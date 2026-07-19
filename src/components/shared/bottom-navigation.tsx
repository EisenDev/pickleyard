'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Layers,
  QrCode,
  User,
  ShieldCheck,
  Menu,
  Users,
  CreditCard
} from 'lucide-react'

interface BottomNavigationProps {
  user?: {
    role?: string | null
  }
  onMenuClick: () => void
}

export function BottomNavigation({ user, onMenuClick }: BottomNavigationProps) {
  const pathname = usePathname()
  const isAdminOrStaff = user?.role === 'ADMIN' || user?.role === 'STAFF'

  const playerTabs = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/openplay', label: 'Open Play', icon: QrCode },
    { href: '/dashboard/paddlestack', label: 'Paddle Stack', icon: Layers },
    { href: '/dashboard/bookings', label: 'Bookings', icon: Calendar },
  ]

  const adminTabs = [
    { href: '/dashboard/admin', label: 'Kiosk', icon: ShieldCheck },
    { href: '/dashboard/paddlestack', label: 'Stack Board', icon: Layers },
    { href: '/dashboard/bookings', label: 'Bookings', icon: Calendar },
    { 
      href: user?.role === 'ADMIN' ? '/dashboard/admin/users' : '/dashboard/transactions', 
      label: user?.role === 'ADMIN' ? 'Users' : 'Ledger', 
      icon: user?.role === 'ADMIN' ? Users : CreditCard 
    },
  ]

  const tabs = isAdminOrStaff ? adminTabs : playerTabs

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
        background: 'var(--color-card)',
        borderTop: '1px solid var(--color-border)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
        display: 'none', // Shown only on mobile via global CSS
        gridTemplateColumns: 'repeat(5, 1fr)',
        alignItems: 'center',
        zIndex: 500,
        boxSizing: 'border-box',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
      className="mobile-bottom-nav"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              height: '100%',
              textDecoration: 'none',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              transition: 'color var(--duration-fast)'
            }}
          >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
            <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500 }}>{tab.label}</span>
          </Link>
        )
      })}

      {/* Menu / More Button */}
      <button
        onClick={onMenuClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          height: '100%',
          border: 'none',
          background: 'transparent',
          color: 'var(--color-text-secondary)',
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
      >
        <Menu size={18} strokeWidth={1.5} />
        <span style={{ fontSize: 9, fontWeight: 500 }}>More</span>
      </button>
    </div>
  )
}
