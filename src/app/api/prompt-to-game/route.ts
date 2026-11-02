import { NextRequest, NextResponse } from 'next/server'
import {
  buildChapterDraft,
  buildTableDraft,
  convertDraftItems,
  decodeHtmlEntities,
  sanitizePrompt,
  type PromptDraft,
  type PromptGameType,
} from '@/lib/prompt-to-game'
import { buildGroqDraft, getGroqConfig } from '@/lib/groq'
import type { ActivityItem } from '@/types'

const ALLOWED_TYPES: PromptGameType[] = ['quiz', 'match-up', 'unjumble']

interface OpenTdbQuestion {
  question?: string
  correct_answer?: string
  incorrect_answers?: string[]
}

/**
 * POST /api/prompt-to-game — draft only, never a published game.
 * Body: { prompt, type: 'quiz' | 'match-up' | 'unjumble', chapterText? }
 * - With chapterText: the draft is built from the chapter's own sentences.
 * - Table prompts: built locally, never touch the network.
 * - Other prompts: Groq first (topic-specific, see src/lib/groq.ts).
 *   Only when NO Groq key is configured does it fall back to free
 *   Open Trivia Database questions (CC BY-SA 4.0), clearly labelled
 *   as general knowledge, not about the exact prompt.
 * No Anthropic. If no source yields at least 2 real, on-topic items,
 * this returns an error instead of inventing any.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const prompt = sanitizePrompt(body.prompt)
    const type: PromptGameType = ALLOWED_TYPES.includes(body.type) ? body.type : 'quiz'
    const chapterText =
      typeof body.chapterText === 'string' ? body.chapterText.slice(0, 20000) : ''

    if (!prompt) {
      return NextResponse.json({ error: 'A prompt is required' }, { status: 400 })
    }

    if (chapterText.trim().length >= 100) {
      const draft = buildChapterDraft(chapterText, prompt, type)
      if (!draft) {
        return NextResponse.json(
          {
            error:
              'That chapter text is too short or has too few usable sentences to make a game. Add more chapter text and try again — no questions were invented.',
          },
          { status: 422 }
        )
      }
      return NextResponse.json({ draft })
    }

    // Table prompts never touch the network: a table of N is built from
    // the prompt itself, so "make game for a table of 2" works even when
    // the free trivia service below is down or slow (that was the live
    // failure: a trivia-service timeout fell through to a generic 500).
    const tableDraft = buildTableDraft(prompt, type)
    if (tableDraft) {
      return NextResponse.json({ draft: tableDraft })
    }

    // Groq first for general prompts (topic-specific draft). Chapter
    // and table prompts above never reach this point, so they are
    // untouched. A configured Groq key that fails (rate limit, bad
    // key, bad model, invalid draft) returns its own plain 502 —
    // it does NOT silently fall back to random trivia, or the
    // creator would see off-topic questions and think Groq worked.
    if (getGroqConfig()) {
      const groq = await buildGroqDraft(prompt)
      if (groq.ok) {
        const draft: PromptDraft = {
          title: prompt,
          type,
          items: convertDraftItems(groq.items, type),
          sourceNote: `Draft made by Groq (${groq.model}) from your exact prompt — every question was checked against your topic. It is still only a draft: check and edit each question before you approve it.`,
        }
        return NextResponse.json({ draft })
      }
      return NextResponse.json({ error: groq.error }, { status: groq.status })
    }

    // No Groq key configured: free content, Open Trivia Database,
    // no key, CC BY-SA 4.0. Clearly labelled below as general
    // knowledge, NOT about the exact prompt.
    // Its failures get their own plain message — never the generic 500 —
    // so the creator knows it is the trivia service, not their prompt.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    let data: { results?: OpenTdbQuestion[] }
    try {
      const res = await fetch('https://opentdb.com/api.php?amount=10&type=multiple', {
        signal: controller.signal,
        headers: { 'User-Agent': 'EduPlay/1.0 (prompt-to-game draft)' },
      })
      if (!res.ok) throw new Error(`OpenTDB ${res.status}`)
      data = await res.json()
    } catch {
      return NextResponse.json(
        { error: 'The free question service did not answer. Try again in a moment — no questions were invented.' },
        { status: 502 }
      )
    } finally {
      clearTimeout(timer)
    }

    const items: ActivityItem[] = (data.results ?? [])
      .map((q, i) => {
        const question = decodeHtmlEntities(String(q.question ?? '')).trim()
        const correct = decodeHtmlEntities(String(q.correct_answer ?? '')).trim()
        const incorrect = (q.incorrect_answers ?? []).map((a) => decodeHtmlEntities(String(a)).trim()).filter(Boolean)
        if (!question || !correct || incorrect.length < 2) return null
        // Rotate the correct answer into the options (index-based, so
        // it is not always first) — the creator can still edit it.
        const options = [...incorrect]
        options.splice(i % (options.length + 1), 0, correct)
        return { prompt: question, answer: correct, answers: options } as ActivityItem
      })
      .filter((i): i is ActivityItem => i !== null)
      .slice(0, 10)

    if (items.length < 2) {
      return NextResponse.json(
        { error: 'No free questions came back right now. Try again in a moment — no questions were invented.' },
        { status: 502 }
      )
    }

    const draft: PromptDraft = {
      title: prompt,
      type,
      items: convertDraftItems(items, type),
      sourceNote:
        'Draft questions come from the free Open Trivia Database (CC BY-SA 4.0) — they are general-knowledge questions, not questions about your exact prompt. Edit the title and every question before you approve it.',
      sourceUrl: 'https://opentdb.com',
    }
    return NextResponse.json({ draft })
  } catch (err) {
    console.error('[POST /api/prompt-to-game]', err)
    return NextResponse.json({ error: 'Could not make a draft right now. Try again in a moment.' }, { status: 500 })
  }
}
