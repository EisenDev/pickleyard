'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { Search, Bell, Grid, ChevronDown, LogOut, User, Settings, Menu as MenuIcon } from 'lucide-react'

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
      }}
    >
      {/* Search Input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 320 }}>
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
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={16}
            color="var(--color-text-secondary)"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search courts, events..."
            style={{
              width: '100%',
              height: 32,
              padding: '0 36px 0 36px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-primary)',
              transition: 'border-color var(--duration-fast), background var(--duration-fast)',
            }}
            className="search-input"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Quick check-in indicator */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            background: 'var(--color-accent-subtle)',
            color: 'var(--color-accent-hover)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid rgba(244, 124, 0, 0.2)',
          }}
        >
          Check-in QR Ready
        </div>

        {/* Notifications */}
        <button
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            position: 'relative',
            transition: 'background var(--duration-fast)',
          }}
          className="header-icon-btn"
        >
          <Bell size={16} strokeWidth={1.5} />
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 8,
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--color-accent)',
            }}
          />
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px' }} />

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
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-full)',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary-subtle)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {initials}
              </div>
            )}
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                {user?.name || 'Player'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: -2, textTransform: 'capitalize' }}>
                {user?.role?.toLowerCase() || 'member'}
              </span>
            </div>
            <ChevronDown size={14} color="var(--color-text-secondary)" />
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
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                }}
                className="dropdown-item"
              >
                <User size={14} strokeWidth={1.5} />
                <span>My Profile</span>
              </button>
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  fontSize: 13,
                  color: 'var(--color-text-primary)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: '100%',
                }}
                className="dropdown-item"
              >
                <Settings size={14} strokeWidth={1.5} />
                <span>Club Settings</span>
              </button>
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
      `}</style>
    </header>
  )
}
