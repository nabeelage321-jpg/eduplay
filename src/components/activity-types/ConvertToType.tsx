'use client'

import { convertTargets, convertTargetLabel } from '@/lib/convert'

/**
 * "Play as another type" control — 2026-11-04, convert part 1.
 *
 * Rendered on the saved game's detail page AND on its play page.
 * It only ever renders LINKS to the same game's play page with
 * ?as=<type>. It never fetches, saves, or changes anything itself:
 * the play page decides compatibility (see src/lib/convert.ts) and
 * either plays the same questions in that type's existing player
 * or shows a plain cannot-play message. The original game is never
 * re-saved by converting — its type, questions, and owner stay
 * exactly as saved.
 */
interface ConvertToTypeProps {
  locale: string
  activityId: string
  originalSlug: string
  /** The ?as= target currently playing, or null for the original type. */
  currentTarget: string | null
}

export default function ConvertToType({ locale, activityId, originalSlug, currentTarget }: ConvertToTypeProps) {
  const targets = convertTargets(originalSlug)
  const playHref = (slug: string | null): string =>
    slug
      ? `/${locale}/activity/${activityId}/play?as=${slug}`
      : `/${locale}/activity/${activityId}/play`

  return (
    <section
      aria-labelledby="convert-heading"
      style={{
        padding: '1.25rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '2px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
        marginBottom: '1.5rem',
      }}
    >
      <h2
        id="convert-heading"
        style={{
          fontSize: '1.25rem',
          fontFamily: 'var(--font-display)',
          color: 'var(--color-text-primary)',
          margin: '0 0 0.5rem',
        }}
      >
        🔀 Play as another type
      </h2>
      <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 1rem', lineHeight: 1.6 }}>
        The same questions, played in another type. Your original game is not changed,
        and converting never saves a new game.
      </p>
      {currentTarget ? (
        <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 1rem' }}>
          Now playing as <strong style={{ color: 'var(--color-text-primary)' }}>{convertTargetLabel(currentTarget)}</strong>
          {' — '}
          <a href={playHref(null)} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            Back to the original type
          </a>
        </p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {targets.map((t) => {
          const active = currentTarget === t.slug
          return (
            <a
              key={t.slug}
              href={playHref(t.slug)}
              aria-current={active ? 'true' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.875rem',
                borderRadius: '9999px',
                border: active ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                background: active ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: active ? 800 : 600,
              }}
            >
              <span aria-hidden="true">{t.icon}</span>
              {t.name}
            </a>
          )
        })}
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: '1rem 0 0', lineHeight: 1.6 }}>
        Some types need special questions (a map, a picture, a video, an ordered round).
        Picking one of those shows a plain message instead of changing your questions.
      </p>
    </section>
  )
}
