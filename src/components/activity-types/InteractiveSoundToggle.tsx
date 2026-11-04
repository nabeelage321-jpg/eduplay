'use client'

import { useEffect, useState } from 'react'
import { playEduSound, readInteractiveSoundOn, storeInteractiveSoundOn, INTERACTIVE_SOUND_EVENT } from '@/lib/game-sound'

/**
 * Shared sound toggle for the interactive games (Letter Wheel and
 * Jump Path only, part 1). Always visible inside those players —
 * including Preview, where the play-page header toggle does not
 * exist — so a player can mute in one tap at any time.
 *
 * Default is ON (no stored choice yet means ON); other games still
 * use the old muted SoundToggle and are untouched. Tapping to turn
 * sound on plays a short click so the player knows sound works.
 * All toggle instances on a page stay in sync via the storage
 * event dispatched by storeInteractiveSoundOn.
 */
export default function InteractiveSoundToggle() {
  const [soundOn, setSoundOn] = useState(true)

  useEffect(() => {
    setSoundOn(readInteractiveSoundOn())
    const sync = (e: Event) => {
      const detail = (e as CustomEvent<{ on?: boolean }>).detail
      if (typeof detail?.on === 'boolean') setSoundOn(detail.on)
    }
    window.addEventListener(INTERACTIVE_SOUND_EVENT, sync)
    return () => window.removeEventListener(INTERACTIVE_SOUND_EVENT, sync)
  }, [])

  function toggle() {
    const next = !soundOn
    setSoundOn(next)
    storeInteractiveSoundOn(next)
    if (next) playEduSound('click', true)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={soundOn ? 'Turn game sound off' : 'Turn game sound on'}
      aria-pressed={soundOn}
      title={soundOn ? 'Game sound on (tap to mute)' : 'Game sound off (tap to turn on)'}
      style={{
        minHeight: '48px',
        minWidth: '48px',
        background: 'var(--color-surface-alt)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        fontSize: '1.25rem',
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {soundOn ? '🔊' : '🔇'}
    </button>
  )
}
