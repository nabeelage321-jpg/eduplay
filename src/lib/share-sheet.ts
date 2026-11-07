/**
 * SHARE SHEET (batch-1 shared build, final list item 6).
 *
 * The device share sheet first (Web Share API — WhatsApp, Facebook,
 * Instagram, and every other app the device offers), with a Copy link
 * fallback when the device has no sheet. Nothing here invents a
 * share destination: Instagram has NO web share URL scheme, so it
 * is never faked — the sheet itself offers Instagram where the
 * device supports it, and the fallback copies the link + caption
 * for the player to paste.
 */

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed'

export interface ShareGameLink {
  title: string
  text: string
  url: string
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

/**
 * Share a game: the device sheet when available, else copy the
 * link + caption. A user closing the sheet without sharing is
 * 'cancelled' (nothing shared, nothing copied) — never reported
 * as shared.
 */
export async function shareGameLink({ title, text, url }: ShareGameLink): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (err) {
      // The user closed the sheet: not an error, not a share.
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // Anything else (e.g. an unsupported file) falls through to copy.
    }
  }
  return (await copyText(text)) ? 'copied' : 'failed'
}
