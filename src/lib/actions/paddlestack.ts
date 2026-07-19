'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { SkillLevel } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export type ActionResult = 
  | { success: true }
  | { success: false; error: string }

export async function joinPaddleStackAction(
  skillLevel: SkillLevel
): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized.' }
  }

  const userEmail = session.user.email

  try {
    const user = await db.user.findUnique({
      where: { email: userEmail }
    })
    if (!user) {
      return { success: false, error: 'User not found.' }
    }

    // Credits Limit Check
    if (Number(user.credits) < 150) {
      return { success: false, error: 'Insufficient credits. You need at least ₱150.00 credits to join the stack queue.' }
    }

    // Check if user is already active in stack queue
    const active = await db.paddleStack.findFirst({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'WAITING', 'PLAYING', 'MATCHED'] }
      }
    })

    if (active) {
      return { success: false, error: 'You are already in the stack queue!' }
    }

    // Generate random unique QR ID for the session
    const { randomBytes } = await import('crypto')
    const qrId = 'OPQ-' + randomBytes(4).toString('hex').toUpperCase()

    // Create stack queue item in PENDING status (Unpaid/unscanned)
    await db.paddleStack.create({
      data: {
        userId: user.id,
        skillLevel,
        status: 'PENDING',
        joinedAt: new Date(),
        qrId
      }
    })

    revalidatePath('/dashboard/paddlestack')
    revalidatePath('/dashboard')
    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to join queue.' }
  }
}

export async function leavePaddleStackAction(): Promise<ActionResult> {
  const session = await auth()
  if (!session?.user?.email) {
    return { success: false, error: 'Unauthorized.' }
  }

  const userEmail = session.user.email

  try {
    const user = await db.user.findUnique({
      where: { email: userEmail }
    })
    if (!user) {
      return { success: false, error: 'User not found.' }
    }

    // Remove user from queue
    await db.paddleStack.updateMany({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'WAITING', 'PLAYING', 'MATCHED'] }
      },
      data: {
        status: 'COMPLETED',
        courtId: null
      }
    })

    revalidatePath('/dashboard/paddlestack')
    revalidatePath('/dashboard')
    return { success: true }

  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to leave queue.' }
  }
}
