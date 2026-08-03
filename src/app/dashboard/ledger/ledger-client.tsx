'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { CreditCard, ArrowDownLeft, ArrowUpRight, TrendingUp, Calendar, DollarSign, X, Gift, AlertTriangle, CheckCircle2, Search, Trash2 } from 'lucide-react'
import { expirePromoCreditsAction } from '@/lib/actions/admin'

interface TransactionItem {
  id: string
  amount: number
  type: string
  reference: string | null
  createdAt: Date
  userName?: string
  userEmail?: string
}

interface BookingLedgerItem {
  id: string
  courtName: string
  courtNumber: number
  startTime: Date
  endTime: Date
  status: string
  price: number
  userName: string
  userEmail: string
}

interface OnlineReceipt {
  id: string
  amount: number
  createdAt: string
  userName: string
  userEmail: string
  paymentFor: string
  receiptImage: string
}

interface LaunchCreditUser {
  userId: string
  userName: string
  userEmail: string
  promoAmount: number
  totalSpent: number
  promoUsed: number
  unusedPromo: number
  regularTopupTotal: number
  currentBalance: number
  receivedAt: string
  promoRef: string
}

interface LedgerClientProps {
  transactions: TransactionItem[]
  bookings: BookingLedgerItem[]
  onlineReceipts?: OnlineReceipt[]
  launchCreditUsers?: LaunchCreditUser[]
  userBalance: number
  userRole: string
  stats: {
    day: number
    week: number
    month: number
    year: number
  }
  initialTab: string
  initialRange: string
}

export function LedgerClient({
  transactions,
  bookings,
  onlineReceipts = [],
  launchCreditUsers = [],
  userBalance,
  userRole,
  stats,
  initialTab,
  initialRange
}: LedgerClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'

  const [tab, setTab] = useState<'bookings' | 'transactions' | 'receipts' | 'launch'>(initialTab as any || 'bookings')
  const [range, setRange] = useState<string>(initialRange || '48h')
  const [selectedLightboxImage, setSelectedLightboxImage] = useState<string | null>(null)
  const [launchSearch, setLaunchSearch] = useState<string>('')
  // Expire modal state
  const [expireTarget, setExpireTarget] = useState<{ userId: string; userName: string; amount: number } | null>(null)
  const [expireError, setExpireError] = useState<string>('')
  const [isExpiring, startExpireTransition] = useTransition()

  const handleRangeChange = (newRange: string) => {
    setRange(newRange)
    const params = new URLSearchParams()
    params.set('tab', tab)
    params.set('range', newRange)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleTabChange = (newTab: 'bookings' | 'transactions' | 'receipts' | 'launch') => {
    setTab(newTab)
    const params = new URLSearchParams()
    params.set('tab', newTab)
    params.set('range', range)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            {isAdminOrStaff ? 'Club Activity & Financial Ledger' : 'My Statement Ledger'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {isAdminOrStaff 
              ? 'View centralized booking records, payment confirmations, and transaction Statements.' 
              : 'Track your personal court reservations, top-ups, and balance ledger statements.'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--color-border)', marginBottom: '8px' }}>
        <button
          onClick={() => handleTabChange('bookings')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: tab === 'bookings' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            color: tab === 'bookings' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          Bookings Ledger
        </button>
        <button
          onClick={() => handleTabChange('transactions')}
          style={{
            padding: '12px 16px',
            background: 'none',
            border: 'none',
            borderBottom: tab === 'transactions' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
            color: tab === 'transactions' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          {isAdminOrStaff ? 'Transaction Ledger' : 'Financial Statements'}
        </button>
        {isAdminOrStaff && (
          <button
            onClick={() => handleTabChange('receipts')}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'receipts' ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
              color: tab === 'receipts' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            Online Payment Receipts
          </button>
        )}
        {isAdminOrStaff && (
          <button
            onClick={() => handleTabChange('launch')}
            style={{
              padding: '12px 16px',
              background: 'none',
              border: 'none',
              borderBottom: tab === 'launch' ? '2.5px solid #f59e0b' : '2.5px solid transparent',
              color: tab === 'launch' ? '#f59e0b' : 'var(--color-text-secondary)',
              fontWeight: 800,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Gift size={14} />
            Launch Credits
          </button>
        )}
      </div>

      {/* Tab Contents: Bookings Ledger */}
      {tab === 'bookings' && (
        <div style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--color-primary)" />
                Court Reservation Records
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
                Unified list of scheduling status updates, check-ins, and late expirations.
              </p>
            </div>

            {/* Time filters */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: '48h', label: 'Past 48 Hours' },
                { id: '1m', label: '1 Month' },
                { id: '3m', label: '3 Months' },
                { id: '1y', label: 'Annual' },
                { id: 'all', label: 'All records' }
              ].map(r => (
                <button
                  key={r.id}
                  onClick={() => handleRangeChange(r.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: '1.5px solid',
                    borderColor: range === r.id ? 'var(--color-primary)' : 'var(--color-border)',
                    background: range === r.id ? 'var(--color-primary-subtle)' : 'var(--color-card)',
                    color: range === r.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>Player</th>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>Court</th>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>Schedule</th>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>Fee Due</th>
                  <th style={{ padding: '12px 8px', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px 8px', textAlign: 'center', color: 'var(--color-text-disabled)' }}>
                      No court reservations recorded for this selected time window.
                    </td>
                  </tr>
                ) : (
                  bookings.map(b => {
                    const isPending = b.status === 'PENDING'
                    const isPaid = b.status === 'PAID'
                    const isReserved = b.status === 'RESERVED'
                    const isExpired = b.status === 'EXPIRED'

                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}>
                        <td style={{ padding: '12px 8px' }}>
                          <div style={{ fontWeight: 700 }}>{b.userName}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{b.userEmail}</div>
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 650 }}>{b.courtName}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <div>{new Date(b.startTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                            {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })} - {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })}
                          </div>
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 700 }}>₱{b.price.toFixed(2)}</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: isReserved ? 'var(--color-info-subtle)' : isPaid ? 'var(--color-success-subtle)' : isPending ? 'var(--color-warning-subtle)' : 'var(--color-danger-subtle)',
                            color: isReserved ? 'var(--color-info)' : isPaid ? 'var(--color-success)' : isPending ? 'var(--color-warning)' : 'var(--color-danger)',
                            textTransform: 'uppercase'
                          }}>
                            {isPending ? 'Cash Due' : isReserved ? 'Checked In' : isPaid ? 'Paid' : isExpired ? 'Expired (Late)' : b.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Contents: Transactions Ledger */}
      {tab === 'transactions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '32px' }} className="transactions-main-grid">
          {/* Left Column: Balance / Income Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {isAdminOrStaff ? (
              /* Admin Stats widgets */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 850, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📊 Club Revenue Dashboard
                </div>
                
                {/* Day Income */}
                <div style={{
                  background: 'var(--color-card)',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: 'var(--radius-xl)',
                  padding: '20px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>Day Income</span>
                    <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
                      ₱{stats.day.toFixed(2)}
                    </h3>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                </div>

                {/* Week Income */}
                <div style={{
                  background: 'var(--color-card)',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: 'var(--radius-xl)',
                  padding: '20px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase' }}>Week Income</span>
                    <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
                      ₱{stats.week.toFixed(2)}
                    </h3>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
                </div>

                {/* Month Income */}
                <div style={{
                  background: 'var(--color-card)',
                  border: '1.5px solid #e9d5ff',
                  borderRadius: 'var(--radius-xl)',
                  padding: '20px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: '#a855f7', fontWeight: 800, textTransform: 'uppercase' }}>Month Income</span>
                    <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
                      ₱{stats.month.toFixed(2)}
                    </h3>
                  </div>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a855f7' }} />
                </div>

                {/* Annual Income */}
                <div style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #005F63 100%)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '22px 20px',
                  color: 'white',
                  boxShadow: 'var(--shadow-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 800, textTransform: 'uppercase' }}>Annual Income</span>
                    <h3 style={{ fontSize: '26px', fontWeight: 900, color: 'white', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
                      ₱{stats.year.toFixed(2)}
                    </h3>
                  </div>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-accent)' }} />
                </div>
              </div>
            ) : (
              /* Player Balance & Top Up */
              <>
                <div style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #005F63 100%)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '28px',
                  color: 'white',
                  boxShadow: 'var(--shadow-md)'
                }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>AVAILABLE BALANCE</span>
                  <h2 style={{ fontSize: '36px', fontWeight: 800, marginTop: '8px', letterSpacing: '-0.02em', margin: '8px 0 0' }}>
                    ₱{userBalance.toFixed(2)}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-accent)', fontWeight: 700, marginTop: '16px' }}>
                    <TrendingUp size={14} />
                    <span>Verified Membership Active</span>
                  </div>
                </div>

                <div style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '12px', margin: 0 }}>
                    Add Credits
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                    Top up your balance using InstaPay, GCash, Maya, Bank Transfer, or Cash at the front desk.
                  </p>
                  <Link
                    href="/dashboard/topup"
                    style={{
                      height: '42px',
                      background: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '13px',
                      fontWeight: 700,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: 'var(--shadow-primary-btn)'
                    }}
                  >
                    <CreditCard size={15} />
                    <span>Go to Top Up Page</span>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Statement Table */}
          <div style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '20px', margin: 0 }}>
              {isAdminOrStaff ? 'All Club Statements' : 'Historical Statements'}
            </h3>

            <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '580px', paddingRight: '4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    {isAdminOrStaff && <th style={{ padding: '10px 8px', fontWeight: 700 }}>User</th>}
                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>Description</th>
                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>Reference</th>
                    <th style={{ padding: '10px 8px', fontWeight: 700 }}>Date</th>
                    <th style={{ padding: '10px 8px', fontWeight: 700, textAlign: 'right' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={isAdminOrStaff ? 5 : 4} style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--color-text-disabled)' }}>
                        No transactions recorded on this account yet.
                      </td>
                    </tr>
                  ) : (
                    transactions.map(t => {
                      const isTopup = t.type === 'TOPUP' || t.type === 'CASH_TOPUP'
                      let displayType = 'Statement'
                      const ref = (t.reference || '').toUpperCase()
                      if (t.type === 'CASH_TOPUP') {
                        if (ref.includes('OPEN-PLAY')) {
                          displayType = 'Counter Cash Payment (Open Play)'
                        } else {
                          displayType = 'Counter Cash Payment (Booking)'
                        }
                      } else if (t.type === 'TOPUP') {
                        displayType = 'Wallet Credits Top-up'
                      } else if (t.type === 'BOOKING_DEBIT') {
                        if (ref.includes('CASH')) {
                          displayType = 'Booking Charge (Cash Paid)'
                        } else {
                          displayType = 'Booking Charge (Wallet Credits)'
                        }
                      } else if (t.type === 'EVENT_DEBIT') {
                        if (ref.includes('CASH') || ref.includes('OPEN-PLAY')) {
                          displayType = 'Open Play Charge (Cash Paid)'
                        } else {
                          displayType = 'Open Play Charge (Wallet Credits)'
                        }
                      } else if (t.type === 'PROMO_EXPIRY') {
                        displayType = 'Launch Promo Credit Expired'
                      } else {
                        displayType = isTopup ? 'Cash Top-up' : 'Booking Debit'
                      }

                      return (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}>
                          {isAdminOrStaff && (
                            <td style={{ padding: '10px 8px' }}>
                              <div style={{ fontWeight: 700 }}>{t.userName || 'Member'}</div>
                              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{t.userEmail}</div>
                            </td>
                          )}
                          <td style={{ padding: '10px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isTopup ? (
                                <ArrowDownLeft size={13} color="#10b981" />
                              ) : (
                                <ArrowUpRight size={13} color="#ef4444" />
                              )}
                              <span style={{ fontWeight: 650 }}>{displayType}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 8px', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                            {t.reference || 'SYSTEM_AUTO'}
                          </td>
                          <td style={{ padding: '10px 8px', color: 'var(--color-text-secondary)' }}>
                            {new Date(t.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}
                          </td>
                          <td style={{
                            padding: '10px 8px',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: isTopup ? '#10b981' : '#ef4444'
                          }}>
                            {isTopup ? '+' : '-'}₱{t.amount.toFixed(2)}
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
      )}

      {/* Tab Contents: Online Payment Receipts */}
      {tab === 'receipts' && isAdminOrStaff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {(!onlineReceipts || onlineReceipts.length === 0) ? (
            <div style={{
              padding: '40px 20px',
              textAlign: 'center',
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              color: 'var(--color-text-disabled)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}>
              <DollarSign size={28} style={{ opacity: 0.3 }} />
              <span style={{ fontSize: '13px', fontWeight: 700 }}>No Online Payment Receipts Found</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Receipts uploaded during GCash/Bank Top-Ups will appear here.</span>
            </div>
          ) : (
            <div style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Date & Time</th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Member Name</th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Payment For</th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Amount Topped</th>
                      <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Receipt Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onlineReceipts.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                          {new Date(r.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                          <strong style={{ color: 'var(--color-text-primary)', display: 'block' }}>{r.userName}</strong>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{r.userEmail}</span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 650 }}>
                          {r.paymentFor}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)' }}>
                          ₱{r.amount.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          {r.receiptImage ? (
                            <button
                              type="button"
                              onClick={() => setSelectedLightboxImage(r.receiptImage)}
                              style={{
                                border: '1px solid var(--color-border)',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                width: '48px',
                                height: '48px',
                                padding: 0,
                                cursor: 'pointer',
                                background: 'var(--color-surface)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <img src={r.receiptImage} alt="Receipt Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </button>
                          ) : (
                            <span style={{ color: 'var(--color-text-disabled)', fontSize: '11px' }}>No photo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Contents: Launch Credits (Signup Promo Tracker) */}
      {tab === 'launch' && isAdminOrStaff && (() => {
        const totalPromoIssued = launchCreditUsers.reduce((s, u) => s + u.promoAmount, 0)
        const totalUnused = launchCreditUsers.reduce((s, u) => s + u.unusedPromo, 0)
        const totalFullyUsed = launchCreditUsers.filter(u => u.unusedPromo === 0).length
        const totalHasUnused = launchCreditUsers.filter(u => u.unusedPromo > 0).length

        const filtered = launchCreditUsers.filter(u =>
          u.userName.toLowerCase().includes(launchSearch.toLowerCase()) ||
          u.userEmail.toLowerCase().includes(launchSearch.toLowerCase())
        )

        const handleExpire = (u: LaunchCreditUser) => {
          setExpireError('')
          setExpireTarget({ userId: u.userId, userName: u.userName, amount: u.unusedPromo })
        }

        const confirmExpire = () => {
          if (!expireTarget) return
          startExpireTransition(async () => {
            const res = await expirePromoCreditsAction(expireTarget)
            if (res.success) {
              setExpireTarget(null)
              router.refresh()
            } else {
              setExpireError(res.error || 'Failed to expire promo credits.')
            }
          })
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Info banner */}
            <div style={{
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: '1.5px solid #fcd34d',
              borderRadius: 'var(--radius-xl)',
              padding: '16px 20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e', marginBottom: '4px' }}>About Launch Credits</div>
                <div style={{ fontSize: '12px', color: '#78350f', lineHeight: 1.6 }}>
                  Shows every player who received the <strong>Auto Sign-up Promo</strong> (₱500) at launch.
                  {' '}<strong>Spending always consumes promo credits first (FIFO)</strong> — own top-up credits are never touched until the promo is fully used.
                  {' '}Only click <strong>Expire</strong> when a player has remaining unused promo and you want to remove it.
                </div>
              </div>
            </div>

            {/* Summary stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[
                { label: 'Total Recipients', value: launchCreditUsers.length, color: '#3b82f6', suffix: '' },
                { label: 'Total Promo Issued', value: `₱${totalPromoIssued.toFixed(2)}`, color: '#10b981', suffix: '' },
                { label: 'Still Unused', value: `₱${totalUnused.toFixed(2)}`, color: '#f59e0b', suffix: '' },
                { label: 'Fully Consumed', value: totalFullyUsed, color: '#6b7280', suffix: ` / ${launchCreditUsers.length}` },
              ].map(stat => (
                <div key={stat.label} style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '16px 18px',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: stat.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{stat.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
                    {stat.value}<span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{stat.suffix}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Gift size={16} color="#f59e0b" />
                    Promo Credit Recipients
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                    {totalHasUnused} player{totalHasUnused !== 1 ? 's' : ''} still have unused promo credits
                  </div>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={13} color="var(--color-text-secondary)" style={{ position: 'absolute', left: 10, pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search player..."
                    value={launchSearch}
                    onChange={e => setLaunchSearch(e.target.value)}
                    style={{
                      paddingLeft: '30px', paddingRight: '12px', height: '34px',
                      border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                      background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                      fontSize: '12px', fontFamily: 'inherit', outline: 'none', width: '200px'
                    }}
                  />
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                      {['Player', 'Promo Given', 'Used on Booking', 'Promo Used', 'Unused Promo ⚠', 'Own Top-ups', 'Wallet Balance', 'Status', 'Action'].map(h => (
                        <th key={h} style={{ padding: '11px 14px', fontSize: '10px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-disabled)', fontSize: '13px' }}>
                          {launchCreditUsers.length === 0 ? 'No signup promo credits have been issued yet.' : 'No players match your search.'}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((u) => {
                        const fullyUsed = u.unusedPromo === 0
                        const partiallyUsed = u.promoUsed > 0 && u.unusedPromo > 0
                        const canExpire = u.unusedPromo > 0 && u.currentBalance >= u.unusedPromo
                        const cantExpireReason = u.unusedPromo > 0 && u.currentBalance < u.unusedPromo
                          ? `Balance too low (₱${u.currentBalance.toFixed(2)})` : ''

                        return (
                          <tr key={u.userId} style={{
                            borderBottom: '1px solid var(--color-border)',
                            background: u.unusedPromo > 0 ? 'rgba(245,158,11,0.03)' : 'transparent'
                          }}>
                            {/* Player */}
                            <td style={{ padding: '12px 14px' }}>
                              <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--color-text-primary)' }}>{u.userName}</div>
                              <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{u.userEmail}</div>
                            </td>

                            {/* Promo Given */}
                            <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#10b981' }}>
                              +₱{u.promoAmount.toFixed(2)}
                            </td>

                            {/* Used on Booking (total spent) */}
                            <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: u.totalSpent > 0 ? '#ef4444' : 'var(--color-text-disabled)' }}>
                              {u.totalSpent > 0 ? `₱${u.totalSpent.toFixed(2)}` : '₱0.00'}
                            </td>

                            {/* Promo Used (portion of spending from promo) */}
                            <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 600, color: u.promoUsed > 0 ? '#ef4444' : 'var(--color-text-disabled)' }}>
                              {u.promoUsed > 0 ? `₱${u.promoUsed.toFixed(2)}` : '₱0.00'}
                            </td>

                            {/* Unused Promo */}
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                fontSize: '12px', fontWeight: 800,
                                color: u.unusedPromo > 0 ? '#d97706' : '#10b981',
                                background: u.unusedPromo > 0 ? '#fef3c7' : '#d1fae5',
                                padding: '3px 8px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap'
                              }}>
                                {u.unusedPromo > 0 ? `₱${u.unusedPromo.toFixed(2)}` : 'Fully Used'}
                              </span>
                            </td>

                            {/* Own Top-ups */}
                            <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                              {u.regularTopupTotal > 0 ? `₱${u.regularTopupTotal.toFixed(2)}` : <span style={{ color: 'var(--color-text-disabled)' }}>None</span>}
                            </td>

                            {/* Wallet Balance */}
                            <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              ₱{u.currentBalance.toFixed(2)}
                            </td>

                            {/* Status */}
                            <td style={{ padding: '12px 14px' }}>
                              {fullyUsed ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: '#6b7280', background: '#f3f4f6', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                                  <CheckCircle2 size={11} /> Consumed
                                </span>
                              ) : partiallyUsed ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                                  <AlertTriangle size={11} /> Partial
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: '#ef4444', background: '#fee2e2', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                                  <Gift size={11} /> Untouched
                                </span>
                              )}
                            </td>

                            {/* Action — Expire button */}
                            <td style={{ padding: '12px 14px' }}>
                              {u.unusedPromo > 0 ? (
                                <button
                                  type="button"
                                  title={cantExpireReason || `Expire ₱${u.unusedPromo.toFixed(2)} unused promo`}
                                  disabled={!canExpire}
                                  onClick={() => handleExpire(u)}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    padding: '5px 10px', borderRadius: 'var(--radius-md)',
                                    border: canExpire ? '1.5px solid #ef4444' : '1.5px solid var(--color-border)',
                                    background: canExpire ? '#fee2e2' : 'var(--color-surface)',
                                    color: canExpire ? '#dc2626' : 'var(--color-text-disabled)',
                                    fontSize: '11px', fontWeight: 800, cursor: canExpire ? 'pointer' : 'not-allowed',
                                    fontFamily: 'inherit', whiteSpace: 'nowrap'
                                  }}
                                >
                                  <Trash2 size={11} />
                                  {cantExpireReason ? 'Low Bal' : `Expire ₱${u.unusedPromo.toFixed(2)}`}
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--color-text-disabled)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expire Confirmation Modal */}
            {expireTarget && (
              <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px'
              }}>
                <div style={{
                  background: 'var(--color-card)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)', padding: '28px', width: '100%', maxWidth: '420px',
                  boxShadow: 'var(--shadow-xl)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Trash2 size={18} color="#dc2626" />
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)' }}>Expire Promo Credits</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>This action cannot be undone</div>
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                    padding: '14px 16px', marginBottom: '16px', border: '1px solid var(--color-border)'
                  }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>You are about to deduct:</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#dc2626', letterSpacing: '-0.02em' }}>
                      −₱{expireTarget.amount.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      from <strong style={{ color: 'var(--color-text-primary)' }}>{expireTarget.userName}</strong>'s wallet
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '11px', color: '#78350f', background: '#fef3c7', padding: '8px 12px', borderRadius: 'var(--radius-md)', lineHeight: 1.5 }}>
                      ⚠ Only the unused promo portion is deducted. Their own top-up credits are <strong>protected</strong>.
                      This will be logged on the player's ledger as a promo expiry.
                    </div>
                  </div>

                  {expireError && (
                    <div style={{ fontSize: '12px', color: '#dc2626', background: '#fee2e2', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', border: '1px solid #fca5a5' }}>
                      {expireError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setExpireTarget(null); setExpireError('') }}
                      disabled={isExpiring}
                      style={{
                        height: '38px', padding: '0 16px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)', background: 'var(--color-card)',
                        color: 'var(--color-text-primary)', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmExpire}
                      disabled={isExpiring}
                      style={{
                        height: '38px', padding: '0 20px', borderRadius: 'var(--radius-md)',
                        border: 'none', background: isExpiring ? '#fca5a5' : '#dc2626',
                        color: 'white', fontSize: '13px', fontWeight: 700,
                        cursor: isExpiring ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      <Trash2 size={13} />
                      {isExpiring ? 'Expiring...' : 'Confirm Expiry'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Lightbox Receipt Modal */}
      {selectedLightboxImage && (
        <div 
          onClick={() => setSelectedLightboxImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 25000, padding: '20px', cursor: 'zoom-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedLightboxImage(null)}
              style={{
                position: 'absolute', top: -36, right: 0,
                border: 'none', background: 'transparent',
                cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700
              }}
            >
              <X size={18} />
              <span>Close</span>
            </button>
            <img 
              src={selectedLightboxImage} 
              alt="Receipt Full Preview" 
              style={{
                maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain',
                borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'block'
              }} 
            />
          </div>
        </div>
      )}
    </div>
  )
}
