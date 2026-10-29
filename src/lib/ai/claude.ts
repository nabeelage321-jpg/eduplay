/**
 * Claude API typed wrapper for EduPlay AI layer (Phase 4)
 * All calls server-side only — ANTHROPIC_API_KEY never exposed to client
 */

import type { ActivityItem, QuizQuestion } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const FREE_MODEL = 'claude-haiku-4-5'
const PREMIUM_MODEL = 'claude-sonnet-4-6'
const MAX_RETRIES = 3
const TIMEOUT_MS = 30_000

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateActivityParams {
  topic: string
  type: string
  count: number
  locale: string
  grade: string
  curriculum?: string
  isPremium?: boolean
  difficulty?: 'easy' | 'medium' | 'hard'
}

export interface GenerateQuestionsParams {
  topic: string
  count: number
  difficulty: 'easy' | 'medium' | 'hard'
  locale: string
  isPremium?: boolean
}

export interface GenerateHintsParams {
  items: ActivityItem[]
  locale: string
  isPremium?: boolean
}

export interface LessonRecapParams {
  sessionId: string
  results: SessionResult[]
  locale: string
  isPremium?: boolean
}

export interface ParentReportParams {
  studentId: string
  weekResults: WeekResult[]
  locale: string
  isPremium?: boolean
}

export interface ModerationResult {
  safe: boolean
  reason?: string
}

export interface SessionResult {
  questionId: string
  correct: boolean
  timeMs: number
  topic: string
}

export interface WeekResult {
  date: string
  activityTitle: string
  score: number
  totalQuestions: number
  subject: string
}

export interface CostRecord {
  model: string
  inputTokens: number
  outputTokens: number
  estimatedUsdCost: number
  timestamp: string
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicRequest {
  model: string
  max_tokens: number
  system?: string | SystemBlock[]
  messages: AnthropicMessage[]
}

interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

interface AnthropicResponse {
  id: string
  content: Array<{ type: string; text: string }>
  usage: { input_tokens: number; output_tokens: number }
  model: string
}

// Cost per 1M tokens (USD) — as of 2025
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5': { input: 0.8, output: 4.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
}

// ─── Core API call ────────────────────────────────────────────────────────────

async function callClaude(
  request: AnthropicRequest,
  attempt = 1
): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      if (response.status === 529 || response.status === 503) {
        // Overloaded — retry
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000
          await new Promise((r) => setTimeout(r, delay))
          return callClaude(request, attempt + 1)
        }
      }
      throw new Error(`Anthropic API error ${response.status}: ${errorBody}`)
    }

    return response.json() as Promise<AnthropicResponse>
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      if (attempt < MAX_RETRIES) {
        return callClaude(request, attempt + 1)
      }
      throw new Error('Claude API timeout after 3 attempts')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

function extractText(response: AnthropicResponse): string {
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

function parseJson<T>(raw: string): T {
  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(cleaned) as T
}

function calcCost(model: string, inputTokens: number, outputTokens: number): CostRecord {
  const rates = TOKEN_COSTS[model] ?? { input: 3.0, output: 15.0 }
  return {
    model,
    inputTokens,
    outputTokens,
    estimatedUsdCost:
      (inputTokens / 1_000_000) * rates.input +
      (outputTokens / 1_000_000) * rates.output,
    timestamp: new Date().toISOString(),
  }
}

function chooseModel(isPremium = false): string {
  return isPremium ? PREMIUM_MODEL : FREE_MODEL
}

// ─── generateActivity ─────────────────────────────────────────────────────────

export async function generateActivity(
  params: GenerateActivityParams
): Promise<{ items: ActivityItem[]; cost: CostRecord }> {
  const { topic, type, count, locale, grade, curriculum, isPremium, difficulty = 'medium' } = params
  const model = chooseModel(isPremium)

  const systemBlocks: SystemBlock[] = [
    {
      type: 'text',
      text: buildActivitySystemPrompt(locale),
      cache_control: { type: 'ephemeral' },
    },
  ]

  const userPrompt = buildActivityUserPrompt({ topic, type, count, locale, grade, curriculum, difficulty })

  const response = await callClaude({
    model,
    max_tokens: 2000,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = extractText(response)
  const parsed = parseJson<{ items: ActivityItem[] }>(raw)

  // Validate & sanitize
  const items = (parsed.items ?? []).slice(0, count).map(sanitizeActivityItem)

  return {
    items,
    cost: calcCost(model, response.usage.input_tokens, response.usage.output_tokens),
  }
}

// ─── generateQuestions ────────────────────────────────────────────────────────

export async function generateQuestions(
  params: GenerateQuestionsParams
): Promise<{ questions: QuizQuestion[]; cost: CostRecord }> {
  const { topic, count, difficulty, locale, isPremium } = params
  const model = chooseModel(isPremium)

  const systemBlocks: SystemBlock[] = [
    {
      type: 'text',
      text: buildQuestionsSystemPrompt(locale),
      cache_control: { type: 'ephemeral' },
    },
  ]

  const userPrompt = buildQuestionsUserPrompt({ topic, count, difficulty, locale })

  const response = await callClaude({
    model,
    max_tokens: 2000,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = extractText(response)
  const parsed = parseJson<{ questions: QuizQuestion[] }>(raw)
  const questions = (parsed.questions ?? []).slice(0, count).map(sanitizeQuizQuestion)

  return {
    questions,
    cost: calcCost(model, response.usage.input_tokens, response.usage.output_tokens),
  }
}

// ─── generateHints ────────────────────────────────────────────────────────────

export async function generateHints(
  params: GenerateHintsParams
): Promise<{ hints: string[]; cost: CostRecord }> {
  const { items, locale, isPremium } = params
  const model = chooseModel(isPremium)

  const systemPrompt = `You are an educational assistant. Return ONLY valid JSON: {"hints": ["hint1","hint2",...]}. 
Language: ${locale}. Keep hints child-safe, helpful, and concise.`

  const userPrompt = `Generate one hint per item. Items:\n${JSON.stringify(
    items.map((i) => ({ prompt: i.prompt, answer: i.answer }))
  )}`

  const response = await callClaude({
    model,
    max_tokens: 1000,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = extractText(response)
  const parsed = parseJson<{ hints: string[] }>(raw)

  return {
    hints: (parsed.hints ?? []).map((h) => h.trim()),
    cost: calcCost(model, response.usage.input_tokens, response.usage.output_tokens),
  }
}

// ─── generateLessonRecap ──────────────────────────────────────────────────────

export async function generateLessonRecap(
  params: LessonRecapParams
): Promise<{ recap: string; cost: CostRecord }> {
  const { sessionId, results, locale, isPremium } = params
  const model = chooseModel(isPremium)

  const correct = results.filter((r) => r.correct).length
  const total = results.length
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const avgTimeMs = total > 0 ? results.reduce((s, r) => s + r.timeMs, 0) / total : 0

  const systemPrompt = `You are an encouraging educational assistant writing a lesson recap for students. 
Write in ${locale}. Be positive, specific, and age-appropriate. Return ONLY valid JSON: {"recap": "...text..."}`

  const userPrompt = `Session ${sessionId}: ${correct}/${total} correct (${accuracy}% accuracy). 
Avg time per question: ${Math.round(avgTimeMs / 1000)}s. 
Topics: ${[...new Set(results.map((r) => r.topic))].join(', ')}.
Write a 2-3 sentence encouraging recap.`

  const response = await callClaude({
    model,
    max_tokens: 300,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = extractText(response)
  const parsed = parseJson<{ recap: string }>(raw)

  return {
    recap: (parsed.recap ?? '').trim(),
    cost: calcCost(model, response.usage.input_tokens, response.usage.output_tokens),
  }
}

// ─── generateParentReport ─────────────────────────────────────────────────────

export async function generateParentReport(
  params: ParentReportParams
): Promise<{ report: string; cost: CostRecord }> {
  const { studentId, weekResults, locale, isPremium } = params
  const model = chooseModel(isPremium)

  const systemPrompt = `You are an educational assistant writing weekly parent reports. 
Write in ${locale}. Be professional yet warm. Return ONLY valid JSON: {"report": "...text..."}`

  const avgScore =
    weekResults.length > 0
      ? weekResults.reduce((s, r) => s + (r.score / r.totalQuestions) * 100, 0) /
        weekResults.length
      : 0

  const userPrompt = `Student ${studentId} weekly report. Activities completed: ${weekResults.length}. 
Average score: ${Math.round(avgScore)}%. 
Subjects covered: ${[...new Set(weekResults.map((r) => r.subject))].join(', ')}.
Activities: ${weekResults.map((r) => r.activityTitle).join(', ')}.
Write a 3-4 sentence parent report.`

  const response = await callClaude({
    model,
    max_tokens: 400,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const raw = extractText(response)
  const parsed = parseJson<{ report: string }>(raw)

  return {
    report: (parsed.report ?? '').trim(),
    cost: calcCost(model, response.usage.input_tokens, response.usage.output_tokens),
  }
}

// ─── moderateContent ──────────────────────────────────────────────────────────

export async function moderateContent(text: string): Promise<ModerationResult> {
  const model = FREE_MODEL // always use cheap model for moderation

  const systemPrompt = `You are a content moderation system for a children's educational platform.
Return ONLY valid JSON: {"safe": true} or {"safe": false, "reason": "brief reason"}.
Flag: violence, sexual content, hate speech, adult themes, personal information, profanity.
Allow: educational content, mild competition, historical facts appropriate for school.`

  const response = await callClaude({
    model,
    max_tokens: 100,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Moderate this content: "${text.slice(0, 2000)}"` }],
  })

  const raw = extractText(response)
  try {
    return parseJson<ModerationResult>(raw)
  } catch {
    return { safe: false, reason: 'Could not parse moderation response' }
  }
}

// ─── Sanitizers ───────────────────────────────────────────────────────────────

function sanitizeActivityItem(item: Partial<ActivityItem>): ActivityItem {
  return {
    prompt: String(item.prompt ?? '').trim().slice(0, 500),
    answer: String(item.answer ?? '').trim().slice(0, 200),
    imageUrl: item.imageUrl ?? undefined,
    hint: item.hint ? String(item.hint).trim().slice(0, 200) : undefined,
  }
}

function sanitizeQuizQuestion(q: Partial<QuizQuestion>): QuizQuestion {
  return {
    id: String(Math.random()),
    question: String(q.question ?? '').trim().slice(0, 500),
    options: Array.isArray(q.options)
      ? q.options.slice(0, 4).map((o) => String(o).trim().slice(0, 200))
      : ['', '', '', ''],
    correctIndex:
      typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex <= 3
        ? q.correctIndex
        : 0,
    // explanation: q.explanation ? String(q.explanation).trim().slice(0, 300) : undefined,
  }
}

// ─── Prompt builders (imported from prompts.ts) ───────────────────────────────

import {
  buildActivitySystemPrompt,
  buildActivityUserPrompt,
  buildQuestionsSystemPrompt,
  buildQuestionsUserPrompt,
} from './prompts'
