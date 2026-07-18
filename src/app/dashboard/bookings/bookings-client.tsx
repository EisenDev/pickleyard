'use client'

import { useState, useTransition } from 'react'
import { createBookingAction } from '@/lib/actions/booking'
import { Clock, Check, AlertTriangle, ShieldCheck, Filter } from 'lucide-react'

interface Court {
  id: string
  number: number
  name: string
  type: string
  status: string
  bookings: {
    startTime: Date
    endTime: Date
  }[]
}

interface BookingsClientProps {
  courts: Court[]
  userBalance: number
}

export function BookingsClient({ courts, userBalance }: BookingsClientProps) {
  const [selectedType, setSelectedType] = useState<string>('ALL')
  const [isPending, startTransition] = useTransition()
  const [bookingMessage, setBookingMessage] = useState<{ success: boolean; text: string } | null>(null)

  // Generate 6 hourly booking slots starting from the current hour
  const slots: Date[] = []
  const now = new Date()
  now.setMinutes(0, 0, 0)
  for (let i = 1; i <= 6; i++) {
    const slotTime = new Date(now)
    slotTime.setHours(now.getHours() + i)
    slots.push(slotTime)
  }

  // Filter courts by type
  const filteredCourts = courts.filter((c) => {
    if (selectedType === 'ALL') return true
    return c.type === selectedType
  })

  // Check if a court has a booking at a specific slot hour
  const isSlotBooked = (court: Court, slot: Date) => {
    const slotStart = slot.getTime()
    const slotEnd = slotStart + 60 * 60 * 1000 // 1 hour later
    return court.bookings.some((b) => {
      const bStart = new Date(b.startTime).getTime()
      const bEnd = new Date(b.endTime).getTime()
      return (slotStart >= bStart && slotStart < bEnd) || (bEnd > slotStart && bEnd <= slotEnd)
    })
  }

  const handleBookSlot = (courtId: string, slotTime: Date) => {
    if (confirm(`Confirm booking for this court at ${slotTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}? Cost will be deducted from your credit balance.`)) {
      setBookingMessage(null)
      startTransition(async () => {
        const result = await createBookingAction(courtId, slotTime.toISOString())
        if (result.success) {
          setBookingMessage({ success: true, text: 'Reservation confirmed! Your slot is secured.' })
        } else {
          setBookingMessage({ success: false, text: result.error })
        }
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Court Scheduler
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Reserve one of our 14 professional courts. Slots start on the hour.
          </p>
        </div>

        {/* Balance badge */}
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Your Balance:</span>
          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
            ${userBalance.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Booking result banner */}
      {bookingMessage && (
        <div
          style={{
            padding: '14px 16px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 600,
            background: bookingMessage.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            color: bookingMessage.success ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${bookingMessage.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
          }}
        >
          {bookingMessage.success ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
          <span>{bookingMessage.text}</span>
        </div>
      )}

      {/* Filter Row */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
        {[
          { key: 'ALL', label: 'All Courts' },
          { key: 'INDOOR', label: 'Indoor cushion' },
          { key: 'OUTDOOR', label: 'Outdoor scenic' },
          { key: 'ROOFTOP', label: 'Rooftop arena' },
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setSelectedType(btn.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              border: selectedType === btn.key ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: selectedType === btn.key ? 'var(--color-primary)' : 'var(--color-card)',
              color: selectedType === btn.key ? 'white' : 'var(--color-text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--duration-fast)',
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Court Schedule Matrix */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {filteredCourts.map((court) => (
          <div
            key={court.id}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: '240px 1fr',
              gap: '24px',
              alignItems: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}
            className="court-scheduler-row"
          >
            {/* Left Court Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--color-secondary)',
                    background: 'var(--color-secondary-subtle)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  {court.type}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Rate: {court.type === 'ROOFTOP' ? '$30/hr' : '$25/hr'}
                </span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                {court.name}
              </h3>
            </div>

            {/* Right Booking Slots list */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px' }}>
              {slots.map((slot) => {
                const booked = isSlotBooked(court, slot)
                return (
                  <button
                    key={slot.toISOString()}
                    disabled={booked || isPending}
                    onClick={() => handleBookSlot(court.id, slot)}
                    style={{
                      height: '56px',
                      borderRadius: 'var(--radius-lg)',
                      border: booked ? '1px dashed var(--color-border)' : '1px solid var(--color-border)',
                      background: booked ? 'var(--color-surface)' : 'var(--color-card)',
                      color: booked ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
                      cursor: booked ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      transition: 'all var(--duration-fast)',
                    }}
                    className={booked ? '' : 'time-slot-available'}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={12} />
                      {slot.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{ fontSize: '10px', color: booked ? 'var(--color-text-disabled)' : 'var(--color-accent-hover)' }}>
                      {booked ? 'Reserved' : 'Book Open'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .time-slot-available:hover {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 0 3px rgba(0, 124, 128, 0.1) !important;
          background: var(--color-primary-subtle) !important;
        }

        @media (max-width: 900px) {
          .court-scheduler-row {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
