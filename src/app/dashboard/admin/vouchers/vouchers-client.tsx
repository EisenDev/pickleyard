'use client'

import { useState, useTransition } from 'react'
import {
  Gift,
  Plus,
  Calendar,
  DollarSign,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Search
} from 'lucide-react'
import {
  updateVoucherSettingsAction,
  generateVouchersAction
} from '@/lib/actions/admin'

interface VoucherItem {
  id: string
  code: string
  amount: number
  isUsed: boolean
  usedAt: string | null
  claimedBy: string | null
  createdAt: string
}

interface PromoSettings {
  active: boolean
  start: string
  end: string
  limit: number
  amount: number
  count: number
}

interface Props {
  initialVouchers: VoucherItem[]
  initialSettings: PromoSettings
}

export function VouchersClient({ initialVouchers, initialSettings }: Props) {
  const [vouchers, setVouchers] = useState<VoucherItem[]>(initialVouchers)
  const [settings, setSettings] = useState<PromoSettings>(initialSettings)
  const [isPending, startTransition] = useTransition()
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Form states - Settings
  const [promoActive, setPromoActive] = useState(settings.active)
  const [promoStart, setPromoStart] = useState(settings.start ? settings.start.substring(0, 16) : '')
  const [promoEnd, setPromoEnd] = useState(settings.end ? settings.end.substring(0, 16) : '')
  const [promoLimit, setPromoLimit] = useState(settings.limit.toString())
  const [promoAmount, setPromoAmount] = useState(settings.amount.toString())

  // Form states - Generator
  const [genCount, setGenCount] = useState('10')
  const [genAmount, setGenAmount] = useState('100')

  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    startTransition(async () => {
      const res = await updateVoucherSettingsAction({
        active: promoActive,
        start: promoStart ? new Date(promoStart).toISOString() : '',
        end: promoEnd ? new Date(promoEnd).toISOString() : '',
        limit: parseInt(promoLimit) || 20,
        amount: parseFloat(promoAmount) || 100
      })

      if (res.success) {
        setMessage({ success: true, text: 'Auto sign-up promotion settings saved successfully!' })
        // Refresh local settings state
        setSettings({
          active: promoActive,
          start: promoStart ? new Date(promoStart).toISOString() : '',
          end: promoEnd ? new Date(promoEnd).toISOString() : '',
          limit: parseInt(promoLimit) || 20,
          amount: parseFloat(promoAmount) || 100,
          count: settings.count
        })
      } else {
        setMessage({ success: false, text: res.error || 'Failed to update promo settings.' })
      }
    })
  }

  const handleGenerateVouchers = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    const count = parseInt(genCount)
    const amount = parseFloat(genAmount)

    if (isNaN(count) || count <= 0 || count > 100) {
      alert('Please enter a generation count between 1 and 100.')
      return
    }
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive voucher amount.')
      return
    }

    startTransition(async () => {
      const res = await generateVouchersAction(count, amount)
      if (res.success) {
        setMessage({ success: true, text: `Successfully generated ${count} unique one-time vouchers!` })
        
        // Fetch latest vouchers client side or trigger refresh
        // We will mock/prepend or reload window for full refresh
        window.location.reload()
      } else {
        setMessage({ success: false, text: res.error || 'Failed to generate vouchers.' })
      }
    })
  }

  const filteredVouchers = vouchers.filter(v =>
    v.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.claimedBy && v.claimedBy.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const inputStyle: React.CSSProperties = {
    height: '40px', padding: '0 12px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box'
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-up">
        {/* Header */}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            Voucher & Promo Control Center
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
            Manage auto-credited sign up promotions and generate one-time voucher codes.
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
            <Gift size={16} />
            <span>{message.text}</span>
          </div>
        )}

        <div className="vouchers-grid">
          {/* Left Panel: Promo Configurations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Auto Signup Promotion */}
            <div style={{
              background: 'var(--color-card)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ToggleRight size={18} color="var(--color-primary)" />
                  Sign-up Auto Promo
                </h2>
                <button
                  type="button"
                  onClick={() => setPromoActive(!promoActive)}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: promoActive ? 'var(--color-primary)' : 'var(--color-text-disabled)',
                    padding: 0, display: 'flex', alignItems: 'center'
                  }}
                >
                  {promoActive ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                </button>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.4 }}>
                When enabled, the first N players who sign up will be automatically credited with registration bonuses.
              </p>

              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Limit (Count)</label>
                    <input type="number" required min="1" value={promoLimit}
                      onChange={e => setPromoLimit(e.target.value)} style={inputStyle} placeholder="e.g. 20" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Bonus Amount (₱)</label>
                    <input type="number" required min="1" value={promoAmount}
                      onChange={e => setPromoAmount(e.target.value)} style={inputStyle} placeholder="e.g. 100" />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Start Time</label>
                  <input type="datetime-local" value={promoStart}
                    onChange={e => setPromoStart(e.target.value)} style={inputStyle} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>End Time (Optional)</label>
                  <input type="datetime-local" value={promoEnd}
                    onChange={e => setPromoEnd(e.target.value)} style={inputStyle} />
                </div>

                <div style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span>Claimed Stats:</span>
                  <strong style={{ color: 'var(--color-primary)' }}>{settings.count} / {settings.limit} players</strong>
                </div>

                <button type="submit" disabled={isPending} style={{
                  height: '40px', marginTop: '6px', border: 'none', borderRadius: 'var(--radius-md)',
                  background: 'var(--color-primary)', color: 'white', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: 'var(--shadow-primary-btn)', opacity: isPending ? 0.75 : 1, width: '100%'
                }}>
                  <span>Save Config</span>
                </button>
              </form>
            </div>

            {/* Voucher Generator */}
            <div style={{
              background: 'var(--color-card)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', padding: '24px'
            }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="var(--color-primary)" />
                Generate Vouchers
              </h2>

              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: '0 0 20px', lineHeight: 1.4 }}>
                Bulk generate random, unique one-time codes that players can redeem on their top-up page.
              </p>

              <form onSubmit={handleGenerateVouchers} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>How many vouchers?</label>
                  <input type="number" required min="1" max="100" value={genCount}
                    onChange={e => setGenCount(e.target.value)} style={inputStyle} placeholder="e.g. 10" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Voucher Value (₱)</label>
                  <input type="number" required min="1" value={genAmount}
                    onChange={e => setGenAmount(e.target.value)} style={inputStyle} placeholder="e.g. 500" />
                </div>

                <button type="submit" disabled={isPending} style={{
                  height: '40px', marginTop: '6px', border: 'none', borderRadius: 'var(--radius-md)',
                  background: 'var(--color-primary)', color: 'white', fontSize: '13px', fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  boxShadow: 'var(--shadow-primary-btn)', opacity: isPending ? 0.75 : 1, width: '100%'
                }}>
                  <span>Generate Codes</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Panel: List of Codes */}
          <div style={{
            background: 'var(--color-card)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={18} color="var(--color-text-secondary)" />
                Voucher Registry ({vouchers.length})
              </h2>
              <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: '260px' }}>
                <Search size={14} color="var(--color-text-disabled)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type="text" placeholder="Search code or claimer..." value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', height: '34px', padding: '0 12px 0 32px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Vouchers Table wrapper */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                    {['Voucher Code', 'Value', 'Status', 'Claimed By / Date', 'Created'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredVouchers.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px 14px', textAlign: 'center', color: 'var(--color-text-disabled)', fontSize: '13px' }}>
                        No vouchers found in registry.
                      </td>
                    </tr>
                  ) : filteredVouchers.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid var(--color-border)', background: v.isUsed ? 'rgba(var(--color-surface-rgb), 0.5)' : 'transparent' }}>
                      <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code style={{ fontSize: '13px', fontFamily: 'monospace', background: 'var(--color-surface)', padding: '3px 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                            {v.code}
                          </code>
                          <button
                            onClick={() => handleCopy(v.code)}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              color: copiedCode === v.code ? 'var(--color-success)' : 'var(--color-text-secondary)',
                              padding: '4px', display: 'flex', alignItems: 'center'
                            }}
                            title="Copy code"
                          >
                            {copiedCode === v.code ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                        ₱{v.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 800, textTransform: 'uppercase',
                          padding: '2px 7px', borderRadius: 'var(--radius-sm)',
                          background: v.isUsed ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                          color: v.isUsed ? '#ef4444' : '#10b981'
                        }}>
                          {v.isUsed ? 'REDEEMED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                        {v.isUsed ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <strong style={{ color: 'var(--color-text-primary)' }}>{v.claimedBy}</strong>
                            <span>{v.usedAt ? new Date(v.usedAt).toLocaleString('en-PH') : ''}</span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-disabled)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {new Date(v.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .vouchers-grid {
          display: grid;
          grid-template-columns: 360px 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .vouchers-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
