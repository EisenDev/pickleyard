import { db } from '@/lib/db'
import { ResetPasswordClient } from './reset-password-client'
import Link from 'next/link'

interface PageProps {
  searchParams: Promise<{
    token?: string
  }>
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams
  const token = resolvedParams.token || ''

  if (!token) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: '24px', background: '#f8fafc', fontFamily: 'sans-serif'
      }}>
        <div style={{
          background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px',
          padding: '40px 32px', maxWidth: '420px', width: '100%', textAlign: 'center',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
          }}>
            <span style={{ fontSize: '28px' }}>⚠️</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '0 0 10px' }}>Invalid Request</h2>
          <p style={{ fontSize: '14.5px', color: '#475569', margin: '0 0 24px', lineHeight: 1.6 }}>
            No password reset token was provided, or the link is invalid. Please request a new link from the sign-in modal.
          </p>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '42px',
            padding: '0 24px', background: '#007C80', color: 'white', borderRadius: '10px',
            fontSize: '14px', fontWeight: 700, textDecoration: 'none', transition: 'all 150ms'
          }}>
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  // Verify token exists and is not expired
  const tokenRecord = await db.verificationToken.findUnique({
    where: { token }
  })

  const isValid = tokenRecord && new Date() <= tokenRecord.expires

  return (
    <ResetPasswordClient token={token} isValid={!!isValid} />
  )
}
