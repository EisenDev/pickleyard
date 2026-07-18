'use client'

import { useState, useTransition } from 'react'
import { registerEventAction } from '@/lib/actions/event'
import { ShieldCheck, ShieldAlert, Clock, MapPin, Users, Ticket, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ClubEvent {
  id: string
  title: string
  description: string
  scheduledAt: Date
  location: string
  price: number
  capacity: number
  registeredCount: number
}

interface EventsClientProps {
  events: ClubEvent[]
  userBalance: number
}

export function EventsClient({ events, userBalance }: EventsClientProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const handleRegister = (eventId: string, title: string, price: number) => {
    if (confirm(`Register for "${title}"? Cost will be ₱${price.toFixed(2)} deducted from your credits.`)) {
      setMessage(null)
      startTransition(async () => {
        const result = await registerEventAction(eventId)
        if (result.success) {
          setMessage({ success: true, text: `Successfully registered for "${title}"!` })
        } else {
          setMessage({ success: false, text: result.error })
        }
      })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
      {/* Back and Header */}
      <div>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: '12px', fontWeight: 600 }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              Club Events & Tournaments
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
              Join our weekly clinics, community socials, and club-hosted tournaments.
            </p>
          </div>

          {/* Balance badge */}
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Your Balance:</span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary)' }}>
              ₱{userBalance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            background: message.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            color: message.success ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${message.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {message.success ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid of Events */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {events.map((e) => {
          const fullyBooked = e.registeredCount >= e.capacity
          return (
            <div
              key={e.id}
              style={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Event Content banner */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-secondary)',
                      background: 'var(--color-secondary-subtle)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--color-secondary-subtle)'
                    }}
                  >
                    Club Event
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                    ₱{e.price.toFixed(2)}
                  </span>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.3 }}>
                  {e.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {e.description}
                </p>

                {/* Event details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <Clock size={14} style={{ color: 'var(--color-text-disabled)' }} />
                    <span>{new Date(e.scheduledAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila' })} • {new Date(e.scheduledAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <MapPin size={14} style={{ color: 'var(--color-text-disabled)' }} />
                    <span>{e.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    <Users size={14} style={{ color: 'var(--color-text-disabled)' }} />
                    <span>Slots: {e.registeredCount} / {e.capacity} occupied</span>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div style={{ padding: '16px 24px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => handleRegister(e.id, e.title, e.price)}
                  disabled={fullyBooked || isPending}
                  style={{
                    width: '100%',
                    height: '38px',
                    background: fullyBooked ? 'var(--color-border-strong)' : 'var(--color-primary)',
                    color: fullyBooked ? 'var(--color-text-disabled)' : 'white',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: fullyBooked ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: fullyBooked ? 'none' : 'var(--shadow-primary-btn)'
                  }}
                >
                  <Ticket size={15} />
                  <span>{fullyBooked ? 'Fully Booked' : 'Register Ticket'}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
