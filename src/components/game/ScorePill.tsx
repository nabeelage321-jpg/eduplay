'use client'

// BOLD + COLOURFUL SCORE (batch 1, final list item 19 + owner
// 12:55 PKT): the score display was small plain text. It is now a
// big bold gradient pill a kid can spot at a glance — used on
// every play screen and on the finish screen. Fredoka One, already
// loaded, no new dependency.
export default function ScorePill({ score, total, big = false }: { score: number; total?: number; big?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      background: 'linear-gradient(135deg, #ff6b9d, #a855f7 50%, #3b82f6)',
      color: '#fff', fontFamily: "'Fredoka One', 'Nunito', system-ui, sans-serif",
      fontWeight: 800, fontSize: big ? '1.4rem' : '1rem',
      padding: big ? '0.5rem 1.25rem' : '0.25rem 0.85rem',
      borderRadius: '9999px', boxShadow: '0 2px 10px rgba(168,85,247,0.45)',
      lineHeight: 1.4, whiteSpace: 'nowrap',
    }}>
      ⭐ Score: {score}{total !== undefined ? ` / ${total}` : ''}
    </span>
  )
}
