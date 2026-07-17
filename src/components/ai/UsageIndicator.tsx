'use client'

import { useEffect, useState } from 'react'

interface UsageData {
  todayCount: number
  dailyLimit: number | null
  remaining: number | null
  isPremium: boolean
}

export default function UsageIndicator() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/ai/usage')
        if (res.ok && !cancelled) {
          const data = await res.json() as UsageData
          setUsage(data)
        }
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetchUsage()
    return () => { cancelled = true }
  }, [])

  if (loading || !usage) return null

  const isNearLimit = !usage.isPremium && (usage.remaining ?? 10) <= 3
  const isAtLimit = !usage.isPremium && (usage.remaining ?? 10) <= 0

  const badgeColor = usage.isPremium
    ? 'var(--color-success)'
    : isAtLimit
    ? 'var(--color-danger)'
    : isNearLimit
    ? 'var(--color-warning)'
    : 'var(--color-primary)'

  return (
    <div
      aria-label={
        usage.isPremium
          ? 'AI: Unlimited'
          : `AI: ${usage.todayCount} of ${usage.dailyLimit} generations used today`
      }
      title={
        usage.isPremium
          ? 'Premium: unlimited AI generations'
          : `${usage.remaining ?? 0} AI generations remaining today`
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        padding: '0.25rem 0.6rem',
        borderRadius: '9999px',
        background: `color-mix(in srgb, ${badgeColor} 15%, transparent)`,
        border: `1px solid color-mix(in srgb, ${badgeColor} 30%, transparent)`,
        fontSize: '0.72rem',
        fontWeight: 700,
        color: badgeColor,
        cursor: 'default',
        userSelect: 'none',
        transition: 'all 0.2s',
        fontFamily: 'var(--font-body)',
      }}
    >
      <span aria-hidden="true">✨</span>
      {usage.isPremium ? (
        <span>AI: ∞</span>
      ) : (
        <span>
          AI: {usage.todayCount}/{usage.dailyLimit}
        </span>
      )}
    </div>
  )
}
