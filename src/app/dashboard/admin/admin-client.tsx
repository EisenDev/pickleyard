'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  scanCheckinAction,
  forceEnterQueueAction,
  removePlayerFromQueueAction,
  assignMatchToCourtAction,
  startMatchTimerAction,
  endMatchEarlyAction,
  checkAndRotateExpiredMatchesAction
} from '@/lib/actions/admin'
import { Users, Clock, ShieldCheck, ShieldAlert, X, Search, UserCheck, Play, Award, Zap, Power, Volume2, QrCode, Trash2, Camera, AlertTriangle, Calendar, RefreshCw } from 'lucide-react'

interface Court {
  id: string
  number: number
  name: string
  status: string
  gameStartedAt: Date | null
  gameDurationSecond: number
}

interface StackEntry {
  id: string
  userId: string
  userName: string
  skillLevel: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'
  status: string
  courtId: string | null
  joinedAt: string
  checkedInAt: string | null
  sessionExpiresAt: string | null
}

interface UserListItem {
  id: string
  name: string
  email: string
  credits: number
  duprRating: number
  membership: string
}

interface Booking {
  id: string
  courtId: string
  startTime: string
  endTime: string
  status: string
}

interface Props {
  courts: Court[]
  stacks: StackEntry[]
  users: UserListItem[]
  bookings: Booking[]
  expiryHours: number
  opStartHour: number
  opEndHour: number
}

// Real-Time Player Session Countdown Timer (Timezone-safe & Hydration-safe)
function PlayerCountdown({ sessionExpiresAt }: { sessionExpiresAt: Date | string }) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const tick = () => {
      const limit = new Date(sessionExpiresAt).getTime()
      const remaining = Math.max(0, Math.floor((limit - Date.now()) / 1000))
      setTimeLeft(remaining)
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [sessionExpiresAt])

  if (!isMounted) return null

  const hours = Math.floor(timeLeft / 3600)
  const mins = Math.floor((timeLeft % 3600) / 60)
  const secs = timeLeft % 60
  const timeStr = `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const isLowTime = timeLeft < 2700 // Under 45 minutes

  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 700,
      color: isLowTime ? 'white' : 'var(--color-text-secondary)',
      background: isLowTime ? 'var(--color-danger)' : 'var(--color-surface)',
      border: `1px solid ${isLowTime ? 'var(--color-danger)' : 'var(--color-border)'}`,
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      animation: isLowTime ? 'pulse-danger 1.5s infinite alternate' : 'none'
    }}>
      {isLowTime ? <AlertTriangle size={11} color="white" /> : <Clock size={11} />}
      <span>{timeLeft === 0 ? 'Expired' : timeStr}</span>
    </span>
  )
}

// Inline Player Timer (returns HH:MM:SS text only, timezone-safe & hydration-safe)
function ClockCountdown({ sessionExpiresAt }: { sessionExpiresAt: Date | string }) {
  const [timeLeft, setTimeLeft] = useState(0)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const tick = () => {
      const limit = new Date(sessionExpiresAt).getTime()
      const remaining = Math.max(0, Math.floor((limit - Date.now()) / 1000))
      setTimeLeft(remaining)
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [sessionExpiresAt])

  if (!isMounted) return null

  const hours = Math.floor(timeLeft / 3600)
  const mins = Math.floor((timeLeft % 3600) / 60)
  const secs = timeLeft % 60
  return <span>{hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}</span>
}

export function AdminClient({ courts, stacks, users, bookings, expiryHours, opStartHour, opEndHour }: Props) {
  const [isPending, startTransition] = useTransition()

  // Helper: Get availability status for a court today based on bookings and operational hours
  const getAvailabilityStatus = (courtId: string) => {
    const courtBookings = bookings.filter(b => b.courtId === courtId)
    if (courtBookings.length === 0) {
      return { status: 'FREE_ALL_DAY', text: 'Free all day', label: 'Free all day' }
    }

    const now = new Date()
    const nowTime = now.getTime()

    // 1. Check if fully booked for operational hours today
    const totalOpHours = opEndHour - opStartHour
    let totalBookedSeconds = 0
    for (const b of courtBookings) {
      const bStart = new Date(b.startTime)
      const bEnd = new Date(b.endTime)
      const durationSeconds = Math.round((bEnd.getTime() - bStart.getTime()) / 1000)
      totalBookedSeconds += durationSeconds
    }
    const totalBookedHours = totalBookedSeconds / 3600

    const listText = courtBookings.map(b => {
      const startStr = new Date(b.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '')
      const endStr = new Date(b.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '')
      return `${startStr}-${endStr}`
    }).join(', ')

    if (totalBookedHours >= totalOpHours) {
      return { status: 'FULLY_BOOKED', text: 'Fully Booked today', label: `Fully Booked: ${listText}` }
    }

    // 2. Find next upcoming booking starting after now
    const upcoming = courtBookings
      .filter(b => new Date(b.startTime).getTime() > nowTime)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

    if (upcoming.length > 0) {
      const nextB = upcoming[0]
      const nextStart = new Date(nextB.startTime)
      const diffMs = nextStart.getTime() - nowTime
      const hours = Math.floor(diffMs / (3600 * 1000))
      const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000))

      const timeStr = nextStart.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true })
      const freeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

      return {
        status: 'PARTIAL',
        text: `Available until ${timeStr} (for ${freeStr})`,
        label: `Booked today: ${listText}`
      }
    }

    // Bookings exist but they are in the past
    return {
      status: 'FREE_REST_OF_DAY',
      text: 'Free for the rest of the day',
      label: `Booked today: ${listText}`
    }
  }

  // Match Assignment Modal State
  const [assigningMatch, setAssigningMatch] = useState<{
    skillLevel: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'
    players: StackEntry[]
  } | null>(null)

  // Navigation & Scan State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null)
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [adminMessage, setAdminMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [modalSkillLevel, setModalSkillLevel] = useState<'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE')
  const [kioskNotice, setKioskNotice] = useState<{ success: boolean; text: string } | null>(null)

  const showNotice = (success: boolean, text: string) => {
    setKioskNotice({ success, text })
    setTimeout(() => setKioskNotice(null), 5000)
  }
  
  // Lobby Queue Filter
  const [skillFilter, setSkillFilter] = useState<'ALL' | 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPIRED'>('ALL')
  
  // Manual scan text field
  const [scanText, setScanText] = useState('')

  // State to force re-render client countdown calculations every second
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTicks(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto trigger check-in rotation & session expiry check periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      await checkAndRotateExpiredMatchesAction()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Filter users for scanner manual selector
  const filteredScanUsers = users.filter(u =>
    u.name.toLowerCase().includes(scanText.toLowerCase()) ||
    u.email.toLowerCase().includes(scanText.toLowerCase())
  ).slice(0, 4)

  // Get active queue stack entries (status WAITING)
  const noviceWaiting = stacks.filter(s => s.skillLevel === 'NOVICE' && s.status === 'WAITING')
  const intermediateWaiting = stacks.filter(s => s.skillLevel === 'INTERMEDIATE' && s.status === 'WAITING')
  const advancedWaiting = stacks.filter(s => s.skillLevel === 'ADVANCED' && s.status === 'WAITING')

  // Checked in lobby players (waiting, matched, or pending check-in, ordered by joinedAt FIFO)
  const lobbyPlayers = stacks.filter(s => s.status === 'WAITING' || s.status === 'MATCHED' || s.status === 'PENDING')
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())

  // Filter lobby players list by skill tabs (and expired tab)
  const filteredLobbyPlayers = stacks.filter(p => {
    if (skillFilter === 'EXPIRED') {
      return p.status === 'COMPLETED'
    } else {
      if (p.status === 'COMPLETED') return false
      if (skillFilter === 'ALL') return true
      return p.skillLevel === skillFilter
    }
  }).sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime())

  const getUserStackEntry = (userId: string) => stacks.find(s => s.userId === userId)

  const handleOpenCheckin = (user: UserListItem) => {
    setSelectedUser(user)
    const active = getUserStackEntry(user.id)
    if (active) {
      setModalSkillLevel(active.skillLevel)
    } else {
      setModalSkillLevel(user.duprRating >= 4.0 ? 'ADVANCED' : user.duprRating >= 3.0 ? 'INTERMEDIATE' : 'NOVICE')
    }
    setAdminMessage(null)
    setIsCheckinModalOpen(true)
  }

  const handleChargeCheckin = () => {
    if (!selectedUser) return
    startTransition(async () => {
      const res = await scanCheckinAction(selectedUser.id, modalSkillLevel)
      if (res.success) {
        setAdminMessage({ success: true, text: 'Member checked in successfully. ₱150 fee debited!' })
        setTimeout(() => {
          setIsCheckinModalOpen(false)
          setIsScannerOpen(false)
          setScanText('')
        }, 1200)
      } else {
        setAdminMessage({ success: false, text: res.error || 'Check-in failed.' })
      }
    })
  }

  const handleForceQueue = () => {
    if (!selectedUser) return
    startTransition(async () => {
      const res = await forceEnterQueueAction(selectedUser.id, modalSkillLevel)
      if (res.success) {
        setAdminMessage({ success: true, text: 'Member entered queue manually (No charge).' })
        setTimeout(() => {
          setIsCheckinModalOpen(false)
          setIsScannerOpen(false)
          setScanText('')
        }, 1200)
      } else {
        setAdminMessage({ success: false, text: res.error || 'Operation failed.' })
      }
    })
  }

  const handleRemoveQueue = (userId: string) => {
    startTransition(async () => {
      const res = await removePlayerFromQueueAction(userId)
      if (res.success) {
        showNotice(true, 'Member successfully removed from the active queue.')
        setIsCheckinModalOpen(false)
      } else {
        setAdminMessage({ success: false, text: res.error || 'Failed to remove player.' })
      }
    })
  }

  const handleStartMatch = (courtId: string, level: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED') => {
    startTransition(async () => {
      const res = await assignMatchToCourtAction(courtId, level)
      if (res.success) {
        showNotice(true, 'Successfully assigned matched players to Court.')
      } else {
        showNotice(false, res.error || 'Failed to assign match.')
      }
    })
  }

  const handleManualAssign = (courtId: string) => {
    if (!assigningMatch) return
    startTransition(async () => {
      const res = await assignMatchToCourtAction(courtId, assigningMatch.skillLevel)
      if (res.success) {
        setAssigningMatch(null)
        showNotice(true, 'Successfully assigned matched players to Court.')
      } else {
        showNotice(false, res.error || 'Failed to assign match.')
      }
    })
  }

  const handleStartTimer = (courtId: string) => {
    startTransition(async () => {
      const res = await startMatchTimerAction(courtId)
      if (res.success) {
        showNotice(true, 'Match timer started!')
      } else {
        showNotice(false, res.error || 'Failed to start timer.')
      }
    })
  }

  const handleEndMatch = (courtId: string) => {
    startTransition(async () => {
      const res = await endMatchEarlyAction(courtId)
      if (res.success) {
        showNotice(true, 'Match ended early. Players rotated back to queue.')
      } else {
        showNotice(false, res.error || 'Failed to end match.')
      }
    })
  }

  // Real-Time Court Timer Component
  function ActiveTimer({ startTime, duration }: { startTime: Date; duration: number }) {
    const [timeLeft, setTimeLeft] = useState(0)

    useEffect(() => {
      const tick = () => {
        const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
        const remaining = Math.max(0, duration - elapsed)
        setTimeLeft(remaining)

        if (remaining === 0) {
          startTransition(async () => {
            await checkAndRotateExpiredMatchesAction()
          })
        }
      }

      tick()
      const timer = setInterval(tick, 1000)
      return () => clearInterval(timer)
    }, [startTime, duration])

    const mins = Math.floor(timeLeft / 60)
    const secs = timeLeft % 60
    const timeStr = `${mins}:${String(secs).padStart(2, '0')}`

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 800, color: timeLeft < 120 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
        <Clock size={15} />
        <span>{timeLeft === 0 ? 'Rotated' : timeStr}</span>
      </div>
    )
  }



  return (
    <>
      {/* ── Page Layout Content (Fades up cleanly) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
        {/* Kiosk General Notices (Modern & elegant replacement for alerts) */}
        {kioskNotice && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            fontSize: '13px',
            fontWeight: 650,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: kioskNotice.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            color: kioskNotice.success ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1.5px solid ${kioskNotice.success ? '#bbf7d0' : '#fecaca'}`,
            boxShadow: 'var(--shadow-sm)',
            transition: 'all var(--duration-normal)'
          }}>
            {kioskNotice.success ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
            <span>{kioskNotice.text}</span>
          </div>
        )}

        {/* Header and Scan Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Staff Kiosk Control Panel
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: 4, margin: '4px 0 0' }}>
              Check in lobby players, scan QR passes, and oversee the automated 2v2 court rotation.
            </p>
          </div>
          <button
            onClick={() => {
              setScanText('')
              setAdminMessage(null)
              setIsScannerOpen(true)
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '40px',
              padding: '0 20px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-primary-btn)'
            }}
          >
            <Camera size={16} />
            <span>Scan Open Play QR</span>
          </button>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }} className="admin-grid">
          {/* Left Column: Active Courts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              Active Play Courts (2v2)
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }} className="courts-grid">
              {courts.map(court => {
                const playersPlaying = stacks.filter(s => s.courtId === court.id && (s.status === 'PLAYING' || s.status === 'MATCHED'))
                
                const isOccupied = court.status === 'OCCUPIED'
                const isReady = court.status === 'READY'
                const isAvailable = court.status === 'AVAILABLE'
                const isClosed = court.status === 'MAINTENANCE'

                return (
                  <div
                    key={court.id}
                    style={{
                      background: 'var(--color-card)',
                      border: `1.5px solid ${isOccupied ? 'var(--color-primary)' : isReady ? 'var(--color-accent)' : isClosed ? '#fca5a5' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-xl)',
                      boxShadow: 'var(--shadow-sm)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Court Header */}
                    <div style={{
                      padding: '12px 18px',
                      background: isOccupied ? 'var(--color-primary-subtle)' : isReady ? 'var(--color-warning-subtle)' : isClosed ? 'rgba(239,68,68,0.05)' : 'var(--color-surface)',
                      borderBottom: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          🏓 Court {court.number}
                        </span>
                        {playersPlaying[0]?.skillLevel && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 850,
                            background: playersPlaying[0].skillLevel === 'ADVANCED' ? 'rgba(99,102,241,0.1)' : playersPlaying[0].skillLevel === 'INTERMEDIATE' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                            color: playersPlaying[0].skillLevel === 'ADVANCED' ? '#6366f1' : playersPlaying[0].skillLevel === 'INTERMEDIATE' ? '#d97706' : '#10b981',
                            border: `1px solid ${playersPlaying[0].skillLevel === 'ADVANCED' ? 'rgba(99,102,241,0.2)' : playersPlaying[0].skillLevel === 'INTERMEDIATE' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                            padding: '1px 7px',
                            borderRadius: 'var(--radius-full)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em'
                          }}>
                            {playersPlaying[0].skillLevel}
                          </span>
                        )}
                      </div>
                      {isOccupied && court.gameStartedAt && (
                        <ActiveTimer startTime={court.gameStartedAt} duration={court.gameDurationSecond} />
                      )}
                      {isReady && (
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Volume2 size={13} />
                          READY TO CALL
                        </span>
                      )}
                      {isAvailable && (
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-success)', background: 'var(--color-success-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                          Available
                        </span>
                      )}
                      {isClosed && (
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', background: '#fef2f2', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: '1px solid #fee2e2' }}>
                          Closed
                        </span>
                      )}
                    </div>

                    {/* Court Body */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(isOccupied || isReady) ? (
                        playersPlaying.length === 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', gap: '8px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                            <Calendar size={22} color="var(--color-primary)" />
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reserved / Booked</span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-disabled)' }}>Private hourly booking active</span>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase' }}>
                              {isReady ? 'Matched Queue (doubles 2v2)' : 'Active Match (doubles 2v2)'}
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {playersPlaying.map((player, idx) => {
                                const limitTime = player.sessionExpiresAt ? new Date(player.sessionExpiresAt).getTime() : 0
                                const isLow = player.sessionExpiresAt && (limitTime - Date.now() < 45 * 60 * 1000)

                                return (
                                  <div
                                    key={player.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      padding: '8px 10px',
                                      background: isLow ? 'var(--color-danger-subtle)' : 'var(--color-surface)',
                                      borderRadius: 'var(--radius-md)',
                                      border: `1px solid ${isLow ? 'var(--color-danger)' : 'var(--color-border)'}`
                                    }}
                                  >
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: isLow ? 'var(--color-danger)' : 'var(--color-text-disabled)' }}>#{idx + 1}</span>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                      <span style={{ fontSize: '11px', fontWeight: 700, color: isLow ? 'var(--color-danger)' : 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85px' }}>
                                        {player.userName}
                                      </span>
                                      {player.sessionExpiresAt && (
                                        <span style={{ fontSize: '8px', fontWeight: 600, color: isLow ? 'var(--color-danger)' : 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '1px' }}>
                                          <Clock size={8} />
                                          <ClockCountdown sessionExpiresAt={player.sessionExpiresAt} />
                                        </span>
                                      )}
                                    </div>
                                    <span style={{ marginLeft: 'auto', fontSize: '8px', fontWeight: 800, color: player.skillLevel === 'ADVANCED' ? '#6366f1' : player.skillLevel === 'INTERMEDIATE' ? '#f59e0b' : '#10b981', background: 'white', padding: '1px 5px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                                      {player.skillLevel[0]}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>

                            {isReady ? (
                              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                <button
                                  onClick={() => handleEndMatch(court.id)}
                                  disabled={isPending}
                                  style={{
                                    flex: 1, height: '36px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                                    background: 'white', color: 'var(--color-text-secondary)',
                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleStartTimer(court.id)}
                                  disabled={isPending}
                                  style={{
                                    flex: 2, height: '36px', border: 'none', borderRadius: 'var(--radius-md)',
                                    background: 'var(--color-primary)', color: 'white',
                                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    boxShadow: 'var(--shadow-primary-btn)'
                                  }}
                                >
                                  <Play size={13} fill="white" />
                                  Start Match Timer
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEndMatch(court.id)}
                                disabled={isPending}
                                style={{
                                  width: '100%', height: '36px', border: 'none', borderRadius: 'var(--radius-md)',
                                  background: 'var(--color-danger-subtle)', color: 'var(--color-danger)',
                                  fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px'
                                }}
                              >
                                <Power size={13} />
                                Force End Match & Re-queue
                              </button>
                            )}
                          </>
                        )
                      ) : isClosed ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', gap: '8px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444' }}>🔴 Closed / Maintenance</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-disabled)', maxWidth: '200px' }}>
                            Court is temporarily closed for repairs or staff-only use.
                          </span>
                        </div>
                      ) : (() => {
                        const avail = getAvailabilityStatus(court.id)
                        const isFull = avail.status === 'FULLY_BOOKED'

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 0', gap: '6px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: isFull ? '#ef4444' : '#10b981' }}>
                              {isFull ? '🔴 Fully Booked today' : '🟢 Vacant & Available'}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)', maxWidth: '220px' }}>
                              {avail.text}
                            </span>
                            {avail.status !== 'FREE_ALL_DAY' && (
                              <span style={{ fontSize: '9px', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', marginTop: '4px' }}>
                                {avail.label}
                              </span>
                            )}
                            {!isFull && (
                              <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', marginTop: '2px' }}>
                                Assign a match using the "Next Match" queue board.
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Lobby Board (Checked-in list with remaining 3 hour countdown) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Next Up Matches Section */}
            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="var(--color-accent)" fill="var(--color-accent)" />
                Next Up Matches (2v2)
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {noviceWaiting.length < 4 && intermediateWaiting.length < 4 && advancedWaiting.length < 4 ? (
                  <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-disabled)', gap: '6px', textAlign: 'center' }}>
                    <Users size={20} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: '11px' }}>Waiting for 4 players of the same skill level to check-in.</span>
                  </div>
                ) : (
                  <>
                    {[
                      { level: 'NOVICE' as const, players: noviceWaiting.slice(0, 4), color: '#10b981', labelColor: '#ecfdf5', textColor: '#059669', border: 'rgba(16,185,129,0.2)' },
                      { level: 'INTERMEDIATE' as const, players: intermediateWaiting.slice(0, 4), color: '#f59e0b', labelColor: '#fffbeb', textColor: '#d97706', border: 'rgba(245,158,11,0.2)' },
                      { level: 'ADVANCED' as const, players: advancedWaiting.slice(0, 4), color: '#6366f1', labelColor: '#f5f3ff', textColor: '#4f46e5', border: 'rgba(99,102,241,0.2)' }
                    ].map(m => {
                      if (m.players.length < 4) return null
                      return (
                        <div
                          key={m.level}
                          style={{
                            background: m.labelColor,
                            border: `1.5px solid ${m.border}`,
                            borderRadius: 'var(--radius-lg)',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 850, color: m.textColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              🏓 {m.level} Match
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: m.textColor, background: 'white', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: `1px solid ${m.border}` }}>
                              Ready to Play
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {m.players.map((p, idx) => (
                              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-disabled)' }}>#{idx + 1}</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '85px' }}>
                                  {p.userName}
                                </span>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => setAssigningMatch({ skillLevel: m.level, players: m.players })}
                            style={{
                              width: '100%',
                              height: '36px',
                              border: 'none',
                              borderRadius: 'var(--radius-md)',
                              background: m.color,
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                          >
                            <Play size={13} fill="white" />
                            <span>Find a Court</span>
                          </button>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>

            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="var(--color-primary)" />
                  Lobby Checked-In Queue
                </h3>
                <span style={{ fontSize: '11px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  {lobbyPlayers.length} Active
                </span>
              </div>

              {/* Skill Tabs */}
              <div style={{ display: 'flex', gap: '4px', background: 'var(--color-surface)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                {(['ALL', 'NOVICE', 'INTERMEDIATE', 'ADVANCED', 'EXPIRED'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSkillFilter(tab)}
                    style={{
                      flex: 1, height: '28px', border: 'none', borderRadius: 'var(--radius-sm)',
                      background: skillFilter === tab ? 'white' : 'transparent',
                      color: skillFilter === tab ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                      fontSize: '9px', fontWeight: 700, cursor: 'pointer', boxShadow: skillFilter === tab ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all var(--duration-fast)'
                    }}
                  >
                    {tab === 'EXPIRED' ? "TIME'S UP" : tab}
                  </button>
                ))}
              </div>

              {/* Lobby List (Scrollable, max 10 items) */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                maxHeight: '530px', 
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {filteredLobbyPlayers.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-disabled)', gap: '8px', textAlign: 'center', padding: '40px 0' }}>
                    <Users size={24} style={{ opacity: 0.3 }} />
                    <span style={{ fontSize: '12px' }}>{skillFilter === 'EXPIRED' ? 'No expired sessions today.' : 'No players checked in for this skill tier.'}</span>
                  </div>
                ) : (
                  filteredLobbyPlayers.map((player, index) => {
                    const isPendingScan = player.status === 'PENDING'
                    const isMatched = player.status === 'MATCHED'
                    const isPlaying = player.status === 'PLAYING'
                    const courtObj = player.courtId ? courts.find(c => c.id === player.courtId) : null
                    const limitTime = player.sessionExpiresAt ? new Date(player.sessionExpiresAt).getTime() : 0
                    const isLowTime = player.sessionExpiresAt && (limitTime - Date.now() < 45 * 60 * 1000)
                    const userObj = users.find(u => u.id === player.userId)

                    return (
                      <div
                        key={player.id}
                        onClick={() => {
                          if (isPendingScan && userObj) {
                            handleOpenCheckin(userObj)
                          }
                        }}
                        style={{
                          padding: '10px 14px',
                          background: isPendingScan 
                            ? '#fef2f2' 
                            : isPlaying 
                              ? 'var(--color-primary-subtle)' 
                              : isMatched 
                                ? 'rgba(245, 158, 11, 0.07)' 
                                : isLowTime 
                                  ? 'var(--color-danger-subtle)' 
                                  : 'var(--color-surface)',
                          border: `1.5px solid ${
                            isPendingScan 
                              ? '#ef4444' 
                              : isPlaying 
                                ? 'var(--color-primary)' 
                                : isMatched 
                                  ? '#f59e0b' 
                                  : isLowTime 
                                    ? 'var(--color-danger)' 
                                    : 'var(--color-border)'
                          }`,
                          borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px',
                          boxShadow: (isPendingScan || isLowTime) 
                            ? '0 0 8px rgba(239, 68, 68, 0.15)' 
                            : isPlaying 
                              ? '0 0 8px rgba(0, 124, 128, 0.15)' 
                              : 'none',
                          cursor: isPendingScan ? 'pointer' : 'default'
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 800, color: isPendingScan ? '#ef4444' : isLowTime ? 'var(--color-danger)' : 'var(--color-text-disabled)', width: '20px' }}>
                          #{index + 1}
                        </span>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: isPendingScan ? '#b91c1c' : isLowTime ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                              {player.userName}
                            </span>
                            <span style={{ fontSize: '8px', fontWeight: 800, color: player.skillLevel === 'ADVANCED' ? '#6366f1' : player.skillLevel === 'INTERMEDIATE' ? '#f59e0b' : '#10b981', background: 'white', padding: '1px 5px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                              {player.skillLevel}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {isPendingScan ? (
                              <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>🔴 UNPAID - PENDING SCAN</span>
                            ) : player.status === 'COMPLETED' ? (
                              <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', fontWeight: 750 }}>🔴 TIME EXPIRED</span>
                            ) : (
                              <>
                                {player.sessionExpiresAt && <PlayerCountdown sessionExpiresAt={player.sessionExpiresAt} />}
                                {isPlaying && courtObj && (
                                  <span style={{ 
                                    fontSize: '10px', 
                                    color: 'var(--color-primary)', 
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}>
                                    🎾 Playing on {courtObj.name}
                                  </span>
                                )}
                                {isMatched && (
                                  <span style={{ 
                                    fontSize: '10px', 
                                    color: '#d97706', 
                                    fontWeight: 800,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}>
                                    🔥 Next Match (Ready)
                                  </span>
                                )}
                              </>
                            )}
                            {isLowTime && !isPendingScan && player.status !== 'COMPLETED' && (
                              <span style={{ fontSize: '9px', color: 'var(--color-danger)', fontWeight: 850, textTransform: 'uppercase', animation: 'blink 1s infinite alternate' }}>⚠️ LOW TIME</span>
                            )}
                          </div>
                        </div>

                        {player.status === 'COMPLETED' ? (
                          userObj && (
                            <button
                              onClick={() => handleOpenCheckin(userObj)}
                              style={{
                                border: 'none',
                                background: 'var(--color-primary-subtle)',
                                color: 'var(--color-primary)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '10px',
                                fontWeight: 750,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Re-enqueue / Start New Session"
                            >
                              <RefreshCw size={11} />
                              <span>Re-Queue</span>
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handleRemoveQueue(player.userId)}
                            style={{
                              border: 'none', background: 'transparent', color: 'var(--color-danger)',
                              cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-sm)'
                            }}
                            title="Remove Player from Open Play"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CAMERA SCANNER MODAL (Outside of animated wrapper to prevent viewport trapping!) ── */}
      {isScannerOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.40)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative'
          }} className="animate-fade-up">
            
            <button
              onClick={() => setIsScannerOpen(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                border: 'none', background: 'transparent',
                cursor: 'pointer', color: 'var(--color-text-secondary)'
              }}
            >
              <X size={18} />
            </button>

            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                Scan Open Play Member QR
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Hold the player's mobile pass QR code in front of the kiosk scanner.
              </p>
            </div>

            {/* Mock Camera QR Frame */}
            <div style={{
              width: '100%', height: '200px', background: '#000', borderRadius: 'var(--radius-lg)',
              position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {/* Scan Overlay grids */}
              <div style={{
                width: '120px', height: '120px', border: '2px solid var(--color-primary)',
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 0 1000px rgba(0, 0, 0, 0.5)'
              }}>
                <div style={{
                  position: 'absolute', width: '100%', height: '2px', background: 'var(--color-primary)',
                  boxShadow: '0 0 8px var(--color-primary)', animation: 'laser 2s infinite linear'
                }} />
              </div>
              <span style={{ position: 'absolute', bottom: '16px', fontSize: '11px', color: '#aaa', fontWeight: 600 }}>
                [ Looking for QR Code... ]
              </span>
            </div>

            {/* Input Member's QR ID */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Input Member's QR ID:
              </label>
              
              <div style={{ position: 'relative' }}>
                <QrCode style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--color-text-disabled)' }} size={16} />
                <input
                  type="text"
                  placeholder="e.g. CMRQ569LW000"
                  value={scanText}
                  onChange={e => setScanText(e.target.value)}
                  style={{
                    width: '100%', height: '36px', padding: '0 12px 0 32px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                    fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                  }}
                  autoFocus
                />
              </div>

              {scanText.trim() && (() => {
                const matchedScanUser = users.find(u => 
                  u.id.substring(0, 12).toLowerCase() === scanText.trim().toLowerCase()
                )

                return (
                  <div style={{ marginTop: '4px' }}>
                    {matchedScanUser ? (
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '12px',
                        background: 'rgba(16, 185, 129, 0.03)', border: '1.5px solid #bbf7d0',
                        borderRadius: 'var(--radius-lg)', padding: '14px',
                        textAlign: 'left'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                              {matchedScanUser.name}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              {matchedScanUser.email}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '9px', fontWeight: 850, textTransform: 'uppercase',
                            background: 'var(--color-primary-subtle)', color: 'var(--color-primary)',
                            padding: '2px 6px', borderRadius: 'var(--radius-sm)'
                          }}>
                            {matchedScanUser.membership}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          <div>DUPR: <strong>{matchedScanUser.duprRating.toFixed(2)}</strong></div>
                          <div>Balance: <strong>₱{matchedScanUser.credits.toFixed(2)}</strong></div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setScanText('')
                            handleOpenCheckin(matchedScanUser)
                          }}
                          style={{
                            width: '100%', height: '32px', background: 'var(--color-success)',
                            color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
                            fontSize: '12px', fontWeight: 750, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            boxShadow: 'var(--shadow-sm)', transition: 'background var(--duration-fast)'
                          }}
                        >
                          <ShieldCheck size={14} />
                          <span>Proceed to Check In</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.03)',
                        border: '1.5px dashed #fecaca', borderRadius: 'var(--radius-lg)',
                        fontSize: '12px', color: 'var(--color-danger)', fontWeight: 650
                      }}>
                        No member found matching QR ID "{scanText}"
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── MEMBER CHECK-IN MODAL (Outside of animated wrapper!) ── */}
      {isCheckinModalOpen && selectedUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.40)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10001
        }}>
          <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative'
          }} className="animate-fade-up">
            
            <button
              onClick={() => setIsCheckinModalOpen(false)}
              style={{
                position: 'absolute', top: 20, right: 20,
                border: 'none', background: 'transparent',
                cursor: 'pointer', color: 'var(--color-text-secondary)'
              }}
            >
              <X size={18} />
            </button>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                Scan Result: {selectedUser.name}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Charge check-in and push member to Open Play stacks.
              </p>
            </div>

            {/* Member Details */}
            <div style={{
              background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
              padding: '14px', border: '1px solid var(--color-border)',
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block' }}>Membership</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedUser.membership}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block' }}>DUPR Rating</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{selectedUser.duprRating.toFixed(2)}</span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block' }}>Credits Balance</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: selectedUser.credits < 150 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                  ₱{selectedUser.credits.toFixed(2)}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', display: 'block' }}>Stack status</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: getUserStackEntry(selectedUser.id) ? 'var(--color-success)' : 'var(--color-text-disabled)' }}>
                  {getUserStackEntry(selectedUser.id) ? `Queued (${getUserStackEntry(selectedUser.id)?.skillLevel})` : 'Not Queued'}
                </span>
              </div>
            </div>

            {/* Skill Selector for Checkin (Always show so admin can select queue level during check-in) */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Select Queue Skill Level</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['NOVICE', 'INTERMEDIATE', 'ADVANCED'] as const).map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setModalSkillLevel(lvl)}
                    style={{
                      height: '34px', borderRadius: 'var(--radius-md)',
                      border: modalSkillLevel === lvl ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: modalSkillLevel === lvl ? 'var(--color-primary-subtle)' : 'var(--color-card)',
                      color: modalSkillLevel === lvl ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all var(--duration-fast)'
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Message display */}
            {adminMessage && (
              <div style={{
                padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px',
                background: adminMessage.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
                color: adminMessage.success ? 'var(--color-success)' : 'var(--color-danger)',
                border: `1px solid ${adminMessage.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
              }}>
                {adminMessage.success ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                <span>{adminMessage.text}</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setIsCheckinModalOpen(false)
                  }}
                  style={{
                    flex: 1, height: '40px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', background: 'var(--color-card)',
                    color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  disabled={isPending || selectedUser.credits < 150}
                  onClick={handleChargeCheckin}
                  style={{
                    flex: 1.5, height: '40px', borderRadius: 'var(--radius-md)', border: 'none',
                    background: 'var(--color-success)', color: 'white',
                    fontSize: '13px', fontWeight: 700, cursor: (isPending || selectedUser.credits < 150) ? 'not-allowed' : 'pointer',
                    opacity: (isPending || selectedUser.credits < 150) ? 0.6 : 1,
                    boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  {isPending ? 'Processing...' : 'Confirm'}
                </button>
              </div>

              <button
                type="button"
                disabled={isPending}
                onClick={handleForceQueue}
                style={{
                  width: '100%', height: '34px', borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--color-border)', background: 'transparent',
                  color: 'var(--color-text-disabled)', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', marginTop: '4px'
                }}
              >
                Force Check In (No Charge)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL COURT ASSIGNMENT MODAL ── */}
      {assigningMatch && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.40)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10002
        }}>
          <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            maxWidth: '640px',
            width: '90%',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            position: 'relative'
          }} className="animate-fade-up">
            
            <button
              onClick={() => setAssigningMatch(null)}
              style={{
                position: 'absolute', top: 20, right: 20,
                border: 'none', background: 'transparent',
                cursor: 'pointer', color: 'var(--color-text-secondary)'
              }}
            >
              <X size={18} />
            </button>

            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Play size={18} color="var(--color-primary)" fill="var(--color-primary)" />
                Assign Next {assigningMatch.skillLevel} Match
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Select a suggested vacant court to assign the next 4 queue players.
              </p>
            </div>

            {/* Players in Next Match */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                Players Selected:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {assigningMatch.players.map((p, idx) => (
                  <span key={p.id} style={{ fontSize: '12px', fontWeight: 750, color: 'var(--color-text-primary)', background: 'white', border: '1px solid var(--color-border)', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}>
                    #{idx + 1} {p.userName}
                  </span>
                ))}
              </div>
            </div>
            {/* Courts Grid for Assignment */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {courts.map(court => {
                const playersHere = stacks.filter(s => s.courtId === court.id && (s.status === 'PLAYING' || s.status === 'MATCHED'))
                
                // Check reservation lookahead (15 minutes)
                const nowTime = Date.now()
                const limitTime = nowTime + 15 * 60 * 1000
                const courtBookings = bookings.filter(b => b.courtId === court.id)
                
                const activeBooking = courtBookings.find(b => {
                  const start = new Date(b.startTime).getTime()
                  const end = new Date(b.endTime).getTime()
                  return start <= nowTime && end >= nowTime
                })

                const bookingSoon = courtBookings.find(b => {
                  const start = new Date(b.startTime).getTime()
                  return start > nowTime && start <= limitTime
                })

                const isClosed = court.status === 'MAINTENANCE'
                const isBlocked = activeBooking || bookingSoon || isClosed
                const isAvailable = court.status === 'AVAILABLE' && !isBlocked

                // Compute free time gap until the next booking today
                const upcomingBookings = courtBookings.filter(b => new Date(b.startTime).getTime() > nowTime)
                const nextUpcoming = upcomingBookings.length > 0 ? upcomingBookings[0] : null
                let gapText = 'Free all day'
                if (nextUpcoming) {
                  const diffMs = new Date(nextUpcoming.startTime).getTime() - nowTime
                  const hours = Math.floor(diffMs / (3600 * 1000))
                  const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000))
                  if (hours > 0) {
                    gapText = `Free for ${hours}h ${mins}m`
                  } else {
                    gapText = `Free for ${mins}m`
                  }
                }

                return (
                  <div key={court.id} style={{
                    padding: '12px',
                    border: `1.5px solid ${isAvailable ? '#10b981' : isClosed ? '#fca5a5' : isBlocked ? '#ef4444' : 'var(--color-border)'}`,
                    background: isAvailable ? '#ecfdf5' : isClosed ? '#fff5f5' : isBlocked ? '#fef2f2' : 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '112px',
                    boxShadow: isAvailable ? '0 2px 6px rgba(16,185,129,0.08)' : 'none'
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          Court {court.number}
                        </span>
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 850,
                          textTransform: 'uppercase',
                          color: isAvailable ? '#10b981' : isClosed ? '#ef4444' : isBlocked ? '#ef4444' : 'var(--color-text-disabled)'
                        }}>
                          {isAvailable ? 'Available' : isClosed ? 'Closed' : isBlocked ? 'Blocked' : 'Occupied'}
                        </span>
                      </div>

                      <div style={{ fontSize: '10px', lineHeight: '1.3' }}>
                        {isAvailable ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>Suggested Vacant</span>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '9px' }}>{gapText}</span>
                          </div>
                        ) : isClosed ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>Maintenance</span>
                            <span style={{ color: 'var(--color-text-disabled)', fontSize: '9px' }}>Closed today</span>
                          </div>
                        ) : activeBooking ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>Booked Now</span>
                            <span style={{ color: '#ef4444', fontSize: '9px' }}>
                              {new Date(activeBooking.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} - {new Date(activeBooking.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : bookingSoon ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: '#ef4444', fontWeight: 700 }}>Starts Soon</span>
                            <span style={{ color: '#ef4444', fontSize: '9px' }}>
                              {new Date(bookingSoon.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} - {new Date(bookingSoon.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            In Play ({playersHere[0]?.skillLevel[0] || 'Open Play'})
                          </span>
                        )}
                      </div>
                    </div>

                    {isAvailable && (
                      <button
                        onClick={() => handleManualAssign(court.id)}
                        disabled={isPending}
                        style={{
                          width: '100%',
                          height: '26px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginTop: '8px'
                        }}
                      >
                        Assign Here
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes laser {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes blink {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes pulse-danger {
          0% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0.4); }
          100% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
        }
        @media (max-width: 900px) {
          .admin-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
    </>
  )
}
