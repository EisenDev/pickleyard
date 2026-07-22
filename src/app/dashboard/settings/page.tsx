import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { User, Mail, Star, Crown, CreditCard, Calendar } from 'lucide-react'
import { ChangePasswordForm } from './change-password-form'

export const dynamic = 'force-dynamic'

const TIER_STYLE: Record<string, { color: string; bg: string; gradient: string; label: string }> = {
  STANDARD: { color: '#6b7280', bg: 'rgba(107,114,128,0.10)', gradient: 'linear-gradient(135deg,#4b5563,#6b7280)', label: 'Standard Member' },
  PRO:      { color: '#0284c7', bg: 'rgba(2,132,199,0.10)',   gradient: 'linear-gradient(135deg,var(--color-primary),#005F63)', label: 'Pro Member' },
  VIP:      { color: '#d97706', bg: 'rgba(217,119,6,0.10)',   gradient: 'linear-gradient(135deg,#d97706,#92400e)', label: 'VIP Member' },
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return null

  const isAdmin = user.role === 'ADMIN' || user.role === 'STAFF'
  const tier = TIER_STYLE[user.membership] ?? TIER_STYLE.STANDARD
  const displayDupr = user.duprRating && user.duprRating > 0 ? user.duprRating : 3.0
  const skillLabel = displayDupr >= 4.0 ? 'Advanced' : displayDupr >= 3.0 ? 'Intermediate' : 'Novice'
  const initials = (user.name || user.email).split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const fieldStyle: React.CSSProperties = {
    height: '42px', padding: '0 14px',
    borderRadius: '10px', border: '1px solid var(--color-border)',
    background: 'var(--color-surface)', color: 'var(--color-text-secondary)',
    fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Club Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
          Your account details and club membership information.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Identity card */}
        <div style={{
          background: tier.gradient, borderRadius: '20px',
          padding: '28px', color: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '20px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: 800, color: 'white',
              border: '2px solid rgba(255,255,255,0.35)', flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800 }}>{user.name || 'Club Member'}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>{user.email}</div>
              <div style={{ marginTop: '6px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', background: 'rgba(255,255,255,0.18)', padding: '3px 10px', borderRadius: '999px' }}>
                  {isAdmin ? user.role : tier.label}
                </span>
                {!isAdmin && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                    {skillLabel} · {displayDupr.toFixed(2)} DUPR
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)', marginBottom: '4px' }}>MEMBER ID</div>
            <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {user.id.substring(0, 14).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Account details grid */}
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: '18px', padding: '24px', boxShadow: 'var(--shadow-sm)'
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={15} color="var(--color-primary)" />
            Account Information
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }} className="settings-grid">
            {/* Name */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Full Name
              </label>
              <input type="text" readOnly value={user.name || '—'} style={fieldStyle} />
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <input type="email" readOnly value={user.email} style={fieldStyle} />
            </div>

            {/* Role */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Account Role
              </label>
              <input type="text" readOnly value={user.role} style={fieldStyle} />
            </div>

            {/* Joined */}
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Member Since
              </label>
              <input type="text" readOnly value={new Date(user.createdAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} style={fieldStyle} />
            </div>

            {/* DUPR (players only) */}
            {!isAdmin && (
              <>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    DUPR Rating
                  </label>
                  <input type="text" readOnly value={`${displayDupr.toFixed(2)} — ${skillLabel}`} style={fieldStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Membership Tier
                  </label>
                  <input type="text" readOnly value={tier.label} style={fieldStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Credit Balance
                  </label>
                  <input type="text" readOnly value={`₱${Number(user.credits).toFixed(2)}`} style={{ ...fieldStyle, color: 'var(--color-primary)', fontWeight: 700 }} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Change Password box */}
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: '18px', padding: '24px', boxShadow: 'var(--shadow-sm)'
        }}>
          <ChangePasswordForm />
        </div>

        {/* Read-only notice */}
        <div style={{
          padding: '14px 18px', borderRadius: '12px',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          fontSize: '13px', color: 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'flex-start', gap: '10px'
        }}>
          <span style={{ fontSize: '16px', lineHeight: 1 }}>ℹ️</span>
          <span>
            <strong>Account details are managed by an admin.</strong> To update your name, email, or membership tier, please contact the club administrator.
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .settings-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
