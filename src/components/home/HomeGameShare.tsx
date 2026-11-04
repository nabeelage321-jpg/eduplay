'use client'

import { useEffect, useState } from 'react'
import {
  facebookShareUrl,
  gamePlayUrl,
  gameShareText,
  shouldShowShare,
  whatsappShareUrl,
} from '@/lib/game-share'

interface HomeGameShareProps {
  locale: string
  gameId: string
  gameTitle: string
  /** Data-driven gate: only an explicitly public game gets a control. */
  isPublic: boolean
}

const smallBtn: React.CSSProperties = {
  display: 'inline-flex',
  minHeight: '36px',
  alignItems: 'center',
  gap: '0.375rem',
  borderRadius: '9999px',
  border: '2px solid var(--color-border)',
  background: 'var(--color-surface)',
  padding: '0 0.75rem',
  fontSize: '0.85rem',
  fontWeight: 700,
  color: 'var(--color-text-primary)',
  cursor: 'pointer',
  textDecoration: 'none',
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Clipboard API unavailable (older browser / permission): the same
    // textarea fallback the live play-page share button already uses.
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  }
}

/**
 * Homepage card share control. The play-page ShareGameButton is left
 * untouched — this control only sits on homepage popular cards, and
 * it shares the SAME play URL and caption formula (see game-share.ts).
 *
 * Targets, honestly labelled:
 * - WhatsApp: real wa.me link with the caption as its text.
 * - Facebook: real facebook.com/sharer link for the play URL.
 * - Copy link: copies the game's real play URL, nothing else.
 * - Copy for Instagram: copies caption + link. Instagram has NO web
 *   link-sharer page, so there is deliberately no Instagram link here
 *   — the button says to copy it and paste it on Instagram.
 * - Share sheet: the device's own share sheet, only rendered where
 *   navigator.share exists; it shares the same title, text and URL,
 *   and falls back to copying the link if the sheet is cancelled.
 */
export default function HomeGameShare({ locale, gameId, gameTitle, isPublic }: HomeGameShareProps) {
  const [canShare, setCanShare] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator)
  }, [])

  // Private games never get a share control, even by omission upstream.
  if (!shouldShowShare(isPublic)) return null

  const playUrl =
    typeof window !== 'undefined'
      ? gamePlayUrl(locale, gameId, window.location.origin)
      : gamePlayUrl(locale, gameId)
  const shareText = gameShareText(gameTitle, playUrl)

  async function copy(kind: 'link' | 'instagram', text: string) {
    await copyToClipboard(text)
    setCopied(kind)
    setTimeout(() => setCopied(null), 2000)
  }

  async function shareViaSheet() {
    try {
      await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
        title: gameTitle,
        text: shareText,
        url: playUrl,
      })
    } catch {
      // Sheet cancelled or failed: fall back to copying the link.
      await copy('link', playUrl)
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }} aria-label={`Share ${gameTitle}`}>
      <a
        href={whatsappShareUrl(shareText)}
        target="_blank"
        rel="noopener noreferrer"
        style={smallBtn}
        aria-label={`Share ${gameTitle} on WhatsApp`}
      >
        💬 WhatsApp
      </a>
      <a
        href={facebookShareUrl(playUrl, shareText)}
        target="_blank"
        rel="noopener noreferrer"
        style={smallBtn}
        aria-label={`Share ${gameTitle} on Facebook`}
      >
        👍 Facebook
      </a>
      <button type="button" onClick={() => copy('link', playUrl)} style={smallBtn} aria-label={`Copy link to ${gameTitle}`}>
        🔗 {copied === 'link' ? 'Link copied!' : 'Copy link'}
      </button>
      <button
        type="button"
        onClick={() => copy('instagram', shareText)}
        style={smallBtn}
        aria-label={`Copy link to paste on Instagram for ${gameTitle}`}
        title="Instagram has no link-sharer page — copy the link, then paste it on Instagram."
      >
        📸 {copied === 'instagram' ? 'Copied for Instagram!' : 'Copy for Instagram'}
      </button>
      {canShare ? (
        <button type="button" onClick={shareViaSheet} style={smallBtn} aria-label={`Share ${gameTitle} with the device share sheet`}>
          📤 Share
        </button>
      ) : null}
    </div>
  )
}
