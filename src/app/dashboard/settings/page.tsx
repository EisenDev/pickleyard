import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await db.user.findUnique({
    where: { email: session.user.email }
  })
  if (!user) return null

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '32px', boxShadow: 'var(--shadow-sm)' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '24px', letterSpacing: '-0.02em' }}>
        Club Profile Settings
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Full Name</label>
          <input
            type="text"
            readOnly
            value={user.name || ''}
            style={{ width: '100%', height: '38px', padding: '0 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-secondary)', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Email Address</label>
          <input
            type="email"
            readOnly
            value={user.email}
            style={{ width: '100%', height: '38px', padding: '0 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-secondary)', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>DUPR Rating</label>
          <input
            type="text"
            readOnly
            value={user.duprRating.toFixed(2)}
            style={{ width: '100%', height: '38px', padding: '0 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-secondary)', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Membership Tier</label>
          <input
            type="text"
            readOnly
            value={user.membership}
            style={{ width: '100%', height: '38px', padding: '0 12px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-secondary)', fontSize: '14px', outline: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
