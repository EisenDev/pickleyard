import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'events' | 'paddlestack' | 'user_balance'

    // ── Real-time balance for a single user (scan modal) ──────────────────────
    if (type === 'user_balance') {
      const userId = searchParams.get('userId')
      if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, credits: true }
      })
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      return NextResponse.json({ success: true, credits: Number(user.credits) }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    let formattedCourts: any[] = []
    let formattedStacks: any[] = []
    let formattedEvents: any[] = []
    let formattedBookings: any[] = []

    // Fetch courts and stacks if type is paddlestack or not specified
    if (!type || type === 'paddlestack') {
      const courts = await db.court.findMany({
        orderBy: { number: 'asc' }
      })

      const stacks = await db.paddleStack.findMany({
        where: { status: { in: ['PENDING', 'WAITING', 'PLAYING', 'MATCHED'] } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              duprRating: true,
              membership: true,
              credits: true
            }
          }
        },
        orderBy: { joinedAt: 'asc' }
      })

      formattedCourts = courts.map(c => ({
        id: c.id,
        number: c.number,
        name: c.name,
        status: c.status,
        gameStartedAt: c.gameStartedAt ? c.gameStartedAt.toISOString() : null,
        gameDurationSecond: c.gameDurationSecond || 900
      }))

      formattedStacks = stacks.map(s => ({
        id: s.id,
        userId: s.userId,
        userName: s.user?.name || s.user?.email || 'Player',
        skillLevel: s.skillLevel,
        status: s.status,
        courtId: s.courtId,
        joinedAt: s.joinedAt.toISOString(),
        checkedInAt: s.checkedInAt ? s.checkedInAt.toISOString() : null,
        sessionExpiresAt: s.sessionExpiresAt ? s.sessionExpiresAt.toISOString() : null,
        qrId: s.qrId
      }))
    }

    // Fetch events if type is events or not specified
    if (!type || type === 'events') {
      const events = await db.clubEvent.findMany({
        orderBy: { scheduledAt: 'desc' }
      })

      formattedEvents = events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        scheduledAt: e.scheduledAt.toISOString(),
        location: e.location,
        price: Number(e.price),
        capacity: e.capacity,
        registeredCount: e.registeredCount,
        type: e.type ?? 'CLINIC'
      }))
    }

    // Fetch bookings if type is bookings or not specified
    if (!type || type === 'bookings') {
      const bookings = await db.booking.findMany({
        where: {
          status: { in: ['RESERVED', 'PAID', 'PENDING', 'EXPIRED', 'CANCELLED'] }
        },
        include: {
          court: { select: { id: true, number: true, name: true, type: true } },
          user: { select: { id: true, name: true, email: true, role: true } }
        },
        orderBy: { startTime: 'asc' }
      })

      formattedBookings = bookings.map(b => ({
        id: b.id,
        courtId: b.courtId,
        courtNumber: b.court.number,
        courtName: b.court.name,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        status: b.status,
        userId: b.userId,
        userName: b.user?.name || 'Member',
        userEmail: b.user?.email || '',
        userRole: b.user?.role || 'PLAYER',
        price: Number(b.price)
      }))
    }

    return NextResponse.json({
      success: true,
      courts: formattedCourts,
      stacks: formattedStacks,
      events: formattedEvents,
      bookings: formattedBookings
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
