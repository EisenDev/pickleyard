'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Award,
  CreditCard,
  Settings,
  Sparkles,
  User,
  QrCode,
  Users,
  Wallet,
  LogOut,
  ShieldCheck
} from 'lucide-react'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/openplay', label: 'Open Play', icon: QrCode },
  { href: '/dashboard/paddlestack', label: 'Paddle Stack', icon: Layers },
  { href: '/dashboard/bookings', label: 'My Bookings', icon: Calendar },
  { href: '/dashboard/events', label: 'Events', icon: Award },
  { href: '/dashboard/transactions', label: 'Transactions', icon: CreditCard },
  { href: '/dashboard/topup', label: 'Top Up', icon: Wallet },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

const adminNavItems = [
  { href: '/dashboard/admin', label: 'Kiosk Control', icon: ShieldCheck },
  { href: '/dashboard/paddlestack', label: 'Paddle Stack Board', icon: Layers },
  { href: '/dashboard/bookings', label: 'Booking Monitor', icon: Calendar },
  { href: '/dashboard/transactions', label: 'Transaction Ledger', icon: CreditCard },
  { href: '/dashboard/admin/users', label: 'User Management', icon: Users },
  { href: '/dashboard/admin/settings', label: 'Time & Cost Control', icon: Settings },
]

const bottomItems = [
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  user?: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
  isOpen?: boolean
}

export function Sidebar({ user, isOpen }: SidebarProps) {
  const pathname = usePathname()

  const activeNavItems = (user?.role === 'ADMIN' || user?.role === 'STAFF')
    ? adminNavItems.filter(item => {
        if (user?.role === 'STAFF') {
          // Staff cannot access Time & Cost Control or User Management
          if (item.href === '/dashboard/admin/settings' || item.href === '/dashboard/admin/users') return false
        }
        return true
      })
    : navItems

  return (
    <aside
      className={`sidebar-container ${isOpen ? 'open' : ''}`}
      style={{
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid var(--color-border)',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <img src="/paddleyard-logo.png" alt="PaddleYard Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          PaddleYard
        </span>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        aria-label="Main navigation"
      >
        {activeNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 12px',
                height: 36,
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'var(--color-primary-subtle)' : 'transparent',
                transition: `background 120ms, color 120ms`,
                position: 'relative',
              }}
              className="sidebar-item"
            >
              <Icon
                size={16}
                strokeWidth={isActive ? 2 : 1.5}
                aria-hidden="true"
              />
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Lobby Check-in Status */}
      <div style={{ padding: '8px 12px 16px' }}>
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ position: 'relative' }}>
            <Sparkles size={16} color="var(--color-accent)" strokeWidth={1.5} />
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--color-success)',
                border: '1px solid var(--color-surface)',
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
              Club Check-in
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-text-secondary)' }}>Lobby is active</div>
          </div>
        </div>
      </div>

      <style>{`
        .sidebar-item:hover {
          background: var(--color-hover-bg) !important;
          color: var(--color-text-primary) !important;
        }
        .sidebar-item[aria-current="page"]:hover {
          background: var(--color-primary-subtle) !important;
          color: var(--color-primary) !important;
        }
      `}</style>
    </aside>
  )
}
