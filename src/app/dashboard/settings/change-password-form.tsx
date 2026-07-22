'use client'

import { useState, useTransition } from 'react'
import { changePasswordAction } from '@/lib/actions/auth'
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react'

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    const formData = new FormData(e.currentTarget)

    const newPass = formData.get('newPassword') as string
    const confirmPass = formData.get('confirmNewPassword') as string

    if (newPass !== confirmPass) {
      setMessage({ success: false, text: 'New passwords do not match.' })
      return
    }

    startTransition(async () => {
      const res = await changePasswordAction(formData)
      if (res.success) {
        setMessage({ success: true, text: 'Password changed successfully!' })
        const form = e.target as HTMLFormElement
        form.reset()
      } else {
        setMessage({ success: false, text: res.error })
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    height: '42px', padding: '0 14px',
    borderRadius: '10px', border: '1px solid var(--color-border)',
    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
    fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box',
    transition: 'border-color var(--duration-fast)',
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <KeyRound size={15} color="var(--color-primary)" />
        Change Password
      </h2>

      {message && (
        <div style={{
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
        }}>
          {message.success ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Password
          </label>
          <input type="password" name="currentPassword" required style={inputStyle} placeholder="Enter your current password" />
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            New Password
          </label>
          <input type="password" name="newPassword" required style={inputStyle} placeholder="At least 8 characters, 1 uppercase letter, 1 number" />
        </div>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Confirm New Password
          </label>
          <input type="password" name="confirmNewPassword" required style={inputStyle} placeholder="Confirm your new password" />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="submit"
          disabled={isPending}
          style={{
            height: '40px',
            padding: '0 24px',
            borderRadius: 'var(--radius-lg)',
            border: 'none',
            background: 'var(--color-primary)',
            color: 'white',
            fontSize: '13px',
            fontWeight: 700,
            cursor: isPending ? 'not-allowed' : 'pointer',
            boxShadow: 'var(--shadow-primary-btn)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isPending ? 0.7 : 1,
            transition: 'all var(--duration-fast)'
          }}
        >
          {isPending ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </form>
  )
}
