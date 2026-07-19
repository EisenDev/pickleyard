'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export type ActionState = { success: boolean; error?: string }

// ── ADMIN SETTINGS ACTIONS ───────────────────────────────────────────────────

export async function updateYardPointsSettingsAction(settings: Record<string, string>): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: 'Unauthorized.' }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    return { success: false, error: 'Access denied.' }
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      await db.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    }
    revalidatePath('/dashboard/admin/settings')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update settings.' }
  }
}

// ── SHOP PRODUCT MANAGEMENT ACTIONS ──────────────────────────────────────────

export async function createShopProductAction(data: {
  name: string
  description?: string
  category: string
  pointsCost: number
  stock: number
}): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: 'Unauthorized.' }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    return { success: false, error: 'Access denied.' }
  }

  try {
    await db.shopProduct.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        pointsCost: data.pointsCost,
        stock: data.stock,
      }
    })
    revalidatePath('/dashboard/admin/settings')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create product.' }
  }
}

export async function updateShopProductAction(id: string, data: {
  name: string
  description?: string
  category: string
  pointsCost: number
  stock: number
  isActive: boolean
}): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: 'Unauthorized.' }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    return { success: false, error: 'Access denied.' }
  }

  try {
    await db.shopProduct.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        pointsCost: data.pointsCost,
        stock: data.stock,
        isActive: data.isActive,
      }
    })
    revalidatePath('/dashboard/admin/settings')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update product.' }
  }
}

export async function deleteShopProductAction(id: string): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: 'Unauthorized.' }

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    return { success: false, error: 'Access denied.' }
  }

  try {
    await db.shopProduct.delete({ where: { id } })
    revalidatePath('/dashboard/admin/settings')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete product.' }
  }
}

// ── PLAYER SHOP ACTIONS (REDEMPTION) ──────────────────────────────────────────

export async function redeemShopProductAction(productId: string): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: 'Unauthorized.' }

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Fetch user
      const user = await tx.user.findUnique({ where: { email: session.user.email! } })
      if (!user) throw new Error('User not found.')

      // 2. Fetch product
      const product = await tx.shopProduct.findUnique({ where: { id: productId } })
      if (!product) throw new Error('Product not found.')
      if (!product.isActive) throw new Error('Product is no longer active.')

      // 3. Check stock if not unlimited (-1)
      if (product.stock !== -1 && product.stock <= 0) {
        throw new Error('This item is out of stock.')
      }

      // 4. Check points balance
      if (user.yardPoints < product.pointsCost) {
        throw new Error(`Insufficient Yard Points. Requires ${product.pointsCost} YP, but you have ${user.yardPoints} YP.`)
      }

      // 5. Deduct points and update stock
      await tx.user.update({
        where: { id: user.id },
        data: { yardPoints: user.yardPoints - product.pointsCost }
      })

      if (product.stock !== -1) {
        await tx.shopProduct.update({
          where: { id: productId },
          data: { stock: product.stock - 1 }
        })
      }

      // 6. Write points log (deduction)
      await tx.yardPointLog.create({
        data: {
          userId: user.id,
          amount: -product.pointsCost,
          reason: 'REDEMPTION',
          details: `Redeemed: ${product.name}`
        }
      })

      // 7. Create Redemption Request
      const redemption = await tx.redemptionRequest.create({
        data: {
          userId: user.id,
          productId: product.id,
          pointsDeducted: product.pointsCost,
          status: 'PENDING'
        }
      })

      return redemption
    })

    revalidatePath('/dashboard/yard-points')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Redemption failed.' }
  }
}

// ── REDEMPTION APPROVAL ACTIONS ──────────────────────────────────────────────

export async function processRedemptionAction(id: string, status: 'APPROVED' | 'REJECTED', notes?: string): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: 'Unauthorized.' }

  const admin = await db.user.findUnique({ where: { email: session.user.email } })
  if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'STAFF')) {
    return { success: false, error: 'Access denied.' }
  }

  try {
    await db.$transaction(async (tx) => {
      const request = await tx.redemptionRequest.findUnique({
        where: { id },
        include: { user: true, product: true }
      })
      if (!request) throw new Error('Request not found.')
      if (request.status !== 'PENDING') throw new Error('Request has already been processed.')

      if (status === 'REJECTED') {
        // Refund points to user
        await tx.user.update({
          where: { id: request.userId },
          data: { yardPoints: request.user.yardPoints + request.pointsDeducted }
        })

        // Log refund
        await tx.yardPointLog.create({
          data: {
            userId: request.userId,
            amount: request.pointsDeducted,
            reason: 'REDEMPTION_REFUND',
            details: `Refunded redemption: ${request.product.name} (Reason: ${notes || 'Rejected by staff'})`
          }
        })

        // Restore stock if not unlimited (-1)
        if (request.product.stock !== -1) {
          await tx.shopProduct.update({
            where: { id: request.productId },
            data: { stock: request.product.stock + 1 }
          })
        }
      } else {
        // APPROVED
        // If it's a CREDIT VOUCHER, automatically award credits to the user!
        if (request.product.category === 'VOUCHER') {
          // Parse value from voucher name (e.g. "₱100 Credit Voucher" -> 100)
          const match = request.product.name.match(/₱(\d+)/)
          const creditsAwarded = match ? parseInt(match[1]) : 0
          if (creditsAwarded > 0) {
            // Update user balance
            await tx.user.update({
              where: { id: request.userId },
              data: { credits: Number(request.user.credits) + creditsAwarded }
            })
            // Create Transaction entry
            await tx.transaction.create({
              data: {
                userId: request.userId,
                amount: creditsAwarded,
                type: 'TOPUP',
                reference: `YP-VOUCHER-${request.id.substring(0, 8).toUpperCase()}`
              }
            })
          }
        }
      }

      // Update request status
      await tx.redemptionRequest.update({
        where: { id },
        data: { status, notes }
      })
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/yard-points')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to process request.' }
  }
}

// ── DAILY LOGIN ACTION ───────────────────────────────────────────────────────

export async function claimDailyLoginAction(): Promise<ActionState> {
  const session = await auth()
  if (!session?.user?.email) return { success: false, error: 'Unauthorized.' }

  try {
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { email: session.user.email! } })
      if (!user) throw new Error('User not found.')

      // Check if already claimed today in Asia/Manila
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
      const parts = formatter.formatToParts(now)
      const y = parts.find(p => p.type === 'year')?.value || '2026'
      const m = parts.find(p => p.type === 'month')?.value || '1'
      const d = parts.find(p => p.type === 'day')?.value || '1'

      const manilaStartStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00+08:00`
      const manilaStart = new Date(manilaStartStr)

      const existingClaim = await tx.yardPointLog.findFirst({
        where: {
          userId: user.id,
          reason: 'DAILY_LOGIN',
          createdAt: { gte: manilaStart }
        }
      })

      if (existingClaim) {
        throw new Error('You have already claimed your daily reward today!')
      }

      // Get daily reward config
      const rewardConfig = await tx.systemSetting.findUnique({ where: { key: 'yp_daily_login' } })
      const rewardAmount = rewardConfig ? parseInt(rewardConfig.value) : 2

      // Award points
      await tx.user.update({
        where: { id: user.id },
        data: {
          yardPoints: user.yardPoints + rewardAmount,
          lifetimeYardPoints: user.lifetimeYardPoints + rewardAmount
        }
      })

      // Log points
      await tx.yardPointLog.create({
        data: {
          userId: user.id,
          amount: rewardAmount,
          reason: 'DAILY_LOGIN',
          details: 'Daily check-in reward'
        }
      })

      return rewardAmount
    })

    revalidatePath('/dashboard/yard-points')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to claim daily reward.' }
  }
}

export async function awardTopUpPoints(tx: any, userId: string, amount: number) {
  // Retrieve settings
  const settings = await tx.systemSetting.findMany()
  const getValue = (key: string, def: number) => {
    const s = settings.find((x: any) => x.key === key)
    return s ? parseInt(s.value) : def
  }

  let points = 0
  if (amount >= 5000) {
    points = getValue('yp_topup_5000', 1350)
  } else if (amount >= 2000) {
    points = getValue('yp_topup_2000', 450)
  } else if (amount >= 1000) {
    points = getValue('yp_topup_1000', 180)
  } else if (amount >= 500) {
    points = getValue('yp_topup_500', 75)
  }

  if (points > 0) {
    // Update user points
    await tx.user.update({
      where: { id: userId },
      data: {
        yardPoints: { increment: points },
        lifetimeYardPoints: { increment: points }
      }
    })

    // Log points earning
    await tx.yardPointLog.create({
      data: {
        userId,
        amount: points,
        reason: 'TOPUP',
        details: `Earned points from ₱${amount.toFixed(2)} Top-Up`
      }
    })
  }
}

