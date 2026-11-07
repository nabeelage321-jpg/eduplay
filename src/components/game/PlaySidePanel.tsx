'use client'

import ActivityIdLine from '@/components/activity-types/ActivityIdLine'
import InteractiveSoundToggle from '@/components/activity-types/InteractiveSoundToggle'
import ShareSheetButton from '@/components/game/ShareSheetButton'
import type { SupportedLocale } from '@/types'

/**
 * PLAY SIDE PANEL (item 37, owner order 2026-11-07 14:07 PKT).
 *
 * The small right panel — game name, type + rounds, Game No.,
 * Share, sound, Activity ID — extracted verbatim from PlayIntro
 * so it is ONE component, not two copies. The play page renders
 * it on ALL THREE screens (intro, play, finish); PlayIntro no
 * longer renders it itself. Activity ID + Share live HERE only —
 * never in the top header, never duplicated.
 *
 * Game No. shows only when the game has one (migration 011);
 * nothing is shown — and nothing invented — before then.
 */

const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

interface PlaySidePanelProps {
  gameId: string
  gameTitle: string
  typeName: string
  itemCount: number
  locale: SupportedLocale
  showShare: boolean
  gameNumber?: number | null
}

export default function PlaySidePanel({
  gameId,
  gameTitle,
  typeName,
  itemCount,
  locale,
  showShare,
  gameNumber,
}: PlaySidePanelProps) {
  return (
    <aside
      style={{
        background: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
        borderRadius: '1rem',
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        alignSelf: 'start',
      }}
    >
      <p
        style={{
          fontFamily: FUNKY_FONT,
          fontSize: '1.05rem',
          color: 'var(--color-text-primary)',
          margin: 0,
          overflowWrap: 'break-word',
        }}
      >
        🎮 {gameTitle}
      </p>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
        {typeName} · {itemCount} {itemCount === 1 ? 'round' : 'rounds'}
      </p>
      {gameNumber != null ? (
        <p style={{ color: 'var(--color-text-primary)', fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
          🔢 Game No. {gameNumber}
        </p>
      ) : null}
      <div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
          SHARE
        </p>
        {showShare ? (
          <ShareSheetButton gameId={gameId} gameTitle={gameTitle} locale={locale} />
        ) : (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Sharing is off for this game.
          </p>
        )}
      </div>
      <div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
          SOUND
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          <span aria-hidden="true">🔊</span>
          <InteractiveSoundToggle />
        </div>
      </div>
      <div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 700, margin: '0 0 0.35rem' }}>
          ACTIVITY ID
        </p>
        <ActivityIdLine id={gameId} />
      </div>
    </aside>
  )
}
