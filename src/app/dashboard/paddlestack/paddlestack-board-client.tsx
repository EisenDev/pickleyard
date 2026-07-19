'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { joinPaddleStackAction, leavePaddleStackAction } from '@/lib/actions/paddlestack'
import { checkAndRotateExpiredMatchesAction } from '@/lib/actions/admin'
import { Clock, Users, ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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

interface Props {
  courts: Court[]
  stacks: StackEntry[]
  currentUserId: string
  userRole?: string
  userCredits?: number
  expiryHours: number
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function PlayerCountdown({ sessionExpiresAt }: { sessionExpiresAt: string }) {
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

  return (
    <span style={{ color: timeLeft < 1800 ? 'var(--color-danger)' : 'var(--color-text-secondary)', fontWeight: 600 }}>
      ({timeLeft === 0 ? 'Expired' : `${timeStr} left`})
    </span>
  )
}

export function PaddleStackBoardClient({ courts: initialCourts, stacks: initialStacks, currentUserId, userRole, userCredits, expiryHours }: Props) {
  const router = useRouter()
  const [courts, setCourts] = useState<Court[]>(initialCourts)
  const [stacks, setStacks] = useState<StackEntry[]>(initialStacks)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [skillLevel, setSkillLevel] = useState<'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE')
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
  const [activeQueueTab, setActiveQueueTab] = useState<'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'>('NOVICE')

  // Keep state in sync with server component props
  useEffect(() => {
    setCourts(initialCourts)
  }, [initialCourts])

  useEffect(() => {
    setStacks(initialStacks)
  }, [initialStacks])

  const fetchRealtimeData = async () => {
    try {
      const res = await fetch('/api/realtime?type=paddlestack')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setCourts(data.courts)
          setStacks(data.stacks)
        }
      }
    } catch (e) {
      console.error('Realtime fetch error:', e)
    }
  }

  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTicks(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // ── Real-Time Polling ───────────────────────────────────────────────
  // Refresh the Paddle Stack Board every 2 seconds so users see
  // court status, waiting queue position, and ready states instantly.
  useEffect(() => {
    fetchRealtimeData()
    const interval = setInterval(fetchRealtimeData, 2000)
    return () => clearInterval(interval)
  }, [])

  // Auto trigger rotation check periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      await checkAndRotateExpiredMatchesAction()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

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
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
        <Clock size={12} />
        {timeLeft === 0 ? 'Rotated' : timeStr}
      </span>
    )
  }

  const userInQueue = stacks.find(s => s.userId === currentUserId)

  // Group stacks by courtId
  const stacksByCourtId = (courtId: string) => stacks.filter(s => s.courtId === courtId && (s.status === 'PLAYING' || s.status === 'MATCHED'))

  // Waiting queue (no court assigned)
  const noviceQueue = stacks.filter(s => s.skillLevel === 'NOVICE' && (s.status === 'WAITING' || s.status === 'PENDING'))
  const intermediateQueue = stacks.filter(s => s.skillLevel === 'INTERMEDIATE' && (s.status === 'WAITING' || s.status === 'PENDING'))
  const advancedQueue = stacks.filter(s => s.skillLevel === 'ADVANCED' && (s.status === 'WAITING' || s.status === 'PENDING'))

  const handleJoin = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await joinPaddleStackAction(skillLevel)
      if (result.success) {
        setMessage({ success: true, text: 'You successfully entered the paddle stack queue!' })
        fetchRealtimeData()
      } else {
        setMessage({ success: false, text: result.error })
      }
    })
  }

  const handleLeaveTrigger = () => {
    setIsLeaveModalOpen(true)
  }

  const handleLeaveConfirm = () => {
    setIsLeaveModalOpen(false)
    setMessage(null)
    startTransition(async () => {
      const result = await leavePaddleStackAction()
      if (result.success) {
        setMessage({ success: true, text: 'You left the queue.' })
        fetchRealtimeData()
      } else {
        setMessage({ success: false, text: result.error })
      }
    })
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
      {/* Header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={22} />
              Paddle Stack Board
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
              Real-time court play logs and waiting list stacks.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {userCredits !== undefined && userRole !== 'ADMIN' && (
              <span style={{ fontSize: '11px', fontWeight: 850, background: 'var(--color-primary-subtle)', border: '1px solid rgba(0,124,128,0.15)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: 'var(--radius-full)' }}>
                Credits Balance: ₱{userCredits.toFixed(2)}
              </span>
            )}
            <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', padding: '4px 10px', borderRadius: 'var(--radius-full)' }}>
              Live Feed
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '8px',
          background: message.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
          color: message.success ? 'var(--color-success)' : 'var(--color-danger)',
          border: `1px solid ${message.success ? 'rgba(16,185,129,0.2)' : 'rgba(239, 68, 68, 0.2)'}`
        }}>
          {message.success ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Join/Leave Panel */}
      {userRole !== 'ADMIN' && (
        !userInQueue ? (
          <div className="join-queue-panel" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '20px 24px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', boxShadow: 'var(--shadow-sm)' }}>
            <span className="join-queue-label" style={{ fontSize: '14px', fontWeight: 750, color: 'var(--color-text-primary)' }}>Join queue as:</span>
            <div className="join-queue-levels" style={{ display: 'flex', gap: '8px' }}>
              {(['NOVICE', 'INTERMEDIATE', 'ADVANCED'] as const).map(lvl => (
                <button key={lvl} onClick={() => setSkillLevel(lvl)} style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  border: skillLevel === lvl ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: skillLevel === lvl ? 'var(--color-primary)' : 'var(--color-card)',
                  color: skillLevel === lvl ? 'white' : 'var(--color-text-secondary)',
                  transition: 'all var(--duration-fast)'
                }} className="join-queue-btn">{lvl}</button>
              ))}
            </div>
            <button onClick={handleJoin} disabled={isPending} className="enter-queue-submit-btn" style={{
              background: 'var(--color-primary)', color: 'white', border: 'none',
              borderRadius: 'var(--radius-md)', height: 36, padding: '0 18px',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              boxShadow: 'var(--shadow-primary-btn)'
            }}>
              Enter Stack Queue
            </button>
          </div>
        ) : (
          <div style={{ background: 'var(--color-primary-subtle)', border: '1px solid rgba(0,124,128,0.2)', borderRadius: 'var(--radius-xl)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
              You are currently in the <strong>{userInQueue.skillLevel}</strong> queue — Status: {userInQueue.status}
            </span>
            <button onClick={handleLeaveTrigger} disabled={isPending} style={{
              background: 'var(--color-danger)', color: 'white', border: 'none',
              borderRadius: 'var(--radius-md)', height: 34, padding: '0 16px',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer'
            }}>Leave Queue</button>
          </div>
        )
      )}

      {/* Court Grid Board */}
      <div className="court-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
        {courts.map(court => {
          const playersHere = stacksByCourtId(court.id)
          const hasPlayers = playersHere.length > 0

          // If court status is MAINTENANCE, render as Court close
          if (court.status === 'MAINTENANCE') {
            return (
              <div
                key={court.id}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px dashed var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  opacity: 0.8,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '265px'
                }}
              >
                {/* Court header */}
                <div style={{
                  padding: '10px 16px',
                  background: 'var(--color-surface)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--color-border)'
                }}>
                  <span className="court-card-title" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-disabled)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🚧 Court {court.number}
                  </span>
                  <span className="court-card-timer" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-disabled)' }}>
                    Closed
                  </span>
                </div>

                {/* Body */}
                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', textAlign: 'center' }}>
                  <span className="court-card-title" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Court close</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', maxWidth: '180px' }}>Not active for stacks</span>
                </div>
              </div>
            )
          }

          return (
            <div
              key={court.id}
              style={{
                background: 'var(--color-card)',
                border: `1px solid ${court.status === 'OCCUPIED' ? 'var(--color-primary)' : court.status === 'READY' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: hasPlayers ? '0 0 0 3px rgba(0,124,128,0.06)' : 'var(--shadow-sm)',
                height: '265px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Court header */}
              <div style={{
                padding: '10px 16px',
                background: court.status === 'OCCUPIED' ? 'var(--color-primary)' : court.status === 'READY' ? 'var(--color-accent)' : 'var(--color-surface)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--color-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="court-card-title" style={{ fontSize: '13px', fontWeight: 800, color: (court.status === 'OCCUPIED' || court.status === 'READY') ? 'white' : 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏓 Court {court.number}
                  </span>
                  {playersHere[0]?.skillLevel && (
                    <span className="court-card-badge" style={{
                      fontSize: '8px',
                      fontWeight: 855,
                      background: (court.status === 'OCCUPIED' || court.status === 'READY') ? 'rgba(255,255,255,0.2)' : playersHere[0].skillLevel === 'ADVANCED' ? 'rgba(99,102,241,0.1)' : playersHere[0].skillLevel === 'INTERMEDIATE' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                      color: (court.status === 'OCCUPIED' || court.status === 'READY') ? 'white' : playersHere[0].skillLevel === 'ADVANCED' ? '#6366f1' : playersHere[0].skillLevel === 'INTERMEDIATE' ? '#d97706' : '#10b981',
                      border: `1px solid ${(court.status === 'OCCUPIED' || court.status === 'READY') ? 'rgba(255,255,255,0.3)' : playersHere[0].skillLevel === 'ADVANCED' ? 'rgba(99,102,241,0.2)' : playersHere[0].skillLevel === 'INTERMEDIATE' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em'
                    }}>
                      {playersHere[0].skillLevel}
                    </span>
                  )}
                </div>
                <span className="court-card-timer" style={{ fontSize: '10px', fontWeight: 700, color: (court.status === 'OCCUPIED' || court.status === 'READY') ? 'rgba(255,255,255,0.8)' : 'var(--color-text-disabled)' }}>
                  {court.status === 'OCCUPIED' && court.gameStartedAt ? (
                    <ActiveTimer startTime={court.gameStartedAt} duration={court.gameDurationSecond} />
                  ) : court.status === 'READY' ? (
                    <span style={{ background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '9px', color: 'white' }}>READY</span>
                  ) : (
                    'Available'
                  )}
                </span>
              </div>

              {/* Players body */}
              <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {hasPlayers ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {playersHere.map((player, idx) => (
                      <div key={player.id} className="court-card-player-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <div className="court-card-player-avatar" style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: player.userId === currentUserId ? 'var(--color-primary)' : 'var(--color-secondary)',
                          color: 'white', fontSize: '11px', fontWeight: 855,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {getInitials(player.userName)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="court-card-player-name" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {player.userName}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-disabled)' }}>#{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '6px' }}>
                    <Clock size={18} color="var(--color-text-disabled)" />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-disabled)' }}>Court Empty</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Waiting Queue Lanes */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '16px', marginTop: '8px' }}>Waiting Queue Stacks</h2>
        
        {/* DESKTOP ONLY VIEW: 3 lanes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }} className="queue-grid desktop-only-queue">
          {[
            { label: 'Novice Queue', color: '#10b981', items: noviceQueue },
            { label: 'Intermediate Queue', color: '#f59e0b', items: intermediateQueue },
            { label: 'Advanced Queue', color: '#6366f1', items: advancedQueue },
          ].map(lane => (
            <div key={lane.label} style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: lane.color }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} /> {lane.label}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  {lane.items.length}
                </span>
              </div>
              <div style={{ 
                padding: '12px', 
                maxHeight: '600px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                paddingRight: '6px'
              }}>
                {lane.items.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 60, gap: '6px' }}>
                    <Users size={18} color="var(--color-text-disabled)" />
                    <span style={{ fontSize: '11px', color: 'var(--color-text-disabled)' }}>Queue is empty</span>
                  </div>
                ) : (
                  lane.items.map((p, idx) => {
                    const joinedTime = new Date(p.joinedAt).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true
                    })
                    const limitTime = p.sessionExpiresAt ? new Date(p.sessionExpiresAt).getTime() : 0
                    const isLowTime = p.sessionExpiresAt && (limitTime - Date.now() < 45 * 60 * 1000)
                    const isPendingScan = p.status === 'PENDING'

                    return (
                      <div key={p.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        background: isPendingScan ? '#fef2f2' : isLowTime ? 'var(--color-danger-subtle)' : 'var(--color-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isPendingScan ? '#ef4444' : isLowTime ? 'var(--color-danger)' : 'var(--color-border)'}`,
                        transition: 'all var(--duration-fast)',
                        boxShadow: (isPendingScan || isLowTime) ? '0 0 8px rgba(239, 68, 68, 0.12)' : 'none'
                      }} className="queue-item-card">
                        {/* Rank indicator badge */}
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: isPendingScan ? '#fee2e2' : 'var(--color-border)',
                          color: isPendingScan ? '#ef4444' : 'var(--color-text-secondary)',
                          fontSize: '11px', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                          {idx + 1}
                        </div>
                        
                        {/* User Avatar Circle */}
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--color-primary-subtle), var(--color-surface))',
                          color: isPendingScan ? '#ef4444' : 'var(--color-primary)',
                          fontSize: '12px', fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: `1.5px solid ${isPendingScan ? '#ef4444' : lane.color}`,
                          flexShrink: 0
                        }}>
                          {getInitials(p.userName)}
                        </div>
                        
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: isPendingScan ? '#b91c1c' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <span>{p.userName}</span>
                            {p.sessionExpiresAt && <PlayerCountdown sessionExpiresAt={p.sessionExpiresAt} />}
                          </div>
                          <div style={{ fontSize: '10px', color: isPendingScan ? '#ef4444' : 'var(--color-text-disabled)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={10} />
                            <span>{isPendingScan ? '🔴 UNPAID - PENDING SCAN' : `Joined: ${joinedTime}`}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ))}
        </div>

        {/* MOBILE ONLY VIEW: Tabs system */}
        <div className="mobile-only-queue" style={{ display: 'none' }}>
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              {[
                { type: 'NOVICE', label: 'Novice', color: '#10b981', items: noviceQueue },
                { type: 'INTERMEDIATE', label: 'Inter.', color: '#f59e0b', items: intermediateQueue },
                { type: 'ADVANCED', label: 'Advance', color: '#6366f1', items: advancedQueue }
              ].map(tab => {
                const isActive = activeQueueTab === tab.type
                return (
                  <button
                    key={tab.type}
                    type="button"
                    onClick={() => setActiveQueueTab(tab.type as any)}
                    style={{
                      padding: '12px 6px',
                      border: 'none',
                      background: isActive ? 'var(--color-card)' : 'transparent',
                      color: isActive ? tab.color : 'var(--color-text-secondary)',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      borderBottom: isActive ? `3.5px solid ${tab.color}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{ 
                      fontSize: '9px', 
                      background: isActive ? tab.color : 'var(--color-border)', 
                      color: isActive ? 'white' : 'var(--color-text-secondary)', 
                      padding: '1px 6px', 
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700
                    }}>
                      {tab.items.length}
                    </span>
                  </button>
                )
              })}
            </div>

            <div style={{ 
              padding: '12px', 
              maxHeight: '400px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px'
            }}>
              {(() => {
                const activeLane = [
                  { type: 'NOVICE', color: '#10b981', items: noviceQueue },
                  { type: 'INTERMEDIATE', color: '#f59e0b', items: intermediateQueue },
                  { type: 'ADVANCED', color: '#6366f1', items: advancedQueue }
                ].find(l => l.type === activeQueueTab)!

                if (activeLane.items.length === 0) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 80, gap: '6px' }}>
                      <Users size={18} color="var(--color-text-disabled)" />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-disabled)' }}>Queue is empty</span>
                    </div>
                  )
                }

                return activeLane.items.map((p, idx) => {
                  const joinedTime = new Date(p.joinedAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })
                  const limitTime = p.sessionExpiresAt ? new Date(p.sessionExpiresAt).getTime() : 0
                  const isLowTime = p.sessionExpiresAt && (limitTime - Date.now() < 45 * 60 * 1000)
                  const isPendingScan = p.status === 'PENDING'

                  return (
                    <div key={p.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      background: isPendingScan ? '#fef2f2' : isLowTime ? 'var(--color-danger-subtle)' : 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${isPendingScan ? '#ef4444' : isLowTime ? 'var(--color-danger)' : 'var(--color-border)'}`,
                      boxShadow: (isPendingScan || isLowTime) ? '0 0 8px rgba(239, 68, 68, 0.12)' : 'none'
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: isPendingScan ? '#fee2e2' : 'var(--color-border)',
                        color: isPendingScan ? '#ef4444' : 'var(--color-text-secondary)',
                        fontSize: '11px', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary-subtle), var(--color-surface))',
                        color: isPendingScan ? '#ef4444' : 'var(--color-primary)',
                        fontSize: '12px', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${isPendingScan ? '#ef4444' : activeLane.color}`,
                        flexShrink: 0
                      }}>
                        {getInitials(p.userName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: isPendingScan ? '#b91c1c' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span>{p.userName}</span>
                          {p.sessionExpiresAt && <PlayerCountdown sessionExpiresAt={p.sessionExpiresAt} />}
                        </div>
                        <div style={{ fontSize: '10px', color: isPendingScan ? '#ef4444' : 'var(--color-text-disabled)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={10} />
                          <span>{isPendingScan ? '🔴 UNPAID - PENDING SCAN' : `Joined: ${joinedTime}`}</span>
                        </div>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .court-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .court-card-title {
            font-size: 11px !important;
          }
          .court-card-badge {
            font-size: 7px !important;
            padding: 1px 4px !important;
          }
          .court-card-timer {
            font-size: 9px !important;
          }
          .court-card-player-item {
            padding: 4px 6px !important;
            gap: 6px !important;
          }
          .court-card-player-avatar {
            width: 20px !important;
            height: 20px !important;
            font-size: 9px !important;
          }
          .court-card-player-name {
            font-size: 11px !important;
          }
          .desktop-only-queue {
            display: none !important;
          }
          .mobile-only-queue {
            display: block !important;
          }
          .join-queue-panel {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
            padding: 16px !important;
          }
          .join-queue-label {
            font-size: 13px !important;
            text-align: center !important;
          }
          .join-queue-levels {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 6px !important;
            width: 100% !important;
          }
          .join-queue-btn {
            padding: 8px 4px !important;
            font-size: 11.5px !important;
            text-align: center !important;
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .enter-queue-submit-btn {
            width: 100% !important;
            height: 40px !important;
            margin-top: 4px !important;
            justify-content: center !important;
          }
        }
      `}</style>
      </div>
      {/* ── LEAVE QUEUE CONFIRMATION MINI MODAL ── */}
      {isLeaveModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.40)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'var(--color-card)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              Leave the Queue?
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Are you sure you want to leave the play queue? You will lose your current position in line.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                style={{
                  flex: 1, height: '38px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', background: 'var(--color-card)',
                  color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLeaveConfirm}
                style={{
                  flex: 1.2, height: '38px', borderRadius: 'var(--radius-md)', border: 'none',
                  background: 'var(--color-danger)', color: 'white',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                Proceed (Leave)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
