import { BookOpenText, CircleHelp, Clock, FileText, Gamepad2, Layers, Library, type LucideIcon } from 'lucide-react'
import { TILES } from './tiles'

// V0 ZIP #2 selling-section port (adapted, not copied): same 6 items and
// the same honest wording, but no price, no percentage, no checkout and
// no claim that selling is live. Selling is a PLAN, labelled as such.
const ITEMS: { label: string; note?: string; Icon: LucideIcon; tile: string }[] = [
  { label: 'Games', Icon: Gamepad2, tile: TILES[2] },
  { label: 'Chapter notes', Icon: BookOpenText, tile: TILES[1] },
  { label: 'Quiz packs', Icon: CircleHelp, tile: TILES[0] },
  { label: 'Worksheets', Icon: FileText, tile: TILES[3] },
  { label: 'Flashcards', Icon: Layers, tile: TILES[4] },
  { label: 'Full course packs', note: 'e.g. chapters 1–10 in one pack', Icon: Library, tile: TILES[5] },
]

export default function V0SellingSection() {
  return (
    <section id="sell" aria-labelledby="sell-title" style={{ background: 'var(--color-surface-alt)' }}>
      <div style={{ margin: '0 auto', maxWidth: '80rem', padding: '4rem 1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="md:flex-row md:items-end md:justify-between">
          <div style={{ maxWidth: '42rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)' }}>
              Coming feature
            </p>
            <h2 id="sell-title" style={{ marginTop: '0.5rem', fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
              Sell what you make
            </h2>
            <p style={{ marginTop: '0.75rem', fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
              Like people use AI to make notes and sell them, creators on EduPlay can sell different things they make here.
            </p>
          </div>
          <span style={{ display: 'inline-flex', minHeight: '48px', width: 'fit-content', alignItems: 'center', gap: '0.5rem', borderRadius: '9999px', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            <Clock style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true" /> Planned — not live yet
          </span>
        </div>
        <ul style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', listStyle: 'none', padding: 0 }} className="md:grid-cols-3 lg:grid-cols-6">
          {ITEMS.map((item) => (
            <li key={item.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '1.25rem', textAlign: 'center' }}>
              <span style={{ display: 'flex', width: '3.5rem', height: '3.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', background: item.tile }} aria-hidden="true">
                <item.Icon style={{ width: '1.75rem', height: '1.75rem', color: '#26264A' }} />
              </span>
              <span style={{ marginTop: '0.75rem', fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)' }}>{item.label}</span>
              {item.note && <span style={{ marginTop: '0.25rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{item.note}</span>}
            </li>
          ))}
        </ul>
        <p style={{ marginTop: '2rem', maxWidth: '48rem', borderRadius: '1.5rem', border: '2px dashed var(--color-border)', background: 'var(--color-surface)', padding: '1.5rem', fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
          Every sellable item goes through the same 12-testers / 3-approvals rule before public listing. The creator sets
          the price, buyers get play/use rights, not a copy to resell. Payment details will be announced later.
        </p>
      </div>
    </section>
  )
}
