import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { EventsClient } from './events-client'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return null

  const isAdmin = user.role === 'ADMIN' || user.role === 'STAFF'

  // Admins see ALL events (so they can manage/review them).
  // Players see events from start of today — avoids hiding same-day events.
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const events = await db.clubEvent.findMany({
    where: isAdmin ? undefined : { scheduledAt: { gte: todayStart } },
    orderBy: { scheduledAt: 'asc' },
  })

  const formattedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    scheduledAt: e.scheduledAt,
    location: e.location,
    price: Number(e.price),
    capacity: e.capacity,
    registeredCount: e.registeredCount,
    type: e.type ?? 'CLINIC',
  }))

  return (
    <EventsClient
      events={formattedEvents}
      userBalance={Number(user.credits)}
      userRole={user.role}
    />
  )
}
