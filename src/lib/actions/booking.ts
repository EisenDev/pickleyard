'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { BookingStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

function formatLocalTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

function getManilaDateString(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export type BookingResult = 
  | { success: true; bookingId: string }
  | { success: false; error: string }

export async function createBookingAction(
  courtId: string,
  startTimeString: string,
  paymentMethod: 'credits' | 'cash' = 'credits',
  voucherId?: string
): Promise<BookingResult> {
  const voucherSelections = voucherId ? { [startTimeString]: voucherId } : undefined
  return createBookingsAction(courtId, [startTimeString], paymentMethod, voucherSelections)
}

export async function createBookingsAction(
  courtId: string,
  startTimeStrings: string[],
  paymentMethod: 'credits' | 'cash' = 'credits',
  voucherSelections?: Record<string, string> // maps startTimeString -> voucherId (RedemptionRequest ID)
): Promise<BookingResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized. Please sign in.' }
  }
  if (startTimeStrings.length === 0) {
    return { success: false, error: 'Please select at least one time slot.' }
  }

  const startTimes = startTimeStrings.map(s => new Date(s)).sort((a, b) => a.getTime() - b.getTime())

  // Check if any start time is in the past
  for (const startTime of startTimes) {
    if (startTime < new Date()) {
      return { success: false, error: 'Cannot book a court slot in the past.' }
    }
  }

  const userEmail = session.user.email

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Fetch user
      const user = await tx.user.findUnique({
        where: { email: userEmail }
      })
      if (!user) throw new Error('User account not found.')

      // Rate mapping based on court type
      const court = await tx.court.findUnique({ where: { id: courtId } })
      if (!court) throw new Error('Selected court does not exist.')

      if (court.status === 'MAINTENANCE') {
        throw new Error('This court is temporarily closed for maintenance.')
      }

      // Operational hour validation
      const startHourSetting = await tx.systemSetting.findUnique({ where: { key: 'openplay_start_hour' } })
      const endHourSetting = await tx.systemSetting.findUnique({ where: { key: 'openplay_end_hour' } })
      const startHour = startHourSetting ? parseInt(startHourSetting.value) : 8
      const endHour = endHourSetting ? parseInt(endHourSetting.value) : 22

      // Daytime / Nighttime pricing
      const allPriceSettings = await tx.systemSetting.findMany({
        where: { key: { in: ['booking_price_per_hour', 'booking_daytime_price', 'booking_daytime_start_hour', 'booking_daytime_end_hour', 'booking_nighttime_price'] } }
      })
      const pMap: Record<string, string> = {}
      for (const s of allPriceSettings) pMap[s.key] = s.value

      const daytimeStart  = parseInt(pMap.booking_daytime_start_hour ?? '8')
      const daytimeEnd    = parseInt(pMap.booking_daytime_end_hour   ?? '17')
      const daytimePrice  = parseFloat(pMap.booking_daytime_price    ?? pMap.booking_price_per_hour ?? '250')
      const nighttimePrice= parseFloat(pMap.booking_nighttime_price  ?? pMap.booking_price_per_hour ?? '300')

      // Returns the rate for a given hour (0-23)
      const getRateForHour = (hour: number): number => {
        const base = (hour >= daytimeStart && hour < daytimeEnd) ? daytimePrice : nighttimePrice
        return court.type === 'ROOFTOP' ? 300.00 : base
      }

      // Map time strings to check if paid by voucher
      const slotPayments = startTimeStrings.map(timeStr => {
        const voucherId = voucherSelections?.[timeStr]
        return {
          timeStr,
          time: new Date(timeStr),
          isVoucher: !!voucherId,
          voucherId
        }
      })

      let totalCost = 0
      for (const slot of slotPayments) {
        if (!slot.isVoucher) {
          const slotHour = slot.time.getHours()
          totalCost += getRateForHour(slotHour)
        }
      }

      // 2. Validate Payment Method
      if (paymentMethod === 'cash') {
        const isAdminOrStaff = user.role === 'ADMIN' || user.role === 'STAFF'
        if (!isAdminOrStaff) {
          throw new Error(`Insufficient Credits. Required: ₱${totalCost.toFixed(2)}, Available: ₱${Number(user.credits).toFixed(2)}.`)
        }
      }

      if (paymentMethod === 'credits') {
        if (totalCost > 0 && Number(user.credits) < totalCost) {
          throw new Error(`Insufficient Credits. Required: ₱${totalCost.toFixed(2)}, Available: ₱${Number(user.credits).toFixed(2)}.`)
        }
      } else {
        // Abuse proof: check how many distinct courts the user currently has pending cash bookings on the same day
        const pendingBookings = await tx.booking.findMany({
          where: {
            userId: user.id,
            status: BookingStatus.PENDING
          },
          select: {
            courtId: true,
            startTime: true
          }
        })

        const pendingByDate = new Map<string, Set<string>>()
        for (const pb of pendingBookings) {
          const dateStr = getManilaDateString(pb.startTime)
          if (!pendingByDate.has(dateStr)) {
            pendingByDate.set(dateStr, new Set())
          }
          pendingByDate.get(dateStr)!.add(pb.courtId)
        }

        for (const startTime of startTimes) {
          const dateStr = getManilaDateString(startTime)
          const courtsForDate = new Set(pendingByDate.get(dateStr) || [])
          courtsForDate.add(courtId)
          if (courtsForDate.size > 2) {
            throw new Error('You cannot have pending cash bookings on more than 2 different courts on the same day. Please settle your unpaid bookings at the desk first.')
          }
        }
      }

      // 3. Check for booking conflicts and overlaps
      for (const startTime of startTimes) {
        const endTime = new Date(startTime.getTime() + 3600000)

        const bookingHour = parseInt(
          new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Manila',
            hour: 'numeric',
            hour12: false
          }).format(startTime)
        )

        if (bookingHour < startHour || bookingHour >= endHour) {
          throw new Error(`Selected booking slot is outside of operational hours (${startHour}:00 to ${endHour}:00).`)
        }

        // Court conflict check (slots in RESERVED, PAID, or PENDING)
        const conflict = await tx.booking.findFirst({
          where: {
            courtId,
            status: { in: [BookingStatus.RESERVED, BookingStatus.PAID, BookingStatus.PENDING] },
            OR: [
              {
                startTime: { lte: startTime },
                endTime: { gt: startTime }
              },
              {
                startTime: { lt: endTime },
                endTime: { gte: endTime }
              }
            ]
          }
        })

        if (conflict) {
          throw new Error(`This court is already reserved at ${formatLocalTime(startTime)}.`);
        }

        // User overlapping booking check (cannot book multiple courts at the same time, except for courts 1, 2, and 10)
        const targetCourtIsDoubleBookable = [1, 2, 10].includes(court.number)

        if (!targetCourtIsDoubleBookable) {
          const userConflict = await tx.booking.findFirst({
            where: {
              userId: user.id,
              status: { in: [BookingStatus.PAID, BookingStatus.RESERVED, BookingStatus.PENDING] },
              court: {
                number: { notIn: [1, 2, 10] }
              },
              OR: [
                {
                  startTime: { lte: startTime },
                  endTime: { gt: startTime }
                },
                {
                  startTime: { lt: endTime },
                  endTime: { gte: endTime }
                }
              ]
            }
          })

          if (userConflict) {
            throw new Error(`You already have an active booking at ${formatLocalTime(startTime)} on another court. Double booking is not allowed.`);
          }
        }
      }

      // 4. Deduct user credits if paying with credits and totalCost > 0
      if (paymentMethod === 'credits' && totalCost > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { credits: Number(user.credits) - totalCost }
        })
      }

      let firstBookingId = ''

      // 5. Create reservation bookings
      for (const slot of slotPayments) {
        const startTime = slot.time
        const endTime = new Date(startTime.getTime() + 3600000)

        const booking = await tx.booking.create({
          data: {
            userId: user.id,
            courtId,
            startTime,
            endTime,
            status: (paymentMethod === 'credits' || slot.isVoucher) ? BookingStatus.PAID : BookingStatus.PENDING,
            price: slot.isVoucher ? 0 : getRateForHour(slot.time.getHours())
          }
        })

        if (!firstBookingId) {
          firstBookingId = booking.id
        }

        if (slot.isVoucher && slot.voucherId) {
          // Mark the voucher (RedemptionRequest) as used
          const voucher = await tx.redemptionRequest.findUnique({
            where: { id: slot.voucherId },
            include: { product: true }
          })
          if (!voucher || voucher.userId !== user.id || voucher.status !== 'APPROVED' || voucher.isUsed || voucher.product.category !== 'COURT_TIME') {
            throw new Error('Selected court time voucher is invalid or already used.')
          }

          await tx.redemptionRequest.update({
            where: { id: slot.voucherId },
            data: {
              isUsed: true,
              usedAt: new Date(),
              bookingId: booking.id
            }
          })
        } else {
          // 6. Create ledger transaction entry only if debited
          if (paymentMethod === 'credits') {
            await tx.transaction.create({
              data: {
                userId: user.id,
                amount: -getRateForHour(slot.time.getHours()),
                type: 'BOOKING_DEBIT',
                reference: `RESRV-C${court.number}-${startTime.toLocaleDateString([], { month: '2-digit', day: '2-digit' })}`
              }
            })
          }
        }
      }

      return { id: firstBookingId }
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/bookings')
    return { success: true, bookingId: result.id }

  } catch (error: any) {
    return { success: false, error: error.message || 'Booking transaction failed.' }
  }
}
