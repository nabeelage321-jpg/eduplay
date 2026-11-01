import Link from 'next/link'
import {
  CircleHelp,
  Disc3,
  FerrisWheel,
  Gamepad2,
  Link2,
  Play,
  Search,
  Shuffle,
  SpellCheck,
  Tags,
  Trophy,
  Type,
  type LucideIcon,
} from 'lucide-react'
import ShareGameButton from '@/components/home/ShareGameButton'
import { TILES, TILE_INK } from './tiles'

export interface V0HomeGame {
  id: string
  title: string
  subject: string
  grade: string
  type: string
}

// V0 game-card port. CRITICAL difference from V0: V0 linked cards to
// /games/<slug>, which do not exist in EduPlay. Every link here goes to
// the REAL play page /{locale}/activity/{id}/play, and the title links
// there too. No dead slug links. No invented ratings.
const TYPE_ICONS: Record<string, LucideIcon> = {
  quiz: CircleHelp,
  unjumble: Shuffle,
  'labelled-diagram': Tags,
  'spin-wheel': Disc3,
  'match-up': Link2,
  anagram: Type,
  'random-wheel': FerrisWheel,
  'gameshow-quiz': Trophy,
  hangman: SpellCheck,
  'word-search': Search,
}

export default function V0GameCard({ game, locale, index }: { game: V0HomeGame; locale: string; index: number }) {
  const Icon = TYPE_ICONS[game.type] ?? Gamepad2
  const tile = TILES[index % TILES.length]
  const playHref = `/${locale}/activity/${game.id}/play`
  return (
    <article
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '1.5rem',
        border: '2px solid var(--color-border)',
        background: 'var(--color-surface)',
        boxShadow: '0 6px 0 0 var(--color-border)',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', height: '10rem', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: tile }} aria-hidden="true">
        <div style={{ position: 'absolute', top: '-1.5rem', insetInlineStart: '-1.5rem', width: '6rem', height: '6rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.4)' }} />
        <div style={{ position: 'absolute', bottom: '-2rem', insetInlineEnd: '1.5rem', width: '7rem', height: '7rem', borderRadius: '9999px', background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ position: 'relative', display: 'flex', width: '5rem', height: '5rem', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', background: 'var(--color-surface)', boxShadow: '0 6px 0 0 rgba(0,0,0,0.1)', transform: 'rotate(-6deg)' }}>
          <Icon style={{ width: '2.5rem', height: '2.5rem', color: TILE_INK }} strokeWidth={2.25} />
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, color: 'var(--color-text-primary)' }}>
          <Link href={playHref} style={{ color: 'inherit' }}>
            {game.title}
          </Link>
        </h3>
        <p style={{ marginTop: '0.25rem', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          {game.subject} · {game.grade} · {game.type}
        </p>
        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
          <Link
            href={playHref}
            style={{ display: 'inline-flex', minHeight: '48px', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', background: 'var(--color-primary)', padding: '0 1rem', fontSize: '1rem', fontWeight: 800, color: 'white' }}
          >
            <Play style={{ width: '1.25rem', height: '1.25rem', fill: 'currentColor' }} aria-hidden="true" />
            Play
          </Link>
          <ShareGameButton locale={locale} gameId={game.id} gameTitle={game.title} />
        </div>
      </div>
    </article>
  )
}
