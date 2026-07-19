'use client'

import { useState, useTransition } from 'react'
import { registerUserByAdminAction } from '@/lib/actions/admin'
import { Users, Search, Plus, UserCheck, ShieldAlert, ShieldCheck } from 'lucide-react'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  membership: string
  duprRating: number
  credits: number
  createdAt: string
}

interface Props {
  users: UserItem[]
}

export function UsersClient({ users }: Props) {
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PLAYER',
    membership: 'STANDARD',
    duprRating: '3.0',
    credits: '0'
  })

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    startTransition(async () => {
      const result = await registerUserByAdminAction({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        membership: formData.role === 'PLAYER' ? formData.membership : undefined,
        duprRating: formData.role === 'PLAYER' ? parseFloat(formData.duprRating) : undefined,
        credits: formData.role === 'PLAYER' ? parseFloat(formData.credits) : undefined
      })

      if (result.success) {
        setMessage({ success: true, text: `Successfully registered new ${formData.role.toLowerCase()} user!` })
        setFormData({ name: '', email: '', password: '', role: 'PLAYER', membership: 'STANDARD', duprRating: '3.0', credits: '0' })
      } else {
        setMessage({ success: false, text: result.error || 'Failed to create user account.' })
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    height: '40px', padding: '0 12px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box'
  }
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
    appearance: 'auto',
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
        {/* Page Header */}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            User Management
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
            Create and manage club players, staff, and admin accounts.
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px', borderRadius: 'var(--radius-md)',
            background: message.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            color: message.success ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${message.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            fontWeight: 650, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {message.success ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Responsive two-column layout — stacks on mobile */}
        <div className="users-layout">
          {/* Left: Create User Form */}
          <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', padding: '24px'
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="var(--color-primary)" />
              Register User Account
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Full Name</label>
                <input type="text" required placeholder="e.g. John Doe" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Email Address</label>
                <input type="email" required placeholder="e.g. john@domain.com" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Password</label>
                <input type="password" required placeholder="Minimum 6 characters" value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Account Role</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} style={selectStyle}>
                  <option value="PLAYER">Player (Club Member)</option>
                  <option value="STAFF">Staff (Kiosk Manager)</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              {formData.role === 'PLAYER' && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Membership Tier</label>
                    <select value={formData.membership} onChange={e => setFormData({ ...formData, membership: e.target.value })} style={selectStyle}>
                      <option value="STANDARD">Standard Member</option>
                      <option value="PRO">Pro Member</option>
                      <option value="VIP">VIP Member</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>DUPR Rating</label>
                      <input type="number" step="0.01" min="2.0" max="8.0" value={formData.duprRating}
                        onChange={e => setFormData({ ...formData, duprRating: e.target.value })} style={inputStyle} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Initial Balance (₱)</label>
                      <input type="number" step="1" min="0" value={formData.credits}
                        onChange={e => setFormData({ ...formData, credits: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" disabled={isPending} style={{
                height: '42px', marginTop: '8px', border: 'none', borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary)', color: 'white', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                boxShadow: 'var(--shadow-primary-btn)', opacity: isPending ? 0.75 : 1, width: '100%'
              }}>
                <UserCheck size={16} />
                <span>{isPending ? 'Registering...' : 'Create Account'}</span>
              </button>
            </form>
          </div>

          {/* Right: Users list */}
          <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={18} color="var(--color-text-secondary)" />
                Registered Accounts ({users.length})
              </h2>
              <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: '260px' }}>
                <Search size={14} color="var(--color-text-disabled)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="text" placeholder="Search name, email, or role..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', height: '34px', padding: '0 12px 0 32px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Mobile card list (shown on small screens) */}
            <div className="users-card-list">
              {filteredUsers.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-disabled)', fontSize: '13px', margin: 0 }}>
                  No matching registered users found.
                </p>
              ) : filteredUsers.map(user => {
                const isPlayer = user.role === 'PLAYER'
                const isStaff = user.role === 'STAFF'
                const isAdmin = user.role === 'ADMIN'
                const roleColor = isAdmin ? '#ef4444' : isStaff ? '#d97706' : '#10b981'
                const roleBg = isAdmin ? 'rgba(239,68,68,0.1)' : isStaff ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'
                return (
                  <div key={user.id} style={{ padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{user.name}</span>
                      <span style={{ fontSize: '9px', fontWeight: 850, textTransform: 'uppercase', background: roleBg, color: roleColor, padding: '2px 7px', borderRadius: 'var(--radius-sm)', flexShrink: 0, marginLeft: '8px' }}>
                        {user.role}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{user.email}</span>
                    {isPlayer && (
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Tier: <strong>{user.membership}</strong></span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>DUPR: <strong>{user.duprRating.toFixed(2)}</strong></span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Bal: <strong>₱{user.credits.toFixed(2)}</strong></span>
                      </div>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--color-text-disabled)' }}>
                      Joined {new Date(user.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Desktop table (hidden on small screens) */}
            <div className="users-table-wrap" style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '480px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Name', 'Email', 'Role', 'Details', 'Date Joined'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--color-text-disabled)', fontSize: '13px' }}>No matching registered users found.</td></tr>
                  ) : filteredUsers.map(user => {
                    const isPlayer = user.role === 'PLAYER'
                    const isStaff = user.role === 'STAFF'
                    const isAdmin = user.role === 'ADMIN'
                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>{user.name}</td>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--color-text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 850, textTransform: 'uppercase',
                            background: isAdmin ? 'rgba(239,68,68,0.1)' : isStaff ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                            color: isAdmin ? '#ef4444' : isStaff ? '#d97706' : '#10b981',
                            padding: '2px 6px', borderRadius: 'var(--radius-sm)'
                          }}>{user.role}</span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {isPlayer ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span>Tier: <strong>{user.membership}</strong></span>
                              <span>DUPR: <strong>{user.duprRating.toFixed(2)}</strong></span>
                              <span>Bal: <strong>₱{user.credits.toFixed(2)}</strong></span>
                            </div>
                          ) : <span style={{ color: 'var(--color-text-disabled)' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {new Date(user.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .users-layout {
          display: grid;
          grid-template-columns: minmax(300px, 360px) 1fr;
          gap: 24px;
          align-items: start;
        }
        /* Mobile card list visible, table hidden */
        .users-table-wrap { display: block; }
        .users-card-list { display: none; flex-direction: column; gap: 10px; }
        @media (max-width: 768px) {
          .users-layout {
            grid-template-columns: 1fr !important;
          }
          .users-table-wrap { display: none !important; }
          .users-card-list { display: flex !important; }
        }
      `}</style>
    </>
  )
}
