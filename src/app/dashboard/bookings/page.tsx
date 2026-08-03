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

  // Fetch daytime / nighttime pricing settings
  const priceSettings = await db.systemSetting.findMany({
    where: { key: { in: ['booking_price_per_hour', 'booking_daytime_price', 'booking_daytime_start_hour', 'booking_daytime_end_hour', 'booking_nighttime_price'] } }
  })
  const psMap: Record<string, string> = {}
  for (const s of priceSettings) psMap[s.key] = s.value
  const bookingPricePerHour  = parseFloat(psMap.booking_price_per_hour     ?? '250')
  const daytimePrice         = parseFloat(psMap.booking_daytime_price       ?? psMap.booking_price_per_hour ?? '250')
  const daytimeStartHour     = parseInt(psMap.booking_daytime_start_hour    ?? '8')
  const daytimeEndHour       = parseInt(psMap.booking_daytime_end_hour      ?? '17')
  const nighttimePrice       = parseFloat(psMap.booking_nighttime_price     ?? psMap.booking_price_per_hour ?? '300')

  // Fetch active approved court vouchers for the player
  const courtVouchers = await db.redemptionRequest.findMany({
    where: {
      userId: user.id,
      status: 'APPROVED',
      isUsed: false,
      product: { category: 'COURT_TIME' }
    },
    include: {
      product: { select: { name: true, durationHours: true } }
    }
  })

  const isAdminOrStaff = user.role === 'ADMIN' || user.role === 'STAFF'
  const players = isAdminOrStaff ? await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      credits: true,
      role: true
    },
    orderBy: { name: 'asc' }
  }) : []

  return (
    <BookingsCalendarClient
      bookingPricePerHour={bookingPricePerHour}
      daytimePrice={daytimePrice}
      daytimeStartHour={daytimeStartHour}
      daytimeEndHour={daytimeEndHour}
      nighttimePrice={nighttimePrice}
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
      courtVouchers={courtVouchers.map(v => ({
        id: v.id,
        name: v.product.name,
        durationHours: v.product.durationHours
      }))}
      players={players.map(p => ({
        id: p.id,
        name: p.name || 'Player',
        email: p.email,
        credits: Number(p.credits),
        role: p.role
      }))}
    />
  )
}
