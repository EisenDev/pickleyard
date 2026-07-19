import { PrismaClient, BookingStatus, SkillLevel } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with production settings...')

  // Clean existing tables to start fresh
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

  // Create the official Admin account
  const hashedPassword = await bcrypt.hash('Pickleball1234', 12)
  await prisma.user.create({
    data: {
      name: 'PaddleYard Admin',
      email: 'pickleballsulop@gmail.com',
      hashedPassword,
      duprRating: 3.5,
      credits: 0.00,
      membership: 'VIP',
      role: 'ADMIN'
    }
  })

  console.log('Admin user created')

  // Create 10 Indoor Courts. All playable (AVAILABLE status)
  const courts = []
  for (let i = 1; i <= 10; i++) {
    const court = await prisma.court.create({
      data: {
        number: i,
        name: `Court ${i}`,
        type: 'INDOOR',
        status: 'AVAILABLE',
        gameDurationSecond: 900
      }
    })
    courts.push(court)
  }
  console.log('10 Indoor courts created (All 10 Available, 15-min duration)')

  // Create or update target user
  const targetEmail = 'arjayescabas102@gmail.com'
  const targetUser = await prisma.user.upsert({
    where: { email: targetEmail },
    update: {
      yardPoints: 100000,
      lifetimeYardPoints: 100000
    },
    create: {
      name: 'Arjay Escabas',
      email: targetEmail,
      hashedPassword: hashedPassword,
      duprRating: 4.5,
      credits: 5000,
      membership: 'VIP',
      role: 'PLAYER',
      yardPoints: 100000,
      lifetimeYardPoints: 100000
    }
  })
  console.log(`User ${targetEmail} seeded with 100,000 points`)

  // Seed 50 lobby players
  const skillLevels: SkillLevel[] = ['NOVICE', 'INTERMEDIATE', 'ADVANCED']
  for (let i = 1; i <= 50; i++) {
    const dummyEmail = `lobbyplayer${i}@example.com`
    const dummyUser = await prisma.user.create({
      data: {
        name: `Lobby Player ${i}`,
        email: dummyEmail,
        hashedPassword,
        duprRating: i % 3 === 0 ? 4.2 : i % 3 === 1 ? 3.3 : 2.5,
        credits: 150,
        membership: 'STANDARD',
        role: 'PLAYER'
      }
    })

    await prisma.paddleStack.create({
      data: {
        userId: dummyUser.id,
        skillLevel: skillLevels[i % 3],
        status: 'WAITING',
        joinedAt: new Date(Date.now() - i * 60000), // staggered join times
        checkedInAt: new Date(),
        sessionExpiresAt: new Date(Date.now() + 3 * 3600 * 1000) // 3 hours limit
      }
    })
  }
  console.log('50 lobby players seeded in WAITING state')

  // Seed bookings for today and tomorrow
  if (courts.length > 0) {
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Helper to construct dates safely
    const setTime = (baseDate: Date, hours: number) => {
      const d = new Date(baseDate)
      d.setHours(hours, 0, 0, 0)
      return d
    }

    // Bookings today on Court 1 & 2
    await prisma.booking.createMany({
      data: [
        {
          userId: targetUser.id,
          courtId: courts[0].id,
          startTime: setTime(today, 9),
          endTime: setTime(today, 10),
          status: 'PAID',
          price: 500
        },
        {
          userId: targetUser.id,
          courtId: courts[0].id,
          startTime: setTime(today, 14),
          endTime: setTime(today, 15),
          status: 'PAID',
          price: 500
        },
        {
          userId: targetUser.id,
          courtId: courts[1].id,
          startTime: setTime(today, 10),
          endTime: setTime(today, 11),
          status: 'PAID',
          price: 500
        },
        // Bookings tomorrow on Court 1 & 3
        {
          userId: targetUser.id,
          courtId: courts[0].id,
          startTime: setTime(tomorrow, 9),
          endTime: setTime(tomorrow, 10),
          status: 'PAID',
          price: 500
        },
        {
          userId: targetUser.id,
          courtId: courts[2].id,
          startTime: setTime(tomorrow, 16),
          endTime: setTime(tomorrow, 17),
          status: 'PAID',
          price: 500
        }
      ]
    })
    console.log('Bookings for today and tomorrow seeded on courts 1, 2, and 3')
  }

  console.log('Production seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
