'use client'

import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { Search, Bell, Grid, ChevronDown, LogOut, User, Settings, Menu as MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface HeaderProps {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string | null
  }
  onMenuClick?: () => void
}

export function Header({ user, onMenuClick }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setDropdownOpen(false)
  }, [pathname])

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header
      style={{
        height: 'var(--header-height)',
        background: 'var(--color-card)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky',
        top: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--spacing-page-x)',
        marginRight: 0,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Hamburger Menu (mobile only) */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text-primary)',
              padding: '6px',
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)'
            }}
            className="mobile-menu-btn"
          >
            <MenuIcon size={20} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* User Profile Menu */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 'var(--radius-md)',
            transition: 'background var(--duration-fast)',
          }}
          className="user-menu-btn"
        >
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name || 'User'}
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-full)',
                objectFit: 'cover',
                border: '2px solid var(--color-primary)',
                boxShadow: '0 0 0 2px var(--color-primary-subtle)',
              }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary-subtle)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 800,
                border: '2px solid var(--color-primary)',
                boxShadow: '0 0 0 2px var(--color-primary-subtle)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}
          <div className="header-user-info" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {user?.name || 'Player'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: -2, textTransform: 'capitalize' }}>
              {user?.role?.toLowerCase() || 'member'}
            </span>
          </div>
          <span className="header-user-chevron" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <ChevronDown size={14} color="var(--color-text-secondary)" />
          </span>
        </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                width: 180,
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '4px 0',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 400,
              }}
            >
              <Link
                href="/dashboard/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
                className="dropdown-item"
              >
                <User size={14} strokeWidth={1.5} />
                <span>My Profile</span>
              </Link>
              <Link
                href="/dashboard/settings"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
                className="dropdown-item"
              >
                <Settings size={14} strokeWidth={1.5} />
                <span>Club Settings</span>
              </Link>
              <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: 13,
                  color: 'var(--color-danger)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                }}
                className="dropdown-item-danger"
              >
                <LogOut size={14} strokeWidth={1.5} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>

      <style>{`
        .search-input:focus {
          border-color: var(--color-border-focus) !important;
          background: var(--color-card) !important;
        }
        .header-icon-btn:hover {
          background: var(--color-hover-bg) !important;
          color: var(--color-text-primary) !important;
        }
        .user-menu-btn:hover {
          background: var(--color-hover-bg) !important;
        }
        .dropdown-item:hover {
          background: var(--color-hover-bg) !important;
        }
        .dropdown-item-danger:hover {
          background: var(--color-danger-subtle) !important;
        }
        @media (max-width: 768px) {
          .header-user-info {
            display: none !important;
          }
          .header-user-chevron {
            display: none !important;
          }
        }
      `}</style>
    </header>
  )
}
