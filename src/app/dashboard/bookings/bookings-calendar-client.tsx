'use client'

import { useState, useEffect, useTransition } from 'react'
import { createBookingAction, createBookingsAction } from '@/lib/actions/booking'
import { adminReserveCourtForOpenPlayAction } from '@/lib/actions/admin'
import { ShieldCheck, AlertTriangle, Calendar, List, Plus, Clock, MapPin, ChevronLeft, ChevronRight, ArrowLeft, X, Search, QrCode } from 'lucide-react'
import Link from 'next/link'

interface Court {
  id: string
  number: number
  name: string
  type: string
  status: string
}

interface BookingItem {
  id: string
  courtId: string
  courtNumber: number
  courtName: string
  startTime: Date
  endTime: Date
  status: string
  userName: string
  userEmail: string
  userRole: string
  isOwn: boolean
}

interface MyBooking {
  id: string
  courtId: string
  courtName: string
  startTime: Date
  endTime: Date
  status: string
  price: number
}

interface Props {
  courts: Court[]
  allBookings: BookingItem[]
  myBookings: MyBooking[]
  userBalance: number
  userId: string
  userRole: string
  startHour: number
  endHour: number
}

function formatHour(h: number) {
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${display}:00 ${suffix}`
}

function formatDateToYYYYMMDD(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function BookingsCalendarClient({ courts, allBookings, myBookings, userBalance, userId, userRole, startHour, endHour }: Props) {
  const HOURS = Array.from({ length: Math.max(1, endHour - startHour) }, (_, i) => i + startHour)
  const [activeTab, setActiveTab] = useState<'calendar' | 'list' | 'passes'>('calendar')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'credits' | 'cash'>('credits')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedCourt, setSelectedCourt] = useState<string>('all')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [bookingSearch, setBookingSearch] = useState('')
  
  // Real-time bookings state and polling
  const [bookings, setBookings] = useState<BookingItem[]>(allBookings)
  const [myBookingsList, setMyBookingsList] = useState<MyBooking[]>(myBookings)

  useEffect(() => {
    setBookings(allBookings)
  }, [allBookings])

  useEffect(() => {
    setMyBookingsList(myBookings)
  }, [myBookings])

  useEffect(() => {
    let active = true
    const fetchLatestBookings = async () => {
      try {
        const res = await fetch('/api/realtime?type=bookings')
        if (!res.ok) return
        const data = await res.json()
        if (data.success && data.bookings && active) {
          const mapped = data.bookings.map((b: any) => ({
            id: b.id,
            courtId: b.courtId,
            courtNumber: b.courtNumber,
            courtName: b.courtName,
            startTime: new Date(b.startTime),
            endTime: new Date(b.endTime),
            status: b.status,
            userName: b.userName,
            userEmail: b.userEmail,
            userRole: b.userRole,
            isOwn: b.userId === userId,
            price: b.price
          }))
          setBookings(mapped)

          // Sync status updates for myBookingsList state
          setMyBookingsList(prev => {
            return prev.map(oldBooking => {
              const latest = mapped.find((m: any) => m.id === oldBooking.id)
              if (latest) {
                return { ...oldBooking, status: latest.status }
              }
              return oldBooking
            })
          })
        }
      } catch (err) {
        console.error('Failed to poll real-time bookings:', err)
      }
    }

    fetchLatestBookings()
    const interval = setInterval(fetchLatestBookings, 3000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [userId])

  // Booking Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCourtId, setModalCourtId] = useState<string>('')
  const [modalCourtIds, setModalCourtIds] = useState<string[]>([]) // support multiple courts for admins
  const [modalDate, setModalDate] = useState<string>('')
  const [modalHours, setModalHours] = useState<number[]>([])

  const filteredCourts = selectedCourt === 'all' ? courts : courts.filter(c => c.id === selectedCourt)

  const getBookingsForCourtAndHour = (courtId: string, hour: number) => {
    return bookings.filter(b => {
      const d = selectedDate
      const slotHourStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0).getTime()
      const slotHourEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour + 1, 0, 0).getTime()
      
      const bStart = new Date(b.startTime).getTime()
      const bEnd = new Date(b.endTime).getTime()
      
      return (
        b.courtId === courtId &&
        bStart < slotHourEnd &&
        bEnd > slotHourStart &&
        b.status !== 'EXPIRED' &&
        b.status !== 'CANCELLED'
      )
    })
  }

  // Open modal for a specific grid cell click
  const handleOpenBookingModalForSlot = (courtId: string, hour: number) => {
    setModalCourtId(courtId)
    setModalCourtIds([courtId])
    setModalDate(formatDateToYYYYMMDD(selectedDate))
    setModalHours([hour])
    
    // Auto check balance
    const court = courts.find(c => c.id === courtId)
    const hourlyRate = court?.type === 'ROOFTOP' ? 300 : 250
    if (userBalance >= hourlyRate) {
      setSelectedPaymentMethod('credits')
    } else {
      setSelectedPaymentMethod('cash')
    }
    
    setIsModalOpen(true)
  }

  // Open modal generally from header button
  const handleOpenBookingModalGeneral = () => {
    const firstId = courts[0]?.id || ''
    setModalCourtId(firstId)
    setModalCourtIds([])
    setModalDate(formatDateToYYYYMMDD(selectedDate))
    setModalHours([])
    setSelectedPaymentMethod(userBalance >= 250 ? 'credits' : 'cash')
    setIsModalOpen(true)
  }

  // Check if a time slot is already booked on the selected court & date inside the modal
  const isSlotBookedInModal = (hour: number) => {
    if (!modalDate) return false
    const parsedDate = new Date(modalDate + 'T00:00:00')
    const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'
    const targetIds = isAdminOrStaff ? modalCourtIds : [modalCourtId]

    if (targetIds.length === 0) return false

    return bookings.some(b => {
      const bStart = new Date(b.startTime)
      return (
        targetIds.includes(b.courtId) &&
        bStart.getFullYear() === parsedDate.getFullYear() &&
        bStart.getMonth() === parsedDate.getMonth() &&
        bStart.getDate() === parsedDate.getDate() &&
        bStart.getHours() === hour
      )
    })
  }

  // Check if a time slot inside the modal is in the past
  const isSlotInPastInModal = (hour: number) => {
    if (!modalDate) return false
    const slotTime = new Date(modalDate + 'T00:00:00')
    slotTime.setHours(hour, 0, 0, 0)
    return slotTime < new Date()
  }

  // Re-check balance when modal settings change
  useEffect(() => {
    if (!isModalOpen) return
    const court = courts.find(c => c.id === modalCourtId)
    const hourlyRate = court?.type === 'ROOFTOP' ? 300 : 250
    const totalCost = hourlyRate * modalHours.length
    if (userBalance >= totalCost) {
      setSelectedPaymentMethod('credits')
    } else {
      setSelectedPaymentMethod('cash')
    }
  }, [modalHours.length, modalCourtId, isModalOpen, userBalance, courts])

  const toggleHourSelection = (hour: number) => {
    setModalHours(prev => {
      if (prev.includes(hour)) {
        return prev.filter(h => h !== hour)
      } else {
        return [...prev, hour].sort((a, b) => a - b)
      }
    })
  }

  const handleConfirmBooking = () => {
    const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'
    if (isAdminOrStaff) {
      if (modalCourtIds.length === 0 || modalHours.length === 0) return
    } else {
      if (!modalCourtId || modalHours.length === 0) return
    }

    const startTimesISO = modalHours.map(hour => {
      const slotTime = new Date(modalDate + 'T00:00:00')
      slotTime.setHours(hour, 0, 0, 0)
      return slotTime.toISOString()
    })

    const hasPastSlot = modalHours.some(hour => {
      const slotTime = new Date(modalDate + 'T00:00:00')
      slotTime.setHours(hour, 0, 0, 0)
      return slotTime < new Date()
    })

    if (hasPastSlot) {
      alert('Cannot book slots in the past.')
      return
    }

    setMessage(null)
    setIsModalOpen(false)
    startTransition(async () => {
      if (isAdminOrStaff) {
        // Admin Open Play Block Reservation (Free ₱0 across multiple courts)
        const result = await adminReserveCourtForOpenPlayAction({
          courtIds: modalCourtIds,
          startTimes: startTimesISO,
          label: 'Open Play Block'
        })
        if (result.success) {
          setMessage({ success: true, text: 'Court successfully reserved for Open Play block(s)!' })
          setSelectedDate(new Date(modalDate + 'T00:00:00'))
        } else {
          setMessage({ success: false, text: result.error || 'Failed to reserve court slots.' })
        }
      } else {
        // Regular Player Court Booking
        const result = await createBookingsAction(modalCourtId, startTimesISO, selectedPaymentMethod)
        if (result.success) {
          setMessage({ success: true, text: 'Court booked successfully!' })
          setSelectedDate(new Date(modalDate + 'T00:00:00'))
        } else {
          setMessage({ success: false, text: result.error })
        }
      }
    })
  }

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d)
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
        {/* Header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                {userRole === 'ADMIN' || userRole === 'STAFF' ? 'Court Schedule Monitor' : 'My Bookings'}
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
                {userRole === 'ADMIN' || userRole === 'STAFF' ? 'Monitor active court reservations and scheduling.' : 'Book active courts and view your scheduled reservations.'}
              </p>
            </div>
            {(userRole === 'ADMIN' || userRole === 'STAFF') ? (
              <button
                onClick={handleOpenBookingModalGeneral}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--color-primary)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-primary-btn)'
                }}
              >
                <Plus size={15} />
                <span>Reserve for Open Play</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Balance: <strong style={{ color: 'var(--color-primary)' }}>₱{userBalance.toFixed(2)}</strong></span>
                <button
                  onClick={handleOpenBookingModalGeneral}
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: 'var(--shadow-primary-btn)'
                  }}
                >
                  <Plus size={15} />
                  <span>Book a Court</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Alert Message */}
        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: message.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            color: message.success ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${message.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            fontWeight: 650, fontSize: '13px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {message.success ? <ShieldCheck size={16} /> : <AlertTriangle size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '0' }}>
          {(['calendar', 'list', 'passes'] as const).map(tab => {
            if (tab === 'passes' && (userRole === 'ADMIN' || userRole === 'STAFF')) return null

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                  transition: 'all var(--duration-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {tab === 'calendar' ? <Calendar size={15} /> : tab === 'list' ? <List size={15} /> : <QrCode size={15} />}
                <span>{tab === 'calendar' ? 'Calendar View' : tab === 'list' ? 'List View' : '🎟️ Play & Cash Passes'}</span>
              </button>
            )
          })}
        </div>

        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Calendar controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Court filter */}
                <select
                  value={selectedCourt}
                  onChange={e => setSelectedCourt(e.target.value)}
                  style={{
                    height: '36px', padding: '0 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-card)',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', outline: 'none'
                  }}
                >
                  <option value="all">All Courts</option>
                  {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                {/* Date jump picker */}
                <input
                  type="date"
                  value={formatDateToYYYYMMDD(selectedDate)}
                  onChange={e => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value + 'T00:00:00'))
                    }
                  }}
                  style={{
                    height: '36px', padding: '0 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-card)',
                    color: 'var(--color-text-primary)',
                    fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Date navigator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => shiftDate(-1)} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={16} color="var(--color-text-secondary)" />
                </button>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', minWidth: 160, textAlign: 'center' }}>
                  {selectedDate.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <button onClick={() => shiftDate(1)} style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={16} color="var(--color-text-secondary)" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: `${100 + filteredCourts.length * 140}px` }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface)' }}>
                      <th style={{ width: 80, padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'left', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
                        Time
                      </th>
                      {filteredCourts.map(court => (
                        <th key={court.id} style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center', borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', minWidth: 140 }}>
                          {court.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HOURS.map(hour => {
                      const isCurrentHour = new Date().getHours() === hour && selectedDate.toDateString() === new Date().toDateString()
                      return (
                        <tr key={hour} style={{ background: isCurrentHour ? 'rgba(0,124,128,0.03)' : 'transparent' }}>
                          <td style={{
                            padding: '8px 16px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: isCurrentHour ? 'var(--color-primary)' : 'var(--color-text-disabled)',
                            borderBottom: '1px solid var(--color-border)',
                            borderRight: '1px solid var(--color-border)',
                            verticalAlign: 'top',
                            whiteSpace: 'nowrap'
                          }}>
                            {isCurrentHour && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--color-danger)', marginRight: 4 }} />}
                            {formatHour(hour)}
                          </td>
                          {filteredCourts.map(court => {
                            const bookingsHere = getBookingsForCourtAndHour(court.id, hour)
                            const isBooked = bookingsHere.length > 0
                            const booking = bookingsHere[0]
                            const isClosed = court.status === 'MAINTENANCE'

                            return (
                              <td key={court.id} style={{ borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', verticalAlign: 'middle', padding: 0, height: 48 }}>
                                {isClosed ? (
                                  <div style={{
                                    background: '#f3f4f6',
                                    color: '#9ca3af',
                                    padding: '8px 12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    height: '100%',
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    boxSizing: 'border-box'
                                  }}>
                                    <span>Closed</span>
                                  </div>
                                ) : isBooked ? (
                                  <div style={{
                                    background: (booking.userRole === 'ADMIN' || booking.userRole === 'STAFF')
                                      ? '#10b981' // Success Green for Open Play block
                                      : booking.isOwn 
                                        ? '#007C80' // Brand Teal for My Booking
                                        : '#475569', // Slate Gray for other Player Bookings
                                    color: 'white',
                                    padding: '6px 12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    height: '100%',
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    boxSizing: 'border-box'
                                  }}>
                                    <span>
                                      {booking.userRole === 'ADMIN' || booking.userRole === 'STAFF'
                                        ? 'Open Play'
                                        : (userRole === 'ADMIN' || userRole === 'STAFF') 
                                          ? booking.userName 
                                          : booking.isOwn 
                                            ? 'My Booking' 
                                            : 'Booked'}
                                    </span>
                                    {((userRole === 'ADMIN' || userRole === 'STAFF') || booking.isOwn) && (
                                      <span style={{ fontWeight: 400, opacity: 0.85, fontSize: 10, marginTop: '2px' }}>
                                        {booking.userRole === 'ADMIN' || booking.userRole === 'STAFF' ? 'RESERVED' : booking.status}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleOpenBookingModalForSlot(court.id, hour)}
                                    disabled={isPending}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--color-text-disabled)',
                                      fontSize: '11px',
                                      borderRadius: 0,
                                      transition: 'all var(--duration-fast)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      boxSizing: 'border-box'
                                    }}
                                    className="slot-open"
                                  >
                                    —
                                  </button>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', gap: '20px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Legend:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: '#10b981' }} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Open Play</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: '#007C80' }} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>My Booking</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(() => {
              const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'
              const listToRender = isAdminOrStaff ? bookings : myBookingsList

              // Filter bookings based on bookingSearch state
              const filteredList = listToRender.filter(b => {
                if (!bookingSearch.trim()) return true
                const searchLower = bookingSearch.toLowerCase()
                
                const userName = 'userName' in b ? String(b.userName).toLowerCase() : ''
                const userEmail = 'userEmail' in b ? String(b.userEmail).toLowerCase() : ''
                const courtName = 'courtName' in b ? String(b.courtName).toLowerCase() : ''
                
                return (
                  userName.includes(searchLower) ||
                  userEmail.includes(searchLower) ||
                  courtName.includes(searchLower)
                )
              })

              // Sort the list based on time priority:
              // 1. Bookings for today always come first.
              // 2. Active bookings right now come first within today.
              // 3. Upcoming bookings today are sorted chronologically.
              // 4. Past bookings today are sorted descending.
              // 5. Future days bookings are sorted chronologically, then past days descending.
              const sortedList = [...filteredList].sort((a, b) => {
                const now = new Date()
                const todayDateStr = now.toLocaleDateString('en-US')

                const isTodayA = new Date(a.startTime).toLocaleDateString('en-US') === todayDateStr
                const isTodayB = new Date(b.startTime).toLocaleDateString('en-US') === todayDateStr

                // Today vs Other Days
                if (isTodayA && !isTodayB) return -1
                if (!isTodayA && isTodayB) return 1

                const timeA = new Date(a.startTime).getTime()
                const endA = new Date(a.endTime).getTime()
                const timeB = new Date(b.startTime).getTime()
                const endB = new Date(b.endTime).getTime()
                const nowMs = now.getTime()

                if (isTodayA && isTodayB) {
                  const isActiveA = nowMs >= timeA && nowMs <= endA
                  const isActiveB = nowMs >= timeB && nowMs <= endB

                  // Active first
                  if (isActiveA && !isActiveB) return -1
                  if (!isActiveA && isActiveB) return 1

                  // Upcoming vs Past
                  const isUpcomingA = endA >= nowMs
                  const isUpcomingB = endB >= nowMs

                  if (isUpcomingA && !isUpcomingB) return -1
                  if (!isUpcomingA && isUpcomingB) return 1

                  if (isUpcomingA && isUpcomingB) {
                    return timeA - timeB // upcoming chronological
                  } else {
                    return timeB - timeA // past descending
                  }
                } else {
                  const isFutureA = timeA >= nowMs
                  const isFutureB = timeB >= nowMs

                  if (isFutureA && !isFutureB) return -1
                  if (!isFutureA && isFutureB) return 1

                  if (isFutureA && isFutureB) {
                    return timeA - timeB // future chronological
                  } else {
                    return timeB - timeA // past descending
                  }
                }
              })

              return (
                <>
                  {isAdminOrStaff && (
                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                      <input
                        type="text"
                        placeholder="Search bookings by name, email or court..."
                        value={bookingSearch}
                        onChange={e => setBookingSearch(e.target.value)}
                        style={{
                          width: '100%',
                          height: '38px',
                          padding: '0 16px 0 38px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text-primary)',
                          fontSize: '13px',
                          fontWeight: 500,
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--color-text-disabled)' }} />
                    </div>
                  )}

                  {sortedList.length === 0 ? (
                    <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '60px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                      <Calendar size={40} color="var(--color-text-disabled)" style={{ margin: '0 auto 16px' }} />
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {bookingSearch ? 'No matching bookings found' : 'No bookings scheduled'}
                      </h3>
                      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                        {bookingSearch ? 'Try checking your search spelling or searching for a different user.' : 'No court reservations found on this date range.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ 
                      background: 'var(--color-card)', 
                      border: '1px solid var(--color-border)', 
                      borderRadius: 'var(--radius-xl)', 
                      overflowX: 'hidden',
                      overflowY: 'auto', 
                      maxHeight: '720px', 
                      boxShadow: 'var(--shadow-sm)' 
                    }}>
                      {sortedList.map((b, i) => {
                        const isOP = 'userRole' in b && (b.userRole === 'ADMIN' || b.userRole === 'STAFF')
                        const priceVal = isOP ? 0.00 : ('price' in b ? b.price : 250.00)
                        const userNameStr = isOP ? 'Open Play' : ('userName' in b ? b.userName : 'Member')

                        return (
                          <div key={b.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '16px 24px',
                            borderBottom: i < sortedList.length - 1 ? '1px solid var(--color-border)' : 'none',
                            flexWrap: 'wrap', gap: '12px'
                          }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                              <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--color-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin size={18} color="var(--color-primary)" />
                              </div>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{b.courtName}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={11} />
                                    {new Date(b.startTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })} •{' '}
                                    {new Date(b.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} – {new Date(b.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isAdminOrStaff && (
                                    <span style={{ fontWeight: 650, color: 'var(--color-text-primary)', fontSize: '11px', marginTop: '2px' }}>
                                      👤 Booked by: <span style={{ color: 'var(--color-primary)' }}>{userNameStr}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary)' }}>₱{priceVal.toFixed(2)}</span>
                              <span style={{
                                fontSize: '10px', fontWeight: 800, padding: '3px 10px',
                                borderRadius: 'var(--radius-full)',
                                background: b.status === 'PAID' ? 'var(--color-success-subtle)' : b.status === 'PENDING' ? 'var(--color-warning-subtle)' : b.status === 'RESERVED' ? 'var(--color-info-subtle)' : 'var(--color-danger-subtle)',
                                color: b.status === 'PAID' ? 'var(--color-success)' : b.status === 'PENDING' ? 'var(--color-warning)' : b.status === 'RESERVED' ? 'var(--color-info)' : 'var(--color-danger)',
                                textTransform: 'uppercase', letterSpacing: '0.05em'
                              }}>
                                {b.status === 'PENDING' ? 'Unpaid' : b.status === 'RESERVED' ? 'Checked In' : b.status}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {activeTab === 'passes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-up">
            {(() => {
              const activePasses = myBookingsList.filter(b => 
                (b.status === 'PENDING' || b.status === 'PAID' || b.status === 'RESERVED') &&
                new Date(b.endTime).getTime() >= Date.now()
              )

              if (activePasses.length === 0) {
                return (
                  <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '60px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <QrCode size={40} color="var(--color-text-disabled)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      No active passes found
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                      You have no active or upcoming court reservations that require counter check-in.
                    </p>
                  </div>
                )
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {activePasses.map(pass => {
                    const isPending = pass.status === 'PENDING'
                    const isPaid = pass.status === 'PAID'
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=BOOKING-PASS:bookingId=${pass.id}`
                    
                    return (
                      <div key={pass.id} style={{
                        background: 'var(--color-card)',
                        border: `1.5px solid ${isPending ? 'var(--color-warning)' : 'var(--color-border)'}`,
                        borderRadius: 'var(--radius-xl)',
                        padding: '24px',
                        boxShadow: 'var(--shadow-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        position: 'relative'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                            {pass.courtName}
                          </span>
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

                        <div style={{
                          background: 'white',
                          padding: '12px',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <img src={qrUrl} alt="Booking QR Pass" style={{ width: '150px', height: '150px', display: 'block' }} />
                        </div>

                        <div style={{ fontSize: '11px', fontFamily: 'monospace', background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '4px 8px', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}>
                          Pass ID: <strong>BK-{pass.id.slice(-6).toUpperCase()}</strong>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            {new Date(pass.startTime).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            {new Date(pass.startTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })} – {new Date(pass.endTime).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '8px' }}>
                            Fee: ₱{pass.price.toFixed(2)}
                          </div>
                        </div>

                        <div style={{
                          width: '100%',
                          background: 'var(--color-surface)',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '11px',
                          color: 'var(--color-text-secondary)',
                          lineHeight: '1.4',
                          textAlign: 'center',
                          boxSizing: 'border-box'
                        }}>
                          {isPending ? (
                            <span>⚠️ Show this QR pass at the front counter to pay <strong>₱{pass.price.toFixed(2)}</strong>. You must pay within 5 mins of play time.</span>
                          ) : isPaid ? (
                            <span>🟢 Fully paid via credits. Scan this QR pass at the counter to verify your arrival and check in.</span>
                          ) : (
                            <span>✅ Checked in! Enjoy your game.</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}
      </div>
      {isModalOpen && (() => {
        const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'
        const court = courts.find(c => c.id === modalCourtId)
        const hourlyRate = court?.type === 'ROOFTOP' ? 300 : 250
        const totalCost = hourlyRate * modalHours.length
        const hasInsufficientBalance = !isAdminOrStaff && userBalance < totalCost

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.40)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '28px',
              maxWidth: '520px',
              width: '90%',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              position: 'relative'
            }} className="animate-fade-up">
              {/* Close button */}
              <button
                onClick={() => setIsModalOpen(false)}
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
                  {isAdminOrStaff ? 'Reserve Court for Open Play' : 'Book a Court'}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
                  {isAdminOrStaff
                    ? 'Reserve this court slot on the schedule for Open Play games.'
                    : 'Select court, date, and hourly slots to complete your reservation.'}
                </p>
              </div>

              {/* Inputs */}
              {isAdminOrStaff ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Date Input */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Date</label>
                    <input
                      type="date"
                      value={modalDate}
                      min={formatDateToYYYYMMDD(new Date())}
                      onChange={e => { setModalDate(e.target.value); setModalHours([]); }}
                      style={{
                        width: '100%', height: '38px', padding: '0 10px',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                        fontSize: '13px', fontWeight: 600, outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  {/* Multi-court select checkbox tags */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                        Select Court(s)
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setModalCourtIds(courts.map(c => c.id))}
                          style={{ fontSize: '10px', color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                        >
                          Select All
                        </button>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)' }}>|</span>
                        <button
                          type="button"
                          onClick={() => setModalCourtIds([])}
                          style={{ fontSize: '10px', color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                      {courts.map(court => {
                        const isSelected = modalCourtIds.includes(court.id)
                        return (
                          <button
                            key={court.id}
                            type="button"
                            onClick={() => {
                              setModalCourtIds(prev => 
                                prev.includes(court.id)
                                  ? prev.filter(id => id !== court.id)
                                  : [...prev, court.id]
                              )
                            }}
                            style={{
                              height: '34px',
                              borderRadius: 'var(--radius-md)',
                              border: isSelected ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                              background: isSelected ? 'var(--color-primary-subtle)' : 'var(--color-card)',
                              color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all var(--duration-fast)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {court.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Court</label>
                    <select
                      value={modalCourtId}
                      onChange={e => { setModalCourtId(e.target.value); setModalHours([]); }}
                      style={{
                        width: '100%', height: '38px', padding: '0 10px',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                        fontSize: '13px', fontWeight: 600, outline: 'none'
                      }}
                    >
                      {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Date</label>
                    <input
                      type="date"
                      value={modalDate}
                      min={formatDateToYYYYMMDD(new Date())}
                      onChange={e => { setModalDate(e.target.value); setModalHours([]); }}
                      style={{
                        width: '100%', height: '38px', padding: '0 10px',
                        borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                        background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                        fontSize: '13px', fontWeight: 600, outline: 'none', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Hour slot selection grid */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Select Time Slot</label>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px',
                  maxHeight: '200px', overflowY: 'auto', paddingRight: '4px'
                }}>
                  {HOURS.map(hour => {
                    const isBooked = isSlotBookedInModal(hour)
                    const isPast = isSlotInPastInModal(hour)
                    const isSelected = modalHours.includes(hour)

                    let btnBg = 'var(--color-card)'
                    let btnColor = 'var(--color-text-primary)'
                    let btnBorder = '1px solid var(--color-border)'
                    let cursorType = 'pointer'

                    if (isBooked) {
                      btnBg = 'rgba(239, 68, 68, 0.08)'
                      btnColor = 'var(--color-danger)'
                      btnBorder = '1px solid rgba(239, 68, 68, 0.25)'
                      cursorType = 'not-allowed'
                    } else if (isPast) {
                      btnBg = 'var(--color-surface)'
                      btnColor = 'var(--color-text-disabled)'
                      btnBorder = '1px solid var(--color-border-subtle)'
                      cursorType = 'not-allowed'
                    } else if (isSelected) {
                      btnBg = 'var(--color-primary)'
                      btnColor = 'white'
                      btnBorder = '1px solid var(--color-primary)'
                    }

                    return (
                      <button
                        key={hour}
                        disabled={isBooked || isPast}
                        onClick={() => toggleHourSelection(hour)}
                        style={{
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          border: btnBorder,
                          background: btnBg,
                          color: btnColor,
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: cursorType,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all var(--duration-fast)',
                          boxSizing: 'border-box'
                        }}
                      >
                        <span>{formatHour(hour).split(' ')[0]}</span>
                        <span style={{ fontSize: '8px', opacity: 0.8 }}>{formatHour(hour).split(' ')[1]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Payment Method Select (Player booking only) */}
              {!isAdminOrStaff && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Payment Method
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Pay with Credits */}
                    <button
                      type="button"
                      disabled={hasInsufficientBalance}
                      onClick={() => setSelectedPaymentMethod('credits')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: selectedPaymentMethod === 'credits' ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: selectedPaymentMethod === 'credits' ? 'var(--color-primary-subtle)' : hasInsufficientBalance ? 'var(--color-surface)' : 'var(--color-card)',
                        cursor: hasInsufficientBalance ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        opacity: hasInsufficientBalance ? 0.6 : 1,
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selectedPaymentMethod === 'credits' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          Pay with Credits (Wallet)
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          Deduct instantly. Booking is fully confirmed and guaranteed.
                        </span>
                      </div>
                    </button>

                    {/* Pay Cash at Counter */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('cash')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: selectedPaymentMethod === 'cash' ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border)',
                        background: selectedPaymentMethod === 'cash' ? 'var(--color-accent-subtle)' : 'var(--color-card)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {selectedPaymentMethod === 'cash' && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          Pay Cash at Desk (5m Expiration Rule)
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          Pay at counter. Unpaid reservations release 5 minutes after game start.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Info Summary */}
              <div style={{
                background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
                padding: '12px 14px', border: '1px solid var(--color-border)',
                display: 'flex', flexDirection: 'column', gap: '6px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  <span>Court Fee</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    {isAdminOrStaff 
                      ? `₱0.00 (Open Play block on ${modalCourtIds.length} court${modalCourtIds.length > 1 ? 's' : ''})` 
                      : `₱${totalCost.toFixed(2)}`}
                  </span>
                </div>
                {!isAdminOrStaff && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      <span>Account Balance</span>
                      <span style={{ fontWeight: 700 }}>₱{userBalance.toFixed(2)}</span>
                    </div>
                    {hasInsufficientBalance && selectedPaymentMethod === 'credits' && (
                      <div style={{
                        color: 'var(--color-danger)', fontSize: '11px', fontWeight: 700,
                        marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <AlertTriangle size={12} />
                        <span>Insufficient balance. Please top up or choose Cash at Desk.</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    height: '38px', padding: '0 16px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', background: 'var(--color-card)',
                    color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={isPending || (isAdminOrStaff ? modalCourtIds.length === 0 : !modalCourtId) || modalHours.length === 0 || (selectedPaymentMethod === 'credits' && hasInsufficientBalance)}
                  onClick={handleConfirmBooking}
                  style={{
                    height: '38px', padding: '0 16px', borderRadius: 'var(--radius-md)',
                    border: 'none', background: 'var(--color-primary)',
                    color: 'white', fontSize: '13px', fontWeight: 700,
                    cursor: (isPending || (isAdminOrStaff ? modalCourtIds.length === 0 : !modalCourtId) || modalHours.length === 0 || (selectedPaymentMethod === 'credits' && hasInsufficientBalance)) ? 'not-allowed' : 'pointer',
                    boxShadow: 'var(--shadow-primary-btn)',
                    opacity: (isPending || (isAdminOrStaff ? modalCourtIds.length === 0 : !modalCourtId) || modalHours.length === 0 || (selectedPaymentMethod === 'credits' && hasInsufficientBalance)) ? 0.6 : 1
                  }}
                >
                  {isPending
                    ? (isAdminOrStaff ? 'Reserving...' : 'Booking...')
                    : (isAdminOrStaff ? 'Confirm Reservation' : 'Confirm Booking')}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <style>{`
        .slot-open:hover {
          background: var(--color-primary-subtle) !important;
          color: var(--color-primary) !important;
        }
      `}</style>
    </>
  )
}
