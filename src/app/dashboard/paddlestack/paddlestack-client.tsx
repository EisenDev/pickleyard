'use client'

import { useState, useTransition } from 'react'
import { joinPaddleStackAction, leavePaddleStackAction } from '@/lib/actions/paddlestack'
import { Layers, ShieldAlert, ArrowRight, ShieldCheck, Trash2 } from 'lucide-react'

interface StackItem {
  id: string
  userId: string
  userName: string | null
  skillLevel: 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'
  status: string
  joinedAt: Date
}

interface PaddleStackClientProps {
  queue: StackItem[]
  currentUserId: string
}

export function PaddleStackClient({ queue, currentUserId }: PaddleStackClientProps) {
  const [skillLevel, setSkillLevel] = useState<'NOVICE' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE')
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)

  // Find if current user is in the queue
  const userInQueue = queue.find((q) => q.userId === currentUserId)

  // Group queue by skill level
  const noviceQueue = queue.filter((q) => q.skillLevel === 'NOVICE')
  const intermediateQueue = queue.filter((q) => q.skillLevel === 'INTERMEDIATE')
  const advancedQueue = queue.filter((q) => q.skillLevel === 'ADVANCED')

  const handleJoin = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await joinPaddleStackAction(skillLevel)
      if (result.success) {
        setMessage({ success: true, text: 'Joined the paddle stack successfully!' })
      } else {
        setMessage({ success: false, text: result.error })
      }
    })
  }

  const handleLeaveTrigger = () => {
    setIsLeaveModalOpen(true)
  }

  const handleLeaveConfirm = () => {
    setIsLeaveModalOpen(false)
    setMessage(null)
    startTransition(async () => {
      const result = await leavePaddleStackAction()
      if (result.success) {
        setMessage({ success: true, text: 'Left the queue successfully.' })
      } else {
        setMessage({ success: false, text: result.error })
      }
    })
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Paddle Stack Queue
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Join the lobby stack and challenge open courts. Queue rotates as games end.
          </p>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-lg)',
            background: message.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
            color: message.success ? 'var(--color-success)' : 'var(--color-danger)',
            border: `1px solid ${message.success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            fontWeight: 600,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {message.success ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Join/Leave Panel */}
      <div
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {userInQueue ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Active Queue Status</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '6px' }}>
                You are currently <span style={{ color: 'var(--color-primary)' }}>{userInQueue.status}</span> in the <span style={{ textTransform: 'lowercase' }}>{userInQueue.skillLevel}</span> queue.
              </h3>
            </div>
            <button
              onClick={handleLeaveTrigger}
              disabled={isPending}
              style={{
                background: 'var(--color-danger)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Trash2 size={15} />
              <span>Leave Queue</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Join the Stack Queue
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['NOVICE', 'INTERMEDIATE', 'ADVANCED'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSkillLevel(lvl)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-lg)',
                      border: skillLevel === lvl ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      background: skillLevel === lvl ? 'var(--color-primary)' : 'var(--color-card)',
                      color: skillLevel === lvl ? 'white' : 'var(--color-text-secondary)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
              <button
                onClick={handleJoin}
                disabled={isPending}
                style={{
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  height: '38px',
                  padding: '0 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: 'var(--shadow-primary-btn)'
                }}
              >
                <span>Enter Queue Stack</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid of 3 Queue Lanes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }} className="queue-lanes-grid">
        {/* Novice Lane */}
        <div className="queue-lane">
          <div className="lane-header">
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>Novice Queue</h3>
            <span className="lane-count">{noviceQueue.length} waiting</span>
          </div>
          <div className="lane-list">
            {noviceQueue.length > 0 ? (
              noviceQueue.map((item, idx) => (
                <div key={item.id} className="lane-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="queue-pos-badge">{idx + 1}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {item.userName || 'Anonymous Player'}
                    </span>
                  </div>
                  <span className={`status-tag status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-lane">Queue is empty</div>
            )}
          </div>
        </div>

        {/* Intermediate Lane */}
        <div className="queue-lane">
          <div className="lane-header">
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>Intermediate Queue</h3>
            <span className="lane-count">{intermediateQueue.length} waiting</span>
          </div>
          <div className="lane-list">
            {intermediateQueue.length > 0 ? (
              intermediateQueue.map((item, idx) => (
                <div key={item.id} className="lane-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="queue-pos-badge">{idx + 1}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {item.userName || 'Anonymous Player'}
                    </span>
                  </div>
                  <span className={`status-tag status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-lane">Queue is empty</div>
            )}
          </div>
        </div>

        {/* Advanced Lane */}
        <div className="queue-lane">
          <div className="lane-header">
            <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>Advanced Queue</h3>
            <span className="lane-count">{advancedQueue.length} waiting</span>
          </div>
          <div className="lane-list">
            {advancedQueue.length > 0 ? (
              advancedQueue.map((item, idx) => (
                <div key={item.id} className="lane-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="queue-pos-badge">{idx + 1}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      {item.userName || 'Anonymous Player'}
                    </span>
                  </div>
                  <span className={`status-tag status-${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-lane">Queue is empty</div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .queue-lane {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }
        .lane-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--color-border);
          background: var(--color-surface);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .lane-count {
          font-size: 11px;
          font-weight: 600;
          color: var(--color-text-secondary);
        }
        .lane-list {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 200px;
        }
        .lane-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          background: var(--color-card);
        }
        .queue-pos-badge {
          width: 20px;
          height: 20px;
          border-radius: var(--radius-full);
          background: var(--color-primary-subtle);
          color: var(--color-primary);
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .status-tag {
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: var(--radius-xs);
          letter-spacing: 0.04em;
        }
        .status-waiting {
          background: var(--color-warning-subtle);
          color: var(--color-warning);
        }
        .status-playing {
          background: var(--color-success-subtle);
          color: var(--color-success);
        }
        .empty-lane {
          font-size: 13px;
          color: var(--color-text-disabled);
          text-align: center;
          padding: 40px 0;
        }

        @media (max-width: 900px) {
          .queue-lanes-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
      `}</style>
      </div>
      {/* ── LEAVE QUEUE CONFIRMATION MINI MODAL ── */}
      {isLeaveModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.40)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'var(--color-card)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            maxWidth: '380px',
            width: '90%',
            boxShadow: 'var(--shadow-lg)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              Leave the Queue?
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Are you sure you want to leave the play queue? You will lose your current position in line.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                style={{
                  flex: 1, height: '38px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', background: 'var(--color-card)',
                  color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLeaveConfirm}
                style={{
                  flex: 1.2, height: '38px', borderRadius: 'var(--radius-md)', border: 'none',
                  background: 'var(--color-danger)', color: 'white',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                Proceed (Leave)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
