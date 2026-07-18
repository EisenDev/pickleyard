import { PrismaClient, BookingStatus, SkillLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with updated PaddleYard v2 settings...')

  // Clean existing tables
  await prisma.transaction.deleteMany()
  await prisma.paddleStack.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.clubEvent.deleteMany()
  await prisma.court.deleteMany()
  await prisma.systemSetting.deleteMany()
  await prisma.user.deleteMany()

  // Seed default settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'booking_duration_minutes', value: '60' },
      { key: 'booking_price_per_hour', value: '500' },
      { key: 'openplay_match_duration_seconds', value: '900' },
      { key: 'openplay_expiry_hours', value: '3' },
      { key: 'openplay_entry_fee', value: '150' }
    ]
  })

  const hashedPassword = await bcrypt.hash('password123', 12)

  // 1. Create default users (Philippines currency ₱)
  const admin = await prisma.user.create({
    data: {
      name: 'Arjay Escabas',
      email: 'arjay@paddleyard.com',
      hashedPassword,
      duprRating: 4.5,
      credits: 650.00,
      membership: 'VIP',
      role: 'ADMIN'
    }
  })

  const adminTest = await prisma.user.create({
    data: {
      name: 'Admin Tester',
      email: 'admin@paddleyard.com',
      hashedPassword,
      duprRating: 4.0,
      credits: 1000.00,
      membership: 'VIP',
      role: 'ADMIN'
    }
  })

  const player1 = await prisma.user.create({
    data: {
      name: 'Carl Abang',
      email: 'carl@paddleyard.com',
      hashedPassword,
      duprRating: 3.8,
      credits: 150.00,
      membership: 'STANDARD'
    }
  })

  const player2 = await prisma.user.create({
    data: {
      name: 'Gemar Estrella',
      email: 'gemar@paddleyard.com',
      hashedPassword,
      duprRating: 4.2,
      credits: 320.00,
      membership: 'PRO'
    }
  })

  const player3 = await prisma.user.create({
    data: {
      name: 'Rhonell Remulta',
      email: 'rhonell@paddleyard.com',
      hashedPassword,
      duprRating: 3.1,
      credits: 0.00,
      membership: 'STANDARD'
    }
  })

  // Extra mock players for active waiting list lists
  const mockNames = []
  const levels = [SkillLevel.NOVICE, SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED]
  const firstNames = ['Juan', 'Maria', 'Jose', 'Ana', 'Carl', 'Gemar', 'Rhonell', 'Arjay', 'Lando', 'Gelo', 'Pedro', 'Rosa', 'Clara', 'Luis', 'Tomas', 'Manuel', 'Kiko', 'Keen', 'Faith', 'Lizette', 'Maricel', 'Pearl', 'Sarah', 'Jamie', 'Zack', 'Josh', 'Tina', 'Ben', 'Ken', 'Joe', 'Dan', 'Sam', 'Ron', 'Don', 'Leo', 'Rex', 'Rexy', 'Max', 'Roy', 'Joy', 'Fay', 'May', 'Ray']
  const lastNames = ['Cruz', 'Santos', 'Reyes', 'Diaz', 'Abang', 'Estrella', 'Remulta', 'Escabas', 'Tolentino', 'Dizon', 'Cortes', 'Potro', 'Brenner', 'Vargas', 'Albarracin', 'Coronado', 'Bacus', 'Dizon', 'Castillo', 'Aquino', 'Garcia', 'Perez', 'Lopez', 'Hernandez', 'Martinez', 'Flores', 'Torres', 'Rivera', 'Gomez', 'Ramirez', 'Cruz', 'Del Rosario', 'Salazar', 'Villanueva', 'Santiago', 'Ramos', 'Castro', 'Espino', 'Vergara', 'Bautista', 'Pascual', 'Valenzuela', 'Mendoza']

  for (let i = 0; i < 43; i++) {
    const fName = firstNames[i % firstNames.length]
    const lName = lastNames[i % lastNames.length]
    const name = `${fName} ${lName} ${i + 1}`
    const rating = parseFloat((2.5 + (i * 0.05)).toFixed(2)) // Ratings from 2.5 to 4.6
    const level = levels[i % levels.length]
    // Stagger check-in offsets by 5 seconds so they expire sequentially for 1-minute test
    const timeOffset = i * 5 // 0s, 5s, 10s... 215s ago
    mockNames.push({ name, rating, level, timeOffset })
  }

  const spawnedPlayers = []
  for (const m of mockNames) {
    const p = await prisma.user.create({
      data: {
        name: m.name,
        email: `${m.name.toLowerCase().replace(/\s/g, '')}@paddleyard.com`,
        hashedPassword,
        duprRating: m.rating,
        credits: 150.00,
        membership: 'STANDARD'
      }
    })
    spawnedPlayers.push({ ...p, level: m.level, timeOffset: m.timeOffset })
  }

  console.log('Users created')

  // 2. Create 10 Indoor Courts. All playable (AVAILABLE status)
  // Set default game duration to 900 seconds (15 minutes)
  const courts = []
  for (let i = 1; i <= 10; i++) {
    const court = await prisma.court.create({
      data: {
        number: i,
        name: `Indoor Court ${i}`,
        type: 'INDOOR',
        status: 'AVAILABLE',
        gameDurationSecond: 900
      }
    })
    courts.push(court)
  }
  console.log('10 Indoor courts created (All 10 Available, 15-min duration)')

  // 3. Create Bookings under real players with 1-4 hour gaps
  const getTodayAtHour = (hour: number) => {
    const d = new Date()
    d.setHours(hour, 0, 0, 0)
    return d
  }

  // Seeding bookings on Courts 5-10
  const bookingsData = [
    // Court 5: Booked 9-11 AM and 3-5 PM. Vacant gap: 11 AM - 3 PM (4 hours gap)
    { userId: player1.id, courtId: courts[4].id, start: 9, end: 11, price: 500.00 },
    { userId: player2.id, courtId: courts[4].id, start: 15, end: 17, price: 500.00 },

    // Court 6: Booked 8-10 AM, 1-3 PM, 6-8 PM. Vacant gaps: 10 AM - 1 PM (3 hours), 3-6 PM (3 hours)
    { userId: player3.id, courtId: courts[5].id, start: 8, end: 10, price: 500.00 },
    { userId: spawnedPlayers[0].id, courtId: courts[5].id, start: 13, end: 15, price: 500.00 },
    { userId: spawnedPlayers[1].id, courtId: courts[5].id, start: 18, end: 20, price: 500.00 },

    // Court 7: Booked 10 AM - 12 PM, 2-4 PM. Vacant gap: 12-2 PM (2 hours)
    { userId: spawnedPlayers[2].id, courtId: courts[6].id, start: 10, end: 12, price: 500.00 },
    { userId: spawnedPlayers[3].id, courtId: courts[6].id, start: 14, end: 16, price: 500.00 },

    // Court 8: Booked 11 AM - 12 PM. Vacant gap: 12-4 PM (4 hours)
    { userId: player1.id, courtId: courts[7].id, start: 11, end: 12, price: 250.00 },

    // Court 9: Booked 1-3 PM, 5-7 PM. Vacant gap: 3-5 PM (2 hours)
    { userId: player2.id, courtId: courts[8].id, start: 13, end: 15, price: 500.00 },
    { userId: player3.id, courtId: courts[8].id, start: 17, end: 19, price: 500.00 },

    // Court 10: Booked 8-10 AM, 2-4 PM. Vacant gap: 10 AM - 2 PM (4 hours)
    { userId: admin.id, courtId: courts[9].id, start: 8, end: 10, price: 500.00 },
    { userId: spawnedPlayers[2].id, courtId: courts[9].id, start: 14, end: 16, price: 500.00 },
  ]

  for (const b of bookingsData) {
    await prisma.booking.create({
      data: {
        userId: b.userId,
        courtId: b.courtId,
        startTime: getTodayAtHour(b.start),
        endTime: getTodayAtHour(b.end),
        status: BookingStatus.PAID,
        price: b.price
      }
    })
  }

  console.log('Bookings seeded under real player accounts with specific hour gaps')

  // 4. Create Active Paddle Stacks (Waiting list logs)
  // Seed initial waiting entries
  await prisma.paddleStack.create({
    data: {
      userId: player1.id, // Carl Abang
      skillLevel: SkillLevel.INTERMEDIATE,
      status: 'WAITING',
      joinedAt: new Date(Date.now() - 3600000),
      checkedInAt: new Date(Date.now() - 3600000),
      sessionExpiresAt: new Date(Date.now() - 3600000 + 3 * 3600 * 1000)
    }
  })

  await prisma.paddleStack.create({
    data: {
      userId: player2.id, // Gemar Estrella
      skillLevel: SkillLevel.ADVANCED,
      status: 'WAITING',
      joinedAt: new Date(Date.now() - 1800000),
      checkedInAt: new Date(Date.now() - 1800000),
      sessionExpiresAt: new Date(Date.now() - 1800000 + 3 * 3600 * 1000)
    }
  })

  await prisma.paddleStack.create({
    data: {
      userId: player3.id, // Rhonell Remulta
      skillLevel: SkillLevel.ADVANCED,
      status: 'WAITING',
      joinedAt: new Date(Date.now() - 600000),
      checkedInAt: new Date(Date.now() - 600000),
      sessionExpiresAt: new Date(Date.now() - 600000 + 3 * 3600 * 1000)
    }
  })

  // Seed waiting entries for additional mock players
  for (let i = 0; i < spawnedPlayers.length; i++) {
    const sp = spawnedPlayers[i]
    const checkinTime = new Date(Date.now() - sp.timeOffset * 1000)
    const status = i < 40 ? 'WAITING' : 'PENDING'
    await prisma.paddleStack.create({
      data: {
        userId: sp.id,
        skillLevel: sp.level,
        status: status,
        joinedAt: checkinTime,
        checkedInAt: status === 'WAITING' ? checkinTime : null,
        sessionExpiresAt: status === 'WAITING' ? new Date(checkinTime.getTime() + 3 * 3600 * 1000) : null
      }
    })
  }

  console.log('Paddle Stack queue data populated')

  // 5. Create Club Events
  const eventDate = new Date()
  eventDate.setDate(eventDate.getDate() + 2)
  eventDate.setHours(19, 0, 0, 0)

  await prisma.clubEvent.create({
    data: {
      title: 'PaddleYard Grand Opening Tournament',
      description: 'Exclusive double-elimination tournament for members. Free drinks and premium prizes.',
      scheduledAt: eventDate,
      location: 'Indoor Courts 1-4',
      price: 350.00,
      capacity: 32,
      registeredCount: 12
    }
  })

  // 6. Create structured transactions (Philippines currency ₱)
  const seedTransaction = async (userId: string, amount: number, type: 'TOPUP' | 'BOOKING_DEBIT', date: Date, ref: string) => {
    await prisma.transaction.create({
      data: {
        userId,
        amount,
        type,
        reference: ref,
        createdAt: date
      }
    })
  }

  // Today's transactions
  const dToday = new Date()
  await seedTransaction(player1.id, 1000.00, 'TOPUP', dToday, 'INSTAPAY-TODAY-1')
  await seedTransaction(player1.id, -500.00, 'BOOKING_DEBIT', dToday, 'BOOKING-TODAY-1')
  await seedTransaction(player2.id, 1500.00, 'TOPUP', dToday, 'INSTAPAY-TODAY-2')
  await seedTransaction(player2.id, -500.00, 'BOOKING_DEBIT', dToday, 'BOOKING-TODAY-2')

  // Yesterday / This Week
  const dYesterday = new Date()
  dYesterday.setDate(dYesterday.getDate() - 1)
  await seedTransaction(player3.id, 2000.00, 'TOPUP', dYesterday, 'INSTAPAY-WK-1')
  await seedTransaction(player3.id, -500.00, 'BOOKING_DEBIT', dYesterday, 'BOOKING-WK-1')

  const dThreeDaysAgo = new Date()
  dThreeDaysAgo.setDate(dThreeDaysAgo.getDate() - 3)
  await seedTransaction(spawnedPlayers[0].id, 1200.00, 'TOPUP', dThreeDaysAgo, 'INSTAPAY-WK-2')
  await seedTransaction(spawnedPlayers[0].id, -500.00, 'BOOKING_DEBIT', dThreeDaysAgo, 'BOOKING-WK-2')

  // This Month
  const dTenDaysAgo = new Date()
  dTenDaysAgo.setDate(dTenDaysAgo.getDate() - 10)
  await seedTransaction(spawnedPlayers[1].id, 3000.00, 'TOPUP', dTenDaysAgo, 'INSTAPAY-MO-1')
  await seedTransaction(spawnedPlayers[1].id, -1000.00, 'BOOKING_DEBIT', dTenDaysAgo, 'BOOKING-MO-1')

  const dTwentyDaysAgo = new Date()
  dTwentyDaysAgo.setDate(dTwentyDaysAgo.getDate() - 20)
  await seedTransaction(spawnedPlayers[2].id, 2500.00, 'TOPUP', dTwentyDaysAgo, 'INSTAPAY-MO-2')
  await seedTransaction(spawnedPlayers[2].id, -500.00, 'BOOKING_DEBIT', dTwentyDaysAgo, 'BOOKING-MO-2')

  // Annual (This Year)
  const dTwoMonthsAgo = new Date()
  dTwoMonthsAgo.setMonth(dTwoMonthsAgo.getMonth() - 2)
  await seedTransaction(spawnedPlayers[3].id, 5000.00, 'TOPUP', dTwoMonthsAgo, 'INSTAPAY-YR-1')
  await seedTransaction(spawnedPlayers[3].id, -1500.00, 'BOOKING_DEBIT', dTwoMonthsAgo, 'BOOKING-YR-1')

  const dFiveMonthsAgo = new Date()
  dFiveMonthsAgo.setMonth(dFiveMonthsAgo.getMonth() - 5)
  await seedTransaction(player1.id, 8000.00, 'TOPUP', dFiveMonthsAgo, 'INSTAPAY-YR-2')
  await seedTransaction(player1.id, -2000.00, 'BOOKING_DEBIT', dFiveMonthsAgo, 'BOOKING-YR-2')

  console.log('Transactions created')
  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
