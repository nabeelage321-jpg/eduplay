/**
 * Play as another type (convert) — 2026-11-04, part 1 of the owner's
 * master list. Wordwall pattern, improved, EduPlay's own names/art:
 * a saved game can be played as ANOTHER type without retyping its
 * questions.
 *
 * HARD RULES (do not soften these in a later batch):
 * - Play-time view ONLY. Nothing in this file writes, saves, or
 *   changes the original game — no API call, no re-save, no mutation
 *   of the original activity object or its items.
 * - Items are adapted ONCE from the original game (adaptActivityItems)
 *   and passed VERBATIM to the target type's existing player
 *   (ActivityPlayer returns activity.items untouched when they are
 *   non-empty, so the target player never re-reads the original
 *   content shape). No question is rewritten, invented, or dropped
 *   to force a fit.
 * - A target is compatible only when its existing player can play
 *   EVERY adapted item as-is. Otherwise canConvertTo returns ok:false
 *   with a plain reason, and the play page shows that message instead
 *   of the player — never a mangled game.
 * - The target list mirrors ACTIVITY_TYPE_META (TypeSelector) and
 *   ActivityPlayer's component map (40 types). If a type is added to
 *   either, it must be added here with a compatibility decision, or
 *   it will fall into the incompatible default below — which is the
 *   safe direction (message, not mangled play).
 */

import type { ActivityItem } from '@/types'
import { parseNumberAnswer } from '@/lib/number-slider'

export interface ConvertTarget {
  slug: string
  name: string
  icon: string
}

export const CONVERT_TARGETS: ConvertTarget[] = [
  { slug: 'quiz',             icon: '❓', name: 'Quiz' },
  { slug: 'match-up',         icon: '🔗', name: 'Match Up' },
  { slug: 'anagram',          icon: '🔤', name: 'Anagram' },
  { slug: 'crossword',        icon: '✏️', name: 'Crossword' },
  { slug: 'wordsearch',       icon: '🔍', name: 'Word Search' },
  { slug: 'spin-wheel',       icon: '🎡', name: 'Spin Wheel' },
  { slug: 'balloon-pop',      icon: '🎈', name: 'Balloon Pop' },
  { slug: 'whack-a-mole',     icon: '🔨', name: 'Whack-a-Mole' },
  { slug: 'true-false',       icon: '✅', name: 'True / False' },
  { slug: 'categorize',       icon: '🗂️', name: 'Categorize' },
  { slug: 'order',            icon: '📋', name: 'Order' },
  { slug: 'fill-blank',       icon: '📝', name: 'Fill the Blank' },
  { slug: 'labelled-diagram', icon: '🗺️', name: 'Labelled Diagram' },
  { slug: 'flashcards',       icon: '🃏', name: 'Flashcards' },
  { slug: 'missing-word',     icon: '🔎', name: 'Missing Word' },
  { slug: 'unjumble',         icon: '📖', name: 'Unjumble' },
  { slug: 'gameshow-quiz',    icon: '🎬', name: 'Gameshow Quiz' },
  { slug: 'hangman',          icon: '🎯', name: 'Hangman' },
  { slug: 'random-wheel',     icon: '🎰', name: 'Random Wheel' },
  { slug: 'open-box',         icon: '🎁', name: 'Open the Box' },
  { slug: 'memory-match',     icon: '🧠', name: 'Memory Match' },
  { slug: 'typing-race',      icon: '⌨️', name: 'Typing Race' },
  { slug: 'bingo',            icon: '🎱', name: 'Bingo' },
  { slug: 'jump-path',        icon: '⭐', name: 'Jump Path' },
  { slug: 'riddle',           icon: '🧩', name: 'Riddle' },
  { slug: 'aster-quiz',       icon: '🚀', name: 'AsterQuiz' },
  { slug: 'dictation',        icon: '🎧', name: 'Dictation' },
  { slug: 'dialogue',         icon: '💬', name: 'Dialogue' },
  { slug: 'map-quiz',         icon: '📍', name: 'Map Quiz' },
  { slug: 'jigsaw-puzzle',    icon: '🧩', name: 'Jigsaw Puzzle' },
  { slug: 'video-quiz',       icon: '🎬', name: 'Video Quiz' },
  { slug: 'letter-wheel',     icon: '🔠', name: 'Letter Wheel' },
  { slug: 'maze-run',         icon: '🌀', name: 'Maze Run' },
  { slug: 'speed-judge',      icon: '⚡', name: 'Speed Judge' },
  { slug: 'spell-it',         icon: '🔡', name: 'Spell It' },
  { slug: 'picture-answer',   icon: '🖼️', name: 'Picture Answer' },
  { slug: 'memory-recall',    icon: '💭', name: 'Memory Recall' },
  { slug: 'claim-line',       icon: '🎯', name: 'Claim Line' },
  { slug: 'opinion-cloud',    icon: '☁️', name: 'Opinion Cloud' },
  { slug: 'number-slider',    icon: '🎚️', name: 'Number Slider' },
]

/** DB slug -> the key ActivityPlayer's component map uses. */
export function normalizeConvertSlug(slug: string): string {
  return slug === 'word-search' ? 'wordsearch' : slug
}

export function convertTargetLabel(slug: string): string {
  return CONVERT_TARGETS.find((t) => t.slug === normalizeConvertSlug(slug))?.name ?? slug
}

/** All types except the game's own type, in list order. */
export function convertTargets(originalSlug: string): ConvertTarget[] {
  const orig = normalizeConvertSlug(originalSlug)
  return CONVERT_TARGETS.filter((t) => t.slug !== orig)
}

/**
 * Validate a ?as= value from the URL. Unknown slugs and the game's
 * own type resolve to null (plain original play) — never to an
 * invented type, and never to a crash.
 */
export function resolveConvertTarget(value: string | null, originalSlug: string): string | null {
  if (!value) return null
  const slug = normalizeConvertSlug(value.trim().toLowerCase())
  if (!slug || slug === normalizeConvertSlug(originalSlug)) return null
  return CONVERT_TARGETS.some((t) => t.slug === slug) ? slug : null
}

const hasLetter = (s: string): boolean => /\p{L}/u.test(s)

/** Plain reason per incompatible target — specific, never generic. */
const INCOMPATIBLE_REASONS: Record<string, string> = {
  'crossword':
    'Crossword needs answers that fit its grid, and words that do not fit are dropped — so this game’s questions are not forced into it.',
  'spin-wheel':
    'Spin Wheel picks a label to show, it does not ask the game’s questions — so playing these questions there would hide the questions.',
  'labelled-diagram':
    'Labelled Diagram needs an image with labels on it — these questions do not carry an image.',
  'dialogue':
    'Dialogue needs a conversation with speakers and lines — these questions are not a conversation.',
  'map-quiz':
    'Map Quiz needs map points with positions on an image — these questions do not carry map points.',
  'jigsaw-puzzle':
    'Jigsaw Puzzle needs a picture to rebuild — these questions do not carry a picture.',
  'video-quiz':
    'Video Quiz needs a video with questions timed to it — these questions do not carry a video.',
}

/**
 * Choice-round adapter (2026-11-07: Balloon Pop first, then the
 * universal-convert pass — Whack-a-Mole uses the same rule). One
 * round per question; the returned labels are the round's choices.
 * Pure and deterministic — the player shuffles before rendering,
 * exactly as it already does.
 *
 * - The question's OWN options win when it has them: distinct,
 *   non-empty, at least 2, and including the correct answer — the
 *   choices are the correct answer + its distractors, as saved.
 *   Capped at maxWrong + 1 labels, with the correct answer kept.
 * - Otherwise the wrong choices are borrowed from the OTHER items'
 *   answers (the Speed Judge pattern: another item's answer, nothing
 *   invented), up to maxWrong, distinct, never the correct answer.
 * - Returns null when a round cannot be formed: a single item with
 *   no options and nothing to borrow from has only one choice, so
 *   there is no choice to play — the gate keeps the plain
 *   cannot-play message instead of a one-choice giveaway round.
 * Exactly one returned label ever equals the item's answer.
 */
export function choiceRoundLabels(items: ActivityItem[], index: number, maxWrong = 3): string[] | null {
  const item = items[index]
  if (!item || !item.answer) return null
  const own = Array.from(new Set((item.answers ?? []).filter((a) => a !== '')))
  if (own.length >= 2 && own.includes(item.answer)) {
    const picked = own.slice(0, maxWrong + 1)
    return picked.includes(item.answer) ? picked : [item.answer, ...picked.slice(0, maxWrong)]
  }
  const borrowed = Array.from(
    new Set(items.map((i) => i.answer).filter((a) => a !== '' && a !== item.answer)),
  ).slice(0, maxWrong)
  if (borrowed.length === 0) return null
  return [item.answer, ...borrowed]
}

/** True when some OTHER item has a different, non-empty answer to
 *  borrow as a wrong choice — the shared "is there a choice at
 *  all" test for rounds that borrow their distractors. */
function hasBorrowableWrong(items: ActivityItem[], index: number): boolean {
  const answer = items[index]?.answer
  if (!answer) return false
  return items.some((i, j) => j !== index && i.answer !== '' && i.answer !== answer)
}

/**
 * Can the target type's EXISTING player play every item as-is?
 * Pure function, no mutation: it only reads items.
 */
export function canConvertTo(
  items: ActivityItem[],
  targetSlug: string,
): { ok: boolean; reason: string } {
  const target = normalizeConvertSlug(targetSlug)
  const label = convertTargetLabel(target)
  if (!items || items.length === 0) {
    return { ok: false, reason: 'This game has no questions to play in another type.' }
  }
  const every = (pred: (i: ActivityItem) => boolean): boolean => items.every(pred)

  switch (target) {
    // Plain prompt/answer players: Quiz-family builds options from
    // all answers; Match Up / Memory Match pair prompt+answer;
    // Flashcards flip prompt/answer; Typing Race shows the prompt
    // and checks the typed answer; Fill the Blank / Missing Word
    // show the prompt and check the answer (their own code handles
    // a prompt with no blank by showing the full prompt); Riddle
    // types the answer to the clue; Dictation speaks the answer
    // with the prompt as its title. Speed Judge shows the prompt
    // plus a claimed answer and the player judges it — a true
    // claim uses the item's own answer, a false claim another
    // item's answer, so no item is dropped and nothing is made
    // up. No item is dropped by any of these for a plain pair.
    case 'speed-judge':
    case 'quiz':
    case 'gameshow-quiz':
    case 'jump-path':
    case 'aster-quiz':
    case 'match-up':
    case 'memory-match':
    case 'flashcards':
    case 'typing-race':
    case 'fill-blank':
    case 'missing-word':
    case 'riddle':
    case 'dictation':
    // Picture Answer shows the prompt/clue plus options built
    // from the game's own answers, with the item's picture
    // when it carries one and an honest no-picture state when
    // it does not — so it plays every prompt/answer item
    // as-is, drops nothing, and invents no picture. Memory
    // Recall studies every prompt/answer pair and recalls
    // them — same plain pairs, nothing dropped, nothing
    // invented, no special item shape needed. Claim Line
    // answers ordinary questions from the game's items and
    // turns them into board moves — the board needs no
    // special item shape, so it plays every prompt/answer
    // item as-is, drops nothing, invents nothing. Opinion
    // Cloud turns every prompt into a statement to react
    // to — the item's answer is never shown and never
    // scored as a right answer, because opinions have no
    // right answer; nothing is dropped, nothing invented.
    // Open the Box reveals every item verbatim (prompt + answer
    // inside its own box) — no options, no choice, nothing
    // needed beyond the items themselves. Random Wheel's
    // segments ARE the game's questions: it picks one to answer
    // aloud and never shows the answers — unlike Spin Wheel,
    // whose segments are the answers, which would hide the
    // questions and spoil them (Spin Wheel stays refused).
    case 'picture-answer':
    case 'memory-recall':
    case 'claim-line':
    case 'opinion-cloud':
    case 'open-box':
    case 'random-wheel':
      return { ok: true, reason: '' }

    // Balloon Pop + Whack-a-Mole (2026-11-07, owner order then
    // universal pass): each question is one choice round — the
    // choices are the question's own options, or wrong choices
    // borrowed from other items' answers when it has none (the
    // shared choiceRoundLabels adapter; Whack-a-Mole's player
    // reads the same adapter, keeping its three correct moles).
    // A round needs at least two choices (one correct, one
    // wrong); a lone question with no options and nothing to
    // borrow keeps the plain message instead of a giveaway.
    case 'balloon-pop':
    case 'whack-a-mole':
      return items.every((_, i) => choiceRoundLabels(items, i) !== null)
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              `${label} needs at least two choices in every round — one of these questions has no options and no other answer to borrow a wrong choice from.`,
          }

    // Number Slider slides a marker to a number on a line, so
    // it needs every answer to BE a number: a word answer
    // has no position on the line, and refusing up front
    // beats dropping that item (convert never drops).
    case 'number-slider':
      return every((i) => parseNumberAnswer(i.answer) !== null)
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason: 'Number Slider needs every answer to be a number — some answers here are words, not numbers.',
          }

    // Hangman guesses the answer letter by letter; Letter Wheel
    // types the answer for a letter (its own code drops items with
    // no letter, so we refuse up front instead of dropping any).
    // Spell It spells the answer word letter by letter, so it
    // needs the same guard: a number-only answer has nothing to
    // spell, and refusing up front beats a free revealed round.
    case 'hangman':
    case 'letter-wheel':
    case 'spell-it':
      return every((i) => hasLetter(i.answer))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason: `${label} needs every answer to contain a letter — some answers here are numbers or symbols only.`,
          }

    // Anagram shuffles the answer's letters into tiles.
    case 'anagram':
      return every((i) => i.answer.replace(/\s/g, '').length >= 2)
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason: 'Anagram needs every answer to be at least 2 characters long — some answers here are too short.',
          }

    // Unjumble rearranges the answer's words; a one-word answer
    // has nothing to rearrange, so it would play as a giveaway.
    case 'unjumble':
      return every((i) => i.answer.trim().split(/\s+/).filter(Boolean).length >= 2)
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason: 'Unjumble needs every answer to have at least 2 words — some answers here are a single word.',
          }

    // True / False only makes sense when every answer IS true/false.
    // Any other answer would be silently treated as false by the
    // player, which would be a mangled game — so we refuse instead.
    case 'true-false':
      return every((i) => ['true', 'false'].includes(i.answer.trim().toLowerCase()))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason: 'True / False needs every answer to be true or false — these answers are not.',
          }

    // Word Search strips spaces and places the word in a 12×12 grid
    // of letters; longer words or non-letters cannot be placed
    // faithfully, so we refuse instead of truncating them.
    case 'wordsearch':
      return every((i) => /^[A-Za-z]{2,12}$/.test(i.answer.replace(/\s/g, '')))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason: 'Word Search needs every answer to be a single word of 2–12 letters — some answers here are longer, multi-word, or not letters.',
          }

    // Bingo's own player refuses games under 8 items ("Add at least
    // 8 items to play Bingo"), so we say so up front, in one place.
    case 'bingo':
      return items.length >= 8
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason: 'Bingo needs at least 8 items for its card — this game has fewer.',
          }

    // Categorize (2026-11-07 universal pass): the player derives
    // its buckets from the game's own answers — each question is
    // dragged into the bucket named by its answer. Nothing is
    // invented, but one bucket is no game: at least two distinct
    // answers are needed, or every question lands in the same
    // bucket with no choice to make.
    case 'categorize': {
      const distinct = new Set(items.map((i) => i.answer)).size
      return distinct >= 2
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Categorize needs at least two different answers to sort into — every answer here is the same, so there would be only one bucket.',
          }
    }

    // Order (2026-11-07 universal pass): the player takes the
    // items' saved order as the correct order and shuffles it for
    // play — for a times table that is the table order, for other
    // games the teacher's saved question order. Nothing is
    // invented; a single item has no order to arrange.
    case 'order':
      return items.length >= 2
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason: 'Order needs at least 2 items to arrange — this game has only one.',
          }

    // Maze Run (2026-11-07 universal pass): the maze itself is
    // generated from the game's own items — one maze per question,
    // tiles are the correct answer plus wrong answers borrowed
    // from the other items, exactly like Quiz builds options.
    // A round needs at least one wrong tile whose label differs
    // from the correct answer, or the maze has no choice in it.
    case 'maze-run':
      return items.every((_, i) => hasBorrowableWrong(items, i))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Maze Run needs at least one different answer to borrow as a wrong tile in every maze — one of these questions has no other answer to borrow from.',
          }

    default:
      return {
        ok: false,
        reason:
          INCOMPATIBLE_REASONS[target] ??
          `${label} needs its own special questions, so this game’s questions cannot be played in it without changing them.`,
      }
  }
}
