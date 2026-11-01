import Link from 'next/link'
import { ArrowRight, Palette, Repeat2, Sparkles, Users, type LucideIcon } from 'lucide-react'
import { TILES } from './tiles'

// V0 ZIP #2 creators-section port (adapted, not copied): V0 used
// Tailwind-4 tokens and /create without a locale. Here every link is a
// real locale route, colours are EduPlay CSS variables + the fixed
// pastel tile palette, and no checkout, price or percentage is shown.
const CARDS: { title: string; body: string; Icon: LucideIcon; tile: string }[] = [
  {
    title: 'Create from a prompt or a chapter',
    body: 'Type one prompt or paste your chapter, get an editable draft, preview it, and save it yourself.',
    Icon: Sparkles,
    tile: TILES[2],
  },
  {
    title: 'Reuse in many game types',
    body: 'Build a game once, then switch it to quiz, match-up, unjumble and other types without retyping.',
    Icon: Repeat2,
    tile: TILES[1],
  },
  {
    title: 'Share with 12 friends first',
    body: 'Share your game with 12 testers — 3 approvals make it ready for the public list. A teacher or parent can still remove a game after it is live.',
    Icon: Users,
    tile: TILES[0],
  },
  {
    title: 'Your own theme',
    body: 'Set your own theme on your own creator page, chosen from a fixed safe palette — never custom code.',
    Icon: Palette,
    tile: TILES[4],
  },
]

export default function V0CreatorsSection({ locale }: { locale: string }) {
  return (
    <section id="creators" aria-labelledby="creators-title" style={{ margin: '0 auto', maxWidth: '80rem', padding: '4rem 1rem' }}>
      <p style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-primary)' }}>
        For creators
      </p>
      <h2 id="creators-title" style={{ marginTop: '0.5rem', fontSize: '1.875rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        Build once, share everywhere, and sell what you make.
      </h2>
      <ol style={{ marginTop: '2.5rem', display: 'grid', gap: '1.5rem', listStyle: 'none', padding: 0 }} className="sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card, i) => (
          <li
            key={card.title}
            style={{ display: 'flex', flexDirection: 'column', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '1.5rem', boxShadow: '0 6px 0 0 var(--color-border)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', width: '3.5rem', height: '3.5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', background: card.tile }} aria-hidden="true">
                <card.Icon style={{ width: '1.75rem', height: '1.75rem', color: '#26264A' }} />
              </span>
              <span style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-border)' }} aria-hidden="true">
                {i + 1}
              </span>
            </div>
            <h3 style={{ marginTop: '1.25rem', fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)' }}>{card.title}</h3>
            <p style={{ marginTop: '0.5rem', flex: 1, fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>{card.body}</p>
            <Link
              href={`/${locale}/create`}
              style={{ marginTop: '1.5rem', display: 'inline-flex', minHeight: '48px', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', background: 'var(--color-primary)', padding: '0 1.25rem', fontSize: '1rem', fontWeight: 800, color: 'white' }}
            >
              Create a game <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
