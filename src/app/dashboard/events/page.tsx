import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { EventsClient } from './events-client'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  // Fetch current user details
  const user = await db.user.findUnique({
    where: { email: session.user.email }
  })
  if (!user) return null

  // Fetch active/upcoming club events
  const events = await db.clubEvent.findMany({
    where: { scheduledAt: { gte: new Date() } },
    orderBy: { scheduledAt: 'asc' }
  })

  // Format database types to frontend schema
  const formattedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    scheduledAt: e.scheduledAt,
    location: e.location,
    price: Number(e.price),
    capacity: e.capacity,
    registeredCount: e.registeredCount
  }))

  return <EventsClient events={formattedEvents} userBalance={Number(user.credits)} />
}
