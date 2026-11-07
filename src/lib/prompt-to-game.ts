/**
 * Prompt-to-game draft builder (UI + prompt batch, 2026-10-30).
 *
 * Rules from the beat master, enforced here:
 * - No paid provider, no Anthropic/Claude, no key in chat or code.
 * - Free content first: Open Trivia Database (CC BY-SA 4.0, attributed),
 *   Free Dictionary API, and the student's own chapter text.
 * - A draft is NEVER a published game. It is editable, private in the
 *   browser, and only becomes a game when the creator approves it and
 *   saves it through the existing (auth-gated) /api/activities flow.
 * - Never hallucinate facts as true. Chapter drafts are PARAPHRASED
 *   from the chapter via Groq (same facts, new words) — never the
 *   book's exact sentences. The old local verbatim fill-in-the-blank
 *   builder was removed in 2026-11-04; no code path may fall back to it.
 * - Never fake a citation. Every draft carries a plain source note.
 */
import type { ActivityItem } from '@/types'

export type PromptGameType = 'quiz' | 'match-up' | 'unjumble' | 'true-false' | 'fill-blank'

/**
 * PENDING-DRAFT HANDOFF (separate prompt page, 2026-11-06) — the
 * sessionStorage key that carries an approved prompt draft from the
 * standalone /prompt-to-game page to /create. sessionStorage, not
 * localStorage: the draft is for this tab's flow only, and
 * ActivityCreator removes the key the moment it reads it, so it can
 * never fire twice or leak into a later, unrelated /create visit.
 * Lives here (not in a component) because both the standalone page
 * and ActivityCreator need the same string.
 */
export const PENDING_PROMPT_DRAFT_KEY = 'eduplay-pending-prompt-draft'

export const PROMPT_GAME_TYPES: Array<{ id: PromptGameType; label: string }> = [
  { id: 'quiz', label: 'Quiz' },
  { id: 'match-up', label: 'Match Up' },
  { id: 'unjumble', label: 'Unjumble' },
  { id: 'true-false', label: 'True False' },
  { id: 'fill-blank', label: 'Fill Blank' },
]

export interface PromptDraft {
  title: string
  type: PromptGameType
  items: ActivityItem[]
  /**
   * GUIDED BUILDER (2026-11-01): subject/grade picked in the creator
   * (exact DB values, e.g. "Math" / "grade-2"). Set only by the
   * approval payload in PromptToGame — never by the draft route —
   * so ActivityCreator can save them instead of saving blank.
   */
  subject?: string
  grade?: string
  /**
   * WORLDWIDE CURRICULUM v1 (2026-11-04): country + syllabus picked
   * in the creator (validated against src/lib/curricula.ts). Set only
   * by the approval payload in PromptToGame — never by the draft route
   * — so ActivityCreator can save them as tags instead of saving
   * blank. Absent = "Not sure / General": no syllabus claim stored.
   */
  countryCode?: string
  syllabusSlug?: string
  /** Plain-language source, shown to the creator before approval. */
  sourceNote: string
  sourceUrl?: string
}

export function sanitizePrompt(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&uuml;/g, 'ü')
}

/** Deterministic word shuffle for unjumble: reverse word order, so the
 *  draft is stable and editable, and no word is invented. */
export function jumbleWords(phrase: string): string {
  const words = phrase.split(/\s+/).filter(Boolean)
  if (words.length < 2) {
    // Single word: reverse its letters (still the same word, editable).
    return words[0] ? words[0].split('').reverse().join('') : ''
  }
  return words.reverse().join(' ')
}

/** Convert quiz-style items (prompt = question, answer = answer) to the
 *  chosen game type. No new facts are created by conversion. */
export function convertDraftItems(
  items: ActivityItem[],
  type: PromptGameType
): ActivityItem[] {
  if (type === 'quiz' || type === 'match-up') return items
  if (type === 'true-false') return convertToTrueFalse(items)
  if (type === 'fill-blank') return convertToFillBlank(items)
  // Unjumble: the player expects prompt = jumbled words, answer = correct phrase.
  return items.map((i) => ({
    prompt: jumbleWords(i.answer),
    answer: i.answer,
    hint: i.prompt,
  }))
}

/** Wrong answers available on a quiz-style item: the `answers` options
 *  minus the correct one. Groq and OpenTDB both put their incorrect
 *  answers there, so nothing is ever invented — a wrong answer is only
 *  ever borrowed from the same draft. */
function wrongAnswersOf(item: ActivityItem): string[] {
  const correct = item.answer.trim().toLowerCase()
  return (item.answers ?? [])
    .map((a) => String(a).trim())
    .filter((a) => a && a.toLowerCase() !== correct)
}

function capFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Turn one quiz question + one answer into a single declarative
 * statement, e.g. "What is the capital of France?" + "Paris" ->
 * "The capital of France is Paris." Only a small set of question
 * shapes converts cleanly; anything else returns null and the caller
 * DROPS that item instead of producing a garbled statement. Never
 * invents, rewords loosely, or guesses — the statement is built from
 * the question's own words plus the given answer only.
 */
export function questionToStatement(question: string, answer: string): string | null {
  const q = cleanSentence(question).replace(/\?+\s*$/, '')
  const a = cleanSentence(answer)
  if (!q || !a || a.length > 120 || a.includes('?')) return null
  // Fill-in-the-blank questions have no clean statement form.
  if (q.includes('___') || /\bblank\b/i.test(q)) return null
  let m: RegExpMatchArray | null

  // Arithmetic "What is 2 + 3?" -> "2 + 3 = 5".
  if ((m = q.match(/^what is ([\d\s+\-×x*/().]+)$/i)) && /\d/.test(m[1]) && /[+\-×x*/]/.test(m[1])) {
    return `${m[1].trim()} = ${a}`
  }
  // "What is/are/was/were X?" -> "X is/are/was/were <answer>."
  // (but never "What is not ...?" — that would read backwards.)
  if ((m = q.match(/^what (is|are|was|were) (.+)$/i)) && !/^not\b/i.test(m[2])) {
    return `${capFirst(m[2].trim())} ${m[1].toLowerCase()} ${a}.`
  }
  // "Which <noun> is/are/was/were ...?" -> "<answer> is/are/was/were ..."
  if ((m = q.match(/^which (.+?) (is|are|was|were) (.+)$/i))) {
    if (m[1].trim().split(/\s+/).length > 6) return null
    return `${capFirst(a)} ${m[2].toLowerCase()} ${m[3].trim()}.`
  }
  // "Who is/are/was/were ...?" -> "<answer> is/are/was/were ..."
  if ((m = q.match(/^who (is|are|was|were) (.+)$/i))) {
    return `${capFirst(a)} ${m[1].toLowerCase()} ${m[2].trim()}.`
  }
  // "Who <verb> ...?" -> "<answer> <verb> ..." (wrote, painted, ...).
  // Auxiliary verbs would need restructuring, so those drop.
  if ((m = q.match(/^who ([A-Za-z']+) (.+)$/i))) {
    const verb = m[1].toLowerCase()
    if (['do', 'does', 'did', 'can', 'could', 'will', 'would', 'has', 'have', 'had', 'is', 'are', 'was', 'were'].includes(verb)) return null
    return `${capFirst(a)} ${m[1]} ${m[2].trim()}.`
  }
  // "Where is/are X?" -> "X is/are in <answer>."
  if ((m = q.match(/^where (is|are) (.+)$/i))) {
    const subj = m[2].trim()
    if (/^in\s/i.test(a)) return `${capFirst(subj)} ${m[1].toLowerCase()} ${a}.`
    return `${capFirst(subj)} ${m[1].toLowerCase()} in ${a}.`
  }
  // "How many <noun> does/do <subject> have?" -> "<Subject> has/have <answer> <noun>."
  if ((m = q.match(/^how many (.+?) (does|do) (.+?) have$/i))) {
    const verb = m[2].toLowerCase() === 'does' ? 'has' : 'have'
    return `${capFirst(m[3].trim())} ${verb} ${a} ${m[1].trim()}.`
  }
  // "How many <noun> are there in <place>?" -> "There are <answer> <noun> in <place>."
  if ((m = q.match(/^how many (.+?) are there in (.+)$/i))) {
    return `There are ${a} ${m[1].trim()} in ${m[2].trim()}.`
  }
  // "What do we/you call X?" -> "X is called <answer>."
  if ((m = q.match(/^what do (?:we|you) call (.+)$/i))) {
    return `${capFirst(m[1].trim())} is called ${a}.`
  }
  // Anything else (when/why/how/in-which-year/...) cannot be turned
  // into a clean statement without rewording, so it drops.
  return null
}

/**
 * Convert quiz-style items to True / False statements. Each source
 * item yields a TRUE statement (question + correct answer) and a FALSE
 * statement (same words, a borrowed wrong answer in place of the
 * correct one). Items whose question has no clean statement form are
 * dropped, never garbled. Items already in true/false form (from the
 * Groq statements path) pass through unchanged. Capped at 10.
 * The player treats any answer other than 'true' as false, so every
 * emitted answer is exactly 'True' or 'False'.
 */
function convertToTrueFalse(items: ActivityItem[]): ActivityItem[] {
  const out: ActivityItem[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (out.length >= 10) break
    const itemAnswer = item.answer.trim().toLowerCase()
    // Already a true/false statement: pass through, normalised.
    if ((itemAnswer === 'true' || itemAnswer === 'false') && !item.prompt.trim().endsWith('?')) {
      const prompt = cleanSentence(item.prompt)
      if (!prompt || seen.has(prompt.toLowerCase())) continue
      seen.add(prompt.toLowerCase())
      out.push({ prompt, answer: itemAnswer === 'true' ? 'True' : 'False' })
      continue
    }
    const trueStmt = questionToStatement(item.prompt, item.answer)
    if (!trueStmt) continue
    if (seen.has(trueStmt.toLowerCase())) continue
    seen.add(trueStmt.toLowerCase())
    out.push({ prompt: trueStmt, answer: 'True' })
    if (out.length >= 10) break
    for (const wrong of wrongAnswersOf(item)) {
      const falseStmt = questionToStatement(item.prompt, wrong)
      if (falseStmt && falseStmt !== trueStmt && !seen.has(falseStmt.toLowerCase())) {
        seen.add(falseStmt.toLowerCase())
        out.push({ prompt: falseStmt, answer: 'False' })
        break
      }
    }
  }
  return out.slice(0, 10)
}

/**
 * Turn one quiz question + one answer into a fill-in-the-blank
 * sentence, e.g. "What is the capital of France?" + "Paris" ->
 * "The capital of France is ___." The sentence is built from the
 * question's own words via questionToStatement, and the answer is
 * replaced by `___` — only when the answer occurs exactly ONCE in
 * that statement, as a whole word/phrase. Anything else returns null
 * and the caller DROPS that item instead of producing a garbled
 * sentence. The blank word must be a single word or short phrase
 * (max 3 words), so the player can offer it as one tap option.
 * A question that already carries exactly one `___` is kept as-is,
 * normalised to end with a full stop.
 */
export function questionToBlankSentence(question: string, answer: string): string | null {
  const a = cleanSentence(answer)
  if (!a || a.includes('?') || a.includes('___')) return null
  if (a.split(/\s+/).length > 3 || a.length > 40) return null
  const q = cleanSentence(question).replace(/\?+\s*$/, '')
  if (!q) return null
  // Already a fill-in-the-blank sentence: keep it, normalised.
  const blanks = (q.match(/___/g) ?? []).length
  if (blanks === 1) {
    return q.endsWith('.') ? q : `${q}.`
  }
  if (blanks > 1) return null
  const statement = questionToStatement(question, answer)
  if (!statement) return null
  // Replace the answer's single occurrence in the statement with ___.
  // Whole-word/phrase only, so "art" never blanks inside "heart",
  // and an answer that appears twice ("2 + 3 = 3") drops instead of
  // blanking the wrong one.
  const lower = statement.toLowerCase()
  const needle = a.toLowerCase()
  const hits: number[] = []
  let from = 0
  for (;;) {
    const idx = lower.indexOf(needle, from)
    if (idx < 0) break
    const before = idx === 0 ? '' : lower[idx - 1]
    const after = idx + needle.length >= lower.length ? '' : lower[idx + needle.length]
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) hits.push(idx)
    from = idx + needle.length
  }
  if (hits.length !== 1) return null
  const idx = hits[0]
  const sentence = `${statement.slice(0, idx)}___${statement.slice(idx + a.length)}`
  if ((sentence.match(/___/g) ?? []).length !== 1) return null
  // The sentence must still have real content around the blank —
  // at least 2 letters/digits (an arithmetic sentence like
  // "2 + 3 = ___" leaves only "23", so the bar is 2, not 3).
  if (sentence.replace(/___/g, '').replace(/[^a-z0-9]/gi, '').length < 2) return null
  return sentence
}

/**
 * Convert quiz-style items to fill-in-the-blank sentences. Items
 * whose question has no clean sentence form are dropped, never
 * garbled. Items already in fill-blank form (from the Groq sentences
 * path) pass through, validated. Capped at 10. Answers are deduped:
 * the player builds its 4 tap options by borrowing the OTHER items'
 * answers, so two items with the same answer would offer the same
 * option twice.
 */
function convertToFillBlank(items: ActivityItem[]): ActivityItem[] {
  const out: ActivityItem[] = []
  const seenSentences = new Set<string>()
  const seenAnswers = new Set<string>()
  for (const item of items) {
    if (out.length >= 10) break
    const answer = cleanSentence(item.answer)
    if (!answer) continue
    const sentence = questionToBlankSentence(item.prompt, answer)
    if (!sentence) continue
    const key = sentence.toLowerCase()
    if (seenSentences.has(key) || seenAnswers.has(answer.toLowerCase())) continue
    seenSentences.add(key)
    seenAnswers.add(answer.toLowerCase())
    out.push({ prompt: sentence, answer })
  }
  return out.slice(0, 10)
}

function cleanSentence(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20,
}

/**
 * Parse a multiplication-table number out of a prompt, e.g.
 * "make game for a table of 2", "table of two", "2 table",
 * "multiplication table of 3". Returns null for any other prompt.
 * Only tables 1–20 are built, so no huge or invented table is made.
 */
export function parseTableNumber(prompt: string): number | null {
  const lower = prompt.toLowerCase()
  const num = '(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)'
  const patterns = [
    new RegExp(`\\btable\\s+of\\s+${num}\\b`),
    new RegExp(`\\bmultiplication\\s+table\\s+(?:of\\s+)?${num}\\b`),
    new RegExp(`\\btimes\\s+table\\s+(?:of\\s+)?${num}\\b`),
    new RegExp(`\\b${num}\\s+table\\b`),
  ]
  for (const re of patterns) {
    const m = lower.match(re)
    if (!m) continue
    const raw = m[1]
    const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : WORD_NUMBERS[raw]
    if (n >= 1 && n <= 20) return n
  }
  return null
}

/**
 * Build a real multiplication-table draft from the prompt itself — no
 * external service is needed, so this works even when the free trivia
 * service is down or slow. Every answer is basic arithmetic (n × 1 …
 * n × 10) with plausible wrong answers, and the whole draft is editable
 * before approval, exactly like every other draft.
 */
export function buildTableDraft(prompt: string, type: PromptGameType): PromptDraft | null {
  const n = parseTableNumber(prompt)
  if (n === null) return null
  const items: ActivityItem[] = []
  for (let i = 1; i <= 10; i++) {
    const product = n * i
    if (type === 'true-false') {
      // One statement per row, alternating true/false across the whole
      // table: odd rows state the true product, even rows state a wrong
      // product borrowed from the SAME table (n × (i±1)), never random.
      const isTrueRow = i % 2 === 1
      const wrongCandidates = [n * (i + 1), n * (i - 1), product + 1, product - 1, product + 2, product - 2]
      const wrong = wrongCandidates.find((c) => c > 0 && c !== product) ?? product + 1
      items.push({
        prompt: `${n} × ${i} = ${isTrueRow ? product : wrong}`,
        answer: isTrueRow ? 'True' : 'False',
      })
      continue
    }
    if (type === 'unjumble') {
      // A number alone cannot be unjumbled, so unjumble the full phrase.
      const phrase = `${n} times ${i} equals ${product}`
      items.push({ prompt: jumbleWords(phrase), answer: phrase, hint: `What is ${n} × ${i}?` })
      continue
    }
    if (type === 'fill-blank') {
      // A table fact makes a clean blank deterministically.
      items.push({ prompt: `${n} × ${i} = ___`, answer: String(product) })
      continue
    }
    const candidates = [product - 2, product + 2, product - 1, product + 1, product + 10, product - 10, n * (i + 1), n * (i - 1)]
    const distractors: number[] = []
    for (const c of candidates) {
      if (c > 0 && c !== product && !distractors.includes(c)) distractors.push(c)
      if (distractors.length >= 3) break
    }
    const options = [String(product), ...distractors.map(String)]
    // Rotate so the correct answer is not always first (creator can edit).
    const rotated = [...options.slice(i % options.length), ...options.slice(0, i % options.length)]
    items.push({
      prompt: type === 'match-up' ? `${n} × ${i}` : `What is ${n} × ${i}?`,
      answer: String(product),
      answers: rotated,
    })
  }
  return {
    title: `Table of ${n}`,
    type,
    items,
    sourceNote: `Built from your prompt — the multiplication table of ${n}, from ${n} × 1 to ${n} × 10. Check and edit each question before you approve it.`,
  }
}
