import { NextRequest, NextResponse } from 'next/server'
import {
  buildChapterDraft,
  convertDraftItems,
  decodeHtmlEntities,
  sanitizePrompt,
  type PromptDraft,
  type PromptGameType,
} from '@/lib/prompt-to-game'
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
 * - Without it: free Open Trivia Database questions (CC BY-SA 4.0).
 * No paid provider, no Anthropic, no key. If no free source yields at
 * least 2 real items, this returns an error instead of inventing any.
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

    // Free content: Open Trivia Database, no key, CC BY-SA 4.0.
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
    return NextResponse.json({ error: 'Could not make a draft right now' }, { status: 500 })
  }
}
