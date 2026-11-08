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
import { canBuildSweetMatchTarget } from '@/lib/sweet-match'
import { sequenceTerms, borrowNumericWrongAnswers, RIVER_HOP_MIN_NUMERIC_WRONGS } from '@/lib/river-hop'
import { borrowWrongAnswers as borrowLaneRunnerWrongAnswers, LANE_RUNNER_MAX_WRONGS } from '@/lib/lane-runner'
import { buildBlockDropRound } from '@/lib/block-drop'
import { buildSlingshotAimRound } from '@/lib/slingshot-aim'
import { buildBrickBounceRound } from '@/lib/brick-bounce'
import { buildRockBlasterRound } from '@/lib/rock-blaster'
import { buildLadderClimbRound } from '@/lib/ladder-climb'
import { buildBeatTapRound } from '@/lib/beat-tap'
import { buildMineLogicRound } from '@/lib/mine-logic'
import { buildBounceUpRound } from '@/lib/bounce-up'
import { buildCreatureCatchRound } from '@/lib/creature-catch'
import { buildPaddleGoalRound } from '@/lib/paddle-goal'
import { buildSnookerQuizRound } from '@/lib/snooker-quiz'
import { buildPatternEchoRound } from '@/lib/pattern-echo'
import { buildBombMazeRoundForConvert } from '@/lib/bomb-maze'
import { buildHiddenHuntRound } from '@/lib/hidden-hunt'
import { buildFlipperBallRound } from '@/lib/flipper-ball'

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
  { slug: 'maze-chase',      icon: '👻', name: 'Maze Chase' },
  { slug: 'apple-snake',     icon: '🍎', name: 'Apple Snake' },
  { slug: 'flutter-flight',  icon: '🐦', name: 'Flutter Flight' },
  { slug: 'sweet-match',     icon: '🍬', name: 'Sweet Match' },
  { slug: 'star-shooter',    icon: '👾', name: 'Star Shooter' },
  { slug: 'jump-blocks',     icon: '🧱', name: 'Jump Blocks' },
  { slug: 'fruit-slice',      icon: '🍉', name: 'Fruit Slice' },
  { slug: 'river-hop',       icon: '🌊', name: 'River Hop' },
  { slug: 'lane-runner',      icon: '🏃', name: 'Lane Runner' },
  { slug: 'block-drop',       icon: '🧱', name: 'Block Drop' },
  { slug: 'slingshot-aim',    icon: '🎯', name: 'Slingshot Aim' },
  { slug: 'brick-bounce',     icon: '🧱', name: 'Brick Bounce' },
  { slug: 'rock-blaster',      icon: '🪨', name: 'Rock Blaster' },
  { slug: 'ladder-climb',      icon: '🪜', name: 'Ladder Climb' },
  { slug: 'beat-tap',          icon: '🥁', name: 'Beat Tap' },
  { slug: 'mine-logic',        icon: '🧩', name: 'Mine Logic' },
  { slug: 'number-merge',      icon: '🔢', name: 'Number Merge' },
  { slug: 'bounce-up',         icon: '⬆️', name: 'Bounce Up' },
  { slug: 'creature-catch',   icon: '🐾', name: 'Creature Catch' },
  { slug: 'paddle-goal',      icon: '⚽', name: 'Paddle Goal' },
  { slug: 'snooker-quiz',     icon: '🎱', name: 'Snooker Quiz' },
  { slug: 'pattern-echo',     icon: '🎵', name: 'Pattern Echo' },
  { slug: 'bomb-maze',       icon: '💣', name: 'Bomb Maze' },
  { slug: 'hidden-hunt',     icon: '🔍', name: 'Hidden Hunt' },
  { slug: 'flipper-ball',     icon: '🎱', name: 'Flipper Ball' },
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

    // Maze Chase (type 41): the maze is generated from the game's
    // own items — one maze per question, pellets are the correct
    // answer plus wrong answers borrowed from the other items,
    // exactly like Maze Run. A round needs at least one wrong
    // pellet whose label differs from the correct answer, or the
    // maze has no choice in it.
    case 'maze-chase':
      return items.every((_, i) => hasBorrowableWrong(items, i))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Maze Chase needs at least one different answer to borrow as a wrong ball in every maze — one of these questions has no other answer to borrow from.',
          }

    // Apple Snake (type 42): the garden is generated from the game's
    // own items — one garden per question, apples are the correct
    // answer plus wrong answers borrowed from the other items,
    // exactly like Maze Run. A round needs at least one wrong
    // apple whose label differs from the correct answer, or the
    // garden has no choice in it.
    case 'apple-snake':
      return items.every((_, i) => hasBorrowableWrong(items, i))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Apple Snake needs at least one different answer to borrow as a wrong apple in every garden — one of these questions has no other answer to borrow from.',
          }

    // Flutter Flight (type 43): the sky is generated from the game's
    // own items — one sky per question, gates are the correct
    // answer plus wrong answers borrowed from the other items,
    // exactly like Maze Run. A round needs at least one wrong
    // gate whose label differs from the correct answer, or the
    // sky has no choice in it.
    case 'flutter-flight':
      return items.every((_, i) => hasBorrowableWrong(items, i))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Flutter Flight needs at least one different answer to borrow as a wrong gate in every sky — one of these questions has no other answer to borrow from.',
          }

    // Sweet Match (type 44): the board is generated from the game's
    // own items — one board per question, the target is the item's
    // own sum (parsed out of the question, only when it really
    // equals the answer) or the answer's first three letters. A
    // round needs one of those, or the board has no target in it.
    case 'sweet-match':
      return items.every((item) => item.prompt && item.answer && canBuildSweetMatchTarget(item.prompt, item.answer))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Sweet Match needs every question to hold a simple sum or an answer of at least 3 letters — one of these questions has neither, so it has no target to match.',
          }

    // Star Shooter (type 45): the sky is generated from the game's
    // own items — one sky per question, the invaders are the
    // correct answer plus wrong answers borrowed from the other
    // items, exactly like Flutter Flight. A round needs at least
    // one wrong invader whose label differs from the correct
    // answer, or the sky has no choice in it.
    case 'star-shooter':
      return items.every((_, i) => hasBorrowableWrong(items, i))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Star Shooter needs at least one different answer to borrow as a wrong invader in every sky — one of these questions has no other answer to borrow from.',
          }

    // Jump Blocks (type 46): the level is generated from the game's
    // own items — one level per question, the blocks are the
    // correct answer plus wrong answers borrowed from the other
    // items, exactly like Star Shooter. A round needs at least
    // one wrong block whose label differs from the correct
    // answer, or the level has no choice in it.
    case 'jump-blocks':
      return items.every((_, i) => hasBorrowableWrong(items, i))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Jump Blocks needs at least one different answer to borrow as a wrong block in every level — one of these questions has no other answer to borrow from.',
          }

    // Fruit Slice (type 47): the round is generated from the game's
    // own items — one round per question, the fruits are the
    // correct answer plus wrong answers borrowed from the other
    // items, exactly like Jump Blocks, plus one bomb fruit. A round
    // needs at least one wrong fruit whose label differs from the
    // correct answer, or the round has no choice in it.
    case 'fruit-slice':
      return items.every((_, i) => hasBorrowableWrong(items, i))
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Fruit Slice needs at least one different answer to borrow as a wrong fruit in every round — one of these questions has no other answer to borrow from.',
          }

    // River Hop (type 48): the round is generated from the game's
    // own items — one round per question, the pads are the three
    // counting numbers before the item's own answer (at the
    // question's counting step) plus wrong numbers borrowed from
    // the other items. A round needs a whole-number answer of 4
    // or more and at least two different number answers to borrow.
    case 'river-hop':
      return items.every((item) => {
        const seq = sequenceTerms(item.prompt, item.answer)
        if (!seq) return false
        const wrongs = borrowNumericWrongAnswers(
          items.map((i) => i.answer),
          item.answer,
          seq.terms,
        )
        return wrongs.length >= RIVER_HOP_MIN_NUMERIC_WRONGS
      })
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'River Hop needs every question to have a whole-number answer of 4 or more, with at least two different number answers to borrow as wrong pads — one of these questions does not.',
          }

    // Lane Runner (type 49): the round is generated from the
    // game's own items — one round per question, the gates are
    // the item's own answer plus two wrong answers borrowed from
    // the other items. A round needs at least two different
    // answers to borrow, or the gates have no choice in them.
    case 'lane-runner':
      return items.every((item) => {
        const wrongs = borrowLaneRunnerWrongAnswers(
          items.map((i) => i.answer),
          item.answer,
        )
        return wrongs.length >= LANE_RUNNER_MAX_WRONGS
      })
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Lane Runner needs at least two different answers to borrow as wrong gates in every round — one of these questions has no other answers to borrow from.',
          }

    // Block Drop (type 50): the round is generated from the
    // game's own items — one round per question, the falling
    // blocks are the item's own target characters plus borrowed
    // distractors. A round needs a word answer of 3–6 letters
    // or a whole-number answer of 0–27; any other answer builds
    // no round.
    case 'block-drop':
      return items.every((item) =>
        buildBlockDropRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Block Drop needs every answer to be a word of 3–6 letters or a whole number up to 27 — one of these questions does not.',
          }

    // Slingshot Aim (type 51): the round is generated from the
    // game's own items — one round per question, the towers are
    // the item's own answer plus two wrong answers borrowed from
    // the other items. A round needs at least two different
    // answers to borrow, or the towers have no choice in them.
    case 'slingshot-aim':
      return items.every((item) =>
        buildSlingshotAimRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Slingshot Aim needs at least two different answers to borrow as wrong towers in every round — one of these questions has no other answers to borrow from.',
          }

    // Brick Bounce (type 52): the round is generated from the
    // game's own items — one wall per question, the correct
    // answer on 3 bricks and wrong answers borrowed from the
    // other items on the rest. A round needs at least two
    // different answers to borrow, or the wall has no choice
    // in it.
    case 'brick-bounce':
      return items.every((item) =>
        buildBrickBounceRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Brick Bounce needs at least two different answers to borrow as wrong bricks in every round — one of these questions has no other answers to borrow from.',
          }

    // Rock Blaster (type 53): the round is generated from the
    // game's own items — one sky per question, the correct
    // answer on one asteroid and wrong answers borrowed from
    // the other items on the rest. A round needs at least two
    // different answers to borrow, or the sky has no choice
    // in it.
    case 'rock-blaster':
      return items.every((item) =>
        buildRockBlasterRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Rock Blaster needs at least two different answers to borrow as wrong asteroids in every round — one of these questions has no other answers to borrow from.',
          }

    // Ladder Climb (type 54): the round is generated from the
    // game's own items — one tower per question, the correct
    // answer at the top of one ladder and wrong answers borrowed
    // from the other items at the tops of the rest. A round needs
    // at least two different answers to borrow, or the tower has
    // no choice in it.
    case 'ladder-climb':
      return items.every((item) =>
        buildLadderClimbRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Ladder Climb needs at least two different answers to borrow as wrong ladders in every round — one of these questions has no other answers to borrow from.',
          }

    // Beat Tap (type 55): the round is generated from the
    // game's own items — one track per question, the correct
    // answer on one falling note and wrong answers borrowed
    // from the other items on the rest. A round needs at
    // least two different answers to borrow, or the track has
    // no choice in it.
    case 'beat-tap':
      return items.every((item) =>
        buildBeatTapRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Beat Tap needs at least two different answers to borrow as wrong notes in every round — one of these questions has no other answers to borrow from.',
          }

    // Mine Logic (type 56): the round is generated from the
    // game's own items — one grid per round, every square
    // opened by answering a quick question from the game's
    // items, the right answer plus wrong answers borrowed
    // from the other items. The whole list builds one queue,
    // so it needs at least three different answers across
    // the game, or the questions have no choice in them.
    case 'mine-logic':
      return buildMineLogicRound(items)
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Mine Logic needs at least three different answers across the game to borrow as wrong choices — one of these questions has no other answers to borrow from.',
          }

    // Number Merge (type 57): the board makes its own numbers
    // — each round starts with six tiles that add up to the
    // target, and every merge is a sum on the board — so any
    // game converts, even one with no items at all. The game's
    // items are kept but not needed for play.
    case 'number-merge':
      return { ok: true, reason: '' }

    // Bounce Up (type 58): the climb is generated from the
    // game's own items, one round per question, so any
    // question list where every item has at least two
    // different answers to borrow as wrong platforms plays.
    case 'bounce-up':
      return items.every((item) =>
        buildBounceUpRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Bounce Up needs at least two different answers to borrow as wrong platforms in every round — one of these questions has no other answers to borrow from.',
          }

    // Paddle Goal (type 60): the top wall is generated from
    // the game's own items — one set of goal mouths per question,
    // the correct answer on one goal and wrong answers borrowed
    // from the other items on the other two. A round needs at
    // least two different answers to borrow, or the top has no
    // choice in it.
    case 'paddle-goal':
      return items.every((item) =>
        buildPaddleGoalRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Paddle Goal needs at least two different answers to borrow as wrong goals in every round — one of these questions has no other answers to borrow from.',
          }

    // Snooker Quiz (type 65): the table is generated from
    // the game's own items, one round per question, so any
    // question list where every item has at least three
    // different answers to borrow as wrong balls plays.
    case 'snooker-quiz':
      return items.every((item) =>
        buildSnookerQuizRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Snooker Quiz needs at least three different answers to borrow as wrong balls in every round — one of these questions has no other answers to borrow from.',
          }

    // Pattern Echo (type 61): the pattern is generated from
    // the game's own items, one round per question, so any
    // question list where every item has at least three
    // different answers to borrow as wrong pads plays.
    case 'pattern-echo':
      return items.every((item, i) =>
        buildPatternEchoRound(
          item.prompt,
          item.answer,
          items.map((x) => x.answer),
          i,
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Pattern Echo needs at least three different answers to borrow as wrong pads in every round — one of these questions has no other answers to borrow from.',
          }

    // Creature Catch (type 59): the meadow is generated from
    // the game's own items, one round per question, so any
    // question list where every item has at least two
    // different answers to borrow as wrong creatures plays.
    case 'creature-catch':
      return items.every((item) =>
        buildCreatureCatchRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Creature Catch needs at least two different answers to borrow as wrong creatures in every round — one of these questions has no other answers to borrow from.',
          }

    // Bomb Maze (type 64): the maze is generated from the
    // game's own items, one round per question, so any
    // question list where every item has at least two
    // different answers to borrow as wrong stars plays.
    case 'bomb-maze':
      return items.every((item) =>
        buildBombMazeRoundForConvert(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Bomb Maze needs at least two different answers to borrow as wrong stars in every round — one of these questions has no other answers to borrow from.',
          }

    // Hidden Hunt (type 62): the clearing is generated from
    // the game's own items, one round per question, so any
    // question list where every item has at least five
    // different answers to borrow as wrong hiding places plays.
    // Hidden Hunt (type 62): the clearing is generated from
    // the game's own items, one round per question, so any
    // question list where every item has at least five
    // different answers to borrow as wrong hiding places plays.
    case 'hidden-hunt':
      return items.every((item) =>
        buildHiddenHuntRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Hidden Hunt needs at least five different answers to borrow as wrong hiding places in every round — one of these questions has no other answers to borrow from.',
          }

    // Flipper Ball (type 63): the table is generated from
    // the game's own items, one round per question, so any
    // question list where every item has at least two
    // different answers to borrow as wrong targets plays.
    case 'flipper-ball':
      return items.every((item) =>
        buildFlipperBallRound(
          item.prompt,
          item.answer,
          items.map((i) => i.answer),
        ),
      )
        ? { ok: true, reason: '' }
        : {
            ok: false,
            reason:
              'Flipper Ball needs at least two different answers to borrow as wrong targets in every round — one of these questions has no other answers to borrow from.',
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
