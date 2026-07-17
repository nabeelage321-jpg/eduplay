// src/components/dashboard/student/MyActivities.tsx
'use client'

import Link from 'next/link'

export type ActivityStatus = 'not_started' | 'in_progress' | 'completed'

export interface AssignedActivity {
  id: string
  title: string
  type: string
  typeEmoji: string
  subject: string
  assignedAt: string
  dueDate?: string
  status: ActivityStatus
  score?: number        // 0-100
  timeSpentSeconds?: number
}

interface MyActivitiesProps {
  activities: AssignedActivity[]
  locale?: string
  loading?: boolean
}

const STATUS_CONFIG: Record<ActivityStatus, { label: string; color: string; bg: string }> = {
  not_started: { label: 'Not Started', color: '#6b7280', bg: '#f3f4f6' },
  in_progress: { label: 'In Progress', color: '#2563eb', bg: '#eff6ff' },
  completed: { label: 'Completed', color: '#16a34a', bg: '#f0fdf4' },
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export default function MyActivities({
  activities,
  locale = 'en',
  loading = false,
}: MyActivitiesProps) {
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
        aria-label="Loading activities"
      />
    )
  }

  const pending = activities.filter((a) => a.status !== 'completed')
  const completed = activities.filter((a) => a.status === 'completed')

  return (
    <section aria-label="My assigned activities">
      <h2
        style={{
          margin: '0 0 16px',
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-display)',
        }}
      >
        📚 My Activities
      </h2>

      {activities.length === 0 ? (
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius)',
            padding: '40px 20px',
            textAlign: 'center',
            border: '1px solid var(--color-border)',
          }}
        >
          <p style={{ fontSize: '40px', margin: 0 }}>🎉</p>
          <p style={{ color: 'var(--color-text-muted)', marginBlockStart: '8px' }}>
            All done! No activities assigned yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h3
                style={{
                  margin: '0 0 10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                To Do ({pending.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pending.map((activity) => {
                  const status = STATUS_CONFIG[activity.status]
                  const overdue = isOverdue(activity.dueDate)

                  return (
                    <article
                      key={activity.id}
                      style={{
                        background: 'var(--color-surface)',
                        borderRadius: 'var(--radius)',
                        border: `1px solid ${overdue ? '#fca5a5' : 'var(--color-border)'}`,
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: overdue ? '0 0 0 2px #fee2e2' : 'none',
                      }}
                    >
                      <span aria-hidden="true" style={{ fontSize: '28px', flexShrink: 0 }}>
                        {activity.typeEmoji}
                      </span>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {activity.title}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--color-text-muted)',
                            marginBlockStart: '2px',
                            display: 'flex',
                            gap: '8px',
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>{activity.subject}</span>
                          {activity.dueDate && (
                            <span style={{ color: overdue ? '#ef4444' : 'inherit' }}>
                              {overdue ? '⚠️ ' : '📅 '}Due{' '}
                              {new Date(activity.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: status.color,
                            background: status.bg,
                          }}
                        >
                          {status.label}
                        </span>
                        <Link
                          href={`/${locale}/activity/${activity.id}/play`}
                          style={{
                            padding: '7px 14px',
                            background: 'var(--gradient-btn)',
                            color: '#fff',
                            borderRadius: 'var(--radius-sm)',
                            textDecoration: 'none',
                            fontSize: '13px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {activity.status === 'in_progress' ? 'Continue ▶' : 'Start ▶'}
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h3
                style={{
                  margin: '0 0 10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Completed ({completed.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {completed.map((activity) => (
                  <div
                    key={activity.id}
                    style={{
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      opacity: 0.8,
                    }}
                  >
                    <span aria-hidden="true" style={{ fontSize: '20px' }}>
                      {activity.typeEmoji}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: '14px',
                        color: 'var(--color-text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {activity.title}
                    </span>
                    {activity.score !== undefined && (
                      <span
                        style={{
                          fontWeight: 700,
                          color: activity.score >= 80 ? '#16a34a' : activity.score >= 60 ? '#ca8a04' : '#dc2626',
                          fontSize: '14px',
                        }}
                        aria-label={`Score: ${activity.score}%`}
                      >
                        {activity.score}%
                      </span>
                    )}
                    <span aria-hidden="true" style={{ color: '#16a34a', fontSize: '18px' }}>✅</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
