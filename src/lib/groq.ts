/**
 * Groq provider for prompt-to-game drafts — SERVER ONLY.
 * Never import this from a client component: it reads the API key.
 *
 * Provider is Groq (GroqCloud, OpenAI-compatible chat completions),
 * NOT xAI Grok — different company, different product.
 *
 * Model: openai/gpt-oss-20b by default, verified 2026-11-02 against
 * Groq's own model docs (console.groq.com/docs/models, Production
 * tier). The retired llama-3.1-8b-instant / llama-3.3-70b-versatile
 * models are NOT used: Groq removed them from Free/Developer tiers
 * on 2026-08-16. Override the model only with GROQ_MODEL.
 *
 * Key: GROQ_API_KEY first. GROK_API_KEY is accepted as a silent
 * fallback ONLY because the owner spells the provider "grok" — it
 * must be standardised to GROQ_API_KEY later, and this fallback is
 * reported with every batch that ships it.
 *
 * Guardrails: low completion cap, JSON-only response, strict
 * validation, and an on-topic filter. A draft that fails validation
 * is an error, never silently replaced with invented questions.
 */
import type { ActivityItem } from '@/types'
import { containsAnswerWordOnce } from './prompt-to-game'
import { clueContainsAnswer } from './crossword-clue'

export const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-20b'
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
/** Completion-token ceiling per draft (gpt-oss max is 65,536). */
export const GROQ_MAX_COMPLETION_TOKENS = 2500
export const GROQ_TIMEOUT_MS = 20000
/** Completion-token ceiling for the answer-consistency self-check. */
export const GROQ_VERIFY_MAX_COMPLETION_TOKENS = 600
export const GROQ_VERIFY_TIMEOUT_MS = 15000

export interface GroqConfig {
  apiKey: string
  model: string
  /** Which env var actually supplied the key — reported, never the key. */
  keyName: 'GROQ_API_KEY' | 'GROK_API_KEY'
}

export function getGroqConfig(): GroqConfig | null {
  const groqKey = process.env.GROQ_API_KEY?.trim()
  if (groqKey) {
    return {
      apiKey: groqKey,
      model: process.env.GROQ_MODEL?.trim() || GROQ_DEFAULT_MODEL,
      keyName: 'GROQ_API_KEY',
    }
  }
  const grokKey = process.env.GROK_API_KEY?.trim()
  if (grokKey) {
    return {
      apiKey: grokKey,
      model: process.env.GROQ_MODEL?.trim() || GROQ_DEFAULT_MODEL,
      keyName: 'GROK_API_KEY',
    }
  }
  return null
}

export type GroqDraftResult =
  | { ok: true; model: string; items: ActivityItem[] }
  | { ok: false; status: number; error: string }

const STOPWORDS = new Set([
  'a', 'an', 'the', 'for', 'of', 'to', 'in', 'on', 'about', 'with', 'and', 'or',
  'make', 'game', 'games', 'create', 'quiz', 'questions', 'question', 'topic',
  'grade', 'class', 'year', 'level', 'students', 'student', 'kids', 'children',
  'school', 'learn', 'learning', 'please', 'simple', 'easy', 'fun', 'my',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean)
}

/** Content words of the prompt, e.g. "Parts of a plant for Grade 2" -> ["parts", "plant"]. */
export function topicKeywords(prompt: string): string[] {
  const out: string[] = []
  for (const t of tokenize(prompt)) {
    if (t.length < 3 || STOPWORDS.has(t) || /^\d+$/.test(t)) continue
    if (!out.includes(t)) out.push(t)
  }
  return out
}

function wordVariants(word: string): string[] {
  const variants = [word]
  if (word.length > 3 && word.endsWith('s')) variants.push(word.slice(0, -1))
  else variants.push(`${word}s`)
  // Common irregular plural for the plant-topic family and friends.
  if (word === 'leaves') variants.push('leaf')
  if (word === 'leaf') variants.push('leaves')
  return variants
}

/** True if the question or its correct answer mentions a topic word. */
function isOnTopic(question: string, correct: string, keywords: string[]): boolean {
  if (keywords.length === 0) return true
  const words = new Set(tokenize(`${question} ${correct}`))
  for (const kw of keywords) {
    for (const v of wordVariants(kw)) {
      if (words.has(v)) return true
    }
  }
  // ARITHMETIC (owner case 2026-11-09): "What is 2 + 3?" IS about
  // addition even though it never says the word "addition" — without
  // this, every plain arithmetic reply fails the filter and the
  // whole draft errors. A digit AND the matching operator (or
  // operation word) are both required, so a digit alone never
  // counts: "How many legs does a spider have? Eight" is not
  // addition, and "What is 5 - 2?" is not addition either.
  return isArithmeticOnTopic(`${question} ${correct}`, keywords)
}

/** Operation words for arithmetic topic words. */
const ARITHMETIC_TOPIC_WORDS: Record<string, { operators: string[]; words: string[] }> = {
  addition: { operators: ['+'], words: ['plus', 'add', 'sum', 'total'] },
  subtraction: { operators: ['-'], words: ['minus', 'subtract', 'difference'] },
  multiplication: { operators: ['×', '*'], words: ['times', 'multiply', 'product'] },
  division: { operators: ['÷', '/'], words: ['divided', 'divide', 'quotient'] },
  table: { operators: ['×', '*'], words: ['times', 'multiply'] },
  tables: { operators: ['×', '*'], words: ['times', 'multiply'] },
}

/** True when the text is an arithmetic sum about one of the topic
 *  words: a digit-operator-digit sum with that word's operator
 *  ("2 + 3" for addition, "7 × 8" for multiplication), "2 x 3"
 *  with x as its own word, or an operation word with a digit
 *  ("two plus three" has no digits, so it needs the word "plus"
 *  AND a digit — "2 plus 3"). The operator is matched per keyword,
 *  so a subtraction sum never passes an addition topic. */
function isArithmeticOnTopic(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  const words = new Set(tokenize(lower))
  for (const kw of keywords) {
    const rule = ARITHMETIC_TOPIC_WORDS[kw]
    if (!rule) continue
    if (/\d/.test(lower) && rule.words.some((w) => words.has(w))) return true
    const sum = lower.match(/\d\s*([+\-×÷*/])\s*\d/)
    if (sum && rule.operators.includes(sum[1])) return true
    if ((kw === 'multiplication' || kw === 'table' || kw === 'tables') && /\d\s+x\s+\d/.test(lower)) return true
  }
  return false
}

interface RawGroqQuestion {
  question?: unknown
  correct?: unknown
  incorrect?: unknown
}

function asNonEmptyString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.replace(/\s+/g, ' ').trim()
  if (!s || s.length > max) return null
  return s
}

/** Parse + validate Groq JSON into quiz-shaped items, dropping any
 *  off-topic, duplicate, or malformed question. Returns only the
 *  surviving items — the caller rejects the draft if fewer than 2. */
export function parseGroqQuestions(raw: unknown, prompt: string): ActivityItem[] {
  if (typeof raw !== 'object' || raw === null) return []
  const questions = (raw as { questions?: unknown }).questions
  if (!Array.isArray(questions)) return []
  const keywords = topicKeywords(prompt)
  const seen = new Set<string>()
  const items: ActivityItem[] = []
  for (const [i, q] of questions.entries()) {
    const r = q as RawGroqQuestion
    const question = asNonEmptyString(r.question, 300)
    const correct = asNonEmptyString(r.correct, 120)
    if (!question || !correct) continue
    // A correct answer that just repeats the question answers nothing.
    if (question.toLowerCase() === correct.toLowerCase()) continue
    if (!Array.isArray(r.incorrect)) continue
    const incorrect: string[] = []
    for (const d of r.incorrect) {
      const s = asNonEmptyString(d, 120)
      if (s && s.toLowerCase() !== correct.toLowerCase() && !incorrect.some((x) => x.toLowerCase() === s.toLowerCase())) {
        incorrect.push(s)
      }
      if (incorrect.length >= 3) break
    }
    if (incorrect.length < 2) continue
    const key = question.toLowerCase()
    if (seen.has(key)) continue
    if (!isOnTopic(question, correct, keywords)) continue
    seen.add(key)
    const options = [...incorrect]
    options.splice(i % (options.length + 1), 0, correct)
    items.push({ prompt: question, answer: correct, answers: options } as ActivityItem)
    if (items.length >= 10) break
  }
  return items
}


/**
 * Chapter paraphrase guard — the copyright rule for chapter games.
 *
 * A chapter draft must use the chapter's FACTS in NEW words, never the
 * book's exact sentences. "Verbatim" here means a whole chapter
 * sentence, or 8 or more consecutive words copied from one. Shorter
 * matches are terms and names (a single word, a place, a person) —
 * those are facts, not sentences, and no question can be written
 * without them, so they are allowed. Anything at or above the
 * threshold is dropped, never kept as a "close enough" question.
 */
function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function chapterSentences(chapterText: string): string[][] {
  return chapterText
    .split(/(?<=[.!?])\s+/)
    .map((s) => normalizeWords(s))
    .filter((w) => w.length >= 3)
}

function chapterNgrams(chapterText: string, n: number): Set<string> {
  const grams = new Set<string>()
  for (const words of chapterSentences(chapterText)) {
    for (let i = 0; i + n <= words.length; i++) {
      grams.add(words.slice(i, i + n).join(' '))
    }
  }
  return grams
}

/** True if `field` reproduces chapter wording at or above the threshold. */
export function isVerbatimChapterText(field: string, chapterText: string): boolean {
  const words = normalizeWords(field)
  if (words.length === 0) return false
  const joined = words.join(' ')
  const sentences = chapterSentences(chapterText)
  for (const sw of sentences) {
    const sJoined = sw.join(' ')
    if (joined === sJoined) return true
    // A whole chapter sentence (5+ words) embedded in a longer field.
    if (sw.length >= 5 && joined.includes(sJoined)) return true
  }
  if (words.length < 8) return false
  const grams = chapterNgrams(chapterText, 8)
  for (let i = 0; i + 8 <= words.length; i++) {
    if (grams.has(words.slice(i, i + 8).join(' '))) return true
  }
  return false
}

/** Drop any item whose question, answer, or option is verbatim chapter text. */
export function filterVerbatimChapterItems(
  items: ActivityItem[],
  chapterText: string
): ActivityItem[] {
  return items.filter((it) => {
    const fields = [it.prompt, it.answer, ...(it.answers ?? [])]
    return !fields.some((f) => isVerbatimChapterText(String(f ?? ''), chapterText))
  })
}

/**
 * Parse + validate a Groq chapter draft, then drop every verbatim item.
 * Structural rules match parseGroqQuestions (question/correct/incorrect,
 * dedupe, correct must not repeat the question). There is NO topic-
 * keyword filter here: a chapter prompt like "chapter three" carries
 * no keywords, and the facts come from the chapter itself, which the
 * system prompt already restricts the model to.
 */
export function parseGroqChapterQuestions(raw: unknown, chapterText: string): ActivityItem[] {
  if (typeof raw !== 'object' || raw === null) return []
  const questions = (raw as { questions?: unknown }).questions
  if (!Array.isArray(questions)) return []
  const seen = new Set<string>()
  const items: ActivityItem[] = []
  for (const [i, q] of questions.entries()) {
    const r = q as RawGroqQuestion
    const question = asNonEmptyString(r.question, 300)
    const correct = asNonEmptyString(r.correct, 120)
    if (!question || !correct) continue
    if (question.toLowerCase() === correct.toLowerCase()) continue
    if (!Array.isArray(r.incorrect)) continue
    const incorrect: string[] = []
    for (const d of r.incorrect) {
      const s = asNonEmptyString(d, 120)
      if (s && s.toLowerCase() !== correct.toLowerCase() && !incorrect.some((x) => x.toLowerCase() === s.toLowerCase())) {
        incorrect.push(s)
      }
      if (incorrect.length >= 3) break
    }
    if (incorrect.length < 2) continue
    const key = question.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const options = [...incorrect]
    options.splice(i % (options.length + 1), 0, correct)
    items.push({ prompt: question, answer: correct, answers: options } as ActivityItem)
    if (items.length >= 10) break
  }
  return filterVerbatimChapterItems(items, chapterText)
}

/**
 * One Groq call for a PARAPHRASED chapter draft. `fetchImpl` exists only
 * so tests can inject a mock — the route always passes the real fetch.
 * Never throws for a provider failure and NEVER falls back to verbatim
 * chapter sentences: a failure returns a distinct error the route turns
 * into a plain message, and the teacher makes the game manually instead.
 */
export async function buildGroqChapterDraft(
  chapterText: string,
  prompt: string,
  fetchImpl: typeof fetch = fetch
): Promise<GroqDraftResult> {
  const config = getGroqConfig()
  if (!config) {
    return { ok: false, status: 503, error: 'GROQ_NOT_CONFIGURED' }
  }
  // The chapter sent to the model is capped so the call stays inside a
  // sane input budget; the teacher reviews the draft either way, and a
  // longer chapter still yields a draft from its opening portion.
  const chapterForModel = chapterText.slice(0, 8000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS)
  try {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a school teacher making quiz questions FROM a chapter, in your OWN words. ' +
            'COPYRIGHT RULE — NEVER copy a sentence from the chapter word for word. Rewrite every fact as a NEW question in different words. ' +
            'A question that repeats a chapter sentence, even with one word blanked out, is forbidden. ' +
            'Use ONLY facts and concepts that actually appear in the chapter — never invent dates, statistics, names, or facts that are not in it. ' +
            'If you cannot state a fact in new words with confidence, leave that question out instead of guessing or copying. ' +
            'CRITICAL — the correct answer must DIRECTLY answer its own question. Before returning each question, read it back and check: if a teacher read only the question and this answer, would they mark it correct? ' +
            'Wrong answers must be plausible but clearly wrong, of the same kind as the correct answer, and different from it. ' +
            'Return ONLY a JSON object, no markdown, no extra text: {"questions": [{"question": "...", "correct": "...", "incorrect": ["...", "...", "..."]}]}. ' +
            'Up to 10 questions.',
        },
        {
          role: 'user',
          content:
            `Game title / prompt: ${prompt}\n\nChapter text (use ONLY facts from this chapter, in your own words — never copy its sentences):\n${chapterForModel}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: GROQ_MAX_COMPLETION_TOKENS,
    }
    if (config.model.startsWith('openai/gpt-oss')) {
      body.reasoning_effort = 'low'
    }
    const res = await fetchImpl(GROQ_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    })
    if (res.status === 429) {
      return { ok: false, status: 502, error: 'Groq is rate-limited right now. Try again in a moment — no questions were invented and no chapter sentences were copied.' }
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: 502, error: 'Groq did not accept the API key. Check the key in Vercel — no questions were invented and no chapter sentences were copied.' }
    }
    if (res.status === 404) {
      return { ok: false, status: 502, error: `Groq model ${config.model} is not available. Check GROQ_MODEL in Vercel — no questions were invented and no chapter sentences were copied.` }
    }
    if (!res.ok) {
      return { ok: false, status: 502, error: 'Groq did not answer. Try again in a moment — no questions were invented and no chapter sentences were copied.' }
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> }
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) {
      return { ok: false, status: 502, error: 'Groq returned an empty draft. Try again — no questions were invented and no chapter sentences were copied.' }
    }
    const parsed = extractJson(content)
    if (parsed === null) {
      return { ok: false, status: 502, error: 'Groq returned a draft that could not be read. Try again — no questions were invented and no chapter sentences were copied.' }
    }
    const parsedItems = parseGroqChapterQuestions(parsed, chapterText)
    // Same answer-consistency self-check as the general route. A failed
    // or incomplete check falls back to the parsed items — it never
    // invents questions, and every parsed item already passed the
    // verbatim filter, so the fallback cannot reintroduce copied text.
    const verified = parsedItems.length > 0
      ? await verifyGroqAnswers(parsedItems, fetchImpl, config)
      : null
    const items = verified ?? parsedItems
    if (items.length < 2) {
      return { ok: false, status: 502, error: 'Groq could not make a paraphrased chapter draft from this text without copying its sentences. Add more chapter text, or make the game manually with your own questions — no verbatim chapter sentences were kept.' }
    }
    return { ok: true, model: config.model, items }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, status: 502, error: 'Groq took too long to answer. Try again in a moment — no questions were invented and no chapter sentences were copied.' }
    }
    return { ok: false, status: 502, error: 'Groq did not answer. Try again in a moment — no questions were invented and no chapter sentences were copied.' }
  } finally {
    clearTimeout(timer)
  }
}

function extractJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown
  } catch {
    // Some models wrap JSON in prose or a code fence: take the first
    // balanced-looking {...} block and try that, nothing else.
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    try {
      return JSON.parse(text.slice(start, end + 1)) as unknown
    } catch {
      return null
    }
  }
}

/**
 * Second Groq call: answer-consistency self-check.
 *
 * Why it exists (live bug, 2026-11-02): a draft can be fully on-topic
 * yet still wrong — e.g. a question asking which part of a plant
 * produces flowers answered "Stem", and a question asking which part
 * is usually green answered "Root". The topic filter cannot catch
 * that, because "Stem" and "Root" are plant words. So the draft is
 * read back, one pair at a time, in a checker framing: would a
 * teacher mark this answer correct for this exact question?
 *
 * Returns the items that survived, or null when the check itself
 * could not be trusted (provider failure, empty reply, unparseable
 * or incomplete verdicts). The caller then falls back to the
 * prompt + structural checks — it never invents questions and never
 * drops the whole draft on a checker failure.
 */
export async function verifyGroqAnswers(
  items: ActivityItem[],
  fetchImpl: typeof fetch,
  config: GroqConfig
): Promise<ActivityItem[] | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GROQ_VERIFY_TIMEOUT_MS)
  try {
    const listed = items
      .map((it, i) => `${i}. Question: ${it.prompt} | Claimed correct answer: ${it.answer}`)
      .join('\n')
    const body: Record<string, unknown> = {
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You are a strict school teacher checking quiz answers. For each numbered item, judge ONLY whether the claimed correct answer actually answers that exact question. ' +
            'A correct answer must directly answer the question — if a teacher read only the question and that answer, they would mark it correct. ' +
            'Mark an item invalid if the answer belongs to a different question, describes a different part or thing, or does not fit the question at all. ' +
            'Return ONLY a JSON object, no markdown, no extra text: {"verdicts": [{"index": 0, "valid": true}]} — one verdict per item, in order.',
        },
        { role: 'user', content: listed },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: GROQ_VERIFY_MAX_COMPLETION_TOKENS,
    }
    if (config.model.startsWith('openai/gpt-oss')) {
      body.reasoning_effort = 'low'
    }
    const res = await fetchImpl(GROQ_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> }
    const content = data.choices?.[0]?.message?.content
    if (typeof content !== 'string' || !content.trim()) return null
    const parsed = extractJson(content) as { verdicts?: unknown } | null
    if (!parsed || !Array.isArray(parsed.verdicts)) return null
    const verdicts = new Map<number, boolean>()
    for (const v of parsed.verdicts as Array<{ index?: unknown; valid?: unknown }>) {
      if (typeof v.index !== 'number' || typeof v.valid !== 'boolean') return null
      if (v.index < 0 || v.index >= items.length || verdicts.has(v.index)) return null
      verdicts.set(v.index, v.valid)
    }
    // Incomplete verdicts are untrustworthy: fall back, do not guess.
    if (verdicts.size !== items.length) return null
    return items.filter((_, i) => verdicts.get(i) === true)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Parse + validate a Groq MISSING-WORD draft: {"sentences": [{"sentence": "Jupiter is the largest planet.", "answer": "Jupiter"}]}.
 * Same strictness as parseGroqQuestions — a sentence must be a plain
 * sentence (never a question, never a blank), on-topic, and
 * deduplicated — but there is no incorrect list: each sentence
 * carries its own missing word. Rules: the answer is ONE single
 * word that occurs in the sentence as a whole word exactly once
 * (the player blanks that word itself), answers deduped (the player
 * borrows other items' answers as tap options). The caller rejects
 * the draft if fewer than 2 survive.
 */
export function parseGroqMissingWordSentences(raw: unknown, prompt: string): ActivityItem[] {
  if (typeof raw !== 'object' || raw === null) return []
  const sentences = (raw as { sentences?: unknown }).sentences
  if (!Array.isArray(sentences)) return []
  const keywords = topicKeywords(prompt)
  const seen = new Set<string>()
  const seenAnswers = new Set<string>()
  const items: ActivityItem[] = []
  for (const s of sentences) {
    const r = s as { sentence?: unknown; answer?: unknown }
    const sentence = asNonEmptyString(r.sentence, 300)
    const answer = asNonEmptyString(r.answer, 40)
    if (!sentence || !answer) continue
    if (sentence.endsWith('?') || sentence.includes('___')) continue
    if (answer.includes('___') || answer.includes('?') || /\s/.test(answer)) continue
    // The missing word must be IN the sentence, as a whole word,
    // exactly once — otherwise the player shows no blank at all.
    if (!containsAnswerWordOnce(sentence, answer)) continue
    const key = sentence.toLowerCase()
    if (seen.has(key) || seenAnswers.has(answer.toLowerCase())) continue
    if (!isOnTopic(sentence, answer, keywords)) continue
    seen.add(key)
    seenAnswers.add(answer.toLowerCase())
    items.push({ prompt: sentence.endsWith('.') ? sentence : `${sentence}.`, answer })
    if (items.length >= 10) break
  }
  return items
}

/**
 * Parse + validate a Groq TRUE/FALSE draft: {"statements": [{"statement": "...", "correct": true|false}]}.
 * Same strictness as parseGroqQuestions — a statement must be a plain
 * sentence (never a question or a blank), on-topic, and deduplicated —
 * but there is no incorrect list: each statement carries its own
 * true/false verdict. The caller rejects the draft if fewer than 2
 * survive, or if all of them are true or all false.
 */
export function parseGroqTrueFalseStatements(raw: unknown, prompt: string): ActivityItem[] {
  if (typeof raw !== 'object' || raw === null) return []
  const statements = (raw as { statements?: unknown }).statements
  if (!Array.isArray(statements)) return []
  const keywords = topicKeywords(prompt)
  const seen = new Set<string>()
  const items: ActivityItem[] = []
  for (const s of statements) {
    const r = s as { statement?: unknown; correct?: unknown }
    const statement = asNonEmptyString(r.statement, 300)
    if (!statement) continue
    if (typeof r.correct !== 'boolean') continue
    if (statement.endsWith('?') || statement.includes('___')) continue
    const key = statement.toLowerCase()
    if (seen.has(key)) continue
    if (!isOnTopic(statement, '', keywords)) continue
    seen.add(key)
    items.push({ prompt: statement, answer: r.correct ? 'True' : 'False' })
    if (items.length >= 10) break
  }
  return items
}

/**
 * Parse + validate a Groq FILL-BLANK draft: {"sentences": [{"sentence": "The capital of France is ___.", "answer": "Paris"}]}.
 * Same strictness as parseGroqQuestions — a sentence must be a plain
 * sentence (never a question), on-topic, and deduplicated — but there
 * is no incorrect list: each sentence carries its own blank and its
 * missing word. Rules: exactly one `___`, answer a single word/short
 * phrase (max 3 words) that does NOT already appear in the sentence,
 * answers deduped (the player borrows other items' answers as tap
 * options). The caller rejects the draft if fewer than 2 survive.
 */
export function parseGroqFillBlankSentences(raw: unknown, prompt: string): ActivityItem[] {
  if (typeof raw !== 'object' || raw === null) return []
  const sentences = (raw as { sentences?: unknown }).sentences
  if (!Array.isArray(sentences)) return []
  const keywords = topicKeywords(prompt)
  const seen = new Set<string>()
  const seenAnswers = new Set<string>()
  const items: ActivityItem[] = []
  for (const s of sentences) {
    const r = s as { sentence?: unknown; answer?: unknown }
    const sentence = asNonEmptyString(r.sentence, 300)
    const answer = asNonEmptyString(r.answer, 40)
    if (!sentence || !answer) continue
    if (sentence.endsWith('?')) continue
    if ((sentence.match(/___/g) ?? []).length !== 1) continue
    if (answer.includes('___') || answer.includes('?')) continue
    if (answer.split(/\s+/).length > 3) continue
    // The answer must fit the blank, not already sit in the sentence.
    if (sentence.toLowerCase().includes(answer.toLowerCase())) continue
    const key = sentence.toLowerCase()
    if (seen.has(key) || seenAnswers.has(answer.toLowerCase())) continue
    if (!isOnTopic(sentence, answer, keywords)) continue
    seen.add(key)
    seenAnswers.add(answer.toLowerCase())
    items.push({ prompt: sentence.endsWith('.') ? sentence : `${sentence}.`, answer })
    if (items.length >= 10) break
  }
  return items
}

/**
 * Parse + validate a Groq HANGMAN draft: {"words": [{"word": "Mars", "hint": "The Red Planet"}]}.
 * Same strictness as parseGroqQuestions — a word must be on-topic
 * and deduplicated — but there is no incorrect list: each word
 * carries its own hint. Rules: the word is ONE single word of
 * letters only (3–12 letters, so the player can guess it), the hint
 * is a real clue that never contains the word as a whole word
 * (otherwise the kid just copies it instead of guessing), answers
 * deduped (two rounds with the same word would be the same round
 * twice). The caller rejects the draft if fewer than 2 survive.
 */
export function parseGroqHangmanWords(raw: unknown, prompt: string): ActivityItem[] {
  if (typeof raw !== 'object' || raw === null) return []
  const words = (raw as { words?: unknown }).words
  if (!Array.isArray(words)) return []
  const keywords = topicKeywords(prompt)
  const seen = new Set<string>()
  const seenAnswers = new Set<string>()
  const items: ActivityItem[] = []
  for (const w of words) {
    const r = w as { word?: unknown; hint?: unknown }
    const word = asNonEmptyString(r.word, 12)
    const hint = asNonEmptyString(r.hint, 300)
    if (!word || !hint) continue
    if (!/^[A-Za-z]{3,12}$/.test(word)) continue
    if (clueContainsAnswer(hint, word)) continue
    const key = hint.toLowerCase()
    if (seen.has(key) || seenAnswers.has(word.toLowerCase())) continue
    if (!isOnTopic(hint, word, keywords)) continue
    seen.add(key)
    seenAnswers.add(word.toLowerCase())
    items.push({ prompt: hint, answer: word })
    if (items.length >= 10) break
  }
  return items
}

/**
 * Parse + validate a Groq WORD SEARCH draft: {"words": [{"word": "Mars", "hint": "The Red Planet"}]}.
 * Same strictness as parseGroqHangmanWords — a word must be on-topic
 * and deduplicated — but the length rule is 2–12 letters, not 3–12:
 * the Word Search player places each word in a 12×12 grid, so a
 * longer word cannot fit, while a 2-letter word still can. The hint
 * is a real clue that never contains the word as a whole word (the
 * player shows the hint as the label for the word to find, so
 * naming the word there would give the hunt away). The caller
 * rejects the draft if fewer than 2 survive.
 */
export function parseGroqWordSearchWords(raw: unknown, prompt: string): ActivityItem[] {
  if (typeof raw !== 'object' || raw === null) return []
  const words = (raw as { words?: unknown }).words
  if (!Array.isArray(words)) return []
  const keywords = topicKeywords(prompt)
  const seen = new Set<string>()
  const seenAnswers = new Set<string>()
  const items: ActivityItem[] = []
  for (const w of words) {
    const r = w as { word?: unknown; hint?: unknown }
    const word = asNonEmptyString(r.word, 12)
    const hint = asNonEmptyString(r.hint, 300)
    if (!word || !hint) continue
    if (!/^[A-Za-z]{2,12}$/.test(word)) continue
    if (clueContainsAnswer(hint, word)) continue
    const key = hint.toLowerCase()
    if (seen.has(key) || seenAnswers.has(word.toLowerCase())) continue
    if (!isOnTopic(hint, word, keywords)) continue
    seen.add(key)
    seenAnswers.add(word.toLowerCase())
    items.push({ prompt: hint, answer: word })
    if (items.length >= 10) break
  }
  return items
}

/**
 * Parse + validate a Groq CATEGORIZE draft: {"categories": [{"name": "Farm Animals", "items": ["Dog", "Cow", "Pig"]}]}.
 * Same strictness as parseGroqQuestions — an item must be on-topic
 * (the shared topic filter: the item label OR its category name
 * must mention a topic keyword — so a category name that carries
 * the topic word, e.g. "Farm Animals" for an animals prompt, keeps
 * its items) and deduplicated — but the shape is grouped, not flat:
 * each category carries its own items. Rules: category name and
 * item label each a short word or short phrase (max 40 chars, so
 * they fit on a basket rim / ball), an item never repeats its own
 * category, an item in two categories is kept only under the first
 * (the same ball cannot belong in two baskets), a category keeps
 * at most 4 items, at most 4 categories are kept, and the draft is
 * capped at 12 items. A category with fewer than 2 surviving items
 * is dropped whole, and fewer than 2 surviving categories yields
 * an empty result — the caller rejects the draft, never a
 * one-basket or one-item-per-basket game.
 */
export function parseGroqCategorizeGroups(raw: unknown, prompt: string): ActivityItem[] {
  if (typeof raw !== 'object' || raw === null) return []
  const categories = (raw as { categories?: unknown }).categories
  if (!Array.isArray(categories)) return []
  const keywords = topicKeywords(prompt)
  const seenItems = new Set<string>()
  const items: ActivityItem[] = []
  let keptCategories = 0
  for (const c of categories) {
    const r = c as { name?: unknown; items?: unknown }
    const name = asNonEmptyString(r.name, 40)
    if (!name) continue
    if (!Array.isArray(r.items)) continue
    const kept: string[] = []
    for (const it of r.items) {
      const label = asNonEmptyString(it, 40)
      if (!label) continue
      if (label.toLowerCase() === name.toLowerCase()) continue
      const key = label.toLowerCase()
      if (seenItems.has(key)) continue
      if (!isOnTopic(label, name, keywords)) continue
      seenItems.add(key)
      kept.push(label)
      if (kept.length >= 4) break
    }
    // A one-item basket has nothing to sort — drop the category.
    if (kept.length < 2) continue
    keptCategories++
    for (const label of kept) {
      items.push({ prompt: label, answer: name })
      if (items.length >= 12) break
    }
    if (items.length >= 12) break
    if (keptCategories >= 4) break
  }
  if (keptCategories < 2) return []
  return items
}

/**
 * Parse + validate a Groq CROSSWORD draft: {"words": [{"word": "Mars", "clue": "The Red Planet"}]}.
 * Same strictness as parseGroqHangmanWords — a word must be on-topic
 * and deduplicated — but the clue is a crossword clue: it must
 * describe the word without naming it (otherwise the kid just
 * copies it from the clue list instead of solving). Rules: the word
 * is ONE single word of letters only (3–12 letters, so it fits the
 * 13-wide grid), the clue never contains the word as a whole word,
 * answers deduped. The caller rejects the draft if fewer than 2
 * survive — and the route then checks the survivors actually
 * interlock into a grid, so this parser alone never promises one.
 */
export function parseGroqCrosswordWords(raw: unknown, prompt: string): ActivityItem[] {
  if (typeof raw !== 'object' || raw === null) return []
  const words = (raw as { words?: unknown }).words
  if (!Array.isArray(words)) return []
  const keywords = topicKeywords(prompt)
  const seen = new Set<string>()
  const seenAnswers = new Set<string>()
  const items: ActivityItem[] = []
  for (const w of words) {
    const r = w as { word?: unknown; clue?: unknown }
    const word = asNonEmptyString(r.word, 12)
    const clue = asNonEmptyString(r.clue, 300)
    if (!word || !clue) continue
    if (!/^[A-Za-z]{3,12}$/.test(word)) continue
    if (clueContainsAnswer(clue, word)) continue
    const key = clue.toLowerCase()
    if (seen.has(key) || seenAnswers.has(word.toLowerCase())) continue
    if (!isOnTopic(clue, word, keywords)) continue
    seen.add(key)
    seenAnswers.add(word.toLowerCase())
    items.push({ prompt: clue, answer: word })
    if (items.length >= 10) break
  }
  return items
}

/**
 * One Groq call for a topic-specific draft. `fetchImpl` exists only so
 * tests can inject a mock — the route always passes the real fetch.
 * Never throws for a provider failure: it returns a distinct result
 * the route can turn into an honest error.
 *
 * WORLDWIDE CURRICULUM v1 (2026-11-04): `syllabusContext` is an
 * optional, server-validated syllabus NAME (never a client string —
 * the route resolves it from src/lib/curricula.ts). It is CONTEXT
 * ONLY for question style: Groq cannot fetch a syllabus, verify
 * alignment, or reproduce official material, and the system prompt
 * says so. The game still carries the mandatory "Not official …
 * material" label, and the teacher still checks every question.
 *
 * TRUE/FALSE (2026-11-07): `gameType` is an optional 'true-false'
 * flag, defaulting to the quiz path — every other caller is
 * untouched. With it, Groq is asked for plain true/false statements
 * instead of Q&A, so statements are written as statements (no
 * lossy question-to-statement conversion), and the question-framed
 * answer-consistency self-check is skipped: it judges whether an
 * answer answers a question, which does not apply to statements.
 *
 * FILL-BLANK (2026-11-07): `gameType` may also be 'fill-blank' —
 * same pattern as true-false. Groq is asked for sentences with
 * exactly one `___` plus the missing word, parsed by
 * parseGroqFillBlankSentences, and the question-framed self-check
 * is skipped for the same reason: there is no question to check an
 * answer against.
 *
 * MISSING-WORD (2026-11-07): `gameType` may also be 'missing-word' —
 * same pattern again. Groq is asked for plain sentences plus the
 * one word in each sentence that is the missing word, parsed by
 * parseGroqMissingWordSentences (the word must occur in its sentence
 * as a whole word exactly once), and the question-framed self-check
 * is skipped for the same reason.
 *
 * HANGMAN (2026-11-07): `gameType` may also be 'hangman' — same
 * pattern again. Groq is asked for single words plus a hint for
 * each, parsed by parseGroqHangmanWords (the word is letters only,
 * 3–12 letters; the hint never contains the word), and the
 * question-framed self-check is skipped for the same reason.
 *
 * WORD SEARCH (2026-11-08): `gameType` may also be 'wordsearch' —
 * same pattern again. Groq is asked for single words plus a hint
 * for each, parsed by parseGroqWordSearchWords (the word is letters
 * only, 2–12 letters, so it fits the player's 12×12 grid; the hint
 * never contains the word), and the question-framed self-check is
 * skipped for the same reason.
 * CATEGORIZE (2026-11-08): `gameType` may also be 'categorize' —
 * same pattern again, but the Groq call is CATEGORY-AWARE: Groq is
 * asked for named groups ({"categories": [{"name": "...", "items":
 * ["...", ...]}]}) instead of flat questions, parsed by
 * parseGroqCategorizeGroups (3–4 categories, each 3–4 items, capped
 * at 12; a category keeps only items that pass the shared on-topic
 * filter — the item label or its category name must mention a topic
 * keyword — and categories with fewer than 2 surviving items are
 * dropped whole). The question-framed self-check is skipped for
 * the same reason: there is no question to check an answer against.
 * The draft items match the Categorize player exactly: prompt =
 * the item label (the ball), answer = the category name (the
 * basket). Category names are asked to carry the topic word, so
 * the on-topic filter keeps the items.
 *
 * CROSSWORD (2026-11-08): `gameType` may also be 'crossword' — same
 * pattern again. Groq is asked for single words plus a clue for
 * each, parsed by parseGroqCrosswordWords (the word is letters only,
 * 3–12 letters; the clue never contains the word), and the
 * question-framed self-check is skipped for the same reason. The
 * system prompt also asks for words that share letters with each
 * other, so they can cross in a grid — the route still verifies the
 * grid placement itself, so a flat list is an error, never a draft.
 */
export async function buildGroqDraft(
  prompt: string,
  fetchImpl: typeof fetch = fetch,
  syllabusContext?: string,
  gameType?: 'true-false' | 'fill-blank' | 'missing-word' | 'hangman' | 'wordsearch' | 'categorize' | 'crossword'
): Promise<GroqDraftResult> {
  const config = getGroqConfig()
  if (!config) {
    return { ok: false, status: 503, error: 'GROQ_NOT_CONFIGURED' }
  }
  const wantTrueFalse = gameType === 'true-false'
  const wantFillBlank = gameType === 'fill-blank'
  const wantMissingWord = gameType === 'missing-word'
  const wantHangman = gameType === 'hangman'
  const wantWordSearch = gameType === 'wordsearch'
  const wantCategorize = gameType === 'categorize'
  const wantCrossword = gameType === 'crossword'
  // TOPIC-WORD RULE (owner case 2026-11-09): the shared on-topic
  // filter drops any item that never mentions a topic word — so a
  // reply of good questions that never say the topic word fails the
  // whole draft (the animals prompt passed on retry only because
  // that reply happened to say "animal"). The rule goes into the
  // user message, so the model writes the topic word into every
  // item it returns.
  const keywords = topicKeywords(prompt)
  const topicRule = keywords.length > 0
    ? `\n\nRULE: every item you return must mention at least one of these topic words: ${keywords.join(', ')}. An item that never mentions the topic word will be rejected, so write the topic word into each question, statement, sentence, hint, or category name.`
    : ''
  try {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: [
        {
          role: 'system',
          content: wantWordSearch
            ? 'You write single words with hints ONLY about the exact topic in the user prompt, at the school level the prompt implies. ' +
              'Return ONLY a JSON object, no markdown, no extra text: {"words": [{"word": "Mars", "hint": "The Red Planet"}]}. ' +
              'Up to 10 words. Each word must be ONE single word of letters only, 2 to 12 letters long — never a phrase, never a number, never a word with a hyphen or an apostrophe, and never longer than 12 letters, or it cannot fit the 12×12 letter grid it will be hidden in. ' +
              'The hint must describe the word without naming it: it must never contain the word itself, or the player would not have to hunt for it. ' +
              'Every word must be a word you are sure belongs to that topic — never invent facts; leave a word out instead. ' +
              'Do not repeat the same word twice.' +
              (syllabusContext
                ? ` Write the words and hints in the style typical for ${syllabusContext} topics, at the level the prompt implies. ` +
                  'This is style context only: you cannot fetch, verify, or reproduce that syllabus, and you must never claim a word is official syllabus material.'
                : '')
            : wantCategorize
            ? 'You sort items into groups ONLY about the exact topic in the user prompt, at the school level the prompt implies. ' +
              'Return ONLY a JSON object, no markdown, no extra text: {"categories": [{"name": "Farm Animals", "items": ["Dog", "Cow", "Pig"]}]}. ' +
              'Give 3 or 4 categories, each with 3 or 4 items. Every item belongs in exactly ONE category — never put the same item in two categories. ' +
              'Name each category so it mentions the topic word from the prompt (for example, for a prompt about animals, name them "Farm Animals", "Wild Animals", "Sea Animals" — never bare names like "Farm", "Wild", "Sea"), because an item is only kept when its item or its category mentions the topic. ' +
              'Each item must be a short word or short phrase (a few words at most) that a child can sort at a glance — never a sentence, never a question. ' +
              'Every item must be one you are sure belongs in its category — never invent facts; leave an item out instead. ' +
              'Do not repeat the same item twice.' +
              (syllabusContext
                ? ` Write the category names and items in the style typical for ${syllabusContext} topics, at the level the prompt implies. ` +
                  'This is style context only: you cannot fetch, verify, or reproduce that syllabus, and you must never claim a category is official syllabus material.'
                : '')
            : wantCrossword
            ? 'You write single words with crossword clues ONLY about the exact topic in the user prompt, at the school level the prompt implies. ' +
              'Return ONLY a JSON object, no markdown, no extra text: {"words": [{"word": "Mars", "clue": "The Red Planet"}]}. ' +
              'Up to 10 words. Each word must be ONE single word of letters only, 3 to 12 letters long — never a phrase, never a number, never a word with a hyphen or an apostrophe. ' +
              'The clue must describe the word without naming it: it must never contain the word itself, or the player would not have to solve anything. ' +
              'Each clue should name the topic it belongs to, so the clue is clearly about that topic and nothing else. ' +
              'Pick words that share letters with each other, so they can cross in a crossword grid — words with no letter in common cannot cross. ' +
              'Every word must be a word you are sure belongs to that topic — never invent facts; leave a word out instead. ' +
              'Do not repeat the same word twice.' +
              (syllabusContext
                ? ` Write the words and clues in the style typical for ${syllabusContext} topics, at the level the prompt implies. ` +
                  'This is style context only: you cannot fetch, verify, or reproduce that syllabus, and you must never claim a word is official syllabus material.'
                : '')
            : wantHangman
            ? 'You write single words with hints ONLY about the exact topic in the user prompt, at the school level the prompt implies. ' +
              'Return ONLY a JSON object, no markdown, no extra text: {"words": [{"word": "Mars", "hint": "The Red Planet"}]}. ' +
              'Up to 10 words. Each word must be ONE single word of letters only, 3 to 12 letters long — never a phrase, never a number, never a word with a hyphen or an apostrophe. ' +
              'The hint must describe the word without naming it: it must never contain the word itself, or the player would not have to guess. ' +
              'Every word must be a word you are sure belongs to that topic — never invent facts; leave a word out instead. ' +
              'Do not repeat the same word twice.' +
              (syllabusContext
                ? ` Write the words and hints in the style typical for ${syllabusContext} topics, at the level the prompt implies. ` +
                  'This is style context only: you cannot fetch, verify, or reproduce that syllabus, and you must never claim a word is official syllabus material.'
                : '')
            : wantMissingWord
            ? 'You write short sentences ONLY about the exact topic in the user prompt, at the school level the prompt implies. ' +
              'Return ONLY a JSON object, no markdown, no extra text: {"sentences": [{"sentence": "Jupiter is the largest planet.", "answer": "Jupiter"}]}. ' +
              'Up to 10 sentences. Each sentence must be ONE clear fact about that topic, written as a plain sentence — never a question, never a blank. ' +
              'The answer must be ONE single word that appears in the sentence as a whole word, exactly once — that word is the missing word the player will guess. ' +
              'Every sentence must state a fact you are sure of — never invent dates, statistics, names, or facts you are unsure of; leave such a sentence out instead. ' +
              'Do not repeat the same fact or the same answer twice.' +
              (syllabusContext
                ? ` Write the sentences in the style typical for ${syllabusContext} topics, at the level the prompt implies. ` +
                  'This is style context only: you cannot fetch, verify, or reproduce that syllabus, and you must never claim a sentence is official syllabus material.'
                : '')
            : wantFillBlank
            ? 'You write short fill-in-the-blank sentences ONLY about the exact topic in the user prompt, at the school level the prompt implies. ' +
              'Return ONLY a JSON object, no markdown, no extra text: {"sentences": [{"sentence": "The capital of France is ___.", "answer": "Paris"}]}. ' +
              'Up to 10 sentences. Each sentence must be ONE clear fact about that topic, with exactly ONE blank written as ___ where a single word or short phrase belongs — never a question, never two blanks. ' +
              'The answer must be the single word or short phrase that fills the blank, and the sentence must read naturally with the blank filled in. ' +
              'Every sentence must state a fact you are sure of — never invent dates, statistics, names, or facts you are unsure of; leave such a sentence out instead. ' +
              'Do not repeat the same fact or the same answer twice.' +
              (syllabusContext
                ? ` Write the sentences in the style typical for ${syllabusContext} topics, at the level the prompt implies. ` +
                  'This is style context only: you cannot fetch, verify, or reproduce that syllabus, and you must never claim a sentence is official syllabus material.'
                : '')
            : wantTrueFalse
            ? 'You write short true-or-false statements ONLY about the exact topic in the user prompt, at the school level the prompt implies. ' +
              'Return ONLY a JSON object, no markdown, no extra text: {"statements": [{"statement": "...", "correct": true}]}. ' +
              'Up to 10 statements. Mix true and false statements — about half of each. ' +
              'Each statement must be ONE clear fact about that topic, written as a plain sentence a young child can judge true or false — never a question, never a fill-in-the-blank. ' +
              'Every TRUE statement must be a fact you are sure of; every FALSE statement must be clearly wrong but believable, changing only one fact (a number, a name, or a place) from a true fact about the same topic. ' +
              'Never invent dates, statistics, names, or facts you are unsure of — leave such a statement out instead. ' +
              'Do not repeat the same fact twice.' +
              (syllabusContext
                ? ` Write the statements in the style typical for ${syllabusContext} topics, at the level the prompt implies. ` +
                  'This is style context only: you cannot fetch, verify, or reproduce that syllabus, and you must never claim a statement is official syllabus material.'
                : '')
            : 'You write short school quiz questions ONLY about the exact topic in the user prompt, at the school level the prompt implies. ' +
            'Return ONLY a JSON object, no markdown, no extra text: {"questions": [{"question": "...", "correct": "...", "incorrect": ["...", "...", "..."]}]}. ' +
            'Up to 10 questions. Each question must be about that topic and nothing else. ' +
            'CRITICAL — the correct answer must DIRECTLY answer its own question. Before returning each question, read it back and check: if a teacher read only the question and this answer, would they mark it correct? ' +
            'For example, a question asking which part produces flowers must be answered with the flower-producing part, never with a part that does something else; ' +
            'a question asking which part is usually green must be answered with the green part, never with a part that grows underground. ' +
            'If you cannot give the direct answer with confidence, leave that question out instead of guessing. ' +
            'Never invent dates, statistics, names, or facts you are unsure of — leave such a question out instead. ' +
            'Wrong answers must be plausible but clearly wrong, of the same kind as the correct answer, and different from it. ' +
            'Do not repeat the same correct answer for questions that ask different things.' +
            (syllabusContext
              ? ` Write the questions in the style typical for ${syllabusContext} topics, at the level the prompt implies. ` +
                'This is style context only: you cannot fetch, verify, or reproduce that syllabus, and you must never claim a question is official syllabus material.'
              : ''),
        },
        { role: 'user', content: `${prompt}${topicRule}` },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: GROQ_MAX_COMPLETION_TOKENS,
    }
    // gpt-oss spends part of the completion budget on reasoning; "low"
    // keeps the budget for the actual JSON answer. Only sent for
    // gpt-oss models, which are the only ones known to accept it.
    if (config.model.startsWith('openai/gpt-oss')) {
      body.reasoning_effort = 'low'
    }
    // FLAKY-DRAFT RETRY (owner case 2026-11-09): Groq's reply varies
    // run to run — the same animals prompt failed once and passed on
    // retry — so a reply that parses to too few usable items gets ONE
    // fresh attempt before the error is shown. Provider errors below
    // (rate limit, bad key, bad model, empty, unreadable) return
    // immediately and are never retried.
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS)
      try {
        const res = await fetchImpl(GROQ_API_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(body),
        })
        if (res.status === 429) {
          return { ok: false, status: 502, error: 'Groq is rate-limited right now. Try again in a moment — no questions were invented.' }
        }
        if (res.status === 401 || res.status === 403) {
          return { ok: false, status: 502, error: 'Groq did not accept the API key. Check the key in Vercel — no questions were invented.' }
        }
        if (res.status === 404) {
          return { ok: false, status: 502, error: `Groq model ${config.model} is not available. Check GROQ_MODEL in Vercel — no questions were invented.` }
        }
        if (!res.ok) {
          return { ok: false, status: 502, error: 'Groq did not answer. Try again in a moment — no questions were invented.' }
        }
        const data = (await res.json()) as { choices?: Array<{ message?: { content?: unknown } }> }
        const content = data.choices?.[0]?.message?.content
        if (typeof content !== 'string' || !content.trim()) {
          return { ok: false, status: 502, error: 'Groq returned an empty draft. Try again — no questions were invented.' }
        }
        const parsed = extractJson(content)
        if (parsed === null) {
          return { ok: false, status: 502, error: 'Groq returned a draft that could not be read. Try again — no questions were invented.' }
        }
        // One shared tail for every game type: parse, then the
        // answer-consistency self-check on the quiz path only, then a
        // single enough/not-enough decision. Previously each type had
        // its own early error return, so a thin first reply could
        // never be retried.
        let parsedItems: ActivityItem[] = []
        let tooFewError = ''
        if (wantWordSearch) {
          parsedItems = parseGroqWordSearchWords(parsed, prompt)
          tooFewError = 'Groq returned a draft that did not pass the topic and answer checks. Try again — no off-topic words, phrases, words too long for the grid, or hints that give the word away were kept.'
        } else if (wantCategorize) {
          parsedItems = parseGroqCategorizeGroups(parsed, prompt)
          tooFewError = 'Groq returned a draft that did not pass the topic and answer checks. Try again — no off-topic items, one-item groups, or items that belong in two groups were kept.'
        } else if (wantCrossword) {
          parsedItems = parseGroqCrosswordWords(parsed, prompt)
          tooFewError = 'Groq returned a draft that did not pass the topic and answer checks. Try again — no off-topic words, phrases, or clues that give the word away were kept.'
        } else if (wantHangman) {
          parsedItems = parseGroqHangmanWords(parsed, prompt)
          tooFewError = 'Groq returned a draft that did not pass the topic and answer checks. Try again — no off-topic words, phrases, or hints that give the word away were kept.'
        } else if (wantMissingWord) {
          parsedItems = parseGroqMissingWordSentences(parsed, prompt)
          tooFewError = 'Groq returned a draft that did not pass the topic and answer checks. Try again — no off-topic or unclear missing-word sentences were kept.'
        } else if (wantFillBlank) {
          parsedItems = parseGroqFillBlankSentences(parsed, prompt)
          tooFewError = 'Groq returned a draft that did not pass the topic and answer checks. Try again — no off-topic or unclear fill-in-the-blank sentences were kept.'
        } else if (wantTrueFalse) {
          parsedItems = parseGroqTrueFalseStatements(parsed, prompt)
          tooFewError = 'Groq returned a draft that did not pass the topic and answer checks. Try again — no off-topic or one-sided statements were kept.'
        } else {
          parsedItems = parseGroqQuestions(parsed, prompt)
          tooFewError = 'Groq returned a draft that did not pass the topic and answer checks. Try again — no off-topic or mismatched questions were kept.'
        }
        // Quiz path only: answer-consistency self-check (see
        // verifyGroqAnswers). A failed or incomplete check falls back
        // to the parsed items — it never invents questions and never
        // drops the draft on its own failure.
        if (!wantWordSearch && !wantCategorize && !wantCrossword && !wantHangman && !wantMissingWord && !wantFillBlank && !wantTrueFalse) {
          const verified = parsedItems.length > 0
            ? await verifyGroqAnswers(parsedItems, fetchImpl, config)
            : null
          parsedItems = verified ?? parsedItems
        }
        const enough = wantCategorize
          ? parsedItems.length >= 4
          : wantTrueFalse
            ? parsedItems.length >= 2 &&
              parsedItems.some((i) => i.answer === 'True') &&
              parsedItems.some((i) => i.answer === 'False')
            : parsedItems.length >= 2
        if (enough) return { ok: true, model: config.model, items: parsedItems }
        if (attempt === 0) continue
        return { ok: false, status: 502, error: tooFewError }
      } finally {
        clearTimeout(timer)
      }
    }
    // Unreachable: every path inside the loop returns.
    return { ok: false, status: 502, error: 'Groq did not answer. Try again in a moment — no questions were invented.' }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, status: 502, error: 'Groq took too long to answer. Try again in a moment — no questions were invented.' }
    }
    return { ok: false, status: 502, error: 'Groq did not answer. Try again in a moment — no questions were invented.' }
  }
}
