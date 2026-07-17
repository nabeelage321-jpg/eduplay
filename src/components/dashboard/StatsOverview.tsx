// src/components/dashboard/StatsOverview.tsx
'use client'

interface StatCard {
  label: string
  value: string | number
  icon: string
  trend?: { value: number; label: string }
  highlight?: boolean
}

interface StatsOverviewProps {
  totalActivities: number
  totalPlays: number
  studentsThisWeek: number
  trendingActivity: { title: string; plays: number } | null
  loading?: boolean
}

function StatCardUI({ card }: { card: StatCard }) {
  return (
    <article
      style={{
        background: card.highlight ? 'var(--gradient-hero)' : 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        padding: '20px 24px',
        boxShadow: 'var(--shadow-card)',
        border: card.highlight ? 'none' : '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span
          aria-hidden="true"
          style={{
            fontSize: '32px',
            lineHeight: 1,
          }}
        >
          {card.icon}
        </span>
        {card.trend && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: card.trend.value >= 0 ? 'var(--color-success)' : 'var(--color-danger)',
              background: card.trend.value >= 0 ? '#d1fae5' : '#fee2e2',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {card.trend.value >= 0 ? '↑' : '↓'} {Math.abs(card.trend.value)}%
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: '32px',
          fontWeight: 700,
          fontFamily: 'var(--font-display)',
          color: card.highlight ? '#fff' : 'var(--color-text-primary)',
          lineHeight: 1.1,
        }}
      >
        {card.value}
      </div>

      <div
        style={{
          fontSize: '14px',
          color: card.highlight ? 'rgba(255,255,255,0.8)' : 'var(--color-text-secondary)',
        }}
      >
        {card.label}
      </div>

      {card.trend && (
        <div
          style={{
            fontSize: '12px',
            color: card.highlight ? 'rgba(255,255,255,0.6)' : 'var(--color-text-muted)',
          }}
        >
          {card.trend.label}
        </div>
      )}
    </article>
  )
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        padding: '20px 24px',
        border: '1px solid var(--color-border)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    >
      <div style={{ height: '32px', width: '32px', background: 'var(--color-surface-alt)', borderRadius: '8px', marginBlockEnd: '12px' }} />
      <div style={{ height: '32px', width: '60%', background: 'var(--color-surface-alt)', borderRadius: '4px', marginBlockEnd: '8px' }} />
      <div style={{ height: '14px', width: '80%', background: 'var(--color-surface-alt)', borderRadius: '4px' }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
    </div>
  )
}

export default function StatsOverview({
  totalActivities,
  totalPlays,
  studentsThisWeek,
  trendingActivity,
  loading = false,
}: StatsOverviewProps) {
  if (loading) {
    return (
      <section aria-label="Loading statistics">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      </section>
    )
  }

  const cards: StatCard[] = [
    {
      label: 'Total Activities',
      value: totalActivities.toLocaleString(),
      icon: '🎮',
      trend: { value: 12, label: 'vs last month' },
    },
    {
      label: 'Total Plays',
      value: totalPlays.toLocaleString(),
      icon: '▶️',
      trend: { value: 24, label: 'vs last month' },
      highlight: true,
    },
    {
      label: 'Students This Week',
      value: studentsThisWeek.toLocaleString(),
      icon: '👥',
      trend: { value: 8, label: 'vs last week' },
    },
    {
      label: 'Trending Activity',
      value: trendingActivity
        ? `${trendingActivity.plays} plays`
        : 'No data',
      icon: '🔥',
      trend: trendingActivity
        ? { value: 45, label: `"${trendingActivity.title.slice(0, 20)}${trendingActivity.title.length > 20 ? '…' : ''}"` }
        : undefined,
    },
  ]

  return (
    <section aria-label="Statistics overview">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {cards.map((card) => (
          <StatCardUI key={card.label} card={card} />
        ))}
      </div>
    </section>
  )
}
