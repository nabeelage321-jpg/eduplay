import type { ActivityItem } from '@/types'

/**
 * ORDER RULE (batch-2 #5, owner 2026-11-07 13:09 PKT).
 *
 * The Order game used to hide its rule: the "correct" order was the
 * game's own list order and the kid saw only shuffled words, so a
 * sensible list got marked wrong with no way to work out why. The
 * order must be DEDUCIBLE: the rule is shown on the instructions
 * and every item carries its order clue.
 *
 * The rule is DETECTED from the data itself, never guessed: the
 * adapted items carry their position in `answer` (1..n — the
 * adapter sorts the round by its own `order` field). When the
 * positions are exactly 1..n, the prompts are checked against the
 * rules a kid can actually use:
 *   - alphabetical: the prompts, in answer order, are A to Z;
 *   - chronological: every prompt carries a year, ascending;
 *   - numeric: the prompts are numbers, ascending.
 * When none of them holds, the game carries no deducible rule and
 * this returns null — the player then says so honestly instead of
 * inventing a rule the words do not support.
 */

export type OrderRuleKind = 'alphabetical' | 'chronological' | 'numeric'

export interface OrderRule {
  kind: OrderRuleKind
  /** The rule as shown, e.g. "Alphabetical order — A to Z". */
  label: string
  /** How the kid works it out, e.g. "A comes first, Z comes last." */
  tip: string
  /** Which part of each item carries the clue. */
  clue: 'first-letter' | 'year' | 'number'
}

/** The answers as positions, or null when they are not exactly 1..n. */
function positions(items: ActivityItem[]): number[] | null {
  if (items.length < 2) return null
  const nums: (number | null)[] = items.map((it) => {
    const n = Number((it.answer ?? '').trim())
    return Number.isInteger(n) ? n : null
  })
  if (nums.some((n) => n === null)) return null
  const sorted = [...(nums as number[])].sort((a, b) => a - b)
  if (!sorted.every((n, i) => n === i + 1)) return null
  return nums as number[]
}

export function detectOrderRule(items: ActivityItem[]): OrderRule | null {
  const pos = positions(items)
  if (!pos) return null
  const ordered = items
    .map((it, i) => ({ it, p: pos[i] }))
    .sort((a, b) => a.p - b.p)
    .map(({ it }) => it)
  const labels = ordered.map((it) => (it.prompt ?? '').trim())
  if (labels.some((l) => l === '')) return null

  // Alphabetical: A to Z.
  const alpha = [...labels].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  if (labels.every((l, i) => l === alpha[i])) {
    return {
      kind: 'alphabetical',
      label: 'Alphabetical order — A to Z',
      tip: 'A comes first, Z comes last. Sort the words that way — the big first letter on each word is your clue.',
      clue: 'first-letter',
    }
  }
  // Chronological: every label carries a year, ascending. Years run
  // 1000–2099 — history games are full of 1500s/1700s/1800s
  // (Mughal 1526, Plassey 1757), not just 1900s/2000s.
  const years = labels.map((l) => {
    const m = l.match(/\b(1\d{3}|20\d{2})\b/)
    return m ? Number(m[0]) : null
  })
  if (
    years.every((y) => y !== null) &&
    years.every((y, i) => i === 0 || (y as number) > (years[i - 1] as number))
  ) {
    return {
      kind: 'chronological',
      label: 'Oldest to newest',
      tip: 'The smallest year goes first. The year on each item is your clue.',
      clue: 'year',
    }
  }
  // Numeric: the labels are numbers, ascending.
  const nums = labels.map((l) => {
    const n = Number(l)
    return l !== '' && Number.isFinite(n) ? n : null
  })
  if (
    nums.every((n) => n !== null) &&
    nums.every((n, i) => i === 0 || (n as number) > (nums[i - 1] as number))
  ) {
    return {
      kind: 'numeric',
      label: 'Smallest to largest',
      tip: 'The smallest number goes first.',
      clue: 'number',
    }
  }
  return null
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 11 -> "11th", 21 -> "21st". */
export function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/**
 * ORDER HINT (batch-2 #5, owner 2026-11-07 13:12 PKT): the hint lets
 * the kid see the YEAR of one line — e.g. "Mughal — 1526". The year
 * comes ONLY from the item's own text: when the label carries a year
 * the hint highlights that line as-is ("💡 Mughal — 1526"). A bare
 * label with no year in it (the programme games use single words
 * like "MUGHAL") has no year to show — inventing one would be fake
 * data — so the hint gives the position the data DOES carry instead
 * ("💡 MUGHAL goes 2nd of 5"). For a year to appear in the hint,
 * the game content itself must carry the year in the label.
 */
export function orderHintText(label: string, position: number, total: number): string {
  const clean = (label ?? '').trim()
  // A label that already carries a year IS the hint — the year is
  // right there in it ("Mughal — 1526"), so the hint just highlights
  // that line. Appending the year again would duplicate it.
  const m = clean.match(/\b(1\d{3}|20\d{2})\b/)
  if (m) return `💡 ${clean}`
  return `💡 ${clean} goes ${ordinal(position)} of ${total}`
}
