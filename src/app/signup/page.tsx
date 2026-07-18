'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Eye, EyeOff, Sparkles, ArrowRight } from 'lucide-react'
import { signUpAction } from '@/lib/actions/auth'
import { SignInModal } from '@/components/auth/signin-modal'
import { signIn } from 'next-auth/react'

export default function SignUpPage() {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0 && data.user) {
          router.push('/dashboard')
        }
      })
      .catch(err => console.error(err))
  }, [router])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }

  const allRulesMet = rules.length && rules.uppercase && rules.number

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!allRulesMet) {
      setError('Please fulfill all password requirements')
      return
    }

    startTransition(async () => {
      const { sendOtpAction } = await import('@/lib/actions/auth')
      const result = await sendOtpAction(email)
      if (result.success) {
        setOtpStep(true)
      } else {
        setError(result.error)
      }
    })
  }

  const handleVerifyAndSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (otpCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    startTransition(async () => {
      const { signUpWithOtpAction } = await import('@/lib/actions/auth')
      const formData = new FormData()
      formData.append('name', name)
      formData.append('email', email)
      formData.append('password', password)

      const result = await signUpWithOtpAction(formData, otpCode)
      if (result.success) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="signup-root">
      {/* Left branding panel */}
      <div className="signup-left animate-fade-in">
        <div className="signup-left-inner">
          {/* Logo */}
          <Link href="/" className="signup-logo-link">
            <img src="/paddleyard-logo.png" alt="PaddleYard Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <span className="signup-logo-text">PaddleYard</span>
          </Link>

          {/* Main copy */}
          <div className="signup-left-copy">
            <div className="signup-badge">
              <Sparkles size={11} />
              <span>Premium Pickleball Club</span>
            </div>
            <h1 className="signup-left-title">
              Play more,<br />
              <span className="signup-left-title-accent">wait less.</span>
            </h1>
            <p className="signup-left-desc">
              Join thousands booking courts, tracking play hours, and rising the queues in real-time.
            </p>
          </div>

          {/* Feature bullets */}
          <ul className="signup-feature-list">
            {[
              'Real-time court scheduler (Courts 1–14)',
              'Live check-in QR scan at the lobby',
              'Collaborative Paddle Stack queue boards',
              'Easy top-ups and reservation ledger',
            ].map((feat) => (
              <li key={feat} className="signup-feature-item">
                <span className="signup-feature-dot" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative elements */}
        <div className="signup-deco-circle signup-deco-circle-1" />
        <div className="signup-deco-circle signup-deco-circle-2" />
      </div>

      {/* Right form panel */}
      <div className="signup-right">
        <div className="signup-form-wrap">
          {/* Mobile-only logo */}
          <Link href="/" className="signup-logo-link signup-logo-mobile">
            <img src="/paddleyard-logo.png" alt="PaddleYard Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <span className="signup-logo-text">PaddleYard</span>
          </Link>

          {/* Heading */}
          <div className="signup-form-header">
            <h2 className="signup-form-title">{otpStep ? 'Verify your email' : 'Create your account'}</h2>
            <p className="signup-form-subtitle">{otpStep ? 'Verification code sent to Gmail.' : 'Book your court and start playing in seconds.'}</p>
          </div>

          {/* Social auth */}
          <div className="signup-social-row">
            <button
              type="button"
              disabled={isGoogleLoading || isPending}
              onClick={() => {
                setIsGoogleLoading(true)
                signIn('google', { callbackUrl: '/dashboard' })
              }}
              className="signup-social-btn"
              style={{ opacity: isGoogleLoading ? 0.7 : 1, cursor: isGoogleLoading ? 'not-allowed' : 'pointer' }}
            >
              {isGoogleLoading ? (
                <div className="spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="signup-divider">
            <div className="signup-divider-line" />
            <span className="signup-divider-text">or</span>
            <div className="signup-divider-line" />
          </div>

          {/* Error */}
          {error && (
            <div className="signup-error animate-fade-in">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {otpStep ? (
            <form onSubmit={handleVerifyAndSignUp} className="signup-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  We sent a 6-digit verification code to <strong>{email}</strong>. Please enter the code below to complete signup.
                </p>
                <div style={{ fontSize: '11px', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', marginTop: '4px' }}>
                  💡 <em>For testing, the code is also printed in your server logs!</em>
                </div>
              </div>

              <div className="signup-field">
                <label className="signup-label">Verification Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="signup-input"
                  style={{ textAlign: 'center', fontSize: '18px', fontWeight: 800, letterSpacing: '4px' }}
                />
              </div>

              <button
                type="submit"
                disabled={isPending || otpCode.length !== 6}
                className={`signup-submit-btn ${otpCode.length === 6 && !isPending ? 'signup-submit-btn-active' : ''}`}
                style={{ marginTop: '12px' }}
              >
                {isPending ? <span>Verifying...</span> : <span>Verify & Complete Sign Up</span>}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px' }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setOtpStep(false)
                    setOtpCode('')
                    setError(null)
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                >
                  ← Go Back
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const { sendOtpAction } = await import('@/lib/actions/auth')
                      const result = await sendOtpAction(email)
                      if (result.success) {
                        setError('A new verification code has been generated and sent.')
                      } else {
                        setError(result.error)
                      }
                    })
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 700 }}
                >
                  Resend Code
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRequestOtp} className="signup-form">
              <div className="signup-field">
                <label className="signup-label">Full name</label>
                <input
                  type="text"
                  required
                  placeholder="Arjay Escabas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="signup-input"
                />
              </div>

              <div className="signup-field">
                <label className="signup-label">Email address</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="signup-input"
                />
              </div>

              <div className="signup-field">
                <label className="signup-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="signup-input"
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="signup-eye-btn"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Password strength indicators */}
                {password.length > 0 && (
                  <div className="signup-rules">
                    {[
                      { ok: rules.length, label: '8+ characters' },
                      { ok: rules.uppercase, label: 'Uppercase letter' },
                      { ok: rules.number, label: 'Number' },
                    ].map(({ ok, label }) => (
                      <div key={label} className={`signup-rule ${ok ? 'signup-rule-ok' : ''}`}>
                        <Check size={11} strokeWidth={ok ? 3 : 2} />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isPending}
                className={`signup-submit-btn ${allRulesMet && !isPending ? 'signup-submit-btn-active' : ''}`}
              >
                {isPending ? (
                  <span>Creating account…</span>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="signup-footer-text">
            Already have an account?{' '}
            <button
              onClick={() => setIsSignInOpen(true)}
              className="signup-link-btn"
            >
              Sign in
            </button>
          </p>

          <p className="signup-legal-text">
            By creating an account, you agree to our{' '}
            <a href="#" className="signup-legal-link">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="signup-legal-link">Privacy Policy</a>.
          </p>
        </div>
      </div>

      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
      />

      <style>{`
        .signup-root {
          min-height: 100vh;
          display: flex;
          background: var(--color-bg-primary);
        }

        /* ── Left panel ── */
        .signup-left {
          position: relative;
          width: 42%;
          background: var(--color-primary);
          display: flex;
          align-items: stretch;
          overflow: hidden;
          flex-shrink: 0;
        }

        .signup-left-inner {
          position: relative;
          z-index: 5;
          padding: 48px 52px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          width: 100%;
        }

        /* Decorative soft circles on left panel */
        .signup-deco-circle {
          position: absolute;
          border-radius: var(--radius-full);
          pointer-events: none;
          background: rgba(255, 255, 255, 0.04);
        }
        .signup-deco-circle-1 {
          width: 450px;
          height: 450px;
          bottom: -150px;
          right: -120px;
          z-index: 1;
        }
        .signup-deco-circle-2 {
          width: 280px;
          height: 280px;
          top: -90px;
          left: -70px;
          z-index: 1;
        }

        /* Logo badge */
        .logo-badge {
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .logo-badge-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
          background: var(--color-accent);
        }

        .signup-logo-link {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
        }
        .signup-logo-text {
          font-size: 18px;
          font-weight: 700;
          color: white;
          letter-spacing: -0.02em;
        }

        /* Left copy */
        .signup-left-copy {
          display: flex;
          flex-direction: column;
          gap: 20px;
          margin-top: 64px;
        }

        .signup-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.9);
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          width: fit-content;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .signup-left-title {
          font-size: 40px;
          font-weight: 800;
          color: white;
          line-height: 1.1;
          letter-spacing: -0.025em;
          margin: 0;
        }
        .signup-left-title-accent {
          color: var(--color-accent);
        }

        .signup-left-desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 0;
          max-width: 320px;
        }

        /* Feature bullets */
        .signup-feature-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .signup-feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.8);
        }
        .signup-feature-dot {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
          background: var(--color-accent);
          flex-shrink: 0;
        }

        /* ── Right panel ── */
        .signup-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          overflow-y: auto;
        }

        .signup-form-wrap {
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Mobile-only logo */
        .signup-logo-mobile {
          display: none;
        }
        .dark-badge {
          background: var(--color-primary-subtle);
          color: var(--color-primary);
          border-color: var(--color-primary-muted);
        }
        .signup-logo-mobile .signup-logo-text {
          color: var(--color-text-primary);
        }

        /* Form header */
        .signup-form-header {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .signup-form-title {
          font-size: 26px;
          font-weight: 800;
          color: var(--color-text-primary);
          letter-spacing: -0.02em;
          margin: 0;
        }
        .signup-form-subtitle {
          font-size: 14px;
          color: var(--color-text-secondary);
          margin: 0;
        }

        /* Social buttons */
        .signup-social-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .signup-social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          height: 42px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-primary);
          cursor: pointer;
          transition: background var(--duration-fast) var(--ease-out), border-color var(--duration-fast);
          font-family: inherit;
        }
        .signup-social-btn:hover {
          background: var(--color-surface);
          border-color: var(--color-border-hover);
        }

        /* Divider */
        .signup-divider {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .signup-divider-line {
          flex: 1;
          height: 1px;
          background: var(--color-border);
        }
        .signup-divider-text {
          font-size: 11px;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          flex-shrink: 0;
        }

        /* Error */
        .signup-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-danger-subtle);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-md);
          padding: 10px 12px;
          font-size: 12px;
          color: var(--color-danger);
          font-weight: 500;
        }

        /* Form */
        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .signup-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .signup-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .signup-input {
          width: 100%;
          height: 42px;
          padding: 0 14px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 14px;
          font-family: inherit;
          color: var(--color-text-primary);
          transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
          outline: none;
        }
        .signup-input::placeholder {
          color: var(--color-text-disabled);
        }
        .signup-input:focus {
          border-color: var(--color-primary);
          box-shadow: var(--shadow-focus);
        }

        /* Password eye toggle */
        .signup-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--color-text-secondary);
          padding: 0;
          display: flex;
          align-items: center;
          transition: color var(--duration-fast);
        }
        .signup-eye-btn:hover {
          color: var(--color-text-primary);
        }

        /* Password rules */
        .signup-rules {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .signup-rule {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: var(--color-text-disabled);
          transition: color var(--duration-fast);
        }
        .signup-rule-ok {
          color: var(--color-success);
        }

        /* Submit button */
        .signup-submit-btn {
          width: 100%;
          height: 44px;
          background: var(--color-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: var(--shadow-primary-btn);
          transition: background var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast), opacity var(--duration-fast);
          margin-top: 4px;
          opacity: 0.85;
        }
        .signup-submit-btn-active {
          opacity: 1;
        }
        .signup-submit-btn:hover:not(:disabled) {
          background: var(--color-primary-hover);
        }
        .signup-submit-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Footer text */
        .signup-footer-text {
          font-size: 13px;
          color: var(--color-text-secondary);
          text-align: center;
          margin: 0;
        }
        .signup-link-btn {
          background: transparent;
          border: none;
          color: var(--color-primary);
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          padding: 0;
          font-family: inherit;
        }
        .signup-link-btn:hover {
          text-decoration: underline;
        }

        .signup-legal-text {
          font-size: 11px;
          color: var(--color-text-secondary);
          text-align: center;
          line-height: 1.5;
          margin: 0;
        }
        .signup-legal-link {
          color: var(--color-primary);
          text-decoration: none;
        }
        .signup-legal-link:hover {
          text-decoration: underline;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .signup-root {
            flex-direction: column;
          }
          .signup-left {
            display: none;
          }
          .signup-logo-mobile {
            display: flex;
          }
          .signup-right {
            padding: 40px 24px;
            align-items: flex-start;
          }
          .signup-form-wrap {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
