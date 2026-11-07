// BATCH 1 (final list item 35): Hangman clue questions.
//
// Hangman used to show only the game's own hint — for programme
// games that is just "{Subject} word" ("History word"), so the kid
// guessed letters blind with no idea what the word was. Before the
// kid guesses a word, the game now shows 3 clue questions whose
// answers point to the word — all taken from the game's own item, so
// no fact is ever invented:
//   1. What kind of word is it? — the item's own hint, cleaned so
//      the answer can never appear in it (the crossword-clue rule).
//   2. How many letters? — the count of letters in the answer.
//   3. What letter does it start with? — the answer's first letter.

import { crosswordClue } from './crossword-clue'

export interface HangmanClues {
  /** The item's own hint, never containing the answer. */
  kind: string
  /** Number of letters (A–Z only) in the word. */
  letters: number
  /** The word's first letter, upper-case. */
  first: string
}

export function hangmanClues(prompt: string, answer: string): HangmanClues {
  const letters = answer.split('').filter((c) => /[A-Za-z]/.test(c))
  const first = letters.length > 0 ? letters[0].toUpperCase() : ''
  return {
    kind: crosswordClue(prompt, answer),
    letters: letters.length,
    first,
  }
}
