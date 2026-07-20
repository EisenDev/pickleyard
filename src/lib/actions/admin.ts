'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { BookingStatus, SkillLevel } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { awardTopUpPoints } from './yardpoints'

// Helper check for admin role
async function checkAdmin() {
  const session = await auth()
  if (!session?.user?.email) return null
  const user = await db.user.findUnique({ where: { email: session.user.email } })
  return user?.role === 'ADMIN' ? user : null
}

export type ActionState = { success: boolean; error?: string }

// 1. Scan / Deduct Open Play fee and place user in Stack Queue
export async function scanCheckinAction(
  userId: string,
  skillLevel: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Staff permissions required.' }

  const fee = 150.00

  try {
    const result = await db.$transaction(async (tx) => {
      // Fetch user
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found.')

      // Check balance
      if (Number(user.credits) < fee) {
        throw new Error(`Insufficient balance. Cost: ₱${fee.toFixed(2)}, Balance: ₱${Number(user.credits).toFixed(2)}`)
      }

      // Deduct fee
      await tx.user.update({
        where: { id: user.id },
        data: { credits: Number(user.credits) - fee }
      })

      // Create ledger entry
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: -fee,
          type: 'EVENT_DEBIT',
          reference: `OPEN-PLAY-${new Date().toLocaleDateString([], { month: '2-digit', day: '2-digit' })}`
        }
      })

      // Check if already in active stack queue (including PENDING)
      const existingQueue = await tx.paddleStack.findFirst({
        where: {
          userId: user.id,
          status: { in: ['PENDING', 'WAITING', 'MATCHED', 'PLAYING'] }
        }
      })

      const expirySetting = await tx.systemSetting.findUnique({
        where: { key: 'openplay_expiry_hours' }
      })
      const expiryHours = expirySetting ? parseFloat(expirySetting.value) : 3.0
      const sessionExpiresAt = new Date(Date.now() + expiryHours * 3600 * 1000)

      if (existingQueue) {
        if (existingQueue.status === 'PENDING') {
          // Update the PENDING entry to WAITING (paid/checked in!)
          await tx.paddleStack.update({
            where: { id: existingQueue.id },
            data: {
              status: 'WAITING',
              skillLevel,
              joinedAt: new Date(),
              checkedInAt: new Date(),
              sessionExpiresAt
            }
          })
        } else {
          throw new Error('User is already checked-in and active in the lobby queue.')
        }
      } else {
        // Create new active lobby queue entry
        const { randomBytes } = await import('crypto')
        const qrId = 'OPQ-' + randomBytes(4).toString('hex').toUpperCase()
        await tx.paddleStack.create({
          data: {
            userId: user.id,
            skillLevel,
            status: 'WAITING',
            joinedAt: new Date(),
            checkedInAt: new Date(),
            sessionExpiresAt,
            qrId
          }
        })
      }

      return true
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    revalidatePath('/dashboard/openplay')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Check-in failed.' }
  }
}

// 2. Force enter queue manually (no fee deduction, e.g. paid cash/voucher already checked)
export async function forceEnterQueueAction(
  userId: string,
  skillLevel: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    const expirySetting = await db.systemSetting.findUnique({
      where: { key: 'openplay_expiry_hours' }
    })
    const expiryHours = expirySetting ? parseFloat(expirySetting.value) : 3.0
    const sessionExpiresAt = new Date(Date.now() + expiryHours * 3600 * 1000)

    const existing = await db.paddleStack.findFirst({
      where: { userId, status: { in: ['PENDING', 'WAITING', 'MATCHED', 'PLAYING'] } }
    })

    if (existing) {
      if (existing.status === 'PENDING') {
        await db.paddleStack.update({
          where: { id: existing.id },
          data: {
            status: 'WAITING',
            skillLevel,
            joinedAt: new Date(),
            checkedInAt: new Date(),
            sessionExpiresAt
          }
        })
      } else {
        return { success: false, error: 'User is already in active queue.' }
      }
    } else {
      const { randomBytes } = await import('crypto')
      const qrId = 'OPQ-' + randomBytes(4).toString('hex').toUpperCase()
      await db.paddleStack.create({
        data: {
          userId,
          skillLevel,
          status: 'WAITING',
          joinedAt: new Date(),
          checkedInAt: new Date(),
          sessionExpiresAt,
          qrId
        }
      })
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Queue entry failed.' }
  }
}

// 3. Remove player from queue entirely
export async function removePlayerFromQueueAction(userId: string): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    const active = await db.paddleStack.findFirst({
      where: { userId, status: { in: ['PENDING', 'WAITING', 'MATCHED', 'PLAYING'] } }
    })
    if (!active) return { success: false, error: 'Player is not in stack queue.' }

    await db.paddleStack.update({
      where: { id: active.id },
      data: { status: 'COMPLETED', courtId: null }
    })

    // If court was occupied or ready, verify if we need to release court
    if (active.courtId) {
      const remainingPlayers = await db.paddleStack.count({
        where: { courtId: active.courtId, status: { in: ['MATCHED', 'PLAYING'] } }
      })
      if (remainingPlayers === 0) {
        await db.court.update({
          where: { id: active.courtId },
          data: { status: 'AVAILABLE', gameStartedAt: null }
        })
      }
    }

    // Attempt to fill court vacancies created by removal
    await checkAndCreateReadyMatches()

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 4. Match 4 players of a skill level and assign to a Court in READY state (Wait for Staff to Start Timer)
export async function assignMatchToCourtAction(
  courtId: string,
  skillLevel: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    // 1. Fetch top 4 waiting players in this queue lane
    const waitingPlayers = await db.paddleStack.findMany({
      where: { skillLevel, status: 'WAITING' },
      orderBy: { joinedAt: 'asc' },
      take: 4
    })

    if (waitingPlayers.length < 4) {
      return { success: false, error: `Need at least 4 waiting players in ${skillLevel} queue. (Current: ${waitingPlayers.length})` }
    }

    // 2. Transactionally assign players to court in READY status
    await db.$transaction(async (tx) => {
      const court = await tx.court.findUnique({ where: { id: courtId } })
      if (!court || court.status !== 'AVAILABLE') {
        throw new Error('Court is not vacant or already matched.')
      }

      // Check reservation lookahead: block if booking starts within 15 minutes (900 seconds)
      const now = new Date()
      const limitTime = new Date(now.getTime() + 15 * 60 * 1000)
      const nextBooking = await tx.booking.findFirst({
        where: {
          courtId,
          status: { in: ['RESERVED', 'PAID'] },
          startTime: { lte: limitTime },
          endTime: { gte: now },
          user: {
            role: { notIn: ['ADMIN', 'STAFF'] }
          }
        }
      })

      if (nextBooking) {
        throw new Error('Court is blocked due to an upcoming private reservation starting in less than 15 minutes.')
      }

      // Update Court Status to READY
      await tx.court.update({
        where: { id: courtId },
        data: {
          status: 'READY',
          gameStartedAt: null
        }
      })

      // Update Player Statuses to MATCHED
      const ids = waitingPlayers.map(p => p.id)
      await tx.paddleStack.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'MATCHED',
          courtId
        }
      })
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Match assignment failed.' }
  }
}

// 5. Staff starts the match timer (Transitions court to OCCUPIED and players to PLAYING, starting timer)
export async function startMatchTimerAction(courtId: string): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    await db.$transaction(async (tx) => {
      const matchDurationSetting = await tx.systemSetting.findUnique({
        where: { key: 'openplay_match_duration_seconds' }
      })
      const durationSeconds = matchDurationSetting ? parseInt(matchDurationSetting.value) : 900

      // Update Court Status
      await tx.court.update({
        where: { id: courtId },
        data: {
          status: 'OCCUPIED',
          gameStartedAt: new Date(),
          gameDurationSecond: durationSeconds
        }
      })

      // Update matched players to PLAYING
      await tx.paddleStack.updateMany({
        where: { courtId, status: 'MATCHED' },
        data: {
          status: 'PLAYING'
        }
      })
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Timer start failed.' }
  }
}

// 6. Force end a match early (re-stacks players to WAITING status at the end of the queue)
export async function endMatchEarlyAction(courtId: string): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    await db.$transaction(async (tx) => {
      // Find players currently playing or matched on this court
      const activePlayers = await tx.paddleStack.findMany({
        where: { courtId, status: { in: ['MATCHED', 'PLAYING'] } }
      })

      // Update their status back to WAITING, with joinedAt updated to now (FIFO re-queue)
      if (activePlayers.length > 0) {
        const ids = activePlayers.map(p => p.id)
        await tx.paddleStack.updateMany({
          where: { id: { in: ids } },
          data: {
            status: 'WAITING',
            courtId: null,
            joinedAt: new Date() // Appends to the back of the queue
          }
        })
      }

      // Reset Court Status
      await tx.court.update({
        where: { id: courtId },
        data: {
          status: 'AVAILABLE',
          gameStartedAt: null
        }
      })
    })

    // Check if we can automatically group next waiting players
    await checkAndCreateReadyMatches()

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Match termination failed.' }
  }
}

// 6b. Record match result and award Yard Points to players
export async function recordMatchResultAction(
  courtId: string,
  winnerUserIds: string[] // exactly 2 user IDs (the winners)
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  if (!winnerUserIds || winnerUserIds.length !== 2) {
    return { success: false, error: 'Exactly 2 winners must be selected.' }
  }

  try {
    await db.$transaction(async (tx) => {
      // 1. Find all 4 players currently on this court (MATCHED or PLAYING)
      const activePlayers = await tx.paddleStack.findMany({
        where: {
          courtId,
          status: { in: ['MATCHED', 'PLAYING'] }
        },
        include: { user: true }
      })

      if (activePlayers.length === 0) {
        throw new Error('No active players found on this court. The match may have already been processed.')
      }

      // 2. Get points settings
      const settings = await tx.systemSetting.findMany()
      const getSetting = (key: string, def: number) => {
        const s = settings.find((x: any) => x.key === key)
        return s ? parseInt(s.value) : def
      }

      const noviceWinner = getSetting('yp_novice_winner', 35)
      const intermediateWinner = getSetting('yp_intermediate_winner', 50)
      const advancedWinner = getSetting('yp_advanced_winner', 65)
      const loserPercentage = getSetting('yp_loser_percentage', 15)

      // 3. Award points to all players (winners get full points, losers get % of winners' points)
      for (const entry of activePlayers) {
        const skillLevel = entry.skillLevel
        const isWinner = winnerUserIds.includes(entry.userId)

        let winnerPoints = 35
        if (skillLevel === 'ADVANCED') {
          winnerPoints = advancedWinner
        } else if (skillLevel === 'INTERMEDIATE') {
          winnerPoints = intermediateWinner
        } else {
          winnerPoints = noviceWinner
        }
        
        // Winners get full winnerPoints, losers get percentage
        const totalPoints = isWinner ? winnerPoints : Math.round(winnerPoints * (loserPercentage / 100))

        // Update user yard points
        await tx.user.update({
          where: { id: entry.userId },
          data: {
            yardPoints: { increment: totalPoints },
            lifetimeYardPoints: { increment: totalPoints }
          }
        })

        // Log the points
        await tx.yardPointLog.create({
          data: {
            userId: entry.userId,
            amount: totalPoints,
            reason: isWinner ? 'OPEN_PLAY_WIN' : 'OPEN_PLAY_PARTICIPATION',
            details: `${skillLevel} match – ${isWinner ? `Winner (earned ${totalPoints} YP)` : `Participation / Loser (earned ${loserPercentage}% of winners' points: ${totalPoints} YP)`} (Court ${courtId.slice(-4)})`
          }
        })
      }

      // 4. Re-queue all players (move back to WAITING at the back of the queue)
      const ids = activePlayers.map(p => p.id)
      await tx.paddleStack.updateMany({
        where: { id: { in: ids } },
        data: {
          status: 'WAITING',
          courtId: null,
          joinedAt: new Date() // Back of the queue
        }
      })

      // 5. Free the court
      await tx.court.update({
        where: { id: courtId },
        data: { status: 'AVAILABLE', gameStartedAt: null }
      })
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    revalidatePath('/dashboard/yard-points')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to record match result.' }
  }
}

// 7. Auto check and rotate expired matches automatically + auto queue next match in READY state
export async function checkAndRotateExpiredMatchesAction(): Promise<ActionState> {
  try {
    const now = new Date()

    // 0. Auto-release any courts closed by bookings if the booking has ended
    const allCourts = await db.court.findMany()
    for (const c of allCourts) {
      // If court status is OCCUPIED but has no stack players assigned, check if booking is still active
      if (c.status === 'OCCUPIED') {
        const stackPlayersCount = await db.paddleStack.count({
          where: { courtId: c.id, status: { in: ['MATCHED', 'PLAYING'] } }
        })

        if (stackPlayersCount === 0) {
          const activeBooking = await db.booking.findFirst({
            where: {
              courtId: c.id,
              status: { in: ['RESERVED', 'PAID'] },
              startTime: { lte: now },
              endTime: { gte: now },
              user: {
                role: { notIn: ['ADMIN', 'STAFF'] }
              }
            }
          })
          if (!activeBooking) {
            // No active booking and no active stack players -> Free the court!
            await db.court.update({
              where: { id: c.id },
              data: { status: 'AVAILABLE', gameStartedAt: null }
            })
          }
        }
      }
    }

    const occupiedCourts = await db.court.findMany({
      where: {
        status: 'OCCUPIED',
        gameStartedAt: { not: null }
      }
    })

    let rotationsPerformed = 0

    // 1. Expire any lobby player sessions after their stored sessionExpiresAt timestamp
    const expiredSessions = await db.paddleStack.findMany({
      where: {
        status: { in: ['WAITING', 'MATCHED', 'PLAYING'] },
        sessionExpiresAt: { lte: now }
      }
    })

    if (expiredSessions.length > 0) {
      for (const sess of expiredSessions) {
        await db.$transaction(async (tx) => {
          await tx.paddleStack.update({
            where: { id: sess.id },
            data: { status: 'COMPLETED', courtId: null }
          })

          if (sess.courtId) {
            // Check if court is now vacant of active players
            const remainingCount = await tx.paddleStack.count({
              where: { courtId: sess.courtId, status: { in: ['MATCHED', 'PLAYING'] } }
            })
            if (remainingCount === 0) {
              await tx.court.update({
                where: { id: sess.courtId },
                data: { status: 'AVAILABLE', gameStartedAt: null }
              })
            }
          }
        })
        rotationsPerformed++
      }
    }

    // 2. Court match timer expiry — intentionally NOT auto-rotating here.
    //    When a match timer expires the admin page shows a "Record Winner & Award Points" button.
    //    The court and players are ONLY cleared when staff records the winner (recordMatchResultAction)
    //    or explicitly force-ends the match (endMatchEarlyAction).
    //    Auto-rotating here would cause players to disappear from courts before the winner is recorded.

    if (rotationsPerformed > 0) {
      revalidatePath('/dashboard/admin')
      revalidatePath('/dashboard/paddlestack')
      revalidatePath('/dashboard/openplay')
      return { success: true }
    }

    return { success: false }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 8. Auto match and queue next group of 4 waiting players on any AVAILABLE court
// 8. Auto match is disabled, staff matches players manually.
export async function checkAndCreateReadyMatches(): Promise<boolean> {
  return false
}

// 9. Fetch all configuration settings
export async function getSystemSettingsAction() {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    const list = await db.systemSetting.findMany()
    const settings: Record<string, string> = {
      booking_duration_minutes: '60',
      booking_price_per_hour: '500',
      openplay_match_duration_seconds: '900',
      openplay_expiry_hours: '3',
      openplay_entry_fee: '150',
      openplay_start_hour: '8',
      openplay_end_hour: '22'
    }
    for (const item of list) {
      settings[item.key] = item.value
    }
    return { success: true, settings }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 10. Update configuration settings
export async function updateSystemSettingsAction(settings: {
  booking_duration_minutes: string
  booking_price_per_hour: string
  openplay_match_duration_seconds: string
  openplay_expiry_hours: string
  openplay_entry_fee: string
  openplay_start_hour: string
  openplay_end_hour: string
}) {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized.' }

  try {
    await db.$transaction(async (tx) => {
      for (const [key, val] of Object.entries(settings)) {
        await tx.systemSetting.upsert({
          where: { key },
          update: { value: val },
          create: { key, value: val }
        })
      }

      // Automatically sync court play times if openplay_match_duration_seconds is updated (only for available/maintenance courts so as not to disrupt active games)
      const matchSeconds = parseInt(settings.openplay_match_duration_seconds)
      if (!isNaN(matchSeconds)) {
        await tx.court.updateMany({
          where: { status: { in: ['AVAILABLE', 'MAINTENANCE'] } },
          data: { gameDurationSecond: matchSeconds }
        })
      }
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    revalidatePath('/dashboard/openplay')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 12. Toggle court open/closed status (AVAILABLE vs MAINTENANCE/CLOSED)
export async function toggleCourtOpenStatusAction(courtId: string): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Only admins can toggle court status.' }

  try {
    const court = await db.court.findUnique({ where: { id: courtId } })
    if (!court) return { success: false, error: 'Court not found.' }

    const newStatus = court.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE'
    await db.court.update({
      where: { id: courtId },
      data: { status: newStatus }
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/paddlestack')
    revalidatePath('/dashboard/openplay')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 11. Register member or staff by Admin
export async function registerUserByAdminAction(data: {
  name: string
  email: string
  password: string
  role: string
  membership?: string
  duprRating?: number
  credits?: number
}) {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Only admins can register new users.' }

  if (!data.name || !data.email || !data.password || !data.role) {
    return { success: false, error: 'All fields are required.' }
  }

  try {
    const existing = await db.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return { success: false, error: 'A user with this email address already exists.' }
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)
    const isPlayer = data.role === 'PLAYER'

    await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: data.role,
        membership: isPlayer ? (data.membership || 'STANDARD') : 'STANDARD',
        duprRating: isPlayer ? (data.duprRating || 3.0) : 3.0,
        credits: isPlayer ? (data.credits || 0) : 0
      }
    })

    revalidatePath('/dashboard/admin/users')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// 12. Top up player credits manually via Cash at the front desk
export async function creditUserCashAction(
  userId: string,
  amount: number
): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Staff permissions required.' }

  if (!amount || amount <= 0) {
    return { success: false, error: 'Invalid top up amount.' }
  }

  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('User not found.')

      // Update user credits
      await tx.user.update({
        where: { id: user.id },
        data: { credits: Number(user.credits) + amount }
      })

      // Create ledger entry
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount,
          type: 'TOPUP',
          reference: `CASH-${new Date().getTime()}`
        }
      })

      // Award loyalty points
      await awardTopUpPoints(tx, user.id, amount)
    })

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/admin/users')
    revalidatePath('/dashboard/yard-points')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to top up balance.' }
  }
}

export async function getLatestUserCreditsAction(userId: string): Promise<{ success: boolean; credits?: number; error?: string }> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { credits: true }
    })
    if (!user) return { success: false, error: 'User not found' }
    return { success: true, credits: Number(user.credits) }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch credits' }
  }
}

// 13. Admin: Reserve a court for an Open Play session block (date + time)
//     This is NOT a regular player booking — it's an admin-reserved block for open play.
//     It creates a booking entry with the admin as the owner and a special OPEN_PLAY reference.
export async function adminReserveCourtForOpenPlayAction(data: {
  courtId: string
  startTime?: string    // ISO string
  durationHours?: number
  startTimes?: string[] // array of ISO strings
  label?: string        // optional display label
}): Promise<ActionState> {
  const admin = await checkAdmin()
  if (!admin) return { success: false, error: 'Unauthorized. Only admins can reserve courts.' }

  try {
    let resolvedTimes: Date[] = []

    if (data.startTimes && data.startTimes.length > 0) {
      resolvedTimes = data.startTimes.map(t => new Date(t))
    } else if (data.startTime && data.durationHours) {
      const start = new Date(data.startTime)
      for (let h = 0; h < data.durationHours; h++) {
        const t = new Date(start)
        t.setHours(start.getHours() + h)
        resolvedTimes.push(t)
      }
    } else {
      return { success: false, error: 'No time slot selected.' }
    }

    // Check past time
    for (const time of resolvedTimes) {
      if (time < new Date(Date.now() - 60000)) {
        return { success: false, error: 'Cannot reserve a court slot in the past.' }
      }
    }

    // Process all slots to check conflicts first
    for (const startTime of resolvedTimes) {
      const endTime = new Date(startTime)
      endTime.setHours(startTime.getHours() + 1)

      // Check for conflicts
      const conflict = await db.booking.findFirst({
        where: {
          courtId: data.courtId,
          status: { in: ['RESERVED', 'PAID'] },
          OR: [
            { startTime: { lte: startTime }, endTime: { gt: startTime } },
            { startTime: { lt: endTime }, endTime: { gte: endTime } }
          ]
        }
      })

      if (conflict) {
        return { success: false, error: `Court already has a reservation at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.` }
      }
    }

    // Create reservation for each time slot
    for (const startTime of resolvedTimes) {
      const endTime = new Date(startTime)
      endTime.setHours(startTime.getHours() + 1)

      await db.booking.create({
        data: {
          userId: admin.id,
          courtId: data.courtId,
          startTime,
          endTime,
          status: 'PAID',
          price: 0, // no charge for admin-reserved open play
        }
      })

      // Log a transaction record for transparency (₱0 since this is admin-reserved open play)
      await db.transaction.create({
        data: {
          userId: admin.id,
          amount: 0,
          type: 'EVENT_DEBIT',
          reference: `OPENPLAY-RESERVE-${data.courtId.slice(-4).toUpperCase()}-${startTime.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: '2-digit', day: '2-digit' })}`
        }
      })
    }

    revalidatePath('/dashboard/admin')
    revalidatePath('/dashboard/bookings')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to reserve court.' }
  }
}

