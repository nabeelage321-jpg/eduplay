// src/components/pwa/OfflineBanner.tsx
'use client'

import { useState, useEffect } from 'react'

interface CachedActivity {
  id: string
  title: string
  type: string
  typeEmoji: string
  cachedAt: string
}

interface OfflineBannerProps {
  locale?: string
}

export default function OfflineBanner({ locale = 'en' }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(false)
  const [cachedActivities, setCachedActivities] = useState<CachedActivity[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine)

    // Set initial state
    setIsOffline(!navigator.onLine)

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  useEffect(() => {
    if (!isOffline) return

    // Load cached activities from IndexedDB / service worker cache
    const loadCached = async () => {
      try {
        // Try to read from localStorage fallback (service worker stores metadata here)
        const raw = localStorage.getItem('eduplay-cached-activities')
        if (raw) {
          setCachedActivities(JSON.parse(raw) as CachedActivity[])
        }
      } catch {
        // Ignore parse errors
      }
    }

    void loadCached()
  }, [isOffline])

  if (!isOffline) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        insetBlockEnd: 0,
        insetInlineStart: 0,
        insetInlineEnd: 0,
        zIndex: 9999,
        background: '#1e293b',
        color: '#f8fafc',
        borderBlockStart: '2px solid #ef4444',
      }}
    >
      {/* Main banner */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '20px', flexShrink: 0 }}>
          📵
        </span>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '14px' }}>You&apos;re offline</strong>
          <span style={{ fontSize: '13px', color: '#94a3b8', marginInlineStart: '8px' }}>
            {cachedActivities.length > 0
              ? `${cachedActivities.length} activit${cachedActivities.length === 1 ? 'y' : 'ies'} available offline`
              : 'No activities cached yet'}
          </span>
        </div>

        {cachedActivities.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            style={{
              background: 'none',
              border: '1px solid #475569',
              borderRadius: 'var(--radius-sm)',
              color: '#cbd5e1',
              padding: '4px 12px',
              fontSize: '13px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {expanded ? 'Hide ▲' : 'Show ▼'}
          </button>
        )}
      </div>

      {/* Cached activities list */}
      {expanded && cachedActivities.length > 0 && (
        <div
          style={{
            borderBlockStart: '1px solid #334155',
            padding: '12px 16px',
            maxWidth: '800px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
          aria-label="Cached activities available offline"
        >
          {cachedActivities.map((activity) => (
            <a
              key={activity.id}
              href={`/${locale}/activity/${activity.id}/play`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: '#0f172a',
                borderRadius: 'var(--radius-sm)',
                textDecoration: 'none',
                color: '#e2e8f0',
                transition: 'background 0.15s',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '20px' }}>
                {activity.typeEmoji}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{activity.title}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Cached {new Date(activity.cachedAt).toLocaleDateString()}
                </div>
              </div>
              <span aria-hidden="true" style={{ color: '#22c55e', fontSize: '12px' }}>
                ✅ Available
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
