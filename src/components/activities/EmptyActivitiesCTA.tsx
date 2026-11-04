// Batch 5 — honest empty state for template pages.
//
// These pages (T1/T2/T3) do NOT query the database, so they must not
// render fake activity cards or skeleton grids that look like content.
// Until a database-backed listing lands (future batch, needs Supabase
// resumed), they show this: a plain statement plus two real actions
// (Browse real activities, Create a game), both with 48px+ touch targets.
export default function EmptyActivitiesCTA({
  locale,
  typeSlug,
  typeLabel,
}: {
  locale: string
  // SINGLE-GAME MAKER ENTRY (2026-11-04): when a type hub renders
  // this empty state, its "make a game" action opens the maker with
  // that type preselected. Without them (other pages) the button
  // keeps its old generic /create link.
  typeSlug?: string
  typeLabel?: string
}) {
  const createHref = typeSlug
    ? `/${locale}/create?type=${encodeURIComponent(typeSlug)}`
    : `/${locale}/create`
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          color: 'var(--color-text-secondary)',
          marginBottom: '1.25rem',
          fontSize: '1rem',
        }}
      >
        No activities are listed on this page yet.
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          justifyContent: 'center',
        }}
      >
        <a
          href={`/${locale}/browse`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '48px',
            padding: '0.75rem 1.5rem',
            background: 'var(--gradient-btn)',
            color: '#fff',
            borderRadius: 'var(--radius)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Browse Games
        </a>
        <a
          href={createHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '48px',
            padding: '0.75rem 1.5rem',
            background: 'var(--color-surface-alt)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)',
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          {typeLabel ? `Make a ${typeLabel} game` : 'Create a Game'}
        </a>
      </div>
    </div>
  )
}
