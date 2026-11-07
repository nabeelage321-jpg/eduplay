/**
 * Gemini provider for Video-to-Game — SERVER ONLY.
 * Never import this from a client component: it reads the API key.
 *
 * What it does: a creator pastes the link of THEIR OWN public
 * YouTube video; Gemini reads the video (YouTube URL as file data —
 * video understanding) and returns a transcript + duration; a second
 * call turns the transcript into a paraphrased Quiz draft.
 *
 * What it NEVER does: download a video, store or re-upload a video,
 * or read anyone else's video without the creator. The video is
 * link-only: the game links back to the source video and credits it.
 * Private / unlisted videos are refused — Gemini's YouTube input
 * only works for public videos, and the oEmbed pre-check below
 * already fails for them, so no call is wasted on one.
 *
 * Provider is Google Gemini (generativelanguage.googleapis.com),
 * NOT Groq and NOT Claude: Claude reads text and images, not video;
 * Gemini is the one that reads a YouTube link natively.
 *
 * Key: GEMINI_API_KEY (Vercel env, set by the owner 2026-11-07).
 * Free tier (Google AI Studio, no card): 1,500 requests/day and
 * 8 hours of YouTube video/day. Model: gemini-3.5-flash-lite
 * by default, override only with GEMINI_MODEL.
 * (gemini-2.5-flash was the default until 2026-11-07: Google
 * deprecated it 2026-11-02 and serves the 2.5 models only to
 * users who used them before — a new key gets a 404 for it.
 * Google's own replacement for new projects is
 * gemini-3.5-flash-lite, on the free tier.)
 *
 * KEY MODEL (owner decision 2026-11-07): each creator will
 * eventually bring their OWN free Gemini key — that is the scale
 * model, better than one shared key. For v1 the shared env key is
 * used, BUT the single resolveGeminiKey(user) helper below is the
 * one place a per-user key plugs in: when per-user key storage
 * ships (it needs an encryption secret in Vercel + a migration),
 * this helper reads the signed-in user's stored key first and the
 * env key only as a fallback. Do NOT call process.env.GEMINI_API_KEY
 * anywhere else — always go through resolveGeminiKey.
 *
 * Guardrails: low completion caps, JSON-only responses, strict
 * validation, and the existing paraphrase rule — draft questions
 * must be in NEW words, never the transcript word for word
 * (parseGroqChapterQuestions in src/lib/groq.ts, reused here: it
 * is provider-agnostic parsing + the verbatim filter). A draft
 * that fails validation is an error, never silently replaced with
 * invented questions. Nothing here ever throws for a provider
 * failure: every failure returns a distinct plain-language result
 * the route turns into a message.
 */
import type { ActivityItem } from '@/types'
import { parseGroqChapterQuestions } from '@/lib/groq'

export const GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash-lite'
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Free-tier budget guard: videos longer than this are refused. */
export const GEMINI_MAX_VIDEO_MINUTES = 15
export const GEMINI_TRANSCRIPT_TIMEOUT_MS = 55000
export const GEMINI_QUESTIONS_TIMEOUT_MS = 20000
export const GEMINI_OEMBED_TIMEOUT_MS = 10000
/** Completion-token ceiling per call. */
export const GEMINI_MAX_OUTPUT_TOKENS = 4000
/** Transcript text sent to question generation is capped, like the
 *  chapter flow in src/lib/groq.ts (8000 chars). */
export const GEMINI_TRANSCRIPT_CAP_CHARS = 8000

export interface GeminiConfig {
  apiKey: string
  model: string
  /** Which env var actually supplied the key — reported, never the key. */
  keyName: 'GEMINI_API_KEY'
}

/**
 * The ONE place a Gemini key is resolved. v1: the shared env key.
 * `user` is reserved for the per-user-key follow-up (a signed-in
 * user record carrying their own stored key): today it is ignored
 * on purpose, and the env key is returned. When per-user storage
 * ships, this helper reads the user's key first and falls back to
 * the env key — no other file changes how it gets a key.
 */
export function resolveGeminiKey(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  user?: unknown
): GeminiConfig | null {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) return null
  return {
    apiKey: key,
    model: process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL,
    keyName: 'GEMINI_API_KEY',
  }
}

/** Same helper, short name, for routes that do not carry a user. */
export function getGeminiConfig(): GeminiConfig | null {
  return resolveGeminiKey()
}

export type GeminiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }

/** Extract a YouTube video ID from a watch / short / embed / live /
 *  youtu.be link. Anything else — including a bare video ID, a
 *  playlist link, or a non-YouTube URL — returns null, never a guess. */
export function parseYouTubeVideoId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const url = raw.trim()
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
  const idOk = (id: string | null): string | null =>
    id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
  if (host === 'youtu.be') {
    return idOk(parsed.pathname.split('/').filter(Boolean)[0] ?? null)
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (parsed.pathname === '/watch') return idOk(parsed.searchParams.get('v'))
    const parts = parsed.pathname.split('/').filter(Boolean)
    if ((parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') && parts[1]) {
      return idOk(parts[1])
    }
  }
  return null
}

export function canonicalYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

export interface VideoMeta {
  title: string
  author: string
  url: string
}

/**
 * Title + channel for a public video, from YouTube's official
 * oEmbed endpoint — no key, no download, no scrape. Returns null
 * for a private, unlisted, deleted, or age-restricted video (oEmbed
 * only answers for public, embeddable videos), which is exactly the
 * refusal the route needs BEFORE any Gemini call is spent.
 */
export async function fetchVideoMeta(
  videoId: string,
  fetchImpl: typeof fetch = fetch
): Promise<VideoMeta | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), GEMINI_OEMBED_TIMEOUT_MS)
  try {
    const res = await fetchImpl(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalYouTubeUrl(videoId))}&format=json`,
      { signal: controller.signal, headers: { 'User-Agent': 'EduPlay/1.0 (video-to-game)' } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { title?: unknown; author_name?: unknown }
    const title = typeof data.title === 'string' ? data.title.trim() : ''
    const author = typeof data.author_name === 'string' ? data.author_name.trim() : ''
    if (!title) return null
    return { title, author, url: canonicalYouTubeUrl(videoId) }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function extractJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown
  } catch {
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

interface GeminiContent {
  candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>
  error?: { message?: unknown; status?: unknown }
}

function responseText(data: GeminiContent): string | null {
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  return typeof text === 'string' && text.trim() ? text : null
}

/** Plain-language error for a Gemini HTTP failure. Never leaks the
 *  key, the raw body, or provider internals — only what the creator
 *  can act on. A 429 is the free-tier daily limit: "try tomorrow".
 *  The 404 names the model that failed, so the next diagnosis is
 *  instant (a dead model string and a bad key look the same
 *  without it). */
function geminiHttpError(status: number, data: GeminiContent, model: string): { ok: false; status: number; error: string } {
  if (status === 429) {
    return {
      ok: false,
      status: 502,
      error:
        'The free video limit for today is finished. Try again tomorrow — no game was made.',
    }
  }
  if (status === 400) {
    return {
      ok: false,
      status: 502,
      error:
        'Gemini could not read this video. It may be private, unlisted, or too new to read yet — only public YouTube videos work.',
    }
  }
  if (status === 401 || status === 403) {
    return {
      ok: false,
      status: 502,
      error:
        'Gemini did not accept the API key. Check the key in Vercel — no game was made.',
    }
  }
  if (status === 404) {
    return {
      ok: false,
      status: 502,
      error:
        `The Gemini model "${model}" is not available right now. Try again in a moment — no game was made.`,
    }
  }
  const message =
    typeof data.error?.message === 'string' ? data.error.message : ''
  void message
  return {
    ok: false,
    status: 502,
    error: 'Gemini did not answer. Try again in a moment — no game was made.',
  }
}

async function geminiGenerateContent(
  config: GeminiConfig,
  parts: Array<Record<string, unknown>>,
  timeoutMs: number,
  fetchImpl: typeof fetch
): Promise<GeminiResult<string>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchImpl(
      `${GEMINI_API_BASE}/${config.model}:generateContent`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
          },
        }),
      }
    )
    const data = (await res.json().catch(() => ({}))) as GeminiContent
    if (!res.ok) return geminiHttpError(res.status, data, config.model)
    const text = responseText(data)
    if (!text) {
      return {
        ok: false,
        status: 502,
        error: 'Gemini returned an empty answer. Try again — no game was made.',
      }
    }
    return { ok: true, data: text }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        status: 502,
        error: 'Gemini took too long to answer. Try again in a moment — no game was made.',
      }
    }
    return {
      ok: false,
      status: 502,
      error: 'Gemini did not answer. Try again in a moment — no game was made.',
    }
  } finally {
    clearTimeout(timer)
  }
}

export interface VideoTranscript {
  transcript: string
  /** Minutes, as reported by the model from the video it read.
   *  Null when it could not tell — treated as unknown, not a refusal. */
  durationMinutes: number | null
  summary: string
}

/**
 * One Gemini call: read a public YouTube video (URL as file data)
 * and return its transcript + duration + short summary. No video is
 * downloaded, stored, or re-uploaded — Gemini reads the public URL
 * on Google's servers. The duration cap is enforced by the caller
 * on the model's reported duration: there is no no-key way to learn
 * a video's length before the read, so the read itself is the one
 * call spent — question generation is what the cap still saves.
 */
export async function fetchVideoTranscript(
  videoUrl: string,
  config: GeminiConfig,
  fetchImpl: typeof fetch = fetch
): Promise<GeminiResult<VideoTranscript>> {
  const result = await geminiGenerateContent(
    config,
    [
      {
        fileData: { mimeType: 'video/mp4', fileUri: videoUrl },
      },
      {
        text:
          'Transcribe this video in full: what is said and shown, in the order it happens. ' +
          'Also tell me how long the video is, in minutes, and give a 2-3 sentence summary of what it teaches. ' +
          'Return ONLY a JSON object, no markdown, no extra text: ' +
          '{"transcript": "...", "durationMinutes": 12, "summary": "..."}. ' +
          'If you cannot tell the duration, use null for durationMinutes. ' +
          'If the video has no speech, transcribe what is shown on screen instead.',
      },
    ],
    GEMINI_TRANSCRIPT_TIMEOUT_MS,
    fetchImpl
  )
  if (!result.ok) return result
  const parsed = extractJson(result.data) as {
    transcript?: unknown
    durationMinutes?: unknown
    summary?: unknown
  } | null
  if (!parsed || typeof parsed.transcript !== 'string' || !parsed.transcript.trim()) {
    return {
      ok: false,
      status: 502,
      error:
        'Gemini could not read anything from this video. Try a video with clear speech — no game was made.',
    }
  }
  const duration =
    typeof parsed.durationMinutes === 'number' && Number.isFinite(parsed.durationMinutes)
      ? parsed.durationMinutes
      : null
  return {
    ok: true,
    data: {
      transcript: parsed.transcript.trim(),
      durationMinutes: duration,
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    },
  }
}

/**
 * One Gemini call: turn a transcript into a Quiz draft. The system
 * prompt is the same paraphrase rule as the chapter flow in
 * src/lib/groq.ts — facts in NEW words, never the transcript's exact
 * sentences — and the result is parsed by the SAME
 * parseGroqChapterQuestions, so the verbatim filter (8+ consecutive
 * words copied from the transcript) and the structural checks apply
 * here too. A draft with fewer than 2 surviving items is an error,
 * never padded with invented questions.
 */
export async function buildVideoQuizDraft(
  transcript: string,
  videoTitle: string,
  config: GeminiConfig,
  fetchImpl: typeof fetch = fetch
): Promise<
  | { ok: true; model: string; items: ActivityItem[] }
  | { ok: false; status: number; error: string }
> {
  const transcriptForModel = transcript.slice(0, GEMINI_TRANSCRIPT_CAP_CHARS)
  const result = await geminiGenerateContent(
    config,
    [
      {
        text:
          'You are a school teacher making quiz questions FROM a video transcript, in your OWN words. ' +
          'COPYRIGHT RULE — NEVER copy a sentence from the transcript word for word. Rewrite every fact as a NEW question in different words. ' +
          'A question that repeats a transcript sentence, even with one word changed, is forbidden. ' +
          'Use ONLY facts and concepts that actually appear in the transcript — never invent dates, statistics, names, or facts that are not in it. ' +
          'If you cannot state a fact in new words with confidence, leave that question out instead of guessing or copying. ' +
          'CRITICAL — the correct answer must DIRECTLY answer its own question. Before returning each question, read it back and check: if a teacher read only the question and this answer, would they mark it correct? ' +
          'Wrong answers must be plausible but clearly wrong, of the same kind as the correct answer, and different from it. ' +
          'Return ONLY a JSON object, no markdown, no extra text: {"questions": [{"question": "...", "correct": "...", "incorrect": ["...", "...", "..."]}]}. ' +
          'Up to 10 questions.',
      },
      {
        text:
          `Video title: ${videoTitle}\n\nTranscript (use ONLY facts from this transcript, in your own words — never copy its sentences):\n${transcriptForModel}`,
      },
    ],
    GEMINI_QUESTIONS_TIMEOUT_MS,
    fetchImpl
  )
  if (!result.ok) return result
  const parsed = extractJson(result.data)
  if (parsed === null) {
    return {
      ok: false,
      status: 502,
      error: 'Gemini returned a draft that could not be read. Try again — no questions were invented.',
    }
  }
  const items = parseGroqChapterQuestions(parsed, transcript)
  if (items.length < 2) {
    return {
      ok: false,
      status: 502,
      error:
        'Gemini could not make a paraphrased draft from this video without copying its words. Try a video with clearer spoken facts, or make the game manually with your own questions — no copied sentences were kept.',
    }
  }
  return { ok: true, model: config.model, items }
}
