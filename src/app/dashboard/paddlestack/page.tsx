import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { PaddleStackBoardClient } from './paddlestack-board-client'

export const dynamic = 'force-dynamic'

export default async function PaddleStackPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return null

  // Fetch all 10 courts
  const courts = await db.court.findMany({ orderBy: { number: 'asc' } })

  // Fetch all active paddle stack entries with user info
  const stacks = await db.paddleStack.findMany({
    where: { status: { in: ['PENDING', 'WAITING', 'PLAYING', 'MATCHED'] } },
    include: { user: { select: { id: true, name: true, email: true, duprRating: true } } },
    orderBy: { joinedAt: 'asc' }
  })

  // Fetch lobby active queue expiry setting
  const expirySetting = await db.systemSetting.findUnique({
    where: { key: 'openplay_expiry_hours' }
  })
  const expiryHours = expirySetting ? parseFloat(expirySetting.value) : 3.0

  return (
    <PaddleStackBoardClient
      expiryHours={expiryHours}
      courts={courts.map(c => ({
        id: c.id,
        number: c.number,
        name: c.name,
        status: c.status,
        gameStartedAt: c.gameStartedAt,
        gameDurationSecond: c.gameDurationSecond || 900
      }))}
      stacks={stacks.map(s => ({
        id: s.id,
        userId: s.userId,
        userName: s.user?.name || s.user?.email || 'Player',
        skillLevel: s.skillLevel,
        status: s.status,
        courtId: s.courtId,
        joinedAt: s.joinedAt.toISOString(),
        checkedInAt: s.checkedInAt ? s.checkedInAt.toISOString() : null,
        sessionExpiresAt: s.sessionExpiresAt ? s.sessionExpiresAt.toISOString() : null
      }))}
      currentUserId={user.id}
      userRole={user.role}
      userCredits={Number(user.credits)}
    />
  )
}
