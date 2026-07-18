'use client'

import { useState, useTransition } from 'react'
import { registerUserByAdminAction } from '@/lib/actions/admin'
import { Users, Search, Plus, UserCheck, ShieldAlert, ShieldCheck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'PLAYER',
    membership: 'STANDARD',
    duprRating: '3.0',
    credits: '0'
  })

  // Filtered Users List
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
        setFormData({
          name: '',
          email: '',
          password: '',
          role: 'PLAYER',
          membership: 'STANDARD',
          duprRating: '3.0',
          credits: '0'
        })
      } else {
        setMessage({ success: false, text: result.error || 'Failed to create user account.' })
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
      {/* Header section */}
      <div>
        <Link href="/dashboard/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)', textDecoration: 'none', marginBottom: '12px', fontWeight: 600 }}>
          <ArrowLeft size={14} /> Back to Kiosk
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          User Management
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
          Create and manage club players, staff, and admin accounts.
        </p>
      </div>

      {/* Message Notifications */}
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
          {message.success ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Core Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Side: Create User Form */}
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-sm)',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} color="var(--color-primary)" />
            Register User Account
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                style={{
                  height: '38px', padding: '0 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text-primary)',
                  fontSize: '13px', outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Email Address</label>
              <input
                type="email"
                required
                placeholder="e.g. john@domain.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                style={{
                  height: '38px', padding: '0 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text-primary)',
                  fontSize: '13px', outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Password</label>
              <input
                type="password"
                required
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                style={{
                  height: '38px', padding: '0 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text-primary)',
                  fontSize: '13px', outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Account Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                style={{
                  height: '38px', padding: '0 10px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text-primary)',
                  fontSize: '13px', outline: 'none', cursor: 'pointer'
                }}
              >
                <option value="PLAYER">Player (Club Member)</option>
                <option value="STAFF">Staff (Kiosk Manager)</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>

            {formData.role === 'PLAYER' && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Membership Tier</label>
                  <select
                    value={formData.membership}
                    onChange={e => setFormData({ ...formData, membership: e.target.value })}
                    style={{
                      height: '38px', padding: '0 10px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text-primary)',
                      fontSize: '13px', outline: 'none', cursor: 'pointer'
                    }}
                  >
                    <option value="STANDARD">Standard Member</option>
                    <option value="PRO">Pro Member</option>
                    <option value="VIP">VIP Member</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>DUPR Rating</label>
                    <input
                      type="number"
                      step="0.01"
                      min="2.0"
                      max="8.0"
                      value={formData.duprRating}
                      onChange={e => setFormData({ ...formData, duprRating: e.target.value })}
                      style={{
                        height: '38px', padding: '0 12px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text-primary)',
                        fontSize: '13px', outline: 'none'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Initial Balance (₱)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.credits}
                      onChange={e => setFormData({ ...formData, credits: e.target.value })}
                      style={{
                        height: '38px', padding: '0 12px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text-primary)',
                        fontSize: '13px', outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                height: '40px', marginTop: '8px', border: 'none', borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary)', color: 'white', fontSize: '13px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                boxShadow: 'var(--shadow-primary-btn)', transition: 'background var(--duration-fast)',
                opacity: isPending ? 0.75 : 1
              }}
            >
              <UserCheck size={16} />
              <span>{isPending ? 'Registering...' : 'Create Account'}</span>
            </button>
          </form>
        </div>

        {/* Right Side: Search and Registered Users List */}
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-sm)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* List header and search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--color-text-secondary)" />
              Registered Accounts ({users.length})
            </h2>

            {/* Search Input */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} color="var(--color-text-disabled)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search name, email, or role..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: '32px', padding: '0 12px 0 32px', borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)', fontSize: '12px', outline: 'none'
                }}
              />
            </div>
          </div>

          {/* User grid table (Scrollable, max 10 rows) */}
          <div style={{ 
            overflowX: 'auto', 
            overflowY: 'auto', 
            maxHeight: '620px', 
            border: '1px solid var(--color-border)', 
            borderRadius: 'var(--radius-md)' 
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '550px' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Details</th>
                  <th style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Date Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--color-text-disabled)', fontSize: '13px' }}>
                      No matching registered users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const isPlayer = user.role === 'PLAYER'
                    const isStaff = user.role === 'STAFF'
                    const isAdmin = user.role === 'ADMIN'

                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {user.name}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {user.email}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '9px', fontWeight: 850, textTransform: 'uppercase',
                            background: isAdmin ? 'rgba(239, 68, 68, 0.1)' : isStaff ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            color: isAdmin ? '#ef4444' : isStaff ? '#d97706' : '#10b981',
                            padding: '2px 6px', borderRadius: 'var(--radius-sm)'
                          }}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {isPlayer ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span>Tier: <strong>{user.membership}</strong></span>
                              <span>DUPR: <strong>{user.duprRating.toFixed(2)}</strong></span>
                              <span>Bal: <strong>₱{user.credits.toFixed(2)}</strong></span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-disabled)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          {new Date(user.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
