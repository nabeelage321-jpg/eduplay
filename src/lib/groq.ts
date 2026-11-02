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

export const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-20b'
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
/** Completion-token ceiling per draft (gpt-oss max is 65,536). */
export const GROQ_MAX_COMPLETION_TOKENS = 2500
export const GROQ_TIMEOUT_MS = 20000

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
 * One Groq call for a topic-specific draft. `fetchImpl` exists only so
 * tests can inject a mock — the route always passes the real fetch.
 * Never throws for a provider failure: it returns a distinct result
 * the route can turn into an honest error.
 */
export async function buildGroqDraft(
  prompt: string,
  fetchImpl: typeof fetch = fetch
): Promise<GroqDraftResult> {
  const config = getGroqConfig()
  if (!config) {
    return { ok: false, status: 503, error: 'GROQ_NOT_CONFIGURED' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS)
  try {
    const body: Record<string, unknown> = {
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'You write short school quiz questions ONLY about the exact topic in the user prompt, at the school level the prompt implies. ' +
            'Return ONLY a JSON object, no markdown, no extra text: {"questions": [{"question": "...", "correct": "...", "incorrect": ["...", "...", "..."]}]}. ' +
            'Up to 10 questions. Each question must be about that topic and nothing else. ' +
            'Never invent dates, statistics, names, or facts you are unsure of — leave such a question out instead. ' +
            'Wrong answers must be plausible but clearly wrong, and different from the correct answer.',
        },
        { role: 'user', content: prompt },
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
    const items = parseGroqQuestions(parsed, prompt)
    if (items.length < 2) {
      return { ok: false, status: 502, error: 'Groq returned a draft that did not pass the topic checks. Try again — no off-topic questions were kept.' }
    }
    return { ok: true, model: config.model, items }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, status: 502, error: 'Groq took too long to answer. Try again in a moment — no questions were invented.' }
    }
    return { ok: false, status: 502, error: 'Groq did not answer. Try again in a moment — no questions were invented.' }
  } finally {
    clearTimeout(timer)
  }
}
