import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Fetch Courts
    const courts = await db.court.findMany({
      orderBy: { number: 'asc' }
    })

    // 2. Fetch Stacks (including completed ones for expired tab)
    const stacks = await db.paddleStack.findMany({
      where: { status: { in: ['PENDING', 'WAITING', 'PLAYING', 'MATCHED', 'COMPLETED'] } },
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

    // 3. Fetch Events
    const events = await db.clubEvent.findMany({
      orderBy: { scheduledAt: 'desc' }
    })

    const formattedCourts = courts.map(c => ({
      id: c.id,
      number: c.number,
      name: c.name,
      status: c.status,
      gameStartedAt: c.gameStartedAt ? c.gameStartedAt.toISOString() : null,
      gameDurationSecond: c.gameDurationSecond || 900
    }))

    const formattedStacks = stacks.map(s => ({
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

    const formattedEvents = events.map(e => ({
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

    return NextResponse.json({
      success: true,
      courts: formattedCourts,
      stacks: formattedStacks,
      events: formattedEvents
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
