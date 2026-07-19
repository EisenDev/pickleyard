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
  // Players see events from start of today in Asia/Manila (local to the club).
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

  // Construct ISO string for midnight Manila (+08:00)
  const manilaMidnightISO = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00+08:00`
  const todayStart = new Date(manilaMidnightISO)

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
