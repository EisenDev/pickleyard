'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { BookingStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export type BookingResult = 
  | { success: true; bookingId: string }
  | { success: false; error: string }

export async function createBookingAction(
  courtId: string,
  startTimeString: string
): Promise<BookingResult> {
  return createBookingsAction(courtId, [startTimeString])
}

export async function createBookingsAction(
  courtId: string,
  startTimeStrings: string[]
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

      const hourlyRate = court.type === 'ROOFTOP' ? 300.00 : 250.00
      const totalCost = hourlyRate * startTimes.length

      // 2. Check user credit balance
      if (Number(user.credits) < totalCost) {
        throw new Error(`Insufficient credits. Booking cost: ₱${totalCost.toFixed(2)}, Balance: ₱${Number(user.credits).toFixed(2)}`)
      }

      // 3. Check for booking conflicts
      for (const startTime of startTimes) {
        const endTime = new Date(startTime)
        endTime.setHours(startTime.getHours() + 1)

        const bookingHour = startTime.getHours()
        if (bookingHour < startHour || bookingHour >= endHour) {
          throw new Error(`Selected booking slot is outside of operational hours (${startHour}:00 to ${endHour}:00).`)
        }

        const conflict = await tx.booking.findFirst({
          where: {
            courtId,
            status: { in: [BookingStatus.RESERVED, BookingStatus.PAID] },
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
          throw new Error(`This court is already reserved at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`)
        }
      }

      // 4. Deduct user credits
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { credits: Number(user.credits) - totalCost }
      })

      let firstBookingId = ''

      // 5. Create reservation bookings
      for (const startTime of startTimes) {
        const endTime = new Date(startTime)
        endTime.setHours(startTime.getHours() + 1)

        const booking = await tx.booking.create({
          data: {
            userId: user.id,
            courtId,
            startTime,
            endTime,
            status: BookingStatus.PAID,
            price: hourlyRate
          }
        })

        if (!firstBookingId) {
          firstBookingId = booking.id
        }

        // 6. Create ledger transaction entry
        await tx.transaction.create({
          data: {
            userId: user.id,
            amount: -hourlyRate,
            type: 'BOOKING_DEBIT',
            reference: `RESRV-C${court.number}-${startTime.toLocaleDateString([], { month: '2-digit', day: '2-digit' })}`
          }
        })
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
