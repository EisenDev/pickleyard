'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export type TopUpResult =
  | { success: true }
  | { success: false; error: string }

export async function topUpCreditsAction(amount: number): Promise<TopUpResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized.' }
  }

  if (amount <= 0 || amount > 1000) {
    return { success: false, error: 'Please choose an amount between $10 and $1000.' }
  }

  const userEmail = session.user.email

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email: userEmail }
      })
      if (!user) throw new Error('User not found.')

      // Update user credits
      await tx.user.update({
        where: { id: user.id },
        data: { credits: Number(user.credits) + amount }
      })

      // Write ledger entry
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: 'TOPUP',
          reference: `TOPUP-ONLINE-${new Date().getTime().toString().substring(8)}`
        }
      })
    })

    revalidatePath('/dashboard/transactions')
    revalidatePath('/dashboard')
    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message || 'Top-up transaction failed.' }
  }
}
