// src/components/dashboard/WeeklyReport.tsx
'use client'

import { useState } from 'react'

interface WeeklyStats {
  weekStartDate: string
  totalSessions: number
  totalStudents: number
  totalPlays: number
  avgCompletionRate: number
  avgScore: number
  topActivity: { title: string; plays: number } | null
  newStudents: number
  streakDays: number
}

interface WeeklyReportProps {
  stats: WeeklyStats
  teacherName: string
  loading?: boolean
}

function StatRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBlockEnd: '1px solid var(--color-border)',
      }}
    >
      <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span aria-hidden="true">{icon}</span>
        {label}
      </span>
      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function generateInsight(stats: WeeklyStats): string {
  const insights: string[] = []

  if (stats.avgScore >= 80) {
    insights.push('Students are performing excellently this week.')
  } else if (stats.avgScore >= 60) {
    insights.push('Students are showing steady progress — consider reviewing lower-scoring topics.')
  } else {
    insights.push('Average scores are below 60% — try simpler activities or review the curriculum.')
  }

  if (stats.avgCompletionRate >= 75) {
    insights.push('Completion rates are strong — students are engaged!')
  } else {
    insights.push('Completion rates could be higher — shorter activities often improve engagement.')
  }

  if (stats.newStudents > 0) {
    insights.push(`${stats.newStudents} new student${stats.newStudents > 1 ? 's' : ''} joined this week.`)
  }

  if (stats.streakDays >= 5) {
    insights.push(`You're on a ${stats.streakDays}-day teaching streak — keep it up! 🔥`)
  }

  return insights.join(' ')
}

export default function WeeklyReport({ stats, teacherName, loading = false }: WeeklyReportProps) {
  const [expanded, setExpanded] = useState(false)

  const weekLabel = new Date(stats.weekStartDate).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  })

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          border: '1px solid var(--color-border)',
          minHeight: '180px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
        aria-busy="true"
        aria-label="Loading weekly report"
      />
    )
  }

  const insight = generateInsight(stats)

  return (
    <section
      aria-label={`Weekly report for week of ${weekLabel}`}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          padding: '16px 20px',
          background: 'none',
          border: 'none',
          borderBlockEnd: expanded ? '1px solid var(--color-border)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          textAlign: 'start',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            📋 Weekly Report — {weekLabel}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Hi {teacherName} — here&apos;s your week in review
          </p>
        </div>
        <span
          aria-hidden="true"
          style={{
            fontSize: '18px',
            color: 'var(--color-text-muted)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          ▼
        </span>
      </button>

      {/* AI insight preview — always visible */}
      <div
        style={{
          padding: '12px 20px',
          background: 'var(--color-surface-alt)',
          borderBlockEnd: expanded ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
          }}
        >
          💡 {insight}
        </p>
      </div>

      {/* Detailed stats — collapsible */}
      {expanded && (
        <div style={{ padding: '0 20px 16px' }}>
          <StatRow label="Live sessions run" value={String(stats.totalSessions)} icon="🎮" />
          <StatRow label="Total students reached" value={stats.totalStudents.toLocaleString()} icon="👥" />
          <StatRow label="Activity plays" value={stats.totalPlays.toLocaleString()} icon="▶️" />
          <StatRow label="Avg completion rate" value={`${stats.avgCompletionRate}%`} icon="✅" />
          <StatRow label="Avg score" value={`${stats.avgScore}%`} icon="📊" />
          <StatRow
            label="Top activity"
            value={
              stats.topActivity
                ? `${stats.topActivity.title.slice(0, 30)} (${stats.topActivity.plays} plays)`
                : 'N/A'
            }
            icon="🔥"
          />
          <StatRow label="New students" value={String(stats.newStudents)} icon="🆕" />
          <StatRow label="Teaching streak" value={`${stats.streakDays} days`} icon="🔥" />
        </div>
      )}
    </section>
  )
}
