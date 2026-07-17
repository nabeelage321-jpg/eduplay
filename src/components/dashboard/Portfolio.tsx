// src/components/dashboard/student/Portfolio.tsx
'use client'

import { useState } from 'react'

export interface PortfolioEntry {
  id: string
  activityTitle: string
  subject: string
  score: number    // 0-100
  completedAt: string
}

interface PortfolioProps {
  entries: PortfolioEntry[]
  studentName: string
  loading?: boolean
}

// Inline sparkline SVG — no external deps
function Sparkline({ entries }: { entries: PortfolioEntry[] }) {
  if (entries.length < 2) return null

  const scores = entries.map((e) => e.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores, min + 1)
  const width = 300
  const height = 60
  const pad = 4

  const points = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (width - pad * 2)
    const y = pad + ((max - s) / (max - min)) * (height - pad * 2)
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width - pad},${height - pad} L ${pad},${height - pad} Z`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      aria-label="Score trend over time"
      role="img"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Latest dot */}
      <circle
        cx={Number(points[points.length - 1].split(',')[0])}
        cy={Number(points[points.length - 1].split(',')[1])}
        r="4"
        fill="var(--color-primary)"
      />
    </svg>
  )
}

export default function Portfolio({ entries, studentName, loading = false }: PortfolioProps) {
  const [filter, setFilter] = useState<string>('all')

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          border: '1px solid var(--color-border)',
          minHeight: '300px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
        aria-busy="true"
        aria-label="Loading portfolio"
      />
    )
  }

  const subjects = ['all', ...Array.from(new Set(entries.map((e) => e.subject)))]

  const filtered =
    filter === 'all' ? entries : entries.filter((e) => e.subject === filter)

  const avgScore =
    filtered.length > 0
      ? Math.round(filtered.reduce((s, e) => s + e.score, 0) / filtered.length)
      : 0

  return (
    <section
      aria-label={`Academic portfolio for ${studentName}`}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBlockEnd: '1px solid var(--color-border)',
        }}
      >
        <h2
          style={{
            margin: '0 0 4px',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          🎓 Academic Portfolio
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {studentName}&apos;s full year journey — {entries.length} activities completed
        </p>
      </div>

      {entries.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>📖</p>
          <p style={{ color: 'var(--color-text-muted)', marginBlockStart: '8px' }}>
            Portfolio is empty — complete activities to build your academic story!
          </p>
        </div>
      ) : (
        <>
          {/* Sparkline */}
          <div style={{ padding: '16px 20px 8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBlockEnd: '8px',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Score trend
              </span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: avgScore >= 80 ? '#16a34a' : avgScore >= 60 ? '#ca8a04' : '#dc2626',
                }}
              >
                Avg: {avgScore}%
              </span>
            </div>
            <Sparkline entries={filtered} />
          </div>

          {/* Subject filter */}
          <div
            style={{
              padding: '0 20px 12px',
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap',
            }}
            role="group"
            aria-label="Filter by subject"
          >
            {subjects.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                aria-pressed={filter === s}
                style={{
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: filter === s ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                  color: filter === s ? '#fff' : 'var(--color-text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Entry list */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {filtered
              .slice()
              .reverse()
              .map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: '10px 20px',
                    borderBlockEnd: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-sm)',
                      background:
                        entry.score >= 80
                          ? '#dcfce7'
                          : entry.score >= 60
                          ? '#fef9c3'
                          : '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                      color:
                        entry.score >= 80
                          ? '#16a34a'
                          : entry.score >= 60
                          ? '#ca8a04'
                          : '#dc2626',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    {entry.score}%
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.activityTitle}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                      {entry.subject} · {new Date(entry.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </section>
  )
}
