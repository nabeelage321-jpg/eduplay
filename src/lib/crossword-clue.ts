/**
 * CROSSWORD CLUES (batch-1 shared build, final list item 22).
 *
 * A crossword clue must NEVER be the answer. Programme games carry
 * prompts like "History word: History" — the prompt IS the answer,
 * so the kid just copies it from the clue list. A real clue asks
 * for the word without naming it.
 *
 * Rule (pure, testable): when the prompt contains the answer, the
 * clue becomes "A <Subject> word with <N> letters" (subject parsed
 * from "<Subject> word: ..." when present, else no subject). The
 * length comes from the answer itself, so nothing is invented.
 * When the prompt does NOT contain the answer, it is already a real
 * clue (a teacher's question or definition) and is kept verbatim.
 */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** True when the prompt names the answer (as a whole word). */
export function clueContainsAnswer(prompt: string, answer: string): boolean {
  const a = (answer ?? '').trim()
  if (!a) return false
  const re = new RegExp(`\\b${escapeRegExp(a)}\\b`, 'i')
  return re.test(prompt ?? '')
}

/** The clue to show for a crossword word: the prompt when it is a
 *  real clue, else a length + subject clue that never names the
 *  answer. */
export function crosswordClue(prompt: string, answer: string): string {
  const p = (prompt ?? '').trim()
  const a = (answer ?? '').trim()
  if (!a) return p
  if (!clueContainsAnswer(p, a)) return p
  const letters = a.replace(/\s/g, '').length
  const subjectMatch = p.match(/^(.+?)\s+word\s*:/i)
  const subject = subjectMatch ? subjectMatch[1].trim() : ''
  // The subject itself can BE the answer ("History word: History") —
  // then "A History word..." would still name it. In that case the
  // subject is dropped and only the length is given.
  if (subject && !clueContainsAnswer(subject, a)) {
    return `A ${subject} word with ${letters} letters`
  }
  return `A word with ${letters} letters`
}
