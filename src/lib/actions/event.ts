'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export type RegisterResult =
  | { success: true }
  | { success: false; error: string }

export async function registerEventAction(eventId: string): Promise<RegisterResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized.' }
  }

  const userEmail = session.user.email

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Fetch user
      const user = await tx.user.findUnique({
        where: { email: userEmail }
      })
      if (!user) throw new Error('User not found.')

      // 2. Fetch event
      const event = await tx.clubEvent.findUnique({
        where: { id: eventId }
      })
      if (!event) throw new Error('Event not found.')

      // 3. Check capacity limit
      if (event.registeredCount >= event.capacity) {
        throw new Error('This event is fully booked.')
      }

      // 4. Check user balance
      const price = Number(event.price)
      if (Number(user.credits) < price) {
        throw new Error(`Insufficient credits. Registration cost: $${price.toFixed(2)}, Balance: $${Number(user.credits).toFixed(2)}`)
      }

      // 5. Deduct credits
      await tx.user.update({
        where: { id: user.id },
        data: { credits: Number(user.credits) - price }
      })

      // 6. Update registeredCount
      await tx.clubEvent.update({
        where: { id: eventId },
        data: { registeredCount: event.registeredCount + 1 }
      })

      // 7. Write ledger transaction
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: -price,
          type: 'EVENT_DEBIT',
          reference: `EVENT-REG-${event.title.substring(0, 10).toUpperCase()}`
        }
      })

      return event
    })

    revalidatePath('/dashboard/events')
    revalidatePath('/dashboard')
    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to register for event.' }
  }
}
