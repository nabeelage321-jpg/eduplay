// src/components/dashboard/student/StudentProgress.tsx
'use client'

interface Badge {
  id: string
  emoji: string
  label: string
  earnedAt: string
}

interface StudentProgressProps {
  studentName: string
  xp: number
  xpToNextLevel: number
  level: number
  streakDays: number
  badges: Badge[]
  loading?: boolean
}

function XPBar({ current, max, level }: { current: number; max: number; level: number }) {
  const pct = Math.min(100, Math.round((current / max) * 100))

  return (
    <div aria-label={`Level ${level}: ${current} of ${max} XP`}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBlockEnd: '6px',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--color-primary)',
          }}
        >
          Level {level}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          {current.toLocaleString()} / {max.toLocaleString()} XP
        </span>
      </div>
      <div
        style={{
          height: '14px',
          background: 'var(--color-surface-alt)',
          borderRadius: '7px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--gradient-btn)',
            borderRadius: '7px',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBlockStart: '4px' }}>
        {(max - current).toLocaleString()} XP to Level {level + 1}
      </p>
    </div>
  )
}

function StreakCounter({ days }: { days: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 16px',
        background: days >= 3 ? '#fff7ed' : 'var(--color-surface-alt)',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${days >= 3 ? '#fed7aa' : 'var(--color-border)'}`,
      }}
      role="status"
      aria-label={`${days}-day streak`}
    >
      <span aria-hidden="true" style={{ fontSize: '28px' }}>
        {days >= 7 ? '🔥' : days >= 3 ? '✨' : '⭐'}
      </span>
      <div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: days >= 3 ? '#ea580c' : 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
            lineHeight: 1,
          }}
        >
          {days} day{days !== 1 ? 's' : ''}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          learning streak
        </div>
      </div>
    </div>
  )
}

export default function StudentProgress({
  studentName,
  xp,
  xpToNextLevel,
  level,
  streakDays,
  badges,
  loading = false,
}: StudentProgressProps) {
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
        aria-label="Loading student progress"
      />
    )
  }

  return (
    <section
      aria-label={`Progress for ${studentName}`}
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Greeting */}
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          Hey, {studentName}! 👋
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--color-text-muted)' }}>
          Keep learning to level up!
        </p>
      </div>

      {/* XP bar */}
      <XPBar current={xp} max={xpToNextLevel} level={level} />

      {/* Streak */}
      <StreakCounter days={streakDays} />

      {/* Recent badges */}
      {badges.length > 0 && (
        <div>
          <h3
            style={{
              margin: '0 0 10px',
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
            }}
          >
            Recent Badges
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {badges.slice(0, 6).map((badge) => (
              <div
                key={badge.id}
                title={`${badge.label} — earned ${new Date(badge.earnedAt).toLocaleDateString()}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 10px',
                  background: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  cursor: 'default',
                  minWidth: '64px',
                }}
                aria-label={badge.label}
              >
                <span aria-hidden="true" style={{ fontSize: '24px' }}>
                  {badge.emoji}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--color-text-muted)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
