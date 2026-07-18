'use client'

import { useState } from 'react'
import { User, Award, QrCode, Camera, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Props {
  user: {
    id: string
    name: string | null
    email: string
    duprRating: number
    credits: number
    membership: string
    createdAt: Date
  }
}

type Tab = 'info' | 'membership' | 'clubid'

const MEMBERSHIP_BADGES: Record<string, { color: string; bg: string; label: string }> = {
  STANDARD: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Standard Member' },
  PRO:      { color: 'var(--color-primary)', bg: 'var(--color-primary-subtle)', label: 'Pro Member' },
  VIP:      { color: 'var(--color-accent)', bg: 'var(--color-accent-subtle)', label: 'VIP Member' },
}

export function ProfileClient({ user }: Props) {
  const [tab, setTab] = useState<Tab>('info')

  const membership = MEMBERSHIP_BADGES[user.membership] || MEMBERSHIP_BADGES.STANDARD
  const initials = (user.name || user.email).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const skillLabel = user.duprRating >= 4.0 ? 'Advanced' : user.duprRating >= 3.0 ? 'Intermediate' : 'Novice'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: 820 }} className="animate-fade-up">
      {/* Back and Header */}
      <div>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: '12px', fontWeight: 600 }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>My Profile</h1>
            <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
              Manage your personal details, membership tier, and digital club pass.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '0' }}>
        {([
          { id: 'info', label: 'Profile Information', icon: User },
          { id: 'membership', label: 'Membership', icon: Award },
          { id: 'clubid', label: 'Club ID Card', icon: QrCode },
        ] as { id: Tab; label: string; icon: any }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', fontSize: '13px', fontWeight: 600,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              transition: 'all var(--duration-fast)',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Info Tab */}
      {tab === 'info' && (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '32px', boxShadow: 'var(--shadow-sm)' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), #005F63)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: 800, color: 'white',
                border: '3px solid var(--color-border)'
              }}>
                {initials}
              </div>
              <button style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-primary)', border: '2px solid var(--color-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}>
                <Camera size={12} color="white" />
              </button>
            </div>
            <button style={{ marginTop: '12px', padding: '6px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-primary)', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              Choose Picture
            </button>
            <span style={{ fontSize: '11px', color: 'var(--color-text-disabled)', marginTop: '6px' }}>JPG, PNG or GIF. Max 10MB.</span>
          </div>

          {/* Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }} className="profile-fields-grid">
            {[
              { label: 'First Name', value: user.name?.split(' ')[0] || '' },
              { label: 'Last Name', value: user.name?.split(' ').slice(1).join(' ') || '' },
              { label: 'Email', value: user.email },
              { label: 'Phone Number', value: '' },
              { label: 'DUPR ID (optional)', value: '', placeholder: 'Your DUPR player ID', fullWidth: true },
            ].map(field => (
              <div key={field.label} style={{ gridColumn: field.fullWidth ? '1 / -1' : undefined }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                  {field.label}
                </label>
                <input
                  type="text"
                  defaultValue={field.value}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%', height: '40px', padding: '0 12px',
                    borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                    fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ marginTop: '20px', padding: '12px 16px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            ℹ️ <strong>Need to update your name, email, or phone number?</strong> Please contact an admin to change your registered details.
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block' }}>Credits</label>
            <input
              readOnly
              value={`₱${user.credits.toFixed(2)}`}
              style={{
                width: '100%', height: '40px', padding: '0 12px', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text-secondary)', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>
      )}

      {/* Membership Tab */}
      {tab === 'membership' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #005F63 100%)',
            borderRadius: 'var(--radius-xl)', padding: '32px', color: 'white',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>MEMBERSHIP TIER</div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px' }}>{membership.label}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
                Member since {new Date(user.createdAt).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>DUPR Rating</div>
              <div style={{ fontSize: '36px', fontWeight: 800 }}>{user.duprRating.toFixed(2)}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 700 }}>{skillLabel}</div>
            </div>
          </div>

          {/* Benefits */}
          <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '16px', margin: '0 0 16px' }}>Membership Benefits</h3>
            {[
              { label: 'Priority court bookings', included: user.membership !== 'STANDARD' },
              { label: 'Discounted session rates', included: user.membership === 'VIP' },
              { label: 'Access to all open play courts', included: true },
              { label: 'Paddle Stack queue access', included: true },
              { label: 'Event early registration', included: user.membership !== 'STANDARD' },
              { label: 'Monthly credits bonus', included: user.membership === 'VIP' },
            ].map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                <span style={{ fontSize: '14px' }}>{b.included ? '✅' : '❌'}</span>
                <span style={{ fontSize: '14px', color: b.included ? 'var(--color-text-primary)' : 'var(--color-text-disabled)', fontWeight: b.included ? 600 : 400 }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Club ID Tab */}
      {tab === 'clubid' && (
        <div style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '32px', boxShadow: 'var(--shadow-sm)', maxWidth: 480, margin: '0 auto', width: '100%' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', textAlign: 'center', marginBottom: '24px', margin: '0 0 24px' }}>
            PaddleYard Club ID Card
          </h3>

          {/* Club ID Card */}
          <div style={{
            background: 'linear-gradient(135deg, var(--color-primary), #005F63)',
            borderRadius: 'var(--radius-xl)', padding: '24px',
            color: 'white', marginBottom: '24px',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <img src="/paddleyard-logo.png" alt="PaddleYard" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <span style={{
                fontSize: '10px', fontWeight: 800, padding: '2px 8px',
                background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-full)',
                color: 'var(--color-accent)'
              }}>
                {user.membership} MEMBER
              </span>
            </div>

            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{user.name}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                Member ID: {user.id.substring(0, 12).toUpperCase()}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>DUPR RATING</div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{user.duprRating.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>SKILL LEVEL</div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>{skillLabel}</div>
              </div>
            </div>
          </div>

          {/* QR code placeholder */}
          <div style={{ textAlign: 'center', padding: '16px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <QrCode size={80} color="var(--color-primary)" style={{ margin: '0 auto' }} />
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>Scan to check in at lobby kiosk</div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          .profile-fields-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
