// Batch 5 — honest empty state for template pages.
//
// These pages (T1/T2/T3) do NOT query the database, so they must not
// render fake activity cards or skeleton grids that look like content.
// Until a database-backed listing lands (future batch, needs Supabase
// resumed), they show this: a plain statement plus two real actions
// (Browse real activities, Create a game), both with 48px+ touch targets.
export default function EmptyActivitiesCTA({ locale }: { locale: string }) {
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
          href={`/${locale}/create`}
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
          Create a Game
        </a>
      </div>
    </div>
  )
}
