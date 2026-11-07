// ─── Bingo call order ───────────────────────────────────────────
// ITEM 32 (owner 2026-11-07 13:34 PKT): the card shows only 8
// shuffled answers (+ FREE centre), but prompts were called from
// ALL items — a called prompt could be one whose answer is NOT on
// the card, so the kid could not play that round. Live proof:
// "History Grade 2 Bingo" called "What is the term for a ruler
// with total power?" (answer: Dictator) and the card showed 1949 /
// Babur / 1971 / History / FREE / Quba / 1914 / Allama Iqbal /
// 23 March — no matching cell.
//
// The fix: call ONLY prompts whose answers are on the card — one
// prompt per card answer, each pointing at a distinct item with
// that answer. The caller shuffles the result, so the call order
// stays random instead of following the card layout.

import type { ActivityItem } from '@/types'

export function bingoPromptOrder(items: ActivityItem[], cardAnswers: string[]): number[] {
  const used = new Set<number>()
  const order: number[] = []
  for (const answer of cardAnswers) {
    const idx = items.findIndex((it, i) => !used.has(i) && it.answer === answer)
    if (idx !== -1) {
      used.add(idx)
      order.push(idx)
    }
  }
  return order
}
