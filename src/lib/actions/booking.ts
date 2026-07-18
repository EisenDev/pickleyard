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
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized. Please sign in.' }
  }

  const startTime = new Date(startTimeString)
  const endTime = new Date(startTime)
  endTime.setHours(startTime.getHours() + 1) // 1-hour block

  // Check if start time is in the past
  if (startTime < new Date()) {
    return { success: false, error: 'Cannot book a court slot in the past.' }
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

      const bookingHour = startTime.getHours()
      if (bookingHour < startHour || bookingHour >= endHour) {
        throw new Error(`Selected booking slot is outside of operational hours (${startHour}:00 to ${endHour}:00).`)
      }
      
      const hourlyRate = court.type === 'ROOFTOP' ? 300.00 : 250.00

      // 2. Check user credit balance
      if (Number(user.credits) < hourlyRate) {
        throw new Error(`Insufficient credits. Booking cost: ₱${hourlyRate.toFixed(2)}, Balance: ₱${Number(user.credits).toFixed(2)}`)
      }

      // 3. Check for booking conflicts
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
        throw new Error('This court is already reserved during the selected hour.')
      }

      // 4. Deduct user credits
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { credits: Number(user.credits) - hourlyRate }
      })

      // 5. Create reservation booking
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

      // 6. Create ledger transaction entry
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: -hourlyRate,
          type: 'BOOKING_DEBIT',
          reference: `RESRV-C${court.number}-${startTime.toLocaleDateString([], { month: '2-digit', day: '2-digit' })}`
        }
      })

      return booking
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/bookings')
    return { success: true, bookingId: result.id }

  } catch (error: any) {
    return { success: false, error: error.message || 'Booking transaction failed.' }
  }
}
