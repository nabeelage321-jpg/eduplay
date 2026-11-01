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
 * - Never hallucinate facts as true. Chapter drafts are built from the
 *   chapter's own sentences (fill-in-the-blank), not invented trivia.
 * - Never fake a citation. Every draft carries a plain source note.
 */
import type { ActivityItem } from '@/types'

export type PromptGameType = 'quiz' | 'match-up' | 'unjumble'

export const PROMPT_GAME_TYPES: Array<{ id: PromptGameType; label: string }> = [
  { id: 'quiz', label: 'Quiz' },
  { id: 'match-up', label: 'Match Up' },
  { id: 'unjumble', label: 'Unjumble' },
]

export interface PromptDraft {
  title: string
  type: PromptGameType
  items: ActivityItem[]
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
  // Unjumble: the player expects prompt = jumbled words, answer = correct phrase.
  return items.map((i) => ({
    prompt: jumbleWords(i.answer),
    answer: i.answer,
    hint: i.prompt,
  }))
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
    if (type === 'unjumble') {
      // A number alone cannot be unjumbled, so unjumble the full phrase.
      const phrase = `${n} times ${i} equals ${product}`
      items.push({ prompt: jumbleWords(phrase), answer: phrase, hint: `What is ${n} × ${i}?` })
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

/**
 * Build a fill-in-the-blank draft from the student's OWN chapter text.
 * Each item blanks one long word out of a real chapter sentence and
 * offers other real chapter words as options. Nothing is invented:
 * if the chapter has too few usable sentences, this returns [] and
 * the API must say so instead of inventing questions.
 */
export function buildChapterDraft(
  chapterText: string,
  prompt: string,
  type: PromptGameType
): PromptDraft | null {
  const sentences = chapterText
    .split(/(?<=[.!?])\s+/)
    .map(cleanSentence)
    .filter((s) => s.length >= 40 && s.length <= 220 && /[A-Za-z]/.test(s))
    .slice(0, 10)
  if (sentences.length < 2) return null

  const allWords = Array.from(
    new Set(
      sentences
        .flatMap((s) => s.replace(/[^A-Za-z\s'-]/g, ' ').split(/\s+/))
        .filter((w) => w.length >= 5)
    )
  )

  const items: ActivityItem[] = []
  for (const sentence of sentences) {
    const words = sentence.replace(/[^A-Za-z\s'-]/g, ' ').split(/\s+/).filter(Boolean)
    // Blank the longest word (not the first word) — a real chapter word.
    let blankIdx = -1
    let blankLen = 0
    words.forEach((w, i) => {
      if (i > 0 && w.length > blankLen && /^[A-Za-z][A-Za-z'-]*$/.test(w)) {
        blankLen = w.length
        blankIdx = i
      }
    })
    if (blankIdx < 0) continue
    const answer = words[blankIdx]
    const promptSentence = [...words]
    promptSentence[blankIdx] = '___'
    const distractors = allWords.filter((w) => w.toLowerCase() !== answer.toLowerCase()).slice(0, 3)
    if (distractors.length < 2) continue
    items.push({
      prompt: `Complete this sentence from your chapter: ${promptSentence.join(' ')}`,
      answer,
      answers: [answer, ...distractors],
    })
    if (items.length >= 8) break
  }
  if (items.length < 2) return null

  return {
    title: prompt || 'My chapter game',
    type,
    items: convertDraftItems(items, type),
    sourceNote:
      'Built from the chapter text you added — every question uses a real sentence from that chapter. Check and edit each one before you approve it.',
  }
}
