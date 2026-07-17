// src/components/dashboard/StudentMastery.tsx
'use client'

import { useState } from 'react'

export interface MasteryCell {
  studentName: string
  topic: string
  score: number | null   // 0-100, null = not attempted
}

interface StudentMasteryProps {
  cells: MasteryCell[]
  students: string[]
  topics: string[]
  loading?: boolean
}

function getColor(score: number | null): string {
  if (score === null) return 'var(--color-surface-alt)'
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function getLegendLabel(score: number | null): string {
  if (score === null) return 'Not attempted'
  if (score >= 80) return `${score}% — Mastered`
  if (score >= 60) return `${score}% — Learning`
  if (score >= 40) return `${score}% — Struggling`
  return `${score}% — Needs help`
}

export default function StudentMastery({
  cells,
  students,
  topics,
  loading = false,
}: StudentMasteryProps) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  // Build lookup map: "student|topic" → score
  const scoreMap = new Map<string, number | null>()
  for (const cell of cells) {
    scoreMap.set(`${cell.studentName}|${cell.topic}`, cell.score)
  }

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          border: '1px solid var(--color-border)',
          minHeight: '200px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
        aria-busy="true"
        aria-label="Loading mastery heatmap"
      />
    )
  }

  return (
    <section
      aria-label="Student mastery heatmap"
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBlockEnd: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
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
          🗺️ Student Mastery Map
        </h2>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { color: '#22c55e', label: 'Mastered (≥80%)' },
            { color: '#eab308', label: 'Learning (60-79%)' },
            { color: '#f97316', label: 'Struggling (40-59%)' },
            { color: '#ef4444', label: 'Needs Help (<40%)' },
            { color: 'var(--color-surface-alt)', label: 'Not Attempted' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                aria-hidden="true"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  background: item.color,
                  border: '1px solid var(--color-border)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px', overflowX: 'auto' }}>
        {students.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px' }}>
            No student data yet. Share activities with students to see progress.
          </p>
        ) : (
          <div style={{ position: 'relative' }}>
            <table
              role="grid"
              aria-label="Student mastery grid"
              style={{
                borderCollapse: 'separate',
                borderSpacing: '3px',
                fontSize: '12px',
              }}
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    style={{
                      padding: '4px 8px',
                      color: 'var(--color-text-muted)',
                      fontWeight: 600,
                      textAlign: 'start',
                      minWidth: '100px',
                    }}
                  >
                    Student / Topic
                  </th>
                  {topics.map((topic) => (
                    <th
                      key={topic}
                      scope="col"
                      style={{
                        padding: '4px 6px',
                        color: 'var(--color-text-muted)',
                        fontWeight: 600,
                        textAlign: 'center',
                        writingMode: 'vertical-lr',
                        transform: 'rotate(180deg)',
                        maxWidth: '32px',
                        fontSize: '11px',
                      }}
                    >
                      {topic}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student}>
                    <th
                      scope="row"
                      style={{
                        padding: '4px 8px',
                        color: 'var(--color-text-primary)',
                        fontWeight: 500,
                        textAlign: 'start',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {student}
                    </th>
                    {topics.map((topic) => {
                      const score = scoreMap.get(`${student}|${topic}`) ?? null
                      const label = getLegendLabel(score)

                      return (
                        <td
                          key={topic}
                          role="gridcell"
                          aria-label={`${student}, ${topic}: ${label}`}
                          onMouseEnter={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect()
                            setTooltip({
                              text: `${student} • ${topic}: ${label}`,
                              x: rect.left,
                              y: rect.top,
                            })
                          }}
                          onMouseLeave={() => setTooltip(null)}
                          style={{
                            width: '28px',
                            height: '28px',
                            background: getColor(score),
                            borderRadius: '4px',
                            cursor: 'default',
                            transition: 'opacity 0.15s',
                          }}
                          onFocus={(e) => {
                            const rect = (e.target as HTMLElement).getBoundingClientRect()
                            setTooltip({
                              text: `${student} • ${topic}: ${label}`,
                              x: rect.left,
                              y: rect.top,
                            })
                          }}
                          onBlur={() => setTooltip(null)}
                          tabIndex={0}
                        />
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tooltip */}
            {tooltip && (
              <div
                role="tooltip"
                style={{
                  position: 'fixed',
                  top: tooltip.y - 40,
                  left: tooltip.x,
                  background: 'var(--color-text-primary)',
                  color: 'var(--color-surface)',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 100,
                }}
              >
                {tooltip.text}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
