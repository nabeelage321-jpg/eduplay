// ─── Labelled Diagram picture helpers ───────────────────────────
// BATCH-2 #7 (owner 2026-11-07 13:15 PKT): the game is COMPLETE only
// with a real diagram picture. The picture lives on the first
// item's imageUrl — the adapter copies the game's content.image
// onto every item for programme rows, and the creator stores the
// teacher-picked URL on every item for teacher games, so the first
// item is the one true source either way. A blank or whitespace
// URL is no picture at all.

import type { ActivityItem } from '@/types'

/** The diagram picture URL, trimmed — or null when there is none. */
export function diagramImageUrl(items: ActivityItem[]): string | null {
  const url = (items[0]?.imageUrl ?? '').trim()
  return url ? url : null
}

/** The stored credit line for the picture ("Title by Creator (CC BY 4.0)") — or null. */
export function diagramImageCredit(items: ActivityItem[]): string | null {
  const credit = (items[0]?.imageCredit ?? '').trim()
  return credit ? credit : null
}
