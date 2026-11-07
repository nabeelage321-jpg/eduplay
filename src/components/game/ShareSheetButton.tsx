'use client'

import { useState } from 'react'
import { shareGameLink, type ShareOutcome } from '@/lib/share-sheet'
import { gamePlayUrl, gameShareText } from '@/lib/game-share'

/**
 * SHARE SHEET BUTTON (batch-1 shared build, final list item 6).
 *
 * One compact button: opens the DEVICE share sheet (Web Share API —
 * WhatsApp, Facebook, Instagram, and whatever else the device
 * offers) and falls back to copying the link + caption when the
 * device has no sheet. The label says plainly what happened
 * ("Shared ✓" / "Link copied ✓"); a closed sheet goes quietly back
 * to the plain label. Used on the intro screen, the play screen,
 * and the finish (score board) screen.
 *
 * Instagram is never faked with a sharer URL (there is no web
 * scheme for it): the sheet offers it where the device supports
 * it, and the copy fallback carries the caption for pasting.
 */
export default function ShareSheetButton({
  gameId,
  gameTitle,
  locale,
}: {
  gameId: string
  gameTitle: string
  locale: string
}) {
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null)

  async function share() {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://eduplay-self.vercel.app'
    const url = gamePlayUrl(locale, gameId, origin)
    const text = gameShareText(gameTitle, url)
    const result = await shareGameLink({ title: gameTitle, text, url })
    setOutcome(result)
    if (result === 'shared' || result === 'copied') {
      window.setTimeout(() => setOutcome(null), 2500)
    } else {
      // Cancelled: back to the plain label at once. Failed: keep
      // the failure visible briefly so the player can tap again.
      window.setTimeout(() => setOutcome(null), result === 'cancelled' ? 0 : 2500)
    }
  }

  const label =
    outcome === 'shared'
      ? '✓ Shared!'
      : outcome === 'copied'
        ? '✓ Link copied!'
        : outcome === 'failed'
          ? 'Could not share — tap to try again'
          : '🔗 Share'

  return (
    <button
      type="button"
      onClick={share}
      aria-label="Share this game"
      style={{
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius)',
        border: '2px solid var(--color-border)',
        background: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        fontWeight: 700,
        cursor: 'pointer',
        minHeight: '44px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
      }}
    >
      {label}
    </button>
  )
}
