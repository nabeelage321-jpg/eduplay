import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import type { SupportedLocale } from '@/types'

// Lazy-loaded like /create does: the prompt box only loads when this
// page opens, so the first paint stays light.
const PromptPageClient = dynamic(() => import('@/components/creator/PromptPageClient'), { ssr: false })

interface Props {
  params: { locale: SupportedLocale }
}

export const metadata: Metadata = {
  title: 'Make a Game with a Prompt — EduPlay',
  description: 'Type a few words — or tap a ready prompt — and get an editable game draft. No account needed to make a draft; nothing is published until you save it yourself.',
  robots: { index: false },
}

/**
 * SEPARATE PROMPT-TO-GAME PAGE (owner order 2026-11-06 22:14 PKT).
 * Owner's ask, in his words: prompt-to-game should be separate —
 * just a prompt and some dropdowns, with the prompts almost
 * predefined. Overlap check (read, not asserted):
 *   /en/make is a role -> type funnel (2 steps, then
 *   /create?type=<slug>). It has NO prompt box anywhere.
 *   /en/create is the full creator page: the PromptToGame box sits
 *   at the top, but shares the page with the ChapterScan box, the
 *   RolePicker, and the 5-step Manual game wizard (Type -> Details
 *   -> Items -> Preview -> Save). Reaching the prompt means opening
 *   the whole creator.
 *   NOTHING exists that is prompt-only: one screen, a prompt box,
 *   subject/grade/type dropdowns, and predefined starter prompts
 *   that fill the box. That is this page. It renders the EXISTING
 *   PromptToGame component (same guided/free modes, same chips, same
 *   /api/prompt-to-game draft route, same editable draft + approve
 *   flow) — a new ENTRY, not a new pipeline. Approval hands the
 *   draft to /create through a sessionStorage key that
 *   ActivityCreator reads once on mount (see its PENDING-DRAFT
 *   comment); without that handoff an approved draft would be lost,
 *   so the handoff is the one necessary additive touch — no step
 *   reorder, no design change, no behaviour change for a normal
 *   /create visit (the key is absent, nothing happens).
 * The prompt pipeline only makes 3 types (quiz / match-up /
 * unjumble — PromptGameType in src/lib/prompt-to-game.ts, enforced
 * by /api/prompt-to-game, unknown types fall back to quiz). The
 * type picker here therefore offers exactly those 3 — never a
 * 40-type list, which would silently make Quiz for 37 of them.
 * Starter prompts are plain topic names only — never a curriculum,
 * board, or official-alignment claim, never invented textbook
 * content. No draft is created or saved by merely opening the page.
 * Tool page: noindex (like /make and /create), NOT in sitemap.xml.
 */
export default function PromptToGamePage({ params }: Props) {
  const isRTL = params.locale === 'ur' || params.locale === 'ar'
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <div style={{ padding: '1.5rem 0.5rem' }}>
        <PromptPageClient locale={params.locale} />
      </div>
    </div>
  )
}
