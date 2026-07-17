// src/components/dashboard/WrongAnswerClusters.tsx
'use client'

export interface WrongAnswerCluster {
  activityId: string
  activityTitle: string
  questionPrompt: string
  wrongCount: number
  totalAttempts: number
  topWrongAnswers: Array<{ answer: string; count: number }>
}

interface WrongAnswerClustersProps {
  clusters: WrongAnswerCluster[]
  loading?: boolean
}

function ErrorRate({ wrong, total }: { wrong: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((wrong / total) * 100)
  const color =
    pct >= 60 ? '#ef4444' : pct >= 40 ? '#f97316' : '#eab308'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          flex: 1,
          height: '6px',
          background: 'var(--color-surface-alt)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: '3px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 700,
          color,
          minWidth: '36px',
          textAlign: 'end',
        }}
        aria-label={`${pct}% error rate`}
      >
        {pct}%
      </span>
    </div>
  )
}

export default function WrongAnswerClusters({
  clusters,
  loading = false,
}: WrongAnswerClustersProps) {
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
        aria-label="Loading wrong answer data"
      />
    )
  }

  const sorted = [...clusters].sort(
    (a, b) =>
      b.wrongCount / (b.totalAttempts || 1) -
      a.wrongCount / (a.totalAttempts || 1),
  )

  return (
    <section
      aria-label="Wrong answer clusters"
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
          ❌ Commonly Missed Questions
        </h2>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          Questions where students struggle most — sorted by error rate
        </p>
      </div>

      {sorted.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '32px', margin: 0 }}>✅</p>
          <p style={{ color: 'var(--color-text-muted)', marginBlockStart: '8px' }}>
            No wrong answers yet — students are doing great!
          </p>
        </div>
      ) : (
        <ol
          style={{ margin: 0, padding: 0, listStyle: 'none' }}
          aria-label="Questions sorted by error rate"
        >
          {sorted.map((cluster, idx) => (
            <li
              key={`${cluster.activityId}-${idx}`}
              style={{
                padding: '16px 20px',
                borderBlockEnd:
                  idx < sorted.length - 1 ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {/* Activity label */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBlockEnd: '4px',
                }}
              >
                {cluster.activityTitle}
              </div>

              {/* Question */}
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBlockEnd: '10px',
                }}
              >
                {cluster.questionPrompt}
              </div>

              {/* Error rate bar */}
              <div style={{ marginBlockEnd: '10px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    marginBlockEnd: '4px',
                  }}
                >
                  Error rate ({cluster.wrongCount} of {cluster.totalAttempts} attempts)
                </div>
                <ErrorRate wrong={cluster.wrongCount} total={cluster.totalAttempts} />
              </div>

              {/* Top wrong answers */}
              {cluster.topWrongAnswers.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-text-muted)',
                      marginBlockEnd: '6px',
                    }}
                  >
                    Most common wrong answers:
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {cluster.topWrongAnswers.map((wa) => (
                      <span
                        key={wa.answer}
                        style={{
                          padding: '3px 10px',
                          background: '#fee2e2',
                          color: '#991b1b',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                          fontWeight: 500,
                        }}
                        aria-label={`"${wa.answer}" chosen ${wa.count} times`}
                      >
                        &ldquo;{wa.answer}&rdquo; ×{wa.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
