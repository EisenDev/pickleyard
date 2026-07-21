import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { BookingsCalendarClient } from './bookings-calendar-client'

export const dynamic = 'force-dynamic'

export default async function MyBookingsPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return null

  const allBookingsToday = await db.booking.findMany({
    where: {
      status: { in: ['RESERVED', 'PAID', 'PENDING', 'EXPIRED', 'CANCELLED'] }
    },
    include: {
      court: { select: { id: true, number: true, name: true, type: true } },
      user: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { startTime: 'asc' }
  })

  // Fetch user's own upcoming bookings
  const myBookings = await db.booking.findMany({
    where: { userId: user.id },
    include: { court: true },
    orderBy: { startTime: 'desc' }
  })

  // Fetch all courts
  const courts = await db.court.findMany({
    orderBy: { number: 'asc' }
  })

  // Fetch operational start and end hours
  const startHourSetting = await db.systemSetting.findUnique({ where: { key: 'openplay_start_hour' } })
  const endHourSetting = await db.systemSetting.findUnique({ where: { key: 'openplay_end_hour' } })
  const startHour = startHourSetting ? parseInt(startHourSetting.value) : 8
  const endHour = endHourSetting ? parseInt(endHourSetting.value) : 22

  return (
    <BookingsCalendarClient
      courts={courts.map(c => ({ id: c.id, number: c.number, name: c.name, type: c.type, status: c.status }))}
      allBookings={allBookingsToday.map(b => ({
        id: b.id,
        courtId: b.courtId,
        courtNumber: b.court.number,
        courtName: b.court.name,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        userName: b.user?.name || 'Member',
        userEmail: b.user?.email || '',
        userRole: b.user?.role || 'PLAYER',
        isOwn: b.userId === user.id
      }))}
      myBookings={myBookings.map(b => ({
        id: b.id,
        courtId: b.courtId,
        courtName: b.court.name,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        price: Number(b.price)
      }))}
      userBalance={Number(user.credits)}
      userId={user.id}
      userRole={user.role}
      startHour={startHour}
      endHour={endHour}
    />
  )
}
