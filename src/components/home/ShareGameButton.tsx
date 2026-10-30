'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface ShareGameButtonProps {
  locale: string
  gameId: string
  gameTitle: string
}

/**
 * Creator share: copies the game link PLUS a ready caption, so the link
 * travels in the post (where a backlink can actually count) instead of
 * being forced as a watermark over the game itself. No video, no crop
 * logic in this batch — that is the next, separate batch.
 */
export default function ShareGameButton({ locale, gameId, gameTitle }: ShareGameButtonProps) {
  const t = useTranslations('home')
  const [copied, setCopied] = useState(false)

  async function copyShare() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/${locale}/activity/${gameId}/play`
        : `https://eduplay-self.vercel.app/${locale}/activity/${gameId}/play`
    const text = `Play ${gameTitle} on EduPlay: ${url}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      onClick={copyShare}
      aria-label={t('shareGame')}
      style={{
        padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
        border: '2px solid var(--color-border)', background: 'var(--color-surface)',
        color: 'var(--color-text-primary)', fontWeight: 600, cursor: 'pointer',
        minHeight: '44px', display: 'inline-flex', alignItems: 'center',
      }}
    >
      {copied ? `✓ ${t('copied')}` : `🔗 ${t('shareGame')}`}
    </button>
  )
}
