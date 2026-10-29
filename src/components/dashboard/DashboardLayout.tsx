// src/components/dashboard/DashboardLayout.tsx
'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: string
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: '📊', label: 'Overview' },
  { href: '/dashboard/activities', icon: '🎮', label: 'My Activities' },
  { href: '/dashboard/analytics', icon: '📈', label: 'Analytics' },
  { href: '/dashboard/students', icon: '👥', label: 'Students' },
  { href: '/dashboard/reports', icon: '📋', label: 'Reports' },
  { href: '/dashboard/marketplace', icon: '🛍️', label: 'Marketplace', badge: 'Pro' },
  { href: '/dashboard/billing', icon: '💳', label: 'Billing' },
  { href: '/dashboard/settings', icon: '⚙️', label: 'Settings' },
]

interface DashboardLayoutProps {
  children: ReactNode
  teacherName?: string
  teacherEmail?: string
  tier?: 'free' | 'pro' | 'school'
}

export default function DashboardLayout({
  children,
  teacherName = 'Teacher',
  teacherEmail = '',
  tier = 'free',
}: DashboardLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const tierBadge: Record<string, string> = {
    free: 'Free',
    pro: '⭐ Pro',
    school: '🏫 School',
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--color-background)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 40,
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: '256px',
          background: 'var(--color-surface)',
          borderInlineEnd: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          insetBlockStart: 0,
          insetBlockEnd: 0,
          insetInlineStart: 0,
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          overflowY: 'auto',
        }}
        // Desktop: always visible
        className="dashboard-sidebar"
        role="navigation"
        aria-label="Dashboard navigation"
      >
        {/* Logo */}
        <div
          style={{
            padding: '24px 20px 16px',
            borderBlockEnd: '1px solid var(--color-border)',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
            }}
          >
            <span style={{ fontSize: '28px' }}>🎓</span>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '20px',
                color: 'var(--color-primary)',
              }}
            >
              EduPlay
            </span>
          </Link>
        </div>

        {/* Teacher info */}
        <div
          style={{
            padding: '16px 20px',
            borderBlockEnd: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '16px',
                flexShrink: 0,
              }}
            >
              {teacherName.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {teacherName}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tierBadge[tier]}
              </div>
            </div>
          </div>
          {tier === 'free' && (
            <Link
              href="/pricing"
              style={{
                display: 'block',
                marginBlockStart: '10px',
                padding: '6px 12px',
                background: 'var(--gradient-btn)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              ⭐ Upgrade to Pro
            </Link>
          )}
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 12px' }}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === item.href || pathname === '/dashboard/'
                : pathname.startsWith(item.href)
            const isProLocked = item.badge === 'Pro' && tier === 'free'

            return (
              <Link
                key={item.href}
                href={isProLocked ? '/pricing' : item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  marginBlockEnd: '2px',
                  textDecoration: 'none',
                  background: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive
                    ? '#fff'
                    : isProLocked
                    ? 'var(--color-text-muted)'
                    : 'var(--color-text-secondary)',
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  transition: 'background 0.15s, color 0.15s',
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span aria-hidden="true" style={{ fontSize: '18px', flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {isProLocked && (
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    Pro
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Help link */}
        <div
          style={{
            padding: '16px 20px',
            borderBlockStart: '1px solid var(--color-border)',
          }}
        >
          {/* Help row: deliberately NOT a mailto link. support@eduplay.app
              was removed 2026-10-29 because eduplay.app is NOT owned by the
              owner — mail sent there would go to a stranger. Owner TODO:
              supply a real support address, then restore a mailto link. */}
          <span
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
            }}
          >
            📧 {teacherEmail || 'Help'}
          </span>
        </div>
      </aside>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
        className="dashboard-main"
      >
        {/* Top header (mobile) */}
        <header
          style={{
            background: 'var(--color-surface)',
            borderBlockEnd: '1px solid var(--color-border)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            position: 'sticky',
            insetBlockStart: 0,
            zIndex: 30,
          }}
          className="dashboard-topbar"
        >
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '22px',
              color: 'var(--color-text-primary)',
              padding: '4px',
            }}
            className="dashboard-hamburger"
          >
            ☰
          </button>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '18px',
              color: 'var(--color-primary)',
            }}
          >
            EduPlay
          </span>
          <div style={{ flex: 1 }} />
          <Link
            href="/create"
            style={{
              padding: '8px 16px',
              background: 'var(--gradient-btn)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            + Create
          </Link>
        </header>

        <main
          style={{
            flex: 1,
            padding: '24px 20px',
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .dashboard-sidebar {
            transform: translateX(0) !important;
            position: sticky !important;
            align-self: flex-start;
            height: 100vh;
          }
          .dashboard-hamburger { display: none !important; }
          .dashboard-main { margin-inline-start: 256px; }
          .dashboard-topbar { display: none !important; }
        }
      `}</style>
    </div>
  )
}
