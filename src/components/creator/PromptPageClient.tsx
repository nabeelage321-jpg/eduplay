'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PENDING_PROMPT_DRAFT_KEY, type PromptDraft } from '@/lib/prompt-to-game'
import type { SupportedLocale } from '@/types'

// Same lazy-load as /create: the prompt box only loads when this page
// opens, so the first paint stays light.
const PromptToGame = dynamic(() => import('./PromptToGame'), { ssr: false })

/**
 * PREDEFINED STARTER PROMPTS (owner order 2026-11-06: prompts should
 * be "almost predefined"). Plain topic names only — the same topics
 * PromptToGame already recommends per subject — never a curriculum,
 * board, or official-alignment claim, never invented textbook
 * content. Tapping one fills the prompt box; the teacher can still
 * edit it before making a draft.
 */
export const PROMPT_STARTER_CHIPS: Array<{ label: string; prompt: string }> = [
  { label: 'Table of 2', prompt: 'make game for a table of 2' },
  { label: 'Animals quiz', prompt: 'Make a quiz about animals' },
  { label: 'My family', prompt: 'Make a game about my family' },
  { label: 'Parts of a plant', prompt: 'Make a quiz about parts of a plant' },
  { label: 'Good manners', prompt: 'Make a game about good manners' },
  { label: 'The solar system', prompt: 'Make a quiz about the solar system' },
]

export default function PromptPageClient({ locale }: { locale: SupportedLocale }) {
  const router = useRouter()

  function handleApprove(draft: PromptDraft) {
    // Hand the approved draft to /create via the PENDING-DRAFT key
    // (defined in src/lib/prompt-to-game.ts; ActivityCreator reads it
    // once on mount). Nothing is saved here — /create still shows
    // Preview first, and the game stays private until the creator
    // saves it.
    try {
      window.sessionStorage.setItem(PENDING_PROMPT_DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Storage unavailable (private mode, quota): fall back to the
      // full creator with the draft's type preselected, so the teacher
      // can re-make the same draft there instead of hitting a dead end.
      // The draft items are lost in this path — stated plainly, not hidden.
      router.push(`/${locale}/create?type=${draft.type}`)
      return
    }
    router.push(`/${locale}/create`)
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1rem' }}>
      <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', margin: '0 0 0.5rem' }}>
        ✨ Make a Game with a Prompt
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: '0 0 0.25rem' }}>
        Type a few words — or tap a ready prompt below. Editing the draft is optional, never required.
      </p>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: '0 0 1.25rem' }}>
        Approving a draft only opens it in the creator. Nothing is published until you save it yourself.
      </p>

      <PromptToGame onApprove={handleApprove} starterChips={PROMPT_STARTER_CHIPS} />

      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
        Want to build by hand instead?{' '}
        <Link href={`/${locale}/create`} style={{ color: 'var(--color-primary)' }}>
          Open the full creator →
        </Link>
      </p>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
        Just want to play?{' '}
        <Link href={`/${locale}/play-games`} style={{ color: 'var(--color-primary)' }}>
          Pick a game and play →
        </Link>
      </p>
    </div>
  )
}
