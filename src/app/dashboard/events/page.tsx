import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { EventsClient } from './events-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EventsPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return null

  // Show ALL events to everyone — no date filtering.
  // Past events are shown with a "PAST" badge in the UI.
  const events = await db.clubEvent.findMany({
    orderBy: { scheduledAt: 'desc' },
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

