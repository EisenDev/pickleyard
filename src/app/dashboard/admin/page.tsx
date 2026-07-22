import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { AdminClient } from './admin-client'
import { checkAndRotateExpiredMatchesAction } from '@/lib/actions/admin'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect('/')
  }

  // Load user role
  const user = await db.user.findUnique({
    where: { email: session.user.email }
  })

  // Role validation: Non-admins and non-staff redirect to dashboard
  if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') {
    redirect('/dashboard')
  }

  // Self-rotate any expired court match timers automatically on load
  await checkAndRotateExpiredMatchesAction()

  // Fetch all courts
  const courts = await db.court.findMany({
    orderBy: { number: 'asc' }
  })

  // Fetch active queue stack entries (PENDING, WAITING, PLAYING, MATCHED, or COMPLETED)
  const stacks = await db.paddleStack.findMany({
    where: { status: { in: ['PENDING', 'WAITING', 'PLAYING', 'MATCHED'] } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          duprRating: true,
          credits: true,
          membership: true
        }
      }
    },
    orderBy: { joinedAt: 'asc' }
  })

  // Fetch all players for check-in scan simulations (excluding admin themselves)
  const players = await db.user.findMany({
    where: { role: { not: 'ADMIN' } },
    orderBy: { name: 'asc' }
  })

  // Fetch today's reservation bookings for the lookahead warning checks
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)
  const bookings = await db.booking.findMany({
    where: {
      status: { in: ['RESERVED', 'PAID', 'PENDING'] },
      startTime: { gte: todayStart, lte: todayEnd },
      user: {
        role: { notIn: ['ADMIN', 'STAFF'] }
      }
    },
    orderBy: { startTime: 'asc' }
  })



  // Fetch lobby active queue expiry and operational hours settings
  const expirySetting = await db.systemSetting.findUnique({
    where: { key: 'openplay_expiry_hours' }
  })
  const expiryHours = expirySetting ? parseFloat(expirySetting.value) : 3.0

  const startHourSetting = await db.systemSetting.findUnique({ where: { key: 'openplay_start_hour' } })
  const endHourSetting = await db.systemSetting.findUnique({ where: { key: 'openplay_end_hour' } })
  const startHour = startHourSetting ? parseInt(startHourSetting.value) : 8
  const endHour = endHourSetting ? parseInt(endHourSetting.value) : 22

  return (
    <AdminClient
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
        userName: s.user?.name || 'Player',
        skillLevel: s.skillLevel,
        status: s.status,
        courtId: s.courtId,
        joinedAt: s.joinedAt.toISOString(),
        checkedInAt: s.checkedInAt ? s.checkedInAt.toISOString() : null,
        sessionExpiresAt: s.sessionExpiresAt ? s.sessionExpiresAt.toISOString() : null,
        qrId: s.qrId,
        user: s.user ? {
          id: s.user.id,
          name: s.user.name || 'Player',
          email: s.user.email,
          duprRating: s.user.duprRating,
          credits: Number(s.user.credits),
          membership: s.user.membership
        } : undefined
      }))}
      users={players.map(p => ({
        id: p.id,
        name: p.name || 'Player',
        email: p.email,
        membership: p.membership,
        credits: Number(p.credits),
        duprRating: p.duprRating
      }))}
      bookings={bookings.map(b => ({
        id: b.id,
        courtId: b.courtId,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        status: b.status
      }))}

      expiryHours={expiryHours}
      opStartHour={startHour}
      opEndHour={endHour}
    />
  )
}
