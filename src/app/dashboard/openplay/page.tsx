import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { QrCode, ShieldAlert, ShieldCheck, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function OpenPlayPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await db.user.findUnique({
    where: { email: session.user.email }
  })
  if (!user) return null

  // Fetch current user's active queue stack status
  const userQueue = await db.paddleStack.findFirst({
    where: {
      userId: user.id,
      status: { in: ['PENDING', 'WAITING', 'PLAYING', 'MATCHED'] }
    }
  })

  const openPlayCost = 150
  const isBalanceLow = Number(user.credits) < openPlayCost && userQueue?.paymentMethod !== 'CASH'

  const activeCourt = userQueue?.courtId
    ? await db.court.findUnique({ where: { id: userQueue.courtId } })
    : null

  const isQueued = !!userQueue

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Open Play Check-in
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: 4, margin: '4px 0 0' }}>
          Join our active open play sessions! Present your QR Code to the front desk staff or scan at the kiosk.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="open-play-grid">
        {/* Left Side: QR Code Panel (Avenor Style) */}
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: isQueued ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>
            <QrCode size={18} />
            <span>YOUR CHECK-IN QR PASS</span>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '-8px 0 0' }}>
            Current Balance: <strong style={{ color: 'var(--color-text-primary)', fontSize: '15px' }}>₱{Number(user.credits).toFixed(2)}</strong>
          </div>

          {isBalanceLow && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-danger-subtle)',
                color: 'var(--color-danger)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 650
              }}
            >
              <ShieldAlert size={14} />
              <span>Insufficient credits for check-in (₱150 needed)</span>
            </div>
          )}

          {userQueue?.paymentMethod === 'CASH' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(245, 158, 11, 0.08)',
                color: '#d97706',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 650
              }}
            >
              <Clock size={14} />
              <span>Pending counter cash payment (₱150 needed)</span>
            </div>
          )}

          {/* QR Code Graphic Container */}
          <div style={{ position: 'relative', width: '240px', height: '240px' }}>
            <div
              style={{
                width: '240px',
                height: '240px',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                opacity: (isBalanceLow || !isQueued) ? 0.25 : 1,
                filter: !isQueued ? 'blur(5px)' : 'none',
                transition: 'all var(--duration-normal)',
                boxSizing: 'border-box'
              }}
            >
              {isQueued && userQueue?.qrId ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${userQueue.qrId}`}
                  alt="Open Play QR Pass"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  backgroundImage: 'radial-gradient(var(--color-primary) 30%, transparent 30%), radial-gradient(var(--color-primary) 30%, transparent 30%)',
                  backgroundSize: '10px 10px',
                  backgroundPosition: '0 0, 5px 5px'
                }} />
              )}
            </div>

            {/* Overlay button if NOT queued */}
            {!isQueued && (
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Link
                  href="/dashboard/paddlestack"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: 'var(--shadow-primary-btn)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Join Queue <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              {user.name}
            </h3>
            <span style={{ fontSize: '11.5px', color: isQueued ? 'var(--color-success)' : 'var(--color-text-disabled)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {isQueued ? `QR ID: ${userQueue.qrId}` : 'QR ID: Inactive'}
            </span>
          </div>

          {/* Dynamic Stacking Status Display */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {isQueued ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Active Queue Status:</span>
                {userQueue.status === 'PLAYING' ? (
                  <span style={{
                    background: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)',
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--color-primary-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Clock size={12} />
                    Playing on {activeCourt?.name || 'Court'}
                  </span>
                ) : userQueue.status === 'PENDING' ? (
                  <span style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    color: '#d97706',
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <ShieldAlert size={12} />
                    Unpaid - Pending scan at Kiosk
                  </span>
                ) : (
                  <span style={{
                    background: 'var(--color-success-subtle)',
                    color: 'var(--color-success)',
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <ShieldCheck size={12} />
                    Already in the Lobby
                  </span>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldAlert size={12} />
                  Queue Inactive
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-disabled)' }}>
                  Join the stack to activate your check-in pass.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Rates & Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Cost breakdown */}
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 16px' }}>
              How to Join Open Play
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center', background: 'var(--color-surface)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>☀️ Day rate</span>
                <div style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-primary)', marginTop: '4px' }}>₱150</div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)' }}>Per session block</span>
              </div>
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '14px', textAlign: 'center', background: 'var(--color-surface)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>🌙 Night rate</span>
                <div style={{ fontSize: '20px', fontWeight: 850, color: 'var(--color-accent)', marginTop: '4px' }}>₱150</div>
                <span style={{ fontSize: '10px', color: 'var(--color-text-disabled)' }}>Per session block</span>
              </div>
            </div>

            <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <li><strong>Verify balance:</strong> Make sure you have at least ₱150 credit.</li>
              <li><strong>Join the stack queue:</strong> Tap the Join Queue button to choose your skill level.</li>
              <li><strong>Present QR code:</strong> Show the active QR pass to staff at the counter.</li>
              <li><strong>Get checked in:</strong> Session rate is deducted from your balance.</li>
            </ul>
          </div>

          {/* Stacking Rules */}
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>
              Paddle Stacking Rules
            </h3>
            <ul style={{ paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <li><strong>3-Hour Session:</strong> Pass remains active for 3 hours.</li>
              <li><strong>Active Play Rotation:</strong> Automated matchmaking on Court 1 and 2.</li>
              <li><strong>15-Min Playtime:</strong> Timer counts down automatically.</li>
              <li><strong>Fair Rotation:</strong> Automated matchmaker selects waiting stack FIFO players.</li>
            </ul>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .open-play-grid {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  )
}
