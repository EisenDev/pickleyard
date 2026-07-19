'use client'

import { useState, useTransition } from 'react'
import { createBookingAction } from '@/lib/actions/booking'
import { ShieldCheck, AlertTriangle, Calendar, List, Plus, Clock, MapPin, ChevronLeft, ChevronRight, ArrowLeft, X } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedCourt, setSelectedCourt] = useState<string>('all')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  // Booking Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalCourtId, setModalCourtId] = useState<string>('')
  const [modalDate, setModalDate] = useState<string>('')
  const [modalHour, setModalHour] = useState<number | null>(null)

  const filteredCourts = selectedCourt === 'all' ? courts : courts.filter(c => c.id === selectedCourt)

  const getBookingsForCourtAndHour = (courtId: string, hour: number) => {
    return allBookings.filter(b => {
      const d = selectedDate
      const slotHourStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0).getTime()
      const slotHourEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour + 1, 0, 0).getTime()
      
      const bStart = new Date(b.startTime).getTime()
      const bEnd = new Date(b.endTime).getTime()
      
      return (
        b.courtId === courtId &&
        bStart < slotHourEnd &&
        bEnd > slotHourStart
      )
    })
  }

  // Open modal for a specific grid cell click
  const handleOpenBookingModalForSlot = (courtId: string, hour: number) => {
    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      setMessage({
        success: false,
        text: 'ℹ️ Schedule Monitor Mode: Staff and Admin accounts are read-only and cannot book slots.'
      })
      setTimeout(() => setMessage(null), 5000)
      return
    }
    setModalCourtId(courtId)
    setModalDate(formatDateToYYYYMMDD(selectedDate))
    setModalHour(hour)
    setIsModalOpen(true)
  }

  // Open modal generally from header button
  const handleOpenBookingModalGeneral = () => {
    if (userRole === 'ADMIN' || userRole === 'STAFF') {
      setMessage({
        success: false,
        text: 'ℹ️ Schedule Monitor Mode: Staff and Admin accounts are read-only and cannot book slots.'
      })
      setTimeout(() => setMessage(null), 5000)
      return
    }
    setModalCourtId(courts[0]?.id || '')
    setModalDate(formatDateToYYYYMMDD(selectedDate))
    setModalHour(null)
    setIsModalOpen(true)
  }

  // Check if a time slot is already booked on the selected court & date inside the modal
  const isSlotBookedInModal = (hour: number) => {
    if (!modalDate || !modalCourtId) return false
    const parsedDate = new Date(modalDate + 'T00:00:00')
    return allBookings.some(b => {
      const bStart = new Date(b.startTime)
      return (
        b.courtId === modalCourtId &&
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

  const handleConfirmBooking = () => {
    if (!modalCourtId || modalHour === null) return
    const slotTime = new Date(modalDate + 'T00:00:00')
    slotTime.setHours(modalHour, 0, 0, 0)

    if (slotTime < new Date()) {
      alert('Cannot book a slot in the past.')
      return
    }

    setMessage(null)
    setIsModalOpen(false)
    startTransition(async () => {
      const result = await createBookingAction(modalCourtId, slotTime.toISOString())
      if (result.success) {
        setMessage({ success: true, text: 'Court booked successfully!' })
      } else {
        setMessage({ success: false, text: result.error })
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
            {userRole !== 'ADMIN' && userRole !== 'STAFF' && (
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
          {(['calendar', 'list'] as const).map(tab => (
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
              {tab === 'calendar' ? <Calendar size={15} /> : <List size={15} />}
              <span>{tab === 'calendar' ? 'Calendar View' : 'List View'}</span>
            </button>
          ))}
        </div>

        {activeTab === 'calendar' ? (
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
                              <td key={court.id} style={{ borderBottom: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', verticalAlign: 'top', padding: '4px 6px', height: 44 }}>
                                {isClosed ? (
                                  <div style={{
                                    background: '#f9fafb',
                                    color: '#9ca3af',
                                    border: '1.5px dashed #e5e7eb',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    minHeight: 36
                                  }}>
                                    <span>Closed</span>
                                  </div>
                                ) : isBooked ? (
                                  <div style={{
                                    background: booking.isOwn ? 'var(--color-primary)' : 'rgba(0,124,128,0.35)',
                                    color: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    minHeight: 36
                                  }}>
                                    <span>
                                      {(userRole === 'ADMIN' || userRole === 'STAFF') 
                                        ? booking.userName 
                                        : booking.isOwn 
                                          ? 'My Booking' 
                                          : 'Booked'}
                                    </span>
                                    {((userRole === 'ADMIN' || userRole === 'STAFF') || booking.isOwn) && (
                                      <span style={{ fontWeight: 400, opacity: 0.85, fontSize: 10 }}>
                                        {booking.status}
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
                                      minHeight: 36,
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: 'var(--color-text-disabled)',
                                      fontSize: '11px',
                                      borderRadius: 'var(--radius-md)',
                                      transition: 'all var(--duration-fast)'
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
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--color-primary)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>My Booking</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(0,124,128,0.35)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Booked</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, border: '1px dashed var(--color-border)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Available (click to book)</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* List View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(() => {
              const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'
              const listToRender = isAdminOrStaff ? allBookings : myBookings

              if (listToRender.length === 0) {
                return (
                  <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '60px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                    <Calendar size={40} color="var(--color-text-disabled)" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>No bookings scheduled</h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>No court reservations found on this date range.</p>
                  </div>
                )
              }

              return (
                <div style={{ 
                  background: 'var(--color-card)', 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 'var(--radius-xl)', 
                  overflowX: 'hidden',
                  overflowY: 'auto', 
                  maxHeight: '720px', 
                  boxShadow: 'var(--shadow-sm)' 
                }}>
                  {listToRender.map((b, i) => {
                    const priceVal = 'price' in b ? b.price : 500.00
                    const userNameStr = 'userName' in b ? b.userName : 'Member'

                    return (
                      <div key={b.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '16px 24px',
                        borderBottom: i < listToRender.length - 1 ? '1px solid var(--color-border)' : 'none',
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
                            background: b.status === 'PAID' ? 'var(--color-success-subtle)' : 'var(--color-warning-subtle)',
                            color: b.status === 'PAID' ? 'var(--color-success)' : 'var(--color-warning)',
                            textTransform: 'uppercase', letterSpacing: '0.05em'
                          }}>
                            {b.status}
                          </span>
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

      {/* ── Booking Modal (Avenor style popup) ── */}
      {isModalOpen && (
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
                Book a Court
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
                Select court, date, and hourly slot to complete your reservation.
              </p>
            </div>

            {/* Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Court</label>
                <select
                  value={modalCourtId}
                  onChange={e => { setModalCourtId(e.target.value); setModalHour(null); }}
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
                  onChange={e => { setModalDate(e.target.value); setModalHour(null); }}
                  style={{
                    width: '100%', height: '38px', padding: '0 10px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                    fontSize: '13px', fontWeight: 600, outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

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
                  const isSelected = modalHour === hour

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
                      onClick={() => setModalHour(hour)}
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

            {/* Info Summary */}
            <div style={{
              background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
              padding: '12px 14px', border: '1px solid var(--color-border)',
              display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <span>Court Fee</span>
                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>₱250.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                <span>Account Balance</span>
                <span style={{ fontWeight: 700 }}>₱{userBalance.toFixed(2)}</span>
              </div>
              {userBalance < 250 && (
                <div style={{
                  color: 'var(--color-danger)', fontSize: '11px', fontWeight: 700,
                  marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                  <AlertTriangle size={12} />
                  <span>Insufficient balance. Please top up your account.</span>
                </div>
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
                disabled={isPending || modalHour === null || userBalance < 250}
                onClick={handleConfirmBooking}
                style={{
                  height: '38px', padding: '0 16px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--color-primary)',
                  color: 'white', fontSize: '13px', fontWeight: 700,
                  cursor: (isPending || modalHour === null || userBalance < 250) ? 'not-allowed' : 'pointer',
                  boxShadow: 'var(--shadow-primary-btn)',
                  opacity: (isPending || modalHour === null || userBalance < 250) ? 0.6 : 1
                }}
              >
                {isPending ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .slot-open:hover {
          background: var(--color-primary-subtle) !important;
          color: var(--color-primary) !important;
        }
      `}</style>
    </>
  )
}
