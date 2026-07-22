'use client'

import { useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  Percent,
  Clock,
  MapPin,
  Trophy,
  AlertTriangle
} from 'lucide-react'

interface KPIPayload {
  totalPlayers: number
  membershipDistribution: {
    STANDARD: number
    VIP: number
    PRO: number
  }
  totalWalletCredits: number
  revenueToday: number
  revenue7Days: number
  revenue30Days: number
  revenue365Days: number
  revenueLifetime: number
  totalBookingsCount: number
  successBookingsCount: number
  noShowCount: number
  cancelledCount: number
  expirationRate: number
  cancellationRate: number
}

interface CourtUsageItem {
  courtId: string
  courtName: string
  courtNumber: number
  bookingsCount: number
  totalHoursPlayed: number
}

interface HourlyPeakItem {
  hour: number
  label: string
  count: number
}

interface RevenueTrendItem {
  date: string
  amount: number
}

interface AnalyticsClientProps {
  kpis: KPIPayload
  courtUsage: CourtUsageItem[]
  hourlyOccupancy: HourlyPeakItem[]
  dailyRevenueTrend: RevenueTrendItem[]
}

export function AnalyticsClient({
  kpis,
  courtUsage,
  hourlyOccupancy,
  dailyRevenueTrend
}: AnalyticsClientProps) {
  // Find highest daily revenue for chart scale
  const maxRevenue = Math.max(...dailyRevenueTrend.map(d => d.amount), 500)
  
  // Find highest hourly count for peak hours chart scale
  const maxHourlyCount = Math.max(...hourlyOccupancy.map(h => h.count), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade-up">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
          Business Analytics & Club Performance
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Real-time financial statement reports, court occupancy rates, and member engagement statistics.
        </p>
      </div>

      {/* Grid 1: Revenue Overview Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        {/* Today */}
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '20px', boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Today's Cash In</span>
            <DollarSign size={16} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '12px 0 4px', letterSpacing: '-0.02em' }}>
            ₱{kpis.revenueToday.toFixed(2)}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Midnight to present</span>
        </div>

        {/* 7 Days */}
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '20px', boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Weekly Revenue</span>
            <TrendingUp size={16} color="var(--color-primary)" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '12px 0 4px', letterSpacing: '-0.02em' }}>
            ₱{kpis.revenue7Days.toFixed(2)}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Last 7 days deposits</span>
        </div>

        {/* 30 Days */}
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '20px', boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Monthly Revenue</span>
            <DollarSign size={16} color="var(--color-primary)" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '12px 0 4px', letterSpacing: '-0.02em' }}>
            ₱{kpis.revenue30Days.toFixed(2)}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Last 30 days deposits</span>
        </div>

        {/* Lifetime */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #032b2d 100%)',
          borderRadius: 'var(--radius-xl)', padding: '20px', color: 'white', boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>Lifetime Capital</span>
            <Trophy size={16} color="var(--color-accent)" />
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 900, color: 'white', margin: '12px 0 4px', letterSpacing: '-0.02em' }}>
            ₱{kpis.revenueLifetime.toFixed(2)}
          </h2>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Total cash processed</span>
        </div>
      </div>

      {/* Grid 2: Revenue Trend Chart & Booking Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '32px' }} className="analytics-main-grid">
        {/* SVG Daily Revenue Trend Card */}
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)',
          display: 'flex', flexDirection: 'column', gap: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              📅 Daily Revenue Trend (Last 7 Days)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
              Aggregation of cash deposits and cash top-ups over the past week.
            </p>
          </div>

          {/* SVG Bar Chart */}
          <div style={{ position: 'relative', height: '240px', marginTop: '12px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: '32px', borderBottom: '1px solid var(--color-border)' }}>
            {dailyRevenueTrend.map((d, i) => {
              const heightPercent = (d.amount / maxRevenue) * 100
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 5 }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    ₱{d.amount.toFixed(0)}
                  </div>
                  {/* Bar */}
                  <div style={{
                    width: '60%',
                    maxWidth: '40px',
                    height: `${Math.max(4, heightPercent * 1.5)}px`,
                    background: 'linear-gradient(to top, var(--color-primary), #00e676)',
                    borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                    transition: 'height 0.3s ease'
                  }} />
                  {/* Label */}
                  <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    fontSize: '10px',
                    color: 'var(--color-text-secondary)',
                    textAlign: 'center',
                    whiteSpace: 'nowrap'
                  }}>
                    {d.date}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Booking Conversion & Rates */}
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)',
          display: 'flex', flexDirection: 'column', gap: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              📈 Booking Conversions & Quality
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
              Check-in percentages, cancellation ratios, and no-shows.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Total Bookings */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Total Bookings Count</span>
              <span style={{ fontSize: '14px', fontWeight: 850, color: 'var(--color-text-primary)' }}>{kpis.totalBookingsCount}</span>
            </div>
            
            {/* Successful Reservations */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Successful Plays (Paid/Check-in)</span>
              <span style={{ fontSize: '14px', fontWeight: 850, color: '#10b981' }}>{kpis.successBookingsCount}</span>
            </div>

            {/* No-Shows */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '10px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <AlertTriangle size={12} color="#f59e0b" />
                No-Show Penalties (Expired)
              </span>
              <span style={{ fontSize: '14px', fontWeight: 850, color: '#ef4444' }}>{kpis.noShowCount}</span>
            </div>

            {/* Expiration Rate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>No-Show Expiration Rate</span>
                <span style={{ fontWeight: 800, color: kpis.expirationRate > 15 ? '#ef4444' : 'var(--color-text-primary)' }}>
                  {kpis.expirationRate.toFixed(1)}%
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', borderRadius: 'var(--radius-full)', background: 'var(--color-border)', overflow: 'hidden' }}>
                <div style={{ width: `${kpis.expirationRate}%`, height: '100%', background: '#ef4444' }} />
              </div>
            </div>

            {/* Cancellation Rate */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Cancellation Rate</span>
                <span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{kpis.cancellationRate.toFixed(1)}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', borderRadius: 'var(--radius-full)', background: 'var(--color-border)', overflow: 'hidden' }}>
                <div style={{ width: `${kpis.cancellationRate}%`, height: '100%', background: '#a855f7' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 3: Peak Booking Hours & Members Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px' }} className="analytics-main-grid">
        {/* Peak Hours SVG Grid */}
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)',
          display: 'flex', flexDirection: 'column', gap: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              ⏰ Busiest Booking Times (Hour-Of-Day Peaks)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
              Hourly booking distribution across the operational time frame (7:00 AM - 10:00 PM).
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
            {hourlyOccupancy.map(h => {
              const widthPercent = (h.count / maxHourlyCount) * 100
              return (
                <div key={h.hour} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '60px', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', textAlign: 'right' }}>
                    {h.label}
                  </div>
                  {/* Bar wrapper */}
                  <div style={{ flex: 1, height: '14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      width: `${Math.max(1, widthPercent)}%`,
                      height: '100%',
                      background: 'linear-gradient(to right, var(--color-primary-subtle), var(--color-primary))',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ width: '24px', fontSize: '11px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {h.count}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Member Tiers & Cash Reserves */}
        <div style={{
          background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)',
          display: 'flex', flexDirection: 'column', gap: '24px'
        }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
              👥 Active Membership Distribution
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
              Track tiers, VIP subscriptions, and club member balances.
            </p>
          </div>

          {/* Members KPIs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Total Players */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>Total Registered Players</span>
              <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-primary)' }}>{kpis.totalPlayers}</span>
            </div>

            {/* Tiers Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '4px' }}>
              {/* Standard */}
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--color-text-secondary)' }}>STANDARD</div>
                <div style={{ fontSize: '16px', fontWeight: 850, color: 'var(--color-text-primary)', marginTop: '6px' }}>{kpis.membershipDistribution.STANDARD}</div>
              </div>
              {/* VIP */}
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#f59e0b' }}>VIP</div>
                <div style={{ fontSize: '16px', fontWeight: 850, color: 'var(--color-text-primary)', marginTop: '6px' }}>{kpis.membershipDistribution.VIP}</div>
              </div>
              {/* PRO */}
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#10b981' }}>PRO</div>
                <div style={{ fontSize: '16px', fontWeight: 850, color: 'var(--color-text-primary)', marginTop: '6px' }}>{kpis.membershipDistribution.PRO}</div>
              </div>
            </div>

            {/* Total credits liabilities */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 850, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  💰 Total Wallet Liability
                </span>
              </div>
              <h4 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-text-primary)', margin: '4px 0 0' }}>
                ₱{kpis.totalWalletCredits.toFixed(2)}
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                Sum total of all players' remaining prepaid wallet credits currently stored on user profiles.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid 4: Court Utilization / Popularity Table */}
      <div style={{
        background: 'var(--color-card)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', padding: '24px', boxShadow: 'var(--shadow-sm)',
        display: 'flex', flexDirection: 'column', gap: '20px'
      }}>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} color="var(--color-primary)" />
            Court Utilization & Traffic Report
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', margin: '4px 0 0' }}>
            Breakdown of play hours, booking count, and occupancy by individual court numbers.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '12px 8px', fontWeight: 700 }}>Court</th>
                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'center' }}>Total Successful Reservations</th>
                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'center' }}>Total Play Hours Booked</th>
                <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'right' }}>Occupancy Grade</th>
              </tr>
            </thead>
            <tbody>
              {courtUsage.map(c => {
                const grade = c.totalHoursPlayed > 50 ? 'EXCELLENT' : c.totalHoursPlayed > 20 ? 'OPTIMAL' : 'MODERATE'
                const gradeColor = grade === 'EXCELLENT' ? '#10b981' : grade === 'OPTIMAL' ? 'var(--color-primary)' : '#f59e0b'

                return (
                  <tr key={c.courtId} style={{ borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-primary)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 800 }}>
                      {c.courtName}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      {c.bookingsCount} slots
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700 }}>
                      {c.totalHoursPlayed.toFixed(1)} hrs
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: gradeColor }}>
                      {grade}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
