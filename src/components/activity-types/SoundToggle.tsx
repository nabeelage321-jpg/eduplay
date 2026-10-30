'use client'

import { useEffect, useState } from 'react'
import { playGameSound, readSoundOn, storeSoundOn } from '@/lib/game-sound'

/**
 * Always-visible sound button for the play-page header.
 * Default is muted (🔇). Tapping turns sound on (🔊) and plays a short
 * test tone so the player knows sound is working. No music, no assets.
 */
export default function SoundToggle() {
  const [soundOn, setSoundOn] = useState(false)

  useEffect(() => {
    setSoundOn(readSoundOn())
  }, [])

  function toggle() {
    const next = !soundOn
    setSoundOn(next)
    storeSoundOn(next)
    if (next) playGameSound('tap', true)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
      aria-pressed={soundOn}
      title={soundOn ? 'Sound on' : 'Sound off (tap to turn on)'}
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
