// src/components/dashboard/student/Achievements.tsx
'use client'

export interface Achievement {
  id: string
  emoji: string
  title: string
  description: string
  earnedAt: string | null   // null = locked
  category: 'learning' | 'streak' | 'social' | 'mastery'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface AchievementsProps {
  achievements: Achievement[]
  loading?: boolean
}

// All defined achievements in the system
export const ALL_ACHIEVEMENTS: Omit<Achievement, 'earnedAt'>[] = [
  // Learning
  { id: 'first_activity', emoji: '🌟', title: 'First Steps', description: 'Complete your first activity', category: 'learning', rarity: 'common' },
  { id: 'ten_activities', emoji: '🎯', title: 'Getting Started', description: 'Complete 10 activities', category: 'learning', rarity: 'common' },
  { id: 'fifty_activities', emoji: '🏅', title: 'Dedicated Learner', description: 'Complete 50 activities', category: 'learning', rarity: 'rare' },
  { id: 'perfect_score', emoji: '💯', title: 'Perfect Score', description: 'Score 100% on any activity', category: 'mastery', rarity: 'rare' },
  { id: 'quiz_master', emoji: '🧠', title: 'Quiz Master', description: 'Score 90%+ on 10 quizzes', category: 'mastery', rarity: 'epic' },
  { id: 'speed_demon', emoji: '⚡', title: 'Speed Demon', description: 'Complete an activity in under 60 seconds', category: 'learning', rarity: 'rare' },
  // Streaks
  { id: 'streak_3', emoji: '🔥', title: '3-Day Streak', description: 'Learn 3 days in a row', category: 'streak', rarity: 'common' },
  { id: 'streak_7', emoji: '🔥🔥', title: 'Week Warrior', description: '7-day learning streak', category: 'streak', rarity: 'rare' },
  { id: 'streak_30', emoji: '🌋', title: 'Month of Fire', description: '30-day learning streak', category: 'streak', rarity: 'legendary' },
  // Social
  { id: 'top_class', emoji: '🏆', title: 'Top of Class', description: 'Finish #1 in a live session', category: 'social', rarity: 'rare' },
  { id: 'team_player', emoji: '🤝', title: 'Team Player', description: 'Join 5 live sessions', category: 'social', rarity: 'common' },
  // Mastery
  { id: 'subject_master', emoji: '📚', title: 'Subject Master', description: 'Score 80%+ in all topics of a subject', category: 'mastery', rarity: 'legendary' },
  { id: 'multilingual', emoji: '🌍', title: 'Multilingual', description: 'Complete activities in 2+ languages', category: 'mastery', rarity: 'epic' },
]

const RARITY_STYLE: Record<Achievement['rarity'], { border: string; bg: string; label: string; labelColor: string }> = {
  common: { border: '#d1d5db', bg: '#f9fafb', label: 'Common', labelColor: '#6b7280' },
  rare: { border: '#93c5fd', bg: '#eff6ff', label: 'Rare', labelColor: '#2563eb' },
  epic: { border: '#c084fc', bg: '#faf5ff', label: 'Epic', labelColor: '#9333ea' },
  legendary: { border: '#fcd34d', bg: '#fffbeb', label: 'Legendary', labelColor: '#d97706' },
}

const CATEGORY_EMOJI: Record<Achievement['category'], string> = {
  learning: '📖',
  streak: '🔥',
  social: '👥',
  mastery: '🎓',
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const earned = achievement.earnedAt !== null
  const rarity = RARITY_STYLE[achievement.rarity]

  return (
    <article
      aria-label={`${achievement.title}${earned ? ' — earned' : ' — locked'}`}
      style={{
        padding: '14px',
        borderRadius: 'var(--radius)',
        border: `2px solid ${earned ? rarity.border : 'var(--color-border)'}`,
        background: earned ? rarity.bg : 'var(--color-surface-alt)',
        opacity: earned ? 1 : 0.5,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'transform 0.15s, box-shadow 0.15s',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Rarity label */}
      <span
        style={{
          position: 'absolute',
          insetBlockStart: '8px',
          insetInlineEnd: '8px',
          fontSize: '10px',
          fontWeight: 700,
          color: earned ? rarity.labelColor : '#9ca3af',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {rarity.label}
      </span>

      {/* Emoji */}
      <span
        aria-hidden="true"
        style={{
          fontSize: '36px',
          lineHeight: 1,
          filter: earned ? 'none' : 'grayscale(100%)',
        }}
      >
        {earned ? achievement.emoji : '🔒'}
      </span>

      {/* Title */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: earned ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        }}
      >
        {achievement.title}
      </div>

      {/* Description */}
      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
        {achievement.description}
      </div>

      {/* Earned date */}
      {earned && achievement.earnedAt && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          ✅ {new Date(achievement.earnedAt).toLocaleDateString()}
        </div>
      )}
    </article>
  )
}

export default function Achievements({ achievements, loading = false }: AchievementsProps) {
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
        aria-label="Loading achievements"
      />
    )
  }

  const earned = achievements.filter((a) => a.earnedAt !== null)

  // Merge all achievements with earned status
  const allWithStatus: Achievement[] = ALL_ACHIEVEMENTS.map((a) => {
    const found = achievements.find((e) => e.id === a.id)
    return { ...a, earnedAt: found?.earnedAt ?? null }
  })

  const byCategory = {
    learning: allWithStatus.filter((a) => a.category === 'learning'),
    streak: allWithStatus.filter((a) => a.category === 'streak'),
    social: allWithStatus.filter((a) => a.category === 'social'),
    mastery: allWithStatus.filter((a) => a.category === 'mastery'),
  }

  return (
    <section aria-label="Achievements">
      {/* Summary bar */}
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          border: '1px solid var(--color-border)',
          marginBlockEnd: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '32px' }} aria-hidden="true">🏆</span>
        <div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {earned.length} / {ALL_ACHIEVEMENTS.length} Badges Earned
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Keep completing activities to unlock more!
          </div>
        </div>
        <div
          style={{
            marginInlineStart: 'auto',
            height: '8px',
            width: '160px',
            background: 'var(--color-surface-alt)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
          role="progressbar"
          aria-valuenow={earned.length}
          aria-valuemax={ALL_ACHIEVEMENTS.length}
          aria-label="Achievement progress"
        >
          <div
            style={{
              width: `${(earned.length / ALL_ACHIEVEMENTS.length) * 100}%`,
              height: '100%',
              background: 'var(--gradient-btn)',
              borderRadius: '4px',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* Categories */}
      {(Object.entries(byCategory) as [Achievement['category'], Achievement[]][]).map(
        ([category, items]) => (
          <div key={category} style={{ marginBlockEnd: '24px' }}>
            <h3
              style={{
                margin: '0 0 12px',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {CATEGORY_EMOJI[category]}{' '}
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '10px',
              }}
            >
              {items.map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          </div>
        ),
      )}
    </section>
  )
}
