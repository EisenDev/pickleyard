import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')

  if (secret !== 'P4ddl3YardCleanUp2026!') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[CLEANUP] Starting Supabase database cleanup via HTTP endpoint...')

  try {
    // 1. Find all admin users
    const admins = await db.user.findMany({
      where: { role: 'ADMIN' }
    })

    if (admins.length === 0) {
      return NextResponse.json({ error: 'No admin accounts found. Cleanup aborted to prevent lockout.' }, { status: 400 })
    }

    const adminIds = admins.map(a => a.id)

    // Transactional deletion of test data
    await db.$transaction(async (tx) => {
      await tx.session.deleteMany()

      await tx.account.deleteMany({
        where: { userId: { notIn: adminIds } }
      })

      await tx.booking.deleteMany()
      await tx.paddleStack.deleteMany()
      await tx.yardPointLog.deleteMany()
      await tx.redemptionRequest.deleteMany()
      await tx.voucher.deleteMany()
      await tx.transaction.deleteMany()
      await tx.clubEvent.deleteMany()
      await tx.verificationToken.deleteMany()

      // Delete non-admin users
      await tx.user.deleteMany({
        where: { id: { notIn: adminIds } }
      })

      // Reset admin wallets & points
      await tx.user.updateMany({
        where: { role: 'ADMIN' },
        data: {
          credits: 0.00,
          yardPoints: 0,
          lifetimeYardPoints: 0,
          duprRating: 3.0
        }
      })

      // Reset all courts to vacant / available state
      await tx.court.updateMany({
        data: {
          status: 'AVAILABLE',
          gameStartedAt: null
        }
      })
    })

    console.log('[CLEANUP] Supabase Database wiped successfully!')
    return NextResponse.json({ success: true, message: 'Database wiped successfully. Only Admin accounts preserved.' })
  } catch (error: any) {
    console.error('[CLEANUP] Error during cleanup:', error)
    return NextResponse.json({ error: error.message || 'Database cleanup failed' }, { status: 500 })
  }
}
