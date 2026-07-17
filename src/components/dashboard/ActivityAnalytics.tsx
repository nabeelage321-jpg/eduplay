// src/components/dashboard/ActivityAnalytics.tsx
'use client'

import { useState } from 'react'

interface DayData {
  date: string   // ISO date string
  plays: number
}

interface ActivityStat {
  id: string
  title: string
  type: string
  playsOverTime: DayData[]
  completionRate: number  // 0-100
  avgScore: number        // 0-100
  totalPlays: number
}

interface ActivityAnalyticsProps {
  activities: ActivityStat[]
  loading?: boolean
}

// Simple bar chart using SVG — no external dep
function PlaysChart({ data, color }: { data: DayData[]; color: string }) {
  const maxPlays = Math.max(...data.map((d) => d.plays), 1)
  const width = 280
  const height = 80
  const barWidth = (width - 16) / data.length - 2

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      aria-label="Plays over time chart"
      role="img"
    >
      {data.map((d, i) => {
        const barHeight = (d.plays / maxPlays) * (height - 20)
        const x = 8 + i * (barWidth + 2)
        const y = height - barHeight - 4

        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={2}
              fill={color}
              opacity={0.85}
            >
              <title>{`${d.date}: ${d.plays} plays`}</title>
            </rect>
          </g>
        )
      })}
    </svg>
  )
}

function RingProgress({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}
    >
      <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`${label}: ${value}%`} role="img">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="6" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="40" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-text-primary)">
          {value}%
        </text>
      </svg>
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
        {label}
      </span>
    </div>
  )
}

export default function ActivityAnalytics({ activities, loading = false }: ActivityAnalyticsProps) {
  const [selectedId, setSelectedId] = useState<string>(activities[0]?.id ?? '')

  const selected = activities.find((a) => a.id === selectedId) ?? activities[0]

  if (loading) {
    return (
      <section aria-busy="true" aria-label="Loading analytics">
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius)',
            padding: '24px',
            border: '1px solid var(--color-border)',
            animation: 'pulse 1.5s ease-in-out infinite',
            minHeight: '300px',
          }}
        />
      </section>
    )
  }

  if (activities.length === 0) {
    return (
      <section
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '48px 24px',
          border: '1px solid var(--color-border)',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '40px', margin: 0 }}>📊</p>
        <p style={{ color: 'var(--color-text-muted)', marginBlockStart: '12px' }}>
          No activity data yet. Create and share activities to see analytics.
        </p>
      </section>
    )
  }

  return (
    <section aria-label="Activity analytics">
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        {/* Activity selector */}
        <div
          style={{
            padding: '16px 20px',
            borderBlockEnd: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            📈 Activity Analytics
          </h2>
          <label htmlFor="activity-select" className="sr-only">
            Select activity
          </label>
          <select
            id="activity-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div style={{ padding: '20px' }}>
            {/* Plays chart */}
            <div style={{ marginBlockEnd: '20px' }}>
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Plays over last 7 days
              </h3>
              <PlaysChart
                data={selected.playsOverTime}
                color="var(--color-primary)"
              />
            </div>

            {/* Metrics row */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'space-around',
                flexWrap: 'wrap',
              }}
            >
              <RingProgress
                value={selected.completionRate}
                label="Completion"
                color="var(--color-success)"
              />
              <RingProgress
                value={selected.avgScore}
                label="Avg Score"
                color="var(--color-primary)"
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {selected.totalPlays.toLocaleString()}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Total Plays
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
