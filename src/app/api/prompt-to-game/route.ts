import { NextRequest, NextResponse } from 'next/server'
import {
  buildTableDraft,
  convertDraftItems,
  crosswordPlacedCount,
  CROSSWORD_MIN_PLACED_WORDS,
  decodeHtmlEntities,
  isCategorizeDraftUsable,
  isCrosswordItem,
  isHangmanItem,
  isMissingWordItem,
  isWordSearchItem,
  sanitizePrompt,
  type PromptDraft,
  type PromptGameType,
} from '@/lib/prompt-to-game'
import { buildGroqChapterDraft, buildGroqDraft, getGroqConfig } from '@/lib/groq'
import { getSyllabus, resolveCurriculumTag } from '@/lib/curricula'
import type { ActivityItem } from '@/types'

const ALLOWED_TYPES: PromptGameType[] = ['quiz', 'match-up', 'unjumble', 'true-false', 'fill-blank', 'missing-word', 'gameshow-quiz', 'hangman', 'wordsearch', 'categorize', 'crossword']

/** A true/false draft needs at least 2 statements with at least one
 *  true and one false — otherwise the game has no choice in it.
 *  Conversion drops unclean questions, so the check runs AFTER
 *  conversion, on every path (chapter, Groq, OpenTDB). */
function trueFalseUsable(items: ActivityItem[]): boolean {
  if (items.length < 2) return false
  const answers = new Set(items.map((i) => i.answer.trim().toLowerCase()))
  return answers.has('true') && answers.has('false')
}

const TRUE_FALSE_TOO_FEW =
  'Could not turn enough of these questions into clear true-or-false statements. Try a simpler topic, or make the game manually — no half-finished draft was kept.'

/** A fill-blank draft needs at least 2 sentences, each with exactly
 *  one `___` and a real missing word — otherwise the game has no
 *  blank to fill. Conversion drops unclean questions, so the check
 *  runs AFTER conversion, on every path (chapter, Groq, OpenTDB). */
function fillBlankUsable(items: ActivityItem[]): boolean {
  if (items.length < 2) return false
  return items.every(
    (i) => (i.prompt.match(/___/g) ?? []).length === 1 && i.answer.trim().length > 0
  )
}

const FILL_BLANK_TOO_FEW =
  'Could not turn enough of these questions into clear fill-in-the-blank sentences. Try a simpler topic, or make the game manually — no half-finished draft was kept.'

/** A missing-word draft needs at least 2 sentences, each a plain
 *  sentence whose missing word is one single word that occurs in it
 *  as a whole word exactly once — otherwise the player shows no
 *  blank at all. Conversion drops unclean questions, so the check
 *  runs AFTER conversion, on every path (chapter, Groq, OpenTDB,
 *  and tables, whose word-form rows can drop below 2). */
function missingWordUsable(items: ActivityItem[]): boolean {
  if (items.length < 2) return false
  return items.every((i) => isMissingWordItem(i))
}

const MISSING_WORD_TOO_FEW =
  'Could not turn enough of these questions into clear sentences with one missing word. Try a simpler topic, or make the game manually — no half-finished draft was kept.'

/** A hangman draft needs at least 2 words, each one single word of
 *  letters only (3–12) with a clue that never contains the word —
 *  otherwise the player has nothing guessable to play. Conversion
 *  drops unclean questions, so the check runs AFTER conversion, on
 *  every path (chapter, Groq, OpenTDB, and tables, whose word-form
 *  rows can drop below 2). */
function hangmanUsable(items: ActivityItem[]): boolean {
  if (items.length < 2) return false
  return items.every((i) => isHangmanItem(i))
}

const HANGMAN_TOO_FEW =
  'Could not turn enough of these questions into single words with clean hints. Try a simpler topic, or make the game manually — no half-finished draft was kept.'

/** A word-search draft needs at least 2 words, each one single word
 *  of letters only (2–12, so it fits the player's 12×12 grid) with
 *  a clue that never contains the word — otherwise the player has
 *  nothing findable to hide in the grid. Conversion drops unclean
 *  questions, so the check runs AFTER conversion, on every path
 *  (chapter, Groq, OpenTDB, and tables, whose word-form rows can
 *  drop below 2). */
function wordSearchUsable(items: ActivityItem[]): boolean {
  if (items.length < 2) return false
  return items.every((i) => isWordSearchItem(i))
}

const WORD_SEARCH_TOO_FEW =
  'Could not turn enough of these questions into single words with clean clues that fit the word grid. Try a simpler topic, or make the game manually — no half-finished draft was kept.'
/** A categorize draft needs at least 2 categories with at least 2
 *  items each — otherwise a basket has nothing to sort, or there
 *  is no choice in the game at all. Conversion passes items
 *  through unchanged, so the check runs AFTER conversion, on every
 *  path (chapter, Groq, OpenTDB, and tables, whose quiz-shaped
 *  rows each form their own one-item category). */
function categorizeUsable(items: ActivityItem[]): boolean {
  return isCategorizeDraftUsable(items)
}

const CATEGORIZE_TOO_FEW =
  'Could not turn this topic into groups with at least 2 items each. Try a topic that sorts into clear groups (for example, animals into farm, wild, and sea animals), or make the game manually — no half-finished draft was kept.'

/** A crossword draft needs at least 2 words, each one single word of
 *  letters only (3–12) with a clue that never contains the word —
 *  AND at least 3 of them must actually interlock on the player's
 *  grid (the anchor plus two crossing words). A flat list of words
 *  that share no letters is not a crossword: the player would show
 *  one lonely across word. Conversion drops unclean questions, so
 *  the check runs AFTER conversion, on every path (chapter, Groq,
 *  OpenTDB, and tables, whose word-form rows can drop below the bar). */
function crosswordUsable(items: ActivityItem[]): boolean {
  if (items.length < 2) return false
  if (!items.every((i) => isCrosswordItem(i))) return false
  return crosswordPlacedCount(items) >= CROSSWORD_MIN_PLACED_WORDS
}

const CROSSWORD_TOO_FEW =
  'Could not turn enough of these questions into words with clean clues that cross each other in a grid. Try a simpler topic with words that share letters, or make the game manually — no half-finished draft was kept.'

interface OpenTdbQuestion {
  question?: string
  correct_answer?: string
  incorrect_answers?: string[]
}

/**
 * POST /api/prompt-to-game — draft only, never a published game.
 * Body: { prompt, type: 'quiz' | 'match-up' | 'unjumble' | 'true-false' | 'fill-blank' | 'missing-word' | 'gameshow-quiz' | 'hangman' | 'wordsearch' | 'categorize' | 'crossword', chapterText? }
 * - With chapterText: the draft is PARAPHRASED from the chapter via Groq —
 *   the same facts in new words, never the book's exact sentences.
 *   No verbatim fallback exists: if paraphrasing fails, or no Groq key
 *   is configured, the route returns a plain error and the teacher
 *   makes the game manually instead.
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
    // WORLDWIDE CURRICULUM v1 (2026-11-04): the client may send a
    // country + syllabus pick. It is validated against the seed —
    // never trusted as a name — and used ONLY as Groq style context
    // on the general-prompt path below. An invalid or General pick
    // simply means no context, never an error, never a claim.
    const curriculumTag = resolveCurriculumTag(body.countryCode, body.syllabusSlug)
    const syllabusContext = curriculumTag
      ? getSyllabus(curriculumTag.countryCode, curriculumTag.syllabusSlug)?.name
      : undefined

    if (!prompt) {
      return NextResponse.json({ error: 'A prompt is required' }, { status: 400 })
    }

    if (chapterText.trim().length >= 100) {
      // COPYRIGHT RULE: chapter drafts are paraphrased, never copied.
      // The old local verbatim fill-in-the-blank builder was removed
      // in this batch — there is no code path left that can produce a
      // verbatim chapter draft. Without a Groq key, or if paraphrasing
      // fails, return a plain error; never fall back to verbatim text.
      if (!getGroqConfig()) {
        return NextResponse.json(
          {
            error:
              'Chapter games are now made in new words, not copied from the chapter, and that paraphrasing needs the Groq key. Check the Groq key in Vercel, or make the game manually with your own questions — the chapter text itself is never copied into a game.',
          },
          { status: 502 }
        )
      }
      const chapter = await buildGroqChapterDraft(chapterText, prompt)
      if (!chapter.ok) {
        return NextResponse.json({ error: chapter.error }, { status: chapter.status })
      }
      const chapterItems = convertDraftItems(chapter.items, type)
      if (type === 'true-false' && !trueFalseUsable(chapterItems)) {
        return NextResponse.json({ error: TRUE_FALSE_TOO_FEW }, { status: 502 })
      }
      if (type === 'fill-blank' && !fillBlankUsable(chapterItems)) {
        return NextResponse.json({ error: FILL_BLANK_TOO_FEW }, { status: 502 })
      }
      if (type === 'missing-word' && !missingWordUsable(chapterItems)) {
        return NextResponse.json({ error: MISSING_WORD_TOO_FEW }, { status: 502 })
      }
      if (type === 'hangman' && !hangmanUsable(chapterItems)) {
        return NextResponse.json({ error: HANGMAN_TOO_FEW }, { status: 502 })
      }
      if (type === 'wordsearch' && !wordSearchUsable(chapterItems)) {
        return NextResponse.json({ error: WORD_SEARCH_TOO_FEW }, { status: 502 })
      }
      if (type === 'categorize' && !categorizeUsable(chapterItems)) {
        return NextResponse.json({ error: CATEGORIZE_TOO_FEW }, { status: 502 })
      }
      if (type === 'crossword' && !crosswordUsable(chapterItems)) {
        return NextResponse.json({ error: CROSSWORD_TOO_FEW }, { status: 502 })
      }
      const draft: PromptDraft = {
        title: prompt,
        type,
        items: chapterItems,
        sourceNote:
          'Made from your chapter in NEW words — the same facts, reworded into new questions, never the book\'s exact sentences. This is not official book material: check and edit each question before you approve it, and keep the game private until a teacher or parent has checked it.',
      }
      return NextResponse.json({ draft })
    }

    // Table prompts never touch the network: a table of N is built from
    // the prompt itself, so "make game for a table of 2" works even when
    // the free trivia service below is down or slow (that was the live
    // failure: a trivia-service timeout fell through to a generic 500).
    const tableDraft = buildTableDraft(prompt, type)
    if (tableDraft) {
      // A missing-word table can drop below 2 rows when products
      // have no single-word form (e.g. table of 19 keeps only 19) —
      // that is a plain error, never a one-row draft. A hangman
      // table drops the same way (table of 19 keeps only "nineteen").
      // A word-search table drops the same way again.
      if (type === 'missing-word' && !missingWordUsable(tableDraft.items)) {
        return NextResponse.json({ error: MISSING_WORD_TOO_FEW }, { status: 502 })
      }
      if (type === 'hangman' && !hangmanUsable(tableDraft.items)) {
        return NextResponse.json({ error: HANGMAN_TOO_FEW }, { status: 502 })
      }
      if (type === 'wordsearch' && !wordSearchUsable(tableDraft.items)) {
        return NextResponse.json({ error: WORD_SEARCH_TOO_FEW }, { status: 502 })
      }
      if (type === 'categorize' && !categorizeUsable(tableDraft.items)) {
        return NextResponse.json({ error: CATEGORIZE_TOO_FEW }, { status: 502 })
      }
      if (type === 'crossword' && !crosswordUsable(tableDraft.items)) {
        return NextResponse.json({ error: CROSSWORD_TOO_FEW }, { status: 502 })
      }
      return NextResponse.json({ draft: tableDraft })
    }

    // Groq first for general prompts (topic-specific draft). Chapter
    // and table prompts above never reach this point, so they are
    // untouched. A configured Groq key that fails (rate limit, bad
    // key, bad model, invalid draft) returns its own plain 502 —
    // it does NOT silently fall back to random trivia, or the
    // creator would see off-topic questions and think Groq worked.
    if (getGroqConfig()) {
      const groqType: 'true-false' | 'fill-blank' | 'missing-word' | 'hangman' | 'wordsearch' | 'categorize' | 'crossword' | undefined =
        type === 'crossword' || type === 'categorize' || type === 'hangman' || type === 'wordsearch' || type === 'missing-word' || type === 'fill-blank' || type === 'true-false' ? type : undefined
      const groq = await buildGroqDraft(prompt, fetch, syllabusContext, groqType)
      if (groq.ok) {
        const groqItems = convertDraftItems(groq.items, type)
        if (type === 'true-false' && !trueFalseUsable(groqItems)) {
          return NextResponse.json({ error: TRUE_FALSE_TOO_FEW }, { status: 502 })
        }
        if (type === 'fill-blank' && !fillBlankUsable(groqItems)) {
          return NextResponse.json({ error: FILL_BLANK_TOO_FEW }, { status: 502 })
        }
        if (type === 'missing-word' && !missingWordUsable(groqItems)) {
          return NextResponse.json({ error: MISSING_WORD_TOO_FEW }, { status: 502 })
        }
        if (type === 'hangman' && !hangmanUsable(groqItems)) {
          return NextResponse.json({ error: HANGMAN_TOO_FEW }, { status: 502 })
        }
        if (type === 'wordsearch' && !wordSearchUsable(groqItems)) {
          return NextResponse.json({ error: WORD_SEARCH_TOO_FEW }, { status: 502 })
        }
        if (type === 'categorize' && !categorizeUsable(groqItems)) {
          return NextResponse.json({ error: CATEGORIZE_TOO_FEW }, { status: 502 })
        }
        if (type === 'crossword' && !crosswordUsable(groqItems)) {
          return NextResponse.json({ error: CROSSWORD_TOO_FEW }, { status: 502 })
        }
        const draft: PromptDraft = {
          title: prompt,
          type,
          items: groqItems,
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

    const converted = convertDraftItems(items, type)
    if (type === 'true-false' && !trueFalseUsable(converted)) {
      return NextResponse.json({ error: TRUE_FALSE_TOO_FEW }, { status: 502 })
    }
    if (type === 'fill-blank' && !fillBlankUsable(converted)) {
      return NextResponse.json({ error: FILL_BLANK_TOO_FEW }, { status: 502 })
    }
    if (type === 'missing-word' && !missingWordUsable(converted)) {
      return NextResponse.json({ error: MISSING_WORD_TOO_FEW }, { status: 502 })
    }
    if (type === 'hangman' && !hangmanUsable(converted)) {
      return NextResponse.json({ error: HANGMAN_TOO_FEW }, { status: 502 })
    }
    if (type === 'wordsearch' && !wordSearchUsable(converted)) {
      return NextResponse.json({ error: WORD_SEARCH_TOO_FEW }, { status: 502 })
    }
    if (type === 'categorize' && !categorizeUsable(converted)) {
      return NextResponse.json({ error: CATEGORIZE_TOO_FEW }, { status: 502 })
    }
    if (type === 'crossword' && !crosswordUsable(converted)) {
      return NextResponse.json({ error: CROSSWORD_TOO_FEW }, { status: 502 })
    }

    const draft: PromptDraft = {
      title: prompt,
      type,
      items: converted,
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
