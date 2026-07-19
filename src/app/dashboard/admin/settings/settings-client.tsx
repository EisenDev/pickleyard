'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateSystemSettingsAction, toggleCourtOpenStatusAction } from '@/lib/actions/admin'
import { Save, Calendar, Layers, Clock, ShieldAlert, Check, Power, ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface CourtItem {
  id: string
  number: number
  name: string
  status: string
}

interface Props {
  initialSettings: Record<string, string>
  courts: CourtItem[]
}

export function SettingsClient({ initialSettings, courts }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [togglePendingId, setTogglePendingId] = useState<string | null>(null)
  
  // State variables
  const [bookingDuration, setBookingDuration] = useState(initialSettings.booking_duration_minutes)
  const [bookingPrice, setBookingPrice] = useState(initialSettings.booking_price_per_hour)
  const [openplayMatchMinutes, setOpenplayMatchMinutes] = useState(
    (parseInt(initialSettings.openplay_match_duration_seconds) / 60).toString()
  )
  const [openplayExpiryHours, setOpenplayExpiryHours] = useState(initialSettings.openplay_expiry_hours)
  const [openplayEntryFee, setOpenplayEntryFee] = useState(initialSettings.openplay_entry_fee)
  const [openplayStartHour, setOpenplayStartHour] = useState(initialSettings.openplay_start_hour || '8')
  const [openplayEndHour, setOpenplayEndHour] = useState(initialSettings.openplay_end_hour || '22')

  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const matchSeconds = Math.round(parseFloat(openplayMatchMinutes) * 60)
    if (isNaN(matchSeconds) || matchSeconds <= 0) {
      setMessage({ success: false, text: 'Match duration must be a positive number.' })
      return
    }

    const startH = parseInt(openplayStartHour)
    const endH = parseInt(openplayEndHour)
    if (isNaN(startH) || startH < 0 || startH > 23 || isNaN(endH) || endH < 0 || endH > 24) {
      setMessage({ success: false, text: 'Operational hours must be between 0 (12 AM) and 24 (12 AM next day).' })
      return
    }
    if (startH >= endH) {
      setMessage({ success: false, text: 'Start hour must be before the end hour.' })
      return
    }

    startTransition(async () => {
      const res = await updateSystemSettingsAction({
        booking_duration_minutes: bookingDuration,
        booking_price_per_hour: bookingPrice,
        openplay_match_duration_seconds: matchSeconds.toString(),
        openplay_expiry_hours: openplayExpiryHours,
        openplay_entry_fee: openplayEntryFee,
        openplay_start_hour: openplayStartHour,
        openplay_end_hour: openplayEndHour
      })

      if (res.success) {
        setMessage({ success: true, text: 'Configuration settings updated successfully!' })
        router.refresh()
      } else {
        setMessage({ success: false, text: res.error || 'Failed to save settings.' })
      }
    })
  }

  const handleToggleCourt = (courtId: string) => {
    setMessage(null)
    setTogglePendingId(courtId)
    startTransition(async () => {
      const res = await toggleCourtOpenStatusAction(courtId)
      setTogglePendingId(null)
      if (res.success) {
        setMessage({ success: true, text: 'Court operational status toggled successfully!' })
        router.refresh()
      } else {
        setMessage({ success: false, text: res.error || 'Failed to toggle court status.' })
      }
    })
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
          Time & Cost Control Panel
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Configure club reservation parameters, hourly pricing, open play rotational timers, and session expirations.
        </p>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg)',
          fontSize: '13px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: message.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
          color: message.success ? 'var(--color-success)' : 'var(--color-danger)',
          border: `1.5px solid ${message.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
        }}>
          {message.success ? <Check size={16} /> : <ShieldAlert size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Section 1: Private Booking Settings */}
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
            <Calendar size={16} color="var(--color-primary)" />
            Private Booking Settings
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Session Duration (Minutes)
              </label>
              <input
                type="number"
                value={bookingDuration}
                onChange={(e) => setBookingDuration(e.target.value)}
                required
                min="1"
                style={{
                  width: '100%', height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  padding: '0 12px', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text-primary)'
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', marginTop: '4px', display: 'block' }}>
                Default calendar event block size.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Hourly Price (₱ PHP)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>₱</span>
                <input
                  type="number"
                  value={bookingPrice}
                  onChange={(e) => setBookingPrice(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%', height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    padding: '0 12px 0 28px', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text-primary)'
                  }}
                />
              </div>
              <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', marginTop: '4px', display: 'block' }}>
                Cost charged per court hour.
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px dashed var(--color-border)', paddingTop: '16px', marginTop: '4px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Operational Start Hour
              </label>
              <select
                value={openplayStartHour}
                onChange={(e) => setOpenplayStartHour(e.target.value)}
                style={{
                  width: '100%', height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  padding: '0 10px', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                  cursor: 'pointer', outline: 'none'
                }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i.toString()}>
                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', marginTop: '4px', display: 'block' }}>
                Hour courts open for reservation today.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Operational End Hour
              </label>
              <select
                value={openplayEndHour}
                onChange={(e) => setOpenplayEndHour(e.target.value)}
                style={{
                  width: '100%', height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  padding: '0 10px', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                  cursor: 'pointer', outline: 'none'
                }}
              >
                {Array.from({ length: 25 }, (_, i) => (
                  <option key={i} value={i.toString()}>
                    {i === 0 ? '12:00 AM (Next Day)' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : i === 24 ? '12:00 AM (Next Day)' : `${i - 12}:00 PM`}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', marginTop: '4px', display: 'block' }}>
                Hour courts close for reservation today.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Open Play Stack Settings */}
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
            <Layers size={16} color="var(--color-accent)" />
            Open Play Stack Settings
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Match Duration (Minutes)
              </label>
              <input
                type="number"
                value={openplayMatchMinutes}
                onChange={(e) => setOpenplayMatchMinutes(e.target.value)}
                required
                min="0.1"
                step="0.1"
                style={{
                  width: '100%', height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  padding: '0 12px', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text-primary)'
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', marginTop: '4px', display: 'block' }}>
                Rotational timer duration per match.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Session Expiration (Hours)
              </label>
              <input
                type="number"
                value={openplayExpiryHours}
                onChange={(e) => setOpenplayExpiryHours(e.target.value)}
                required
                min="0.01"
                step="0.01"
                style={{
                  width: '100%', height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                  padding: '0 12px', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text-primary)'
                }}
              />
              <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', marginTop: '4px', display: 'block' }}>
                Player active session duration limit.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Entry Fee (₱ PHP)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>₱</span>
                <input
                  type="number"
                  value={openplayEntryFee}
                  onChange={(e) => setOpenplayEntryFee(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%', height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    padding: '0 12px 0 28px', fontSize: '13px', background: 'var(--color-surface)', color: 'var(--color-text-primary)'
                  }}
                />
              </div>
              <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)', marginTop: '4px', display: 'block' }}>
                Fee charged upon checking in.
              </span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="submit"
            disabled={isPending}
            style={{
              height: '40px',
              padding: '0 20px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-primary-btn)',
              opacity: isPending ? 0.7 : 1
            }}
          >
            <Save size={14} />
            {isPending ? 'Saving settings...' : 'Save Configuration'}
          </button>
        </div>
      </form>

      {/* Section 3: Court Status Control (Open/Close Courts) */}
      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '8px'
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
          <Power size={16} color="var(--color-danger)" />
          Court Status Control (Open / Close Courts)
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0 }}>
          Temporarily close courts for maintenance, cleanups, or reservations. Closed courts will be blocked from match rotations on the Kiosk.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '8px' }}>
          {courts.map(court => {
            const isClosed = court.status === 'MAINTENANCE'
            const isToggling = togglePendingId === court.id

            return (
              <div
                key={court.id}
                style={{
                  padding: '12px 14px',
                  background: isClosed ? 'rgba(239, 68, 68, 0.02)' : 'rgba(16, 185, 129, 0.02)',
                  border: `1.5px solid ${isClosed ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    Court {court.number}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 850,
                    textTransform: 'uppercase',
                    color: isClosed ? '#ef4444' : '#10b981'
                  }}>
                    {isClosed ? '🔴 Offline / Closed' : '🟢 Active / Open'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={isToggling || isPending}
                  onClick={() => handleToggleCourt(court.id)}
                  style={{
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    background: isClosed ? 'var(--color-success)' : 'var(--color-danger)',
                    color: 'white',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 750,
                    cursor: (isToggling || isPending) ? 'not-allowed' : 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    opacity: (isToggling || isPending) ? 0.7 : 1,
                    transition: 'all var(--duration-fast)',
                    minWidth: '85px',
                    textAlign: 'center'
                  }}
                >
                  {isToggling ? 'Toggling...' : isClosed ? 'Open Court' : 'Close Court'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
