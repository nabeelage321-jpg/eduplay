/**
 * DB content -> player items adapter (2026-10-30 play-page bug fix).
 *
 * The live `activities` table stores `type` (not `type_id`) and
 * `content` (not `items`), and each of the 23 programme types stores
 * its content in its own shape (questions, pairs, sentences, …).
 * ActivityPlayer, however, only read `activity.items` and
 * `activity.type_id`, so every programme game rendered
 * "This activity has no items yet." even though its content existed.
 *
 * This adapter is the single place that translates DB shape -> the
 * { prompt, answer } items every player component expects. It does
 * NOT change any DB row. If `items` already exist (creator-created
 * activities), they pass through untouched.
 *
 * TWO content shapes exist for `content.questions` and they are
 * disjoint, so they must not be confused:
 * - Programme rows: { question, options, correct } (see the seed data).
 * - Creator rows (POST/PUT /api/activities, wizard items): the save
 *   route stores EVERY type's wizard items as
 *   { prompt, answer, hint, imageUrl } under `content.questions`,
 *   whatever the activity type is. The quiz case below used to read
 *   only question/options/correct from these rows, got '' for both
 *   prompt and answer, filtered every item out, and the play page
 *   rendered "This activity has no items yet." for a game that had
 *   saved fine (teacher-saved Table of 2, 2026-11-02). The creator
 *   branch below runs first so those rows play without re-saving.
 */

import type { ActivityItem } from '@/types'

type AnyRecord = Record<string, unknown>

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function words(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter(Boolean) : []
}

/** DB type -> the key ActivityPlayer's component map uses. */
export function playerTypeKey(type: string): string {
  return type === 'word-search' ? 'wordsearch' : type
}

export interface DbActivityLike {
  type?: string
  type_id?: string
  items?: ActivityItem[]
  content?: unknown
}

export function dbTypeOf(activity: DbActivityLike): string {
  const t = str(activity.type || activity.type_id || 'quiz').trim()
  return t || 'quiz'
}

export function adaptActivityItems(activity: DbActivityLike): ActivityItem[] {
  if (Array.isArray(activity.items) && activity.items.length > 0) {
    return activity.items
  }
  const content: AnyRecord = isRecord(activity.content) ? activity.content : {}
  const type = dbTypeOf(activity)

  // CREATOR-SAVE SHAPE (teacher-game fix 2026-11-02): POST/PUT
  // /api/activities store wizard items as content.questions[] with
  // { prompt, answer, hint, imageUrl } for every type. Programme rows
  // never use prompt/answer keys, so this branch cannot steal a
  // programme row's items — it only rescues creator rows, which the
  // per-type cases below would otherwise read as empty.
  const creatorQuestions = arr(content.questions).filter(
    (q) => isRecord(q) && (typeof q.prompt === 'string' || typeof q.answer === 'string'),
  )
  if (creatorQuestions.length > 0) {
    return creatorQuestions
      .map((q) => {
        const r = isRecord(q) ? q : {}
        return {
          prompt: str(r.prompt),
          answer: str(r.answer),
          hint: str(r.hint),
          imageUrl: str(r.imageUrl),
        }
      })
      .filter((i) => i.prompt && i.answer)
  }

  switch (type) {
    case 'riddle':
      // Riddle-shaped rows: clue + solution (+ optional hint). The
      // creator-save branch above already handles prompt/answer rows,
      // so this only rescues rows stored in riddle shape.
      return arr(content.questions).map((q) => {
        const r = isRecord(q) ? q : {}
        return { prompt: str(r.clue || r.question || r.prompt), answer: str(r.solution || r.answer), hint: str(r.hint) }
      }).filter((i) => i.prompt && i.answer)

    case 'dialogue':
      // Dialogue-shaped rows: lines[] with speaker/character + text/
      // line, or questions[] with a speaker/text pair. The creator-
      // save branch above already handles prompt/answer rows (speaker
      // in prompt, line in answer), so this only rescues rows stored
      // in dialogue shape.
      if (arr(content.lines).length > 0) {
        return arr(content.lines).map((l) => {
          const r = isRecord(l) ? l : {}
          return { prompt: str(r.speaker || r.character || r.name || r.prompt), answer: str(r.text || r.line || r.answer) }
        }).filter((i) => i.prompt && i.answer)
      }
      return arr(content.questions).map((q) => {
        const r = isRecord(q) ? q : {}
        return { prompt: str(r.speaker || r.character || r.prompt), answer: str(r.text || r.line || r.answer) }
      }).filter((i) => i.prompt && i.answer)

    case 'dictation':
      // Dictation-shaped rows: passages[] with text/passage (+
      // optional title/label), or questions[] with a passage/text
      // field. The creator-save branch above already handles
      // prompt/answer rows, so this only rescues rows stored in
      // dictation shape.
      if (arr(content.passages).length > 0) {
        return arr(content.passages).map((p) => {
          const r = isRecord(p) ? p : {}
          return { prompt: str(r.title || r.label || ''), answer: str(r.text || r.passage || r.answer) }
        }).filter((i) => i.answer)
      }
      return arr(content.questions).map((q) => {
        const r = isRecord(q) ? q : {}
        return { prompt: str(r.title || r.label || ''), answer: str(r.passage || r.text || r.answer) }
      }).filter((i) => i.answer)

    case 'quiz':
    case 'gameshow-quiz':
    case 'jump-path':
    case 'aster-quiz':
      return arr(content.questions).map((q) => {
        const r = isRecord(q) ? q : {}
        const options = words(r.options)
        // Programme shape: options[correct]. Creator shape is handled
        // by the branch above; the r.answer fallback here is defence
        // in depth only, so a mixed row still yields its items.
        const correct = typeof r.correct === 'number' ? options[r.correct] : str(r.answer)
        return { prompt: str(r.question || r.prompt), answer: correct, answers: options }
      }).filter((i) => i.prompt && i.answer)

    case 'match-up':
    case 'memory-match':
    case 'typing-race':
    case 'bingo':
      return arr(content.pairs).map((p) => {
        const r = isRecord(p) ? p : {}
        return { prompt: str(r.left), answer: str(r.right) }
      }).filter((i) => i.prompt && i.answer)

    case 'anagram':
      return arr(content.words).map((w) => {
        const r = isRecord(w) ? w : {}
        return { prompt: str(r.scrambled), answer: str(r.answer), hint: str(r.hint) }
      }).filter((i) => i.answer)

    case 'crossword':
      return arr(content.clues).map((c) => {
        const r = isRecord(c) ? c : {}
        return { prompt: str(r.clue), answer: str(r.answer) }
      }).filter((i) => i.prompt && i.answer)

    case 'word-search':
      return words(content.words).map((w) => ({ prompt: w, answer: w }))

    case 'spin-wheel':
      return arr(content.items).map((it) => {
        const r = isRecord(it) ? it : {}
        const options = words(r.options)
        const answer = typeof r.answer === 'number' ? options[r.answer] : str(r.answer)
        return { prompt: str(r.question), answer, answers: options }
      }).filter((i) => i.prompt && i.answer)

    case 'balloon-pop':
      return arr(content.rounds).map((rd) => {
        const r = isRecord(rd) ? rd : {}
        const hit = arr(r.balloons).find((b) => isRecord(b) && b.correct === true)
        return { prompt: str(r.question), answer: str(isRecord(hit) ? hit.value : '') }
      }).filter((i) => i.prompt && i.answer)

    case 'whack-a-mole':
      return arr(content.rounds).map((rd) => {
        const r = isRecord(rd) ? rd : {}
        const hit = arr(r.moles).find((m) => isRecord(m) && m.correct === true)
        return { prompt: str(r.question), answer: str(isRecord(hit) ? hit.value : '') }
      }).filter((i) => i.prompt && i.answer)

    case 'true-false':
      return arr(content.statements).map((s) => {
        const r = isRecord(s) ? s : {}
        return { prompt: str(r.statement), answer: r.isTrue === true ? 'true' : 'false' }
      }).filter((i) => i.prompt)

    case 'categorize':
      return arr(content.items).map((it) => {
        const r = isRecord(it) ? it : {}
        return { prompt: str(r.text), answer: str(r.category) }
      }).filter((i) => i.prompt && i.answer)

    case 'order': {
      // OrderActivity scores items by their position in the array, so
      // a flattened multi-round list would be wrong. Use the first
      // round, sorted by its own `order` field, as one playable round.
      const firstRound = arr(content.rounds)[0]
      const roundItems = isRecord(firstRound) ? arr(firstRound.items) : []
      return roundItems
        .map((it) => {
          const r = isRecord(it) ? it : {}
          return { text: str(r.text), order: typeof r.order === 'number' ? r.order : 0 }
        })
        .sort((a, b) => a.order - b.order)
        .map((it) => ({ prompt: it.text, answer: String(it.order) }))
        .filter((i) => i.prompt)
    }

    case 'fill-blank':
      return arr(content.sentences).map((s) => {
        const r = isRecord(s) ? s : {}
        const answer = str(r.answer)
        const text = str(r.text)
        // Programme text is "<prompt> <answer>"; blank it out instead
        // of showing the answer in the sentence.
        const prompt = answer && text.endsWith(` ${answer}`)
          ? `${text.slice(0, text.length - answer.length - 1)} ___`
          : text.replace(answer, '___')
        return { prompt, answer, answers: words(r.options) }
      }).filter((i) => i.prompt && i.answer)

    case 'labelled-diagram':
      return arr(content.labels).map((l) => {
        const r = isRecord(l) ? l : {}
        return { prompt: str(r.text), answer: str(r.answer), imageUrl: str(content.image) }
      }).filter((i) => i.prompt && i.answer)

    case 'flashcards':
      return arr(content.cards).map((c) => {
        const r = isRecord(c) ? c : {}
        return { prompt: str(r.front), answer: str(r.back) }
      }).filter((i) => i.prompt && i.answer)

    case 'missing-word':
      return arr(content.sentences).map((s) => {
        const r = isRecord(s) ? s : {}
        return { prompt: str(r.text), answer: str(r.missing), answers: words(r.options) }
      }).filter((i) => i.prompt && i.answer)

    case 'unjumble':
      return arr(content.sentences).map((s) => {
        const r = isRecord(s) ? s : {}
        return {
          prompt: words(r.jumbled).join(' '),
          answer: words(r.correct).join(' '),
        }
      }).filter((i) => i.answer)

    case 'hangman':
      return arr(content.words).map((w) => {
        const r = isRecord(w) ? w : {}
        return { prompt: str(r.hint), answer: str(r.word) }
      }).filter((i) => i.answer)

    case 'random-wheel':
      return arr(content.items).map((it) => {
        const r = isRecord(it) ? it : {}
        return { prompt: str(r.challenge || r.label), answer: str(r.label) }
      }).filter((i) => i.prompt)

    case 'open-box':
      return arr(content.boxes).map((b) => {
        const r = isRecord(b) ? b : {}
        const options = words(r.options)
        const answer = typeof r.answer === 'number' ? options[r.answer] : str(r.hiddenItem)
        return { prompt: str(r.question), answer, answers: options }
      }).filter((i) => i.prompt && i.answer)

    default: {
      // Generic fallback: content.items already in prompt/answer shape.
      const generic = arr(content.items).map((it) => {
        const r = isRecord(it) ? it : {}
        return { prompt: str(r.prompt || r.text || r.label), answer: str(r.answer || r.right || '') }
      }).filter((i) => i.prompt && i.answer)
      return generic
    }
  }
}
