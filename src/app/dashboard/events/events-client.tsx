'use client'

import { useState, useTransition } from 'react'
import { registerEventAction, createClubEventAction } from '@/lib/actions/event'
import { ShieldCheck, ShieldAlert, Clock, MapPin, Users, Ticket, Plus, X, Calendar, PencilLine } from 'lucide-react'

// ── Pickleball-specific event types ──────────────────────────────────────────
const EVENT_TYPES = [
  { value: 'OPEN_PLAY',          label: 'Open Play',          color: '#0284c7', bg: 'rgba(2,132,199,0.10)' },
  { value: 'ROUND_ROBIN',        label: 'Round Robin',        color: '#7c3aed', bg: 'rgba(124,58,237,0.10)' },
  { value: 'SINGLES_TOURNAMENT', label: 'Singles Tournament', color: '#dc2626', bg: 'rgba(220,38,38,0.10)' },
  { value: 'DOUBLES_TOURNAMENT', label: 'Doubles Tournament', color: '#b45309', bg: 'rgba(180,83,9,0.10)' },
  { value: 'MIXED_DOUBLES',      label: 'Mixed Doubles',      color: '#0d9488', bg: 'rgba(13,148,136,0.10)' },
  { value: 'CLINIC',             label: 'Clinic / Drills',    color: '#059669', bg: 'rgba(5,150,105,0.10)' },
  { value: 'SOCIAL_MIXER',       label: 'Social Mixer',       color: '#db2777', bg: 'rgba(219,39,119,0.10)' },
  { value: 'LADDER_PLAY',        label: 'Ladder Play',        color: '#6d28d9', bg: 'rgba(109,40,217,0.10)' },
  { value: 'CUSTOM',             label: '✏  Custom',          color: '#64748b', bg: 'rgba(100,116,139,0.10)' },
]

function getTypeStyle(type: string) {
  return EVENT_TYPES.find(t => t.value === type)
    ?? { label: type, color: 'var(--color-secondary)', bg: 'var(--color-secondary-subtle)' }
}

interface ClubEvent {
  id: string
  title: string
  description: string
  scheduledAt: Date
  location: string
  price: number
  capacity: number
  registeredCount: number
  type: string
}

interface EventsClientProps {
  events: ClubEvent[]
  userBalance: number
  userRole: string
}

const EMPTY_FORM = {
  title: '',
  description: '',
  scheduledAt: '',
  location: '',
  price: '',
  capacity: '',
  type: 'OPEN_PLAY',
  customType: '',
}

export function EventsClient({ events, userBalance, userRole }: EventsClientProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const isAdmin = userRole === 'ADMIN' || userRole === 'STAFF'

  // Create Event modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [createPending, startCreateTransition] = useTransition()
  const [createMsg, setCreateMsg] = useState<{ success: boolean; text: string } | null>(null)

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

  const handleCreate = () => {
    const resolvedType = form.type === 'CUSTOM'
      ? (form.customType.trim() || '').toUpperCase().replace(/\s+/g, '_')
      : form.type

    if (!form.title || !form.scheduledAt || !form.location || !form.capacity) {
      setCreateMsg({ success: false, text: 'Please fill in all required fields.' })
      return
    }
    if (form.type === 'CUSTOM' && !form.customType.trim()) {
      setCreateMsg({ success: false, text: 'Please enter a custom event type name.' })
      return
    }

    setCreateMsg(null)
    startCreateTransition(async () => {
      const result = await createClubEventAction({
        title: form.title,
        description: form.description,
        scheduledAt: form.scheduledAt,
        location: form.location,
        price: parseFloat(form.price) || 0,
        capacity: parseInt(form.capacity) || 1,
        type: resolvedType,
      })
      if (result.success) {
        setCreateMsg({ success: true, text: 'Event published! It is now live on the Events page.' })
        setForm(EMPTY_FORM)
        setTimeout(() => { setIsCreateOpen(false); setCreateMsg(null) }, 1800)
      } else {
        setCreateMsg({ success: false, text: result.error })
      }
    })
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
        {/* Header ─────────────────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
                Club Events &amp; Tournaments
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
                Join our weekly clinics, community socials, and club-hosted tournaments.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Balance badge */}
              <div style={{
                background: 'var(--color-card)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', padding: '8px 16px',
                display: 'flex', alignItems: 'center', gap: '10px', boxShadow: 'var(--shadow-sm)'
              }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Your Balance:</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-primary)' }}>₱{userBalance.toFixed(2)}</span>
              </div>

              {/* Admin Create Event button */}
              {isAdmin && (
                <button
                  onClick={() => { setIsCreateOpen(true); setCreateMsg(null); setForm(EMPTY_FORM) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--color-primary)', color: 'white',
                    border: 'none', borderRadius: 'var(--radius-md)',
                    padding: '9px 18px', fontSize: '13px', fontWeight: 700,
                    cursor: 'pointer', boxShadow: 'var(--shadow-primary-btn)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={15} />
                  Create Event
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Global feedback */}
        {message && (
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-lg)',
            background: message.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            color: message.success ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${message.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            fontWeight: 600, fontSize: '13px',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {message.success ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Event grid ─────────────────────────────────────────────────────── */}
        {events.length === 0 ? (
          <div style={{
            background: 'var(--color-card)', border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-xl)', padding: '64px 24px', textAlign: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Calendar size={40} color="var(--color-text-disabled)" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, fontWeight: 600 }}>
              No upcoming events
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-disabled)', margin: '6px 0 0' }}>
              {isAdmin ? 'Create your first event using the button above.' : 'Check back soon for upcoming clinics and tournaments.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {events.map((e) => {
              const fullyBooked = e.registeredCount >= e.capacity
              const typeStyle = getTypeStyle(e.type)
              return (
                <div key={e.id} style={{
                  background: 'var(--color-card)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        color: typeStyle.color, background: typeStyle.bg,
                        padding: '3px 9px', borderRadius: 'var(--radius-xs)',
                        border: `1px solid ${typeStyle.color}33`, flexShrink: 0
                      }}>
                        {typeStyle.label?.replace('✏  ', '')}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)', flexShrink: 0 }}>
                        {e.price === 0 ? 'Free' : `₱${e.price.toFixed(2)}`}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.3 }}>
                      {e.title}
                    </h3>
                    {e.description && (
                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        {e.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        <Clock size={13} style={{ color: 'var(--color-text-disabled)', flexShrink: 0 }} />
                        <span>
                          {new Date(e.scheduledAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' })}
                          {' • '}
                          {new Date(e.scheduledAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        <MapPin size={13} style={{ color: 'var(--color-text-disabled)', flexShrink: 0 }} />
                        <span>{e.location}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        <Users size={13} style={{ color: 'var(--color-text-disabled)', flexShrink: 0 }} />
                        <span>{e.registeredCount} / {e.capacity} slots filled</span>
                        {fullyBooked && (
                          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-danger)', background: 'var(--color-danger-subtle)', padding: '1px 6px', borderRadius: 'var(--radius-xs)' }}>
                            FULL
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Register button — hidden for admin */}
                  {!isAdmin && (
                    <div style={{ padding: '14px 20px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                      <button
                        onClick={() => handleRegister(e.id, e.title, e.price)}
                        disabled={fullyBooked || isPending}
                        style={{
                          width: '100%', height: '38px',
                          background: fullyBooked ? 'var(--color-border-strong)' : 'var(--color-primary)',
                          color: fullyBooked ? 'var(--color-text-disabled)' : 'white',
                          border: 'none', borderRadius: 'var(--radius-md)',
                          fontSize: '13px', fontWeight: 700,
                          cursor: fullyBooked ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          boxShadow: fullyBooked ? 'none' : 'var(--shadow-primary-btn)'
                        }}
                      >
                        <Ticket size={14} />
                        <span>{fullyBooked ? 'Fully Booked' : 'Register Ticket'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Create Event Modal ─────────────────────────────────────────────── */}
      {isCreateOpen && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '16px',
          }}
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '28px',
              maxWidth: '560px', width: '100%',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex', flexDirection: 'column', gap: '18px',
              position: 'relative',
              maxHeight: '92vh', overflowY: 'auto',
              boxSizing: 'border-box',
            }}
            className="animate-fade-up"
          >
            {/* Close */}
            <button
              onClick={() => setIsCreateOpen(false)}
              style={{ position: 'absolute', top: 18, right: 18, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
            >
              <X size={18} />
            </button>

            {/* Title */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                Create New Event
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                Fill in the details. The event goes live instantly.
              </p>
            </div>

            {/* Feedback */}
            {createMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: createMsg.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
                color: createMsg.success ? 'var(--color-success)' : 'var(--color-danger)',
                border: `1px solid ${createMsg.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}>
                {createMsg.success ? <ShieldCheck size={15} /> : <ShieldAlert size={15} />}
                <span>{createMsg.text}</span>
              </div>
            )}

            {/* Event Type Selector */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Event Type *
              </label>
              <div className="event-type-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px' }}>
                {EVENT_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                    style={{
                      padding: '9px 6px', borderRadius: 'var(--radius-md)',
                      fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'center',
                      border: form.type === t.value ? `2px solid ${t.color}` : '1.5px solid var(--color-border)',
                      background: form.type === t.value ? t.bg : 'var(--color-surface)',
                      color: form.type === t.value ? t.color : 'var(--color-text-secondary)',
                      transition: 'all 0.15s', lineHeight: 1.3,
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Custom type text input */}
              {form.type === 'CUSTOM' && (
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PencilLine size={15} style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="Type your custom event name (e.g. Fun Slam, Battle of Clubs)"
                    value={form.customType}
                    onChange={e => setForm(f => ({ ...f, customType: e.target.value }))}
                    style={{
                      flex: 1, height: '38px', padding: '0 12px',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                      fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
            </div>

            {/* Event Title */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Event Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Saturday Morning Round Robin"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={{
                  width: '100%', height: '40px', padding: '0 12px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                  fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Description
              </label>
              <textarea
                placeholder="Short description of the event..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                  fontSize: '13px', outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Date/Time + Location */}
            <div className="modal-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  style={{
                    width: '100%', height: '40px', padding: '0 10px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Location *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Court 2"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  style={{
                    width: '100%', height: '40px', padding: '0 12px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Price + Capacity */}
            <div className="modal-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Entry Fee (₱)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0 for free"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  style={{
                    width: '100%', height: '40px', padding: '0 12px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Capacity *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Max attendees"
                  value={form.capacity}
                  onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                  style={{
                    width: '100%', height: '40px', padding: '0 12px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Publish button — bigger on mobile */}
            <button
              onClick={handleCreate}
              disabled={createPending}
              className="publish-event-btn"
              style={{
                width: '100%',
                background: 'var(--color-primary)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-md)',
                fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                boxShadow: 'var(--shadow-primary-btn)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: createPending ? 0.7 : 1,
                height: '52px',
                marginTop: '4px',
              }}
            >
              <Plus size={18} />
              {createPending ? 'Publishing...' : 'Publish Event'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .event-type-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .modal-row {
            grid-template-columns: 1fr !important;
          }
          .publish-event-btn {
            height: 60px !important;
            font-size: 17px !important;
            border-radius: 14px !important;
          }
        }
      `}</style>
    </>
  )
}
