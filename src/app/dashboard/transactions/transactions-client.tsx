'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreditCard, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react'

interface TransactionItem {
  id: string
  amount: number
  type: string
  reference: string | null
  createdAt: Date
  userName?: string
}

interface TransactionsClientProps {
  transactions: TransactionItem[]
  userBalance: number
  userRole: string
  stats: {
    day: number
    week: number
    month: number
    year: number
  }
}

export function TransactionsClient({ transactions, userBalance, userRole, stats }: TransactionsClientProps) {
  const isAdminOrStaff = userRole === 'ADMIN' || userRole === 'STAFF'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            {isAdminOrStaff ? 'Club Transaction Ledger' : 'My Transaction Ledger'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {isAdminOrStaff 
              ? 'Monitor club transaction statements, player deposits, and revenue inflows.' 
              : 'Check your top-up history, booking debits, and manage your credit balance.'}
          </p>
        </div>
      </div>

      {/* Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '32px' }} className="transactions-main-grid">
        
        {/* Left Column: Balance / Income Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {isAdminOrStaff ? (
            /* Admin/Staff Stats widgets */
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
            /* Player personal credits balance & topup widgets */
            <>
              {/* Balance card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #005F63 100%)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '28px',
                  color: 'white',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>AVAILABLE BALANCE</span>
                <h2 style={{ fontSize: '36px', fontWeight: 800, marginTop: '8px', letterSpacing: '-0.02em', margin: '8px 0 0' }}>
                  ₱{userBalance.toFixed(2)}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-accent)', fontWeight: 700, marginTop: '16px' }}>
                  <TrendingUp size={14} />
                  <span>Verified Membership Active</span>
                </div>
              </div>

              {/* Top-up redirection widget */}
              <div
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
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

        {/* Right Column: Ledger Table */}
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '20px', margin: 0 }}>
            {isAdminOrStaff ? 'All Club Statements' : 'Historical Statements'}
          </h3>

          {/* Scrollable table, max 10 rows */}
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '580px', paddingRight: '4px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {isAdminOrStaff && (
                    <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase' }}>Player</th>
                  )}
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase' }}>Transaction</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase' }}>Date</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase' }}>Reference</th>
                  <th style={{ padding: '12px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length > 0 ? (
                  transactions.map((t) => {
                    const isDebit = t.amount < 0
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        {/* Player name (only for admin/staff) */}
                        {isAdminOrStaff && (
                          <td style={{ padding: '14px 8px', fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', verticalAlign: 'middle' }}>
                            {t.userName || 'Member'}
                          </td>
                        )}
                        
                        {/* Transaction Type */}
                        <td style={{ padding: '14px 8px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: 'var(--radius-full)',
                                background: isDebit ? 'var(--color-danger-subtle)' : 'var(--color-success-subtle)',
                                color: isDebit ? 'var(--color-danger)' : 'var(--color-success)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                            >
                              {isDebit ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 750, color: 'var(--color-text-primary)' }}>
                              {t.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td style={{ padding: '14px 8px', fontSize: '12px', color: 'var(--color-text-secondary)', verticalAlign: 'middle' }}>
                          {new Date(t.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>

                        {/* Reference */}
                        <td style={{ padding: '14px 8px', fontSize: '12px', color: 'var(--color-text-disabled)', fontFamily: 'var(--font-mono)', verticalAlign: 'middle' }}>
                          {t.reference || '—'}
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '14px 8px', fontSize: '13px', fontWeight: 850, color: isDebit ? 'var(--color-danger)' : 'var(--color-success)', textAlign: 'right', verticalAlign: 'middle' }}>
                          {isDebit ? '-' : '+'}₱{Math.abs(t.amount).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdminOrStaff ? 5 : 4} style={{ padding: '48px 0', color: 'var(--color-text-disabled)', textAlign: 'center', fontSize: '13px' }}>
                      No transaction history recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .transactions-main-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  )
}
