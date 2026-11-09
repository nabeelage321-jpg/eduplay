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
import { clueContainsAnswer } from './crossword-clue'
import { countPlacedCrosswordWords, CROSSWORD_MIN_PLACED_WORDS } from './crossword-grid'

export type PromptGameType = 'quiz' | 'match-up' | 'unjumble' | 'true-false' | 'fill-blank' | 'missing-word' | 'gameshow-quiz' | 'hangman' | 'wordsearch' | 'categorize' | 'crossword'

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
  { id: 'missing-word', label: 'Missing Word' },
  { id: 'gameshow-quiz', label: 'Gameshow Quiz' },
  { id: 'hangman', label: 'Hangman' },
  { id: 'wordsearch', label: 'Word Search' },
  { id: 'categorize', label: 'Categorize' },
  { id: 'crossword', label: 'Crossword' },
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

/**
 * GUIDED TAPS-ONLY PROMPT (2026-11-09): a kid must be able to make
 * a draft with taps only — tap a topic chip, tap a game type, tap
 * Make draft — never type. The chip's prompt IS the complete
 * working prompt (e.g. "make game for a table of 3", "Animals for
 * Grade 5"), so when the prompt box is empty in Guided mode the
 * tapped chip's prompt is used instead of failing. A typed prompt
 * always wins over the chip: editing the box means the creator
 * meant their own words.
 */
export function buildGuidedPrompt(prompt: string, pickedChipPrompt: string | null): string {
  const typed = prompt.trim()
  if (typed) return typed
  return (pickedChipPrompt ?? '').trim()
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
  // GAMESHOW-QUIZ (2026-11-07): identity, exactly like quiz. The
  // player builds each round from a quiz-shaped item — prompt +
  // answer, with its 3 wrong options borrowed from the OTHER items
  // (GameshowQuizActivity) — so a gameshow-quiz draft item IS a quiz
  // item: no rewording, no dropping, no new facts.
  // CATEGORIZE (2026-11-08): identity, exactly like quiz. The
  // player builds one basket per distinct answer (the category)
  // and one ball per item label (the prompt) — so a categorize
  // draft item IS a { prompt: label, answer: category } item, and
  // the route's isCategorizeDraftUsable check decides whether the
  // set is sortable. No rewording, no dropping, no new facts.
  if (type === 'quiz' || type === 'match-up' || type === 'gameshow-quiz' || type === 'categorize') return items
  if (type === 'true-false') return convertToTrueFalse(items)
  if (type === 'fill-blank') return convertToFillBlank(items)
  if (type === 'missing-word') return convertToMissingWord(items)
  if (type === 'hangman') return convertToHangman(items)
  if (type === 'wordsearch') return convertToWordSearch(items)
  if (type === 'crossword') return convertToCrossword(items)
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

/**
 * True when `answer` occurs in `sentence` as a whole word, exactly
 * once, case-insensitively — so "art" never matches inside "heart",
 * and an answer that appears twice ("2 + 3 = 3" for answer "3")
 * does not count. Plain indexOf, never a regex built from the
 * answer, so punctuation in the answer cannot break the check.
 * The MissingWord player blanks the word with the same whole-word
 * rule, so a sentence that passes here always shows a blank there.
 */
export function containsAnswerWordOnce(sentence: string, answer: string): boolean {
  const lower = sentence.toLowerCase()
  const needle = answer.trim().toLowerCase()
  if (!needle) return false
  let count = 0
  let from = 0
  for (;;) {
    const idx = lower.indexOf(needle, from)
    if (idx < 0) break
    const before = idx === 0 ? '' : lower[idx - 1]
    const after = idx + needle.length >= lower.length ? '' : lower[idx + needle.length]
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) count++
    from = idx + needle.length
  }
  return count === 1
}

/**
 * True when a draft item is a usable Missing Word item: the prompt
 * is a plain sentence (never a question, never a fill-in-the-blank
 * with `___`) and the answer is one single word that occurs in it
 * as a whole word exactly once. Used by the route as the
 * after-conversion check, on every path.
 */
export function isMissingWordItem(item: ActivityItem): boolean {
  const answer = cleanSentence(item.answer)
  if (!answer || /\s/.test(answer) || answer.includes('___') || answer.includes('?')) return false
  const prompt = cleanSentence(item.prompt)
  if (!prompt || prompt.endsWith('?') || prompt.includes('___')) return false
  return containsAnswerWordOnce(prompt, answer)
}

/**
 * Turn one quiz question + one answer into a Missing Word sentence,
 * e.g. "What is the largest planet?" + "Jupiter" ->
 * "The largest planet is Jupiter." The sentence is built from the
 * question's own words via questionToStatement, and the answer must
 * be a SINGLE word that occurs in that statement as a whole word
 * exactly once. Anything else returns null and the caller DROPS
 * that item instead of producing a sentence without its missing
 * word in it, or a garbled one. A prompt that is already such a
 * sentence (from the Groq sentences path) passes through,
 * normalised to end with a full stop.
 */
export function questionToMissingWordSentence(question: string, answer: string): string | null {
  const a = cleanSentence(answer)
  if (!a || /\s/.test(a) || a.length > 40 || a.includes('?') || a.includes('___')) return null
  const q = cleanSentence(question)
  if (!q) return null
  // Already a missing-word sentence: keep it, normalised — but it
  // must still be a real sentence, not a lone word or a question.
  if (!q.endsWith('?') && !q.includes('___') && q.split(/\s+/).length >= 3 && containsAnswerWordOnce(q, a)) {
    return q.endsWith('.') ? q : `${q}.`
  }
  const statement = questionToStatement(question, answer)
  if (!statement) return null
  if (statement.split(/\s+/).length < 3) return null
  if (!containsAnswerWordOnce(statement, a)) return null
  return statement.endsWith('.') ? statement : `${statement}.`
}

/**
 * Convert quiz-style items to Missing Word sentences. Items whose
 * question has no clean sentence form, whose answer is not a single
 * word, or whose answer does not occur exactly once as a whole word
 * in the sentence are dropped, never garbled. Items already in
 * missing-word form (from the Groq sentences path) pass through,
 * validated. Capped at 10. Answers are deduped: the player builds
 * its tap options by borrowing the OTHER items' answers, so two
 * items with the same answer would offer the same option twice.
 */
function convertToMissingWord(items: ActivityItem[]): ActivityItem[] {
  const out: ActivityItem[] = []
  const seenSentences = new Set<string>()
  const seenAnswers = new Set<string>()
  for (const item of items) {
    if (out.length >= 10) break
    const answer = cleanSentence(item.answer)
    if (!answer) continue
    const sentence = questionToMissingWordSentence(item.prompt, answer)
    if (!sentence) continue
    const key = sentence.toLowerCase()
    if (seenSentences.has(key) || seenAnswers.has(answer.toLowerCase())) continue
    seenSentences.add(key)
    seenAnswers.add(answer.toLowerCase())
    out.push({ prompt: sentence, answer })
  }
  return out.slice(0, 10)
}

/**
 * True when a draft item is a usable Hangman item: the answer is
 * ONE single word of letters only (3–12 letters — the player only
 * guesses A–Z, so a digit, a phrase, or a word with punctuation
 * would be unplayable), and the prompt is a real clue that never
 * contains the answer word as a whole word (the player shows the
 * prompt as the "What kind of word is it?" clue, so naming the
 * word there would give the game away). Used by the route as the
 * after-conversion check, on every path.
 */
export function isHangmanItem(item: ActivityItem): boolean {
  const answer = cleanSentence(item.answer)
  if (!answer || !/^[A-Za-z]{3,12}$/.test(answer)) return false
  const prompt = cleanSentence(item.prompt)
  if (!prompt) return false
  if (clueContainsAnswer(prompt, answer)) return false
  return true
}

/**
 * Convert quiz-style items to Hangman items. The question is kept
 * as the prompt — it IS the clue the player shows before guessing
 * (plus the letter count and first letter, which the player derives
 * itself) — and the answer is the word to guess. Items are DROPPED,
 * never garbled: a multi-word answer, a digit or number answer, a
 * word shorter than 3 or longer than 12 letters, or a question that
 * contains the answer word all drop. Groq hangman items already
 * arrive as { hint, word } and pass through the same validation,
 * so no separate passthrough is needed. Capped at 10. Answers are
 * deduped: two rounds with the same word would be the same round
 * twice.
 */
function convertToHangman(items: ActivityItem[]): ActivityItem[] {
  const out: ActivityItem[] = []
  const seenAnswers = new Set<string>()
  for (const item of items) {
    if (out.length >= 10) break
    const answer = cleanSentence(item.answer)
    const prompt = cleanSentence(item.prompt)
    if (!answer || !prompt) continue
    if (!isHangmanItem({ prompt, answer })) continue
    const key = answer.toLowerCase()
    if (seenAnswers.has(key)) continue
    seenAnswers.add(key)
    out.push({ prompt, answer })
  }
  return out.slice(0, 10)
}

/**
 * True when a draft item is a usable Word Search item: the answer is
 * ONE single word of letters only (2–12 letters — the player builds
 * a 12×12 grid, so a longer word cannot fit in it, and a digit, a
 * phrase, or a word with punctuation would be unplaceable), and the
 * prompt is a real clue that never contains the answer word as a
 * whole word (the player shows the prompt as the label for the word
 * to find, so naming the word there would give the hunt away).
 * Used by the route as the after-conversion check, on every path.
 */
export function isWordSearchItem(item: ActivityItem): boolean {
  const answer = cleanSentence(item.answer)
  if (!answer || !/^[A-Za-z]{2,12}$/.test(answer)) return false
  const prompt = cleanSentence(item.prompt)
  if (!prompt) return false
  if (clueContainsAnswer(prompt, answer)) return false
  return true
}

/**
 * True when a draft item is a usable Crossword item: the answer is
 * ONE single word of letters only (3–12 letters — the grid is
 * 13 wide, and a digit, a phrase, or a word with punctuation
 * would be unplayable), and the prompt is a real clue that never
 * contains the answer word as a whole word (the player shows the
 * prompt as the clue, so naming the word there would give the
 * game away — the player itself rewrites answer-naming prompts,
 * but a draft must not rely on that). Used by the route as the
 * after-conversion check, on every path, alongside the grid
 * placement check below.
 */
export function isCrosswordItem(item: ActivityItem): boolean {
  const answer = cleanSentence(item.answer)
  if (!answer || !/^[A-Za-z]{3,12}$/.test(answer)) return false
  const prompt = cleanSentence(item.prompt)
  if (!prompt) return false
  if (clueContainsAnswer(prompt, answer)) return false
  return true
}

/**
 * Convert quiz-style items to Word Search items. The question is
 * kept as the prompt — it IS the clue the player shows in the word
 * list above the grid — and the answer is the word to find in the
 * 12×12 grid. Items are DROPPED, never garbled: a multi-word
 * answer, a digit or number answer, a word shorter than 2 or longer
 * than 12 letters, or a question that contains the answer word all
 * drop. Groq word-search items already arrive as { hint, word } and
 * pass through the same validation, so no separate passthrough is
 * needed. Capped at 10. Answers are deduped: two rounds with the
 * same word would be the same hunt twice.
 */
function convertToWordSearch(items: ActivityItem[]): ActivityItem[] {
  const out: ActivityItem[] = []
  const seenAnswers = new Set<string>()
  for (const item of items) {
    if (out.length >= 10) break
    const answer = cleanSentence(item.answer)
    const prompt = cleanSentence(item.prompt)
    if (!answer || !prompt) continue
    if (!isWordSearchItem({ prompt, answer })) continue
    const key = answer.toLowerCase()
    if (seenAnswers.has(key)) continue
    seenAnswers.add(key)
    out.push({ prompt, answer })
  }
  return out.slice(0, 10)
}

/**
 * True when a draft is a usable Categorize game. The player builds
 * one basket per distinct answer (the category name) and one ball
 * per item (the prompt label), so the check is on the whole SET,
 * not on single items: at least 2 categories, each with at least 2
 * items (a one-item basket has nothing to sort, and a single
 * category has no choice in it), every label and category short
 * enough to fit on a ball / basket rim (40 chars — the Groq
 * parser caps them the same way), and no label that just repeats
 * its own category. Used by the route as the after-conversion
 * check, on every path. Quiz-shaped items converted by identity
 * (a question as the label, its answer as the category) almost
 * never pass — each answer is its own one-item category — so the
 * chapter / OpenTDB / table paths honestly error for categorize
 * instead of shipping an unsortable draft; only the Groq
 * category-grouped path produces a passing set.
 */
export function isCategorizeDraftUsable(items: ActivityItem[]): boolean {
  if (items.length < 4) return false
  const byCategory = new Map<string, number>()
  for (const item of items) {
    const label = cleanSentence(item.prompt)
    const category = cleanSentence(item.answer)
    if (!label || !category) return false
    if (label.length > 40 || category.length > 40) return false
    if (label.toLowerCase() === category.toLowerCase()) return false
    const key = category.toLowerCase()
    byCategory.set(key, (byCategory.get(key) ?? 0) + 1)
  }
  if (byCategory.size < 2) return false
  for (const count of byCategory.values()) {
    if (count < 2) return false
  }
  return true
}

/**
 * Convert quiz-style items to Crossword items. The question is kept
 * as the prompt — it IS the clue the player shows in the clue list
 * — and the answer is the word in the grid. Items are DROPPED,
 * never garbled: a multi-word answer, a digit or number answer, a
 * word shorter than 3 or longer than 12 letters, or a question that
 * contains the answer word all drop. Groq crossword items already
 * arrive as { clue, word } and pass through the same validation,
 * so no separate passthrough is needed. Capped at 10. Answers are
 * deduped: two grid entries with the same word would be the same
 * word twice.
 *
 * NOTE: conversion alone cannot promise a grid — words that share
 * no letters cannot cross. The route checks crosswordPlacedCount
 * AFTER conversion, so a list that cannot interlock is an error,
 * never a draft.
 */
function convertToCrossword(items: ActivityItem[]): ActivityItem[] {
  const out: ActivityItem[] = []
  const seenAnswers = new Set<string>()
  for (const item of items) {
    if (out.length >= 10) break
    const answer = cleanSentence(item.answer)
    const prompt = cleanSentence(item.prompt)
    if (!answer || !prompt) continue
    if (!isCrosswordItem({ prompt, answer })) continue
    const key = answer.toLowerCase()
    if (seenAnswers.has(key)) continue
    seenAnswers.add(key)
    out.push({ prompt, answer })
  }
  return out.slice(0, 10)
}

/**
 * How many of these draft items the Crossword player would actually
 * place on its grid (same placement rules — see crossword-grid.ts).
 * The route requires at least CROSSWORD_MIN_PLACED_WORDS, so a
 * draft is only ever a real interlocking grid, never a flat list
 * that plays as one lonely across word.
 */
export function crosswordPlacedCount(items: ActivityItem[]): number {
  return countPlacedCrosswordWords(items.map((i) => i.answer))
}

export { CROSSWORD_MIN_PLACED_WORDS }

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
 * Single-word number words for Missing Word table sentences, e.g.
 * "Two times three equals six." Only products with a one-word form
 * are built (1–20 and the tens to 90): a product like 21 or 100 has
 * no single-word form ("twenty-one", "one hundred"), so that row is
 * DROPPED rather than inventing one — the route then errors if
 * fewer than 2 rows survive, never a half draft.
 */
const NUMBER_WORDS: Record<number, string> = {
  1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven',
  8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen',
  14: 'fourteen', 15: 'fifteen', 16: 'sixteen', 17: 'seventeen', 18: 'eighteen',
  19: 'nineteen', 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty',
  60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety',
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
    if (type === 'missing-word') {
      // A word-form sentence: "2 times 3 equals six." — the
      // product word is the missing word, and it occurs in the
      // sentence as a whole word exactly once. The factors stay
      // digits on purpose: spelling them out ("Two times one
      // equals two.") would repeat the answer word on every i = 1
      // row — and on every row of the table of 1 — so the player
      // would blank the first occurrence and leave the answer
      // visible at the end. Rows whose product has no single-word
      // form are dropped, never invented.
      const pWord = NUMBER_WORDS[product]
      if (!pWord) continue
      items.push({
        prompt: `${n} times ${i} equals ${pWord}.`,
        answer: pWord,
      })
      continue
    }
    if (type === 'hangman') {
      // The answer is the product in WORD form ("six", not "6"):
      // the player only guesses A–Z letters, so a digit answer
      // would be an unplayable item. The prompt is the question
      // itself ("What is 2 × 3?") — it never contains the word
      // form. Rows whose product has no single-word form are
      // dropped, never invented.
      const pWord = NUMBER_WORDS[product]
      if (!pWord) continue
      items.push({
        prompt: `What is ${n} × ${i}?`,
        answer: pWord,
      })
      continue
    }
    if (type === 'wordsearch') {
      // Same word-form rows as hangman: the answer is the product
      // in WORD form ("six", not "6") — the player places the word
      // in a 12×12 grid of letters, so a digit answer would be
      // unplaceable, and every number word here is 3–9 letters so
      // it fits. The prompt is the question itself, shown as the
      // clue in the word list — it never contains the word form.
      // Rows whose product has no single-word form are dropped,
      // never invented.
      const pWord = NUMBER_WORDS[product]
      if (!pWord) continue
      items.push({
        prompt: `What is ${n} × ${i}?`,
        answer: pWord,
      })
      continue
    }
    if (type === 'crossword') {
      // Same word-form rows as hangman ("six", not "6"): the grid
      // only takes letters. The question is the clue — it never
      // contains the word form. Rows whose product has no
      // single-word form are dropped, never invented; the route
      // then checks the survivors actually interlock (table of 3
      // places 5, table of 19 keeps only "nineteen" and errors).
      const pWord = NUMBER_WORDS[product]
      if (!pWord) continue
      items.push({
        prompt: `What is ${n} × ${i}?`,
        answer: pWord,
      })
      continue
    }
    // QUIZ + GAMESHOW-QUIZ (2026-11-07): the same branch, exactly.
    // Gameshow Quiz plays quiz-shaped items (prompt + answer, the
    // player borrows the wrong options), so it gets the same 10 rows,
    // the same rotated options, and the same "What is 2 × 3?"
    // prompts as quiz. Match-up only changes the prompt text.
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
