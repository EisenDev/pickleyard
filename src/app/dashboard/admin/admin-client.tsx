'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  scanCheckinAction,
  forceEnterQueueAction,
  removePlayerFromQueueAction,
  assignMatchToCourtAction,
  startMatchTimerAction,
  endMatchEarlyAction,
  checkAndRotateExpiredMatchesAction,
  creditUserCashAction,
  recordMatchResultAction,
  getLatestUserCreditsAction,
  getBookingDetailsForScanAction,
  adminConfirmBookingCheckinAction
} from '@/lib/actions/admin'
import { Users, Clock, ShieldCheck, ShieldAlert, X, Search, UserCheck, Play, Award, Zap, Power, Volume2, QrCode, Trash2, Camera, AlertTriangle, Calendar, RefreshCw, DollarSign, Star, Trophy } from 'lucide-react'

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
  qrId: string | null
  user?: UserListItem
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

interface BookingLedgerItem {
  id: string
  courtName: string
  startTime: string
  endTime: string
  status: string
  price: number
  userName: string
  userEmail: string
}

interface Props {
  courts: Court[]
  stacks: StackEntry[]
  users: UserListItem[]
  bookings: Booking[]
  bookingLedger: BookingLedgerItem[]
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

export function AdminClient({ courts: initialCourts, stacks: initialStacks, users, bookings, bookingLedger, expiryHours, opStartHour, opEndHour }: Props) {
  const [courts, setCourts] = useState<Court[]>(initialCourts)
  const [stacks, setStacks] = useState<StackEntry[]>(initialStacks)
  const [isPending, setIsPending] = useState(false)
  const [activeLoadingId, setActiveLoadingId] = useState<string | null>(null)
  const router = useRouter()

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
  const [liveCredits, setLiveCredits] = useState<number | null>(null)

  // ── Record Winner Modal State ─────────────────────────────────────────────
  const [recordWinnerModal, setRecordWinnerModal] = useState<{
    courtId: string
    courtNumber: number
    players: StackEntry[]
  } | null>(null)
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]) // userId array, max 2
  const [confirmRecord, setConfirmRecord] = useState(false)

  const showNotice = (success: boolean, text: string) => {
    setKioskNotice({ success, text })
    setTimeout(() => setKioskNotice(null), 5000)
  }
  
  // Lobby Queue Filter
  const [skillFilter, setSkillFilter] = useState<'ALL' | 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPIRED'>('ALL')
  
  // Manual scan text field
  const [scanText, setScanText] = useState('')
  const [overrideCashAmount, setOverrideCashAmount] = useState('')
  
  // Booking scan details state
  const [scannedBooking, setScannedBooking] = useState<{
    id: string
    courtId: string
    courtName: string
    courtNumber: number
    startTime: string
    endTime: string
    status: string
    price: number
    userId: string
    userName: string
    userEmail: string
  } | null>(null)
  const [isBookingLoading, setIsBookingLoading] = useState(false)

  useEffect(() => {
    if (scanText.trim().startsWith('CASH-TOPUP:')) {
      const decoded = decodeURIComponent(scanText.trim())
      const amountMatch = decoded.match(/amount=([^&]+)/)
      if (amountMatch) {
        setOverrideCashAmount(amountMatch[1])
      }
      setScannedBooking(null)
    } else if (scanText.trim().startsWith('BOOKING-PASS:')) {
      setOverrideCashAmount('')
      const decoded = decodeURIComponent(scanText.trim())
      const bookingIdMatch = decoded.match(/bookingId=([^&]+)/)
      const parsedBookingId = bookingIdMatch ? bookingIdMatch[1] : null
      
      if (parsedBookingId) {
        setIsBookingLoading(true)
        setAdminMessage(null)
        getBookingDetailsForScanAction(parsedBookingId).then(res => {
          setIsBookingLoading(false)
          if (res.success && res.booking) {
            setScannedBooking(res.booking)
          } else {
            setScannedBooking(null)
            setAdminMessage({ success: false, text: res.error || 'Failed to resolve booking details.' })
          }
        })
      } else {
        setScannedBooking(null)
      }
    } else {
      setOverrideCashAmount('')
      setScannedBooking(null)
    }
    setAdminMessage(null)
  }, [scanText])

  // State to force re-render client countdown calculations every second
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTicks(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Real QR Camera Scanner Lifecycle
  useEffect(() => {
    if (!isScannerOpen) return

    let html5QrcodeScanner: any = null

    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      const container = document.getElementById('qr-reader')
      if (container) {
        container.innerHTML = ''
      }

      html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 24, 
          qrbox: (width: number, height: number) => {
            const minEdge = Math.min(width, height);
            const size = Math.floor(minEdge * 0.7);
            return { width: size, height: size };
          },
          aspectRatio: 1.0
        },
        /* verbose= */ false
      )

      html5QrcodeScanner.render(
        (decodedText: string) => {
          setScanText(decodedText)
          
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const osc = audioCtx.createOscillator()
            const gain = audioCtx.createGain()
            osc.connect(gain)
            gain.connect(audioCtx.destination)
            osc.frequency.setValueAtTime(880, audioCtx.currentTime)
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
            osc.start()
            osc.stop(audioCtx.currentTime + 0.08)
          } catch (e) {}
        },
        () => {}
      )
    }).catch(console.error)

    return () => {
      if (html5QrcodeScanner) {
        html5QrcodeScanner.clear().catch(console.error)
      }
    }
  }, [isScannerOpen])

  // Auto trigger check-in rotation & session expiry check periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      await checkAndRotateExpiredMatchesAction()
    }, 30000) // Every 30s instead of 5s to reduce DB load
    return () => clearInterval(interval)
  }, [])

  // ── Real-Time Polling ─────────────────────────────────────────────────────
  // Pause polling whenever a modal is open or an action is executing so that
  // mid-click DOM re-renders never swallow the user's button presses.
  useEffect(() => {
    if (activeLoadingId || isCheckinModalOpen || isScannerOpen || !!assigningMatch || !!recordWinnerModal) {
      return // no interval started – no cleanup needed
    }
    fetchRealtimeData()
    const interval = setInterval(fetchRealtimeData, 2000)
    return () => clearInterval(interval)
  }, [activeLoadingId, isCheckinModalOpen, isScannerOpen, assigningMatch, recordWinnerModal])

  // Find currently matched scan user for either cash top-up or regular check-in
  const getActiveScanUser = () => {
    const text = scanText.trim()
    if (!text) return null

    if (text.startsWith('CASH-TOPUP:')) {
      const decoded = decodeURIComponent(text)
      const userIdMatch = decoded.match(/userId=([^&]+)/)
      const parsedUserId = userIdMatch ? userIdMatch[1] : null
      return users.find(u => u.id === parsedUserId) || null
    }

    const activeQueueEntry = stacks.find(s => 
      s.qrId?.toLowerCase() === text.toLowerCase() && 
      ['PENDING', 'WAITING', 'PLAYING', 'MATCHED'].includes(s.status)
    )
    return activeQueueEntry 
      ? users.find(u => u.id === activeQueueEntry.userId) || null
      : null
  }
  const activeScanUser = getActiveScanUser()

  // ── Live Balance Polling for Selected User (scan/checkin modal) ─────────────
  // Fetches the player's latest credit balance every 3s while either modal is open.
  // This prevents check-in on a stale 0-balance that was actually topped up.
  useEffect(() => {
    const targetUser = selectedUser || activeScanUser
    if (!targetUser || (!isCheckinModalOpen && !isScannerOpen)) {
      setLiveCredits(null)
      return
    }
    const fetchBalance = async () => {
      try {
        const res = await fetch(`/api/realtime?type=user_balance&userId=${targetUser.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) setLiveCredits(data.credits)
        }
      } catch (e) {
        // silently fail — fallback to props credits
      }
    }
    fetchBalance()
    const interval = setInterval(fetchBalance, 3000)
    return () => clearInterval(interval)
  }, [selectedUser, activeScanUser, isCheckinModalOpen, isScannerOpen])

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

    // Fetch latest credits in background
    getLatestUserCreditsAction(user.id).then(res => {
      if (res.success && res.credits !== undefined) {
        setSelectedUser(prev => prev && prev.id === user.id ? { ...prev, credits: res.credits! } : prev)
      }
    })
  }

  const handleChargeCheckin = async () => {
    if (!selectedUser || activeLoadingId) return
    setActiveLoadingId('checkin')
    setIsPending(true)
    const res = await scanCheckinAction(selectedUser.id, modalSkillLevel)
    setIsPending(false)
    setActiveLoadingId(null)
    if (res.success) {
      setAdminMessage({ success: true, text: 'Member checked in successfully. ₱150 fee debited!' })
      fetchRealtimeData()
      setTimeout(() => { setIsCheckinModalOpen(false); setIsScannerOpen(false); setScanText('') }, 1200)
    } else {
      setAdminMessage({ success: false, text: res.error || 'Check-in failed.' })
    }
  }

  const handleForceQueue = async () => {
    if (!selectedUser || activeLoadingId) return
    setActiveLoadingId('forcequeue')
    setIsPending(true)
    const res = await forceEnterQueueAction(selectedUser.id, modalSkillLevel)
    setIsPending(false)
    setActiveLoadingId(null)
    if (res.success) {
      setAdminMessage({ success: true, text: 'Member entered queue manually (No charge).' })
      fetchRealtimeData()
      setTimeout(() => { setIsCheckinModalOpen(false); setIsScannerOpen(false); setScanText('') }, 1200)
    } else {
      setAdminMessage({ success: false, text: res.error || 'Operation failed.' })
    }
  }

  const handleRemoveQueue = async (userId: string) => {
    if (activeLoadingId) return
    setActiveLoadingId('remove-' + userId)
    setIsPending(true)
    const res = await removePlayerFromQueueAction(userId)
    setIsPending(false)
    setActiveLoadingId(null)
    if (res.success) {
      showNotice(true, 'Member successfully removed from the active queue.')
      fetchRealtimeData()
      setIsCheckinModalOpen(false)
    } else {
      setAdminMessage({ success: false, text: res.error || 'Failed to remove player.' })
    }
  }

  const handleStartMatch = async (courtId: string, level: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED') => {
    if (activeLoadingId) return
    setActiveLoadingId('startmatch-' + courtId)
    setIsPending(true)
    const res = await assignMatchToCourtAction(courtId, level)
    setIsPending(false)
    setActiveLoadingId(null)
    if (res.success) {
      showNotice(true, 'Successfully assigned matched players to Court.')
      fetchRealtimeData()
    } else {
      showNotice(false, res.error || 'Failed to assign match.')
    }
  }

  const handleManualAssign = async (courtId: string) => {
    if (!assigningMatch || activeLoadingId) return
    setActiveLoadingId('assign-' + courtId)
    setIsPending(true)
    const res = await assignMatchToCourtAction(courtId, assigningMatch.skillLevel)
    setIsPending(false)
    setActiveLoadingId(null)
    if (res.success) {
      setAssigningMatch(null)
      showNotice(true, 'Successfully assigned matched players to Court.')
      fetchRealtimeData()
    } else {
      showNotice(false, res.error || 'Failed to assign match.')
    }
  }

  const handleStartTimer = async (courtId: string) => {
    if (activeLoadingId) return
    setActiveLoadingId('timer-' + courtId)
    setIsPending(true)
    const res = await startMatchTimerAction(courtId)
    setIsPending(false)
    setActiveLoadingId(null)
    if (res.success) {
      showNotice(true, 'Match timer started!')
      fetchRealtimeData()
    } else {
      showNotice(false, res.error || 'Failed to start timer.')
    }
  }

  const handleEndMatch = async (courtId: string) => {
    if (activeLoadingId) return
    setActiveLoadingId('end-' + courtId)
    setIsPending(true)
    const res = await endMatchEarlyAction(courtId)
    setIsPending(false)
    setActiveLoadingId(null)
    if (res.success) {
      showNotice(true, 'Match ended early. Players rotated back to queue.')
      fetchRealtimeData()
    } else {
      showNotice(false, res.error || 'Failed to end match.')
    }
  }

  const handleOpenRecordWinner = (courtId: string, courtNumber: number) => {
    const players = stacks.filter(s => s.courtId === courtId && (s.status === 'PLAYING' || s.status === 'MATCHED'))
    setRecordWinnerModal({ courtId, courtNumber, players })
    setSelectedWinners([])
    setConfirmRecord(false)
  }

  const toggleWinnerSelection = (userId: string) => {
    setSelectedWinners(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId)
      if (prev.length >= 2) return prev
      return [...prev, userId]
    })
  }

  const handleConfirmRecordWinner = async () => {
    if (!recordWinnerModal || selectedWinners.length !== 2 || activeLoadingId) return
    setActiveLoadingId('recordwinner-' + recordWinnerModal.courtId)
    setIsPending(true)
    try {
      const res = await recordMatchResultAction(recordWinnerModal.courtId, selectedWinners)
      if (res.success) {
        setRecordWinnerModal(null)
        setConfirmRecord(false)
        showNotice(true, `✅ Match result recorded! Yard Points awarded to all players.`)
        await fetchRealtimeData()
      } else {
        showNotice(false, res.error || 'Failed to record result.')
        setRecordWinnerModal(null)
      }
    } catch (err: any) {
      console.error('Error recording match result:', err)
      showNotice(false, err.message || 'An unexpected error occurred.')
      setRecordWinnerModal(null)
    } finally {
      setIsPending(false)
      setActiveLoadingId(null)
      setConfirmRecord(false)
    }
  }

// Real-Time Court Game Timer (defined OUTSIDE AdminClient so it's stable across re-renders)
function ActiveTimer({ startTime, duration }: { startTime: Date | string; duration: number }) {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
    return Math.max(0, duration - elapsed)
  })

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000)
      setTimeLeft(Math.max(0, duration - elapsed))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [startTime, duration])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`
  const isExpired = timeLeft === 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', fontWeight: 800,
      color: isExpired ? 'var(--color-danger)' : timeLeft < 120 ? 'var(--color-danger)' : 'var(--color-primary)'
    }}>
      <Clock size={15} />
      <span>{isExpired ? "TIME'S UP" : timeStr}</span>
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
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              Staff Kiosk Control Panel
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: '2px 8px', borderRadius: '999px', letterSpacing: '0.04em' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'liveBlip 1.4s ease-in-out infinite' }} />
                LIVE
              </span>
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: 4, margin: '4px 0 0' }}>
              Check in lobby players, scan QR passes, and oversee the automated 2v2 court rotation. Auto-refreshes every 3s.
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
            <span>Scan Kiosk QR</span>
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

                // Compute timer expiry from DB data (not from client-side state)
                // This prevents "Record Winner" from showing while timer still runs
                const isTimerExpired = isOccupied && court.gameStartedAt != null && (() => {
                  const elapsed = Math.floor((Date.now() - new Date(court.gameStartedAt!).getTime()) / 1000)
                  return elapsed >= court.gameDurationSecond
                })()

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
                            ) : isTimerExpired ? (
                              // Timer expired → show Record Winner (ONLY when timer has truly expired per DB data)
                              <button
                                onClick={() => handleOpenRecordWinner(court.id, court.number)}
                                disabled={isPending}
                                style={{
                                  width: '100%', height: '40px', border: 'none', borderRadius: 'var(--radius-md)',
                                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                  color: 'white',
                                  fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                  marginTop: '8px', boxShadow: '0 0 12px rgba(245,158,11,0.5)',
                                  animation: 'pulse-danger 1.5s infinite alternate'
                                }}
                              >
                                <Trophy size={15} />
                                Record Winner & Award Points
                              </button>
                            ) : (
                              // Game still running → show Force End button only
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

        {/* Booking History Ledger (Failed/Late vs. Success Bookings) */}
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: '12px'
        }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--color-primary)" />
              Court Booking Check-In Ledger (Past 48 Hours)
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
              Reference ledger for cashier collections, no-show court releases, and payment confirmations.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Player</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Court</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Schedule</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Fee Due</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '10px 8px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookingLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--color-text-disabled)' }}>
                      No court reservations recorded in the past 48 hours.
                    </td>
                  </tr>
                ) : (
                  bookingLedger.map(b => {
                    const isPending = b.status === 'PENDING'
                    const isPaid = b.status === 'PAID'
                    const isReserved = b.status === 'RESERVED'
                    const isExpired = b.status === 'EXPIRED'
                    const isCancelled = b.status === 'CANCELLED'

                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ fontWeight: 700 }}>{b.userName}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{b.userEmail}</div>
                        </td>
                        <td style={{ padding: '10px 8px', fontWeight: 650 }}>{b.courtName}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <div>{new Date(b.startTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                            {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} - {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', fontWeight: 700 }}>₱{b.price.toFixed(2)}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                            background: isReserved ? 'var(--color-info-subtle)' : isPaid ? 'var(--color-success-subtle)' : isPending ? 'var(--color-warning-subtle)' : 'var(--color-danger-subtle)',
                            color: isReserved ? 'var(--color-info)' : isPaid ? 'var(--color-success)' : isPending ? 'var(--color-warning)' : 'var(--color-danger)',
                            textTransform: 'uppercase'
                          }}>
                            {isPending ? 'Cash Due' : isReserved ? 'Checked In' : isPaid ? 'Paid' : isExpired ? 'Expired (Late)' : b.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          {isPending && (
                            <button
                              onClick={async () => {
                                if (confirm(`Collect ₱${b.price.toFixed(2)} cash from ${b.userName} and check in?`)) {
                                  const res = await adminConfirmBookingCheckinAction(b.id)
                                  if (res.success) {
                                    alert('Booking check-in successful!')
                                    router.refresh()
                                  } else {
                                    alert(res.error || 'Failed to check in.')
                                  }
                                }
                              }}
                              style={{
                                padding: '4px 10px', background: 'var(--color-accent)', border: 'none', borderRadius: 'var(--radius-sm)',
                                color: 'white', fontWeight: 700, fontSize: '10px', cursor: 'pointer'
                              }}
                            >
                              Collect Cash & Check In
                            </button>
                          )}
                          {isPaid && (
                            <button
                              onClick={async () => {
                                const res = await adminConfirmBookingCheckinAction(b.id)
                                if (res.success) {
                                  alert('Check-in confirmed!')
                                  router.refresh()
                                } else {
                                  alert(res.error || 'Failed to check in.')
                                }
                              }}
                              style={{
                                padding: '4px 10px', background: 'var(--color-primary)', border: 'none', borderRadius: 'var(--radius-sm)',
                                color: 'white', fontWeight: 700, fontSize: '10px', cursor: 'pointer'
                              }}
                            >
                              Check In Player
                            </button>
                          )}
                          {(isExpired || isCancelled) && (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-disabled)', fontStyle: 'italic' }}>
                              {isExpired ? 'No Show Penalty' : 'Cancelled'}
                            </span>
                          )}
                          {isReserved && (
                            <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 650 }}>
                              Active Play
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
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
            maxHeight: '90vh',
            overflowY: 'auto',
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
                Scan Member / Cash QR Code
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                Hold the player's mobile pass QR code in front of the kiosk scanner.
              </p>
            </div>

            {/* Real Camera QR Scanner Frame */}
            <div style={{
              width: '100%',
              maxWidth: '280px',
              margin: '0 auto',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              background: '#000',
              border: '1px solid var(--color-border)'
            }}>
              <div id="qr-reader" style={{ width: '100%', border: 'none' }} />
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
                />
              </div>

              {scanText.trim() && (() => {
                const isCashQr = scanText.trim().startsWith('CASH-TOPUP:')
                const isBookingQr = scanText.trim().startsWith('BOOKING-PASS:')
                
                if (isBookingQr) {
                  if (isBookingLoading) {
                    return (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '13px' }}>
                        <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px', display: 'block' }} />
                        <span>Fetching booking details...</span>
                      </div>
                    )
                  }

                  if (!scannedBooking) {
                    return (
                      <div style={{
                        padding: '12px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.03)',
                        border: '1.5px dashed #fecaca', borderRadius: 'var(--radius-lg)',
                        fontSize: '12px', color: 'var(--color-danger)', fontWeight: 650, marginTop: '4px'
                      }}>
                        {adminMessage?.text || 'No matching reservation booking found.'}
                      </div>
                    )
                  }

                  const isPending = scannedBooking.status === 'PENDING'
                  const isPaid = scannedBooking.status === 'PAID'
                  const isReserved = scannedBooking.status === 'RESERVED'

                  return (
                    <div style={{ marginTop: '4px' }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '12px',
                        background: isPending ? 'rgba(245, 158, 11, 0.03)' : 'rgba(0, 124, 128, 0.03)',
                        border: `1.5px solid ${isPending ? 'rgba(245, 158, 11, 0.3)' : 'rgba(0, 124, 128, 0.3)'}`,
                        borderRadius: 'var(--radius-lg)', padding: '14px',
                        textAlign: 'left'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                              🎟️ Reservation Check-in
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '2px' }}>
                              Player: {scannedBooking.userName}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              {scannedBooking.userEmail}
                            </span>
                          </div>
                          <span style={{
                            fontSize: '9px', fontWeight: 800, padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: isPending ? 'var(--color-warning-subtle)' : isPaid ? 'var(--color-success-subtle)' : 'var(--color-primary-subtle)',
                            color: isPending ? 'var(--color-warning)' : isPaid ? 'var(--color-success)' : 'var(--color-primary)',
                            textTransform: 'uppercase'
                          }}>
                            {isPending ? 'Pay cash' : isPaid ? 'Paid' : 'Checked In'}
                          </span>
                        </div>

                        <div style={{ background: 'var(--color-surface)', padding: '10px 12px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          <div>Court: <strong style={{ color: 'var(--color-text-primary)' }}>{scannedBooking.courtName}</strong></div>
                          <div>Play Time: <strong style={{ color: 'var(--color-text-primary)' }}>
                            {new Date(scannedBooking.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} – {new Date(scannedBooking.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                          </strong></div>
                          <div>Fee Total: <strong style={{ color: 'var(--color-primary)' }}>₱{scannedBooking.price.toFixed(2)}</strong></div>
                        </div>

                        {isPending && (
                          <div style={{
                            padding: '10px',
                            background: 'rgba(245, 158, 11, 0.05)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            fontSize: '11px',
                            color: 'var(--color-warning)',
                            fontWeight: 600
                          }}>
                            👉 Collection required: Collect <strong>₱{scannedBooking.price.toFixed(2)} cash</strong> at counter before confirming.
                          </div>
                        )}

                        {adminMessage && (
                          <div style={{
                            padding: '8px 10px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600,
                            background: adminMessage.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
                            color: adminMessage.success ? 'var(--color-success)' : 'var(--color-danger)',
                            border: `1px solid ${adminMessage.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                          }}>
                            {adminMessage.text}
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={isPending ? false : isReserved}
                          onClick={async () => {
                            if (activeLoadingId) return
                            setActiveLoadingId('bookingcheckin')
                            setIsPending(true)
                            const res = await adminConfirmBookingCheckinAction(scannedBooking.id)
                            setIsPending(false)
                            setActiveLoadingId(null)
                            if (res.success) {
                              setAdminMessage({ success: true, text: isPending ? 'Payment confirmed & checked in successfully!' : 'Check-in confirmed!' })
                              setTimeout(() => { setIsScannerOpen(false); setScanText('') }, 1500)
                            } else {
                              setAdminMessage({ success: false, text: res.error || 'Failed to check in.' })
                            }
                          }}
                          style={{
                            width: '100%', height: '36px', background: isPending ? 'var(--color-accent)' : 'var(--color-primary)',
                            color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
                            fontSize: '12px', fontWeight: 800, cursor: isReserved ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            boxShadow: 'var(--shadow-sm)', transition: 'background var(--duration-fast)',
                            opacity: isReserved ? 0.6 : 1
                          }}
                        >
                          <UserCheck size={14} />
                          <span>
                            {activeLoadingId === 'bookingcheckin'
                              ? 'Processing...' 
                              : isPending 
                                ? 'Confirm Cash Payment & Check In' 
                                : isReserved 
                                  ? 'Checked In' 
                                  : 'Confirm Arrival & Check In'}
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                }

                if (isCashQr) {
                  const decoded = decodeURIComponent(scanText.trim())
                  const userIdMatch = decoded.match(/userId=([^&]+)/)
                  const parsedUserId = userIdMatch ? userIdMatch[1] : null
                  const matchedScanUser = users.find(u => u.id === parsedUserId)

                  if (!matchedScanUser) {
                    return (
                      <div style={{
                        padding: '12px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.03)',
                        border: '1.5px dashed #fecaca', borderRadius: 'var(--radius-lg)',
                        fontSize: '12px', color: 'var(--color-danger)', fontWeight: 650, marginTop: '4px'
                      }}>
                        No member found matching QR Cash Top-Up request.
                      </div>
                    )
                  }

                  const parsedAmt = parseFloat(overrideCashAmount) || 0

                  return (
                    <div style={{ marginTop: '4px' }}>
                      <div style={{
                        display: 'flex', flexDirection: 'column', gap: '12px',
                        background: 'rgba(244, 124, 0, 0.03)', border: '1.5px solid rgba(244, 124, 0, 0.3)',
                        borderRadius: 'var(--radius-lg)', padding: '14px',
                        textAlign: 'left'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                              💵 Cash Top-Up: {matchedScanUser.name}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                              {matchedScanUser.email}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          <div>Current Balance: <strong>₱{(liveCredits ?? matchedScanUser.credits).toFixed(2)}{liveCredits !== null ? ' ●' : ''}</strong></div>
                          <div>New Balance: <strong style={{ color: 'var(--color-success)' }}>₱{((liveCredits ?? matchedScanUser.credits) + parsedAmt).toFixed(2)}</strong></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                          <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Confirm Cash Received (₱):</label>
                          <input
                            type="number"
                            value={overrideCashAmount}
                            onChange={e => setOverrideCashAmount(e.target.value)}
                            style={{
                              width: '100%', height: '34px', padding: '0 10px',
                              borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                              background: 'var(--color-card)', color: 'var(--color-text-primary)',
                              fontSize: '13px', fontWeight: 700, outline: 'none', boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        {adminMessage && (
                          <div style={{
                            padding: '8px 10px', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600,
                            background: adminMessage.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
                            color: adminMessage.success ? 'var(--color-success)' : 'var(--color-danger)',
                            border: `1px solid ${adminMessage.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                          }}>
                            {adminMessage.text}
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={isPending || parsedAmt <= 0}
                          onClick={async () => {
                            if (activeLoadingId) return
                            setActiveLoadingId('cashcredit')
                            setIsPending(true)
                            const res = await creditUserCashAction(matchedScanUser.id, parsedAmt)
                            setIsPending(false)
                            setActiveLoadingId(null)
                            if (res.success) {
                              setAdminMessage({ success: true, text: `Successfully credited ₱${parsedAmt.toFixed(2)} cash to ${matchedScanUser.name}!` })
                              setTimeout(() => { setIsScannerOpen(false); setScanText('') }, 1500)
                            } else {
                              setAdminMessage({ success: false, text: res.error || 'Failed to credit cash.' })
                            }
                          }}
                          style={{
                            width: '100%', height: '36px', background: 'var(--color-primary)',
                            color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
                            fontSize: '12px', fontWeight: 800, cursor: (isPending || parsedAmt <= 0) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            boxShadow: 'var(--shadow-sm)', transition: 'background var(--duration-fast)',
                            opacity: (isPending || parsedAmt <= 0) ? 0.6 : 1
                          }}
                        >
                          <DollarSign size={14} />
                          <span>{isPending ? 'Processing...' : 'Confirm Cash Received & Credit'}</span>
                        </button>
                      </div>
                    </div>
                  )
                }

                const activeQueueEntry = stacks.find(s => 
                  s.qrId?.toLowerCase() === scanText.trim().toLowerCase() && 
                  ['PENDING', 'WAITING', 'PLAYING', 'MATCHED'].includes(s.status)
                )
                const matchedScanUser = activeQueueEntry 
                  ? (activeQueueEntry.user || users.find(u => u.id === activeQueueEntry.userId))
                  : null

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
                          <div>Balance: <strong style={{ color: (liveCredits ?? matchedScanUser.credits) >= 150 ? 'var(--color-success)' : 'var(--color-danger)' }}>₱{(liveCredits ?? matchedScanUser.credits).toFixed(2)}{liveCredits !== null ? ' ●' : ''}</strong></div>
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
                <span style={{ fontSize: '13px', fontWeight: 800, color: (liveCredits ?? selectedUser.credits) < 150 ? 'var(--color-danger)' : 'var(--color-primary)' }}>
                  ₱{(liveCredits ?? selectedUser.credits).toFixed(2)}{liveCredits !== null ? ' ●' : ''}
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
                  disabled={isPending || (liveCredits ?? selectedUser.credits) < 150}
                  onClick={handleChargeCheckin}
                  style={{
                    flex: 1.5, height: '40px', borderRadius: 'var(--radius-md)', border: 'none',
                    background: 'var(--color-success)', color: 'white',
                    fontSize: '13px', fontWeight: 700, cursor: (isPending || (liveCredits ?? selectedUser.credits) < 150) ? 'not-allowed' : 'pointer',
                    opacity: (isPending || (liveCredits ?? selectedUser.credits) < 150) ? 0.6 : 1,
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

      {/* ── Record Winner Modal ─────────────────────────────────────────────── */}
      {recordWinnerModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--color-card)', borderRadius: 'var(--radius-xl)', padding: '28px',
            width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            border: '1.5px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '20px'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Trophy size={20} color="#f59e0b" />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                    Record Match Result
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                  Court {recordWinnerModal.courtNumber} — Select the 2 winners. All 4 players earn Yard Points.
                </p>
              </div>
              <button onClick={() => { setRecordWinnerModal(null); setConfirmRecord(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Player Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase', margin: 0 }}>
                Select 2 Winners ({selectedWinners.length}/2 selected)
              </p>
              {recordWinnerModal.players.map((player) => {
                const isSelected = selectedWinners.includes(player.userId)
                const isDisabled = !isSelected && selectedWinners.length >= 2
                const skillColors: Record<string, string> = { NOVICE: '#10b981', INTERMEDIATE: '#f59e0b', ADVANCED: '#6366f1' }
                const skillColor = skillColors[player.skillLevel] || '#6366f1'
                
                let totalYP = 35
                if (player.skillLevel === 'ADVANCED') {
                  totalYP = isSelected ? 65 : 10
                } else if (player.skillLevel === 'INTERMEDIATE') {
                  totalYP = isSelected ? 50 : 8
                } else {
                  totalYP = isSelected ? 35 : 5
                }

                return (
                  <button
                    key={player.userId}
                    onClick={() => toggleWinnerSelection(player.userId)}
                    disabled={isDisabled}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px', borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isSelected ? '#f59e0b' : isDisabled ? 'var(--color-border)' : 'var(--color-border)'}`,
                      background: isSelected ? 'rgba(245,158,11,0.08)' : isDisabled ? 'var(--color-surface)' : 'var(--color-surface)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1,
                      textAlign: 'left', width: '100%', transition: 'all 120ms'
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', background: isSelected ? '#f59e0b' : 'var(--color-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 120ms'
                    }}>
                      {isSelected ? <Trophy size={16} color="white" /> : <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-secondary)' }}>P</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{player.userName}</div>
                      <div style={{ fontSize: '11px', color: skillColor, fontWeight: 600 }}>{player.skillLevel}</div>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: isSelected ? '#f59e0b' : 'var(--color-text-secondary)', textAlign: 'right' }}>
                      <div>+{totalYP} YP</div>
                      {isSelected && <div style={{ fontSize: '10px', color: '#10b981' }}>WINNER</div>}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* YP Summary */}
            {selectedWinners.length === 2 && !confirmRecord && (
              <div style={{ background: 'var(--color-success-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', border: '1px solid #bbf7d0' }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--color-success)' }}>
                  ✅ Ready to record. Winners get full points, losers get 15% participation YP.
                </p>
              </div>
            )}

            {/* Confirmation Step */}
            {!confirmRecord ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setRecordWinnerModal(null); setConfirmRecord(false) }}
                  style={{ flex: 1, height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => setConfirmRecord(true)}
                  disabled={selectedWinners.length !== 2}
                  style={{
                    flex: 2, height: '40px', border: 'none', borderRadius: 'var(--radius-md)',
                    background: selectedWinners.length === 2 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--color-border)',
                    color: 'white', fontSize: '13px', fontWeight: 800, cursor: selectedWinners.length === 2 ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <Trophy size={15} />
                  Record & Remove Players
                </button>
              </div>
            ) : (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1.5px solid #f59e0b', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#92400e', textAlign: 'center' }}>
                  ⚠️ Confirm? This will record the result, award Yard Points to all 4 players, and move them back to the lobby queue.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setConfirmRecord(false)}
                    style={{ flex: 1, height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleConfirmRecordWinner}
                    disabled={isPending}
                    style={{
                      flex: 2, height: '40px', border: 'none', borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      color: 'white', fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      boxShadow: '0 4px 12px rgba(245,158,11,0.4)'
                    }}
                  >
                    {isPending ? 'Recording...' : '✅ Confirm & Award Points'}
                  </button>
                </div>
              </div>
            )}
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
        @keyframes liveBlip {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.75); }
        }
        @media (max-width: 900px) {
          .admin-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
    </>
  )
}
