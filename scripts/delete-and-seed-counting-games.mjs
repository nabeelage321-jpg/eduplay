import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// 20 Unique Math Games for Pre-K Counting (1-10)
const countingGames = [
  {
    title: 'Counting Quiz',
    description: 'Answer multiple choice questions about counting 1-10',
    type: 'quiz',
    content: {
      questions: [
        { question: 'How many 🍎 are there?', options: ['2', '3', '4', '5'], correct: 1, emoji: '🍎🍎🍎' },
        { question: 'Count the ⭐', options: ['4', '5', '6', '7'], correct: 2, emoji: '⭐⭐⭐⭐⭐⭐' },
        { question: 'How many 🐝?', options: ['1', '2', '3', '4'], correct: 1, emoji: '🐝🐝' },
        { question: 'Count the 🌻', options: ['5', '6', '7', '8'], correct: 1, emoji: '🌻🌻🌻🌻🌻🌻' },
        { question: 'How many 🦋?', options: ['3', '4', '5', '6'], correct: 2, emoji: '🦋🦋🦋🦋🦋' },
        { question: 'Count the 🐠', options: ['2', '3', '4', '5'], correct: 0, emoji: '🐠🐠' },
        { question: 'How many 🍊?', options: ['6', '7', '8', '9'], correct: 2, emoji: '🍊🍊🍊🍊🍊🍊🍊🍊' },
        { question: 'Count the 🎈', options: ['1', '2', '3', '4'], correct: 3, emoji: '🎈🎈🎈🎈' },
        { question: 'How many 🌸?', options: ['5', '6', '7', '8'], correct: 0, emoji: '🌸🌸🌸🌸🌸' },
        { question: 'Count the 🐢', options: ['3', '4', '5', '6'], correct: 1, emoji: '🐢🐢🐢🐢' },
      ],
    },
  },
  {
    title: 'Match Numbers to Objects',
    description: 'Match the number to the correct number of objects',
    type: 'match-up',
    content: {
      pairs: [
        { left: '1', right: '🍎' },
        { left: '2', right: '🍎🍎' },
        { left: '3', right: '🍎🍎🍎' },
        { left: '4', right: '🌻🌻🌻🌻' },
        { left: '5', right: '⭐⭐⭐⭐⭐' },
        { left: '6', right: '🐝🐝🐝🐝🐝🐝' },
        { left: '7', right: '🎈🎈🎈🎈🎈🎈🎈' },
        { left: '8', right: '🐠🐠🐠🐠🐠🐠🐠🐠' },
        { left: '9', right: '🦋🦋🦋🦋🦋🦋🦋🦋🦋' },
        { left: '10', right: '🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸' },
      ],
    },
  },
  {
    title: 'Unscramble Number Words',
    description: 'Unscramble the letters to spell number words',
    type: 'anagram',
    content: {
      words: [
        { scrambled: 'ENO', answer: 'ONE', hint: '1' },
        { scrambled: 'OWT', answer: 'TWO', hint: '2' },
        { scrambled: 'EERTH', answer: 'THREE', hint: '3' },
        { scrambled: 'RUFO', answer: 'FOUR', hint: '4' },
        { scrambled: 'FEVI', answer: 'FIVE', hint: '5' },
        { scrambled: 'XIS', answer: 'SIX', hint: '6' },
        { scrambled: 'EVENS', answer: 'SEVEN', hint: '7' },
        { scrambled: 'HTIEGY', answer: 'EIGHT', hint: '8' },
        { scrambled: 'ENIN', answer: 'NINE', hint: '9' },
        { scrambled: 'NET', answer: 'TEN', hint: '10' },
      ],
    },
  },
  {
    title: 'Counting Crossword',
    description: 'Fill in number words in the crossword puzzle',
    type: 'crossword',
    content: {
      clues: [
        { number: 1, clue: '1st number', answer: 'ONE', direction: 'across', row: 0, col: 0 },
        { number: 2, clue: 'After one', answer: 'TWO', direction: 'across', row: 1, col: 0 },
        { number: 3, clue: '1 + 2', answer: 'THREE', direction: 'across', row: 2, col: 0 },
        { number: 4, clue: '2 × 2', answer: 'FOUR', direction: 'down', row: 0, col: 2 },
        { number: 5, clue: 'Hand fingers', answer: 'FIVE', direction: 'down', row: 0, col: 4 },
        { number: 6, clue: 'After five', answer: 'SIX', direction: 'across', row: 3, col: 0 },
        { number: 7, clue: 'Lucky number', answer: 'SEVEN', direction: 'across', row: 4, col: 0 },
        { number: 8, clue: 'One + seven', answer: 'EIGHT', direction: 'down', row: 2, col: 5 },
        { number: 9, clue: 'Before ten', answer: 'NINE', direction: 'across', row: 5, col: 0 },
        { number: 10, clue: 'Final digit', answer: 'TEN', direction: 'down', row: 4, col: 2 },
      ],
    },
  },
  {
    title: 'Number Word Search',
    description: 'Find hidden number words in the grid',
    type: 'word-search',
    content: {
      words: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN'],
      grid: [
        ['O', 'N', 'E', 'X', 'T', 'H', 'R', 'E', 'E'],
        ['T', 'W', 'O', 'Z', 'F', 'O', 'U', 'R', 'L'],
        ['F', 'I', 'V', 'E', 'A', 'S', 'I', 'X', 'M'],
        ['S', 'E', 'V', 'E', 'N', 'B', 'E', 'I', 'G'],
        ['H', 'T', 'N', 'I', 'N', 'E', 'C', 'T', 'E'],
        ['T', 'E', 'N', 'D', 'O', 'U', 'R', 'P', 'N'],
      ],
    },
  },
  {
    title: 'Spin Wheel Count',
    description: 'Spin the wheel and count the items',
    type: 'spin-wheel',
    content: {
      items: [
        { label: 'Count 1️⃣', question: 'How many?', answer: '1' },
        { label: 'Count 2️⃣', question: 'How many?', answer: '2' },
        { label: 'Count 3️⃣', question: 'How many?', answer: '3' },
        { label: 'Count 4️⃣', question: 'How many?', answer: '4' },
        { label: 'Count 5️⃣', question: 'How many?', answer: '5' },
        { label: 'Count 6️⃣', question: 'How many?', answer: '6' },
        { label: 'Count 7️⃣', question: 'How many?', answer: '7' },
        { label: 'Count 8️⃣', question: 'How many?', answer: '8' },
        { label: 'Count 9️⃣', question: 'How many?', answer: '9' },
        { label: 'Count 🔟', question: 'How many?', answer: '10' },
      ],
    },
  },
  {
    title: 'Pop the Balloons',
    description: 'Pop the balloon with the correct count',
    type: 'balloon-pop',
    content: {
      rounds: [
        { question: 'Pop 3 balloons', balloons: [{ value: 2, correct: false }, { value: 3, correct: true }, { value: 4, correct: false }, { value: 5, correct: false }] },
        { question: 'Pop 5 balloons', balloons: [{ value: 4, correct: false }, { value: 5, correct: true }, { value: 6, correct: false }, { value: 7, correct: false }] },
        { question: 'Pop 7 balloons', balloons: [{ value: 6, correct: false }, { value: 7, correct: true }, { value: 8, correct: false }, { value: 9, correct: false }] },
        { question: 'Pop 2 balloons', balloons: [{ value: 1, correct: false }, { value: 2, correct: true }, { value: 3, correct: false }, { value: 4, correct: false }] },
        { question: 'Pop 9 balloons', balloons: [{ value: 8, correct: false }, { value: 9, correct: true }, { value: 10, correct: false }, { value: 7, correct: false }] },
        { question: 'Pop 1 balloon', balloons: [{ value: 0, correct: false }, { value: 1, correct: true }, { value: 2, correct: false }, { value: 3, correct: false }] },
        { question: 'Pop 6 balloons', balloons: [{ value: 5, correct: false }, { value: 6, correct: true }, { value: 7, correct: false }, { value: 8, correct: false }] },
        { question: 'Pop 10 balloons', balloons: [{ value: 9, correct: false }, { value: 10, correct: true }, { value: 8, correct: false }, { value: 7, correct: false }] },
        { question: 'Pop 4 balloons', balloons: [{ value: 3, correct: false }, { value: 4, correct: true }, { value: 5, correct: false }, { value: 6, correct: false }] },
        { question: 'Pop 8 balloons', balloons: [{ value: 7, correct: false }, { value: 8, correct: true }, { value: 9, correct: false }, { value: 6, correct: false }] },
      ],
    },
  },
  {
    title: 'Whack the Mole',
    description: 'Whack the mole with the correct number',
    type: 'whack-a-mole',
    content: {
      rounds: [
        { question: 'Whack 1 mole', moles: [{ value: 1, correct: true }, { value: 2, correct: false }, { value: 3, correct: false }, { value: 4, correct: false }] },
        { question: 'Whack 2 moles', moles: [{ value: 1, correct: false }, { value: 2, correct: true }, { value: 3, correct: false }, { value: 4, correct: false }] },
        { question: 'Whack 3 moles', moles: [{ value: 2, correct: false }, { value: 3, correct: true }, { value: 4, correct: false }, { value: 5, correct: false }] },
        { question: 'Whack 5 moles', moles: [{ value: 4, correct: false }, { value: 5, correct: true }, { value: 6, correct: false }, { value: 7, correct: false }] },
        { question: 'Whack 7 moles', moles: [{ value: 6, correct: false }, { value: 7, correct: true }, { value: 8, correct: false }, { value: 9, correct: false }] },
        { question: 'Whack 10 moles', moles: [{ value: 9, correct: false }, { value: 10, correct: true }, { value: 8, correct: false }, { value: 6, correct: false }] },
        { question: 'Whack 4 moles', moles: [{ value: 3, correct: false }, { value: 4, correct: true }, { value: 5, correct: false }, { value: 6, correct: false }] },
        { question: 'Whack 6 moles', moles: [{ value: 5, correct: false }, { value: 6, correct: true }, { value: 7, correct: false }, { value: 8, correct: false }] },
        { question: 'Whack 8 moles', moles: [{ value: 7, correct: false }, { value: 8, correct: true }, { value: 9, correct: false }, { value: 10, correct: false }] },
        { question: 'Whack 9 moles', moles: [{ value: 8, correct: false }, { value: 9, correct: true }, { value: 10, correct: false }, { value: 7, correct: false }] },
      ],
    },
  },
  {
    title: 'True or False Counting',
    description: 'Is the counting statement true or false?',
    type: 'true-false',
    content: {
      statements: [
        { statement: '1 + 1 = 2', isTrue: true, emoji: '🍎🍎' },
        { statement: '2 + 2 = 5', isTrue: false, emoji: '🍎🍎🍎🍎🍎' },
        { statement: '3 + 2 = 5', isTrue: true, emoji: '🌻🌻🌻🌻🌻' },
        { statement: '4 + 1 = 6', isTrue: false, emoji: '⭐⭐⭐⭐⭐⭐' },
        { statement: '5 + 1 = 6', isTrue: true, emoji: '🎈🎈🎈🎈🎈🎈' },
        { statement: '6 - 1 = 4', isTrue: false, emoji: '🐝🐝🐝🐝' },
        { statement: '7 + 1 = 8', isTrue: true, emoji: '🐠🐠🐠🐠🐠🐠🐠🐠' },
        { statement: '8 - 2 = 5', isTrue: false, emoji: '🦋🦋🦋🦋🦋' },
        { statement: '9 + 1 = 10', isTrue: true, emoji: '🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸' },
        { statement: '10 - 5 = 3', isTrue: false, emoji: '🌻🌻🌻' },
      ],
    },
  },
  {
    title: 'Categorize Numbers',
    description: 'Sort numbers into Small (1-5) and Big (6-10)',
    type: 'categorize',
    content: {
      categories: [
        { name: 'Small (1-5)', items: [] },
        { name: 'Big (6-10)', items: [] },
      ],
      items: [
        { text: '1', category: 'Small (1-5)' },
        { text: '3', category: 'Small (1-5)' },
        { text: '5', category: 'Small (1-5)' },
        { text: '7', category: 'Big (6-10)' },
        { text: '9', category: 'Big (6-10)' },
        { text: '2', category: 'Small (1-5)' },
        { text: '4', category: 'Small (1-5)' },
        { text: '6', category: 'Big (6-10)' },
        { text: '8', category: 'Big (6-10)' },
        { text: '10', category: 'Big (6-10)' },
      ],
    },
  },
  {
    title: 'Order the Numbers',
    description: 'Arrange numbers in the correct sequence',
    type: 'order',
    content: {
      rounds: [
        { items: [{ text: '3', order: 3 }, { text: '1', order: 1 }, { text: '2', order: 2 }], instruction: 'Arrange in order' },
        { items: [{ text: '5', order: 5 }, { text: '3', order: 3 }, { text: '4', order: 4 }], instruction: 'Arrange in order' },
        { items: [{ text: '7', order: 7 }, { text: '6', order: 6 }, { text: '8', order: 8 }], instruction: 'Arrange in order' },
        { items: [{ text: '2', order: 2 }, { text: '4', order: 4 }, { text: '1', order: 1 }, { text: '3', order: 3 }], instruction: 'Arrange in order' },
        { items: [{ text: '10', order: 10 }, { text: '8', order: 8 }, { text: '9', order: 9 }], instruction: 'Arrange in order' },
        { items: [{ text: '6', order: 6 }, { text: '4', order: 4 }, { text: '5', order: 5 }], instruction: 'Arrange in order' },
        { items: [{ text: '1', order: 1 }, { text: '3', order: 3 }, { text: '2', order: 2 }, { text: '4', order: 4 }], instruction: 'Arrange in order' },
        { items: [{ text: '9', order: 9 }, { text: '7', order: 7 }, { text: '8', order: 8 }], instruction: 'Arrange in order' },
        { items: [{ text: '5', order: 5 }, { text: '3', order: 3 }, { text: '4', order: 4 }, { text: '6', order: 6 }], instruction: 'Arrange in order' },
        { items: [{ text: '2', order: 2 }, { text: '1', order: 1 }, { text: '3', order: 3 }, { text: '4', order: 4 }, { text: '5', order: 5 }], instruction: 'Arrange in order' },
      ],
    },
  },
  {
    title: 'Fill the Blank',
    description: 'Complete the counting sequence',
    type: 'fill-blank',
    content: {
      sentences: [
        { text: '1, 2, ___, 4, 5', blank: 3, answer: '3', options: ['2', '3', '4', '5'] },
        { text: '2, ___, 4, 5, 6', blank: 1, answer: '3', options: ['1', '2', '3', '4'] },
        { text: '5, 6, 7, ___, 9', blank: 1, answer: '8', options: ['7', '8', '9', '10'] },
        { text: '___, 2, 3, 4, 5', blank: 0, answer: '1', options: ['0', '1', '2', '3'] },
        { text: '7, 8, ___, 10', blank: 1, answer: '9', options: ['8', '9', '10', '11'] },
        { text: '3, ___, 5, 6, 7', blank: 1, answer: '4', options: ['3', '4', '5', '6'] },
        { text: '6, 7, ___, 9, 10', blank: 1, answer: '8', options: ['7', '8', '9', '10'] },
        { text: '1, ___, 3, 4', blank: 1, answer: '2', options: ['1', '2', '3', '4'] },
        { text: '8, 9, ___, 11', blank: 1, answer: '10', options: ['9', '10', '11', '12'] },
        { text: '___, 6, 7, 8, 9', blank: 0, answer: '5', options: ['4', '5', '6', '7'] },
      ],
    },
  },
  {
    title: 'Labelled Diagram',
    description: 'Click the correct part of the counting diagram',
    type: 'labelled-diagram',
    content: {
      image: 'counting-diagram',
      labels: [
        { id: 'one', text: '1', x: 10, y: 10, answer: 'one' },
        { id: 'two', text: '2', x: 30, y: 10, answer: 'two' },
        { id: 'three', text: '3', x: 50, y: 10, answer: 'three' },
        { id: 'four', text: '4', x: 70, y: 10, answer: 'four' },
        { id: 'five', text: '5', x: 10, y: 50, answer: 'five' },
        { id: 'six', text: '6', x: 30, y: 50, answer: 'six' },
        { id: 'seven', text: '7', x: 50, y: 50, answer: 'seven' },
        { id: 'eight', text: '8', x: 70, y: 50, answer: 'eight' },
        { id: 'nine', text: '9', x: 10, y: 90, answer: 'nine' },
        { id: 'ten', text: '10', x: 30, y: 90, answer: 'ten' },
      ],
    },
  },
  {
    title: 'Counting Flashcards',
    description: 'Flip the card to see the count',
    type: 'flashcards',
    content: {
      cards: [
        { front: 'ONE', back: '1 🍎', emoji: '🍎' },
        { front: 'TWO', back: '2 🍎🍎', emoji: '🍎' },
        { front: 'THREE', back: '3 🌻🌻🌻', emoji: '🌻' },
        { front: 'FOUR', back: '4 ⭐⭐⭐⭐', emoji: '⭐' },
        { front: 'FIVE', back: '5 🎈🎈🎈🎈🎈', emoji: '🎈' },
        { front: 'SIX', back: '6 🐝🐝🐝🐝🐝🐝', emoji: '🐝' },
        { front: 'SEVEN', back: '7 🎨🎨🎨🎨🎨🎨🎨', emoji: '🎨' },
        { front: 'EIGHT', back: '8 🐠🐠🐠🐠🐠🐠🐠🐠', emoji: '🐠' },
        { front: 'NINE', back: '9 🦋🦋🦋🦋🦋🦋🦋🦋🦋', emoji: '🦋' },
        { front: 'TEN', back: '10 🌸🌸🌸🌸🌸🌸🌸🌸🌸🌸', emoji: '🌸' },
      ],
    },
  },
  {
    title: 'Missing Word Count',
    description: 'Find the missing number word',
    type: 'missing-word',
    content: {
      sentences: [
        { text: '___ is after zero', missing: 'ONE', options: ['ONE', 'TWO', 'THREE', 'FOUR'] },
        { text: '___ comes after one', missing: 'TWO', options: ['ONE', 'TWO', 'THREE', 'FOUR'] },
        { text: '___ is one plus two', missing: 'THREE', options: ['TWO', 'THREE', 'FOUR', 'FIVE'] },
        { text: '___ is two times two', missing: 'FOUR', options: ['THREE', 'FOUR', 'FIVE', 'SIX'] },
        { text: '___ is your hand fingers', missing: 'FIVE', options: ['FOUR', 'FIVE', 'SIX', 'SEVEN'] },
        { text: '___ comes after five', missing: 'SIX', options: ['FIVE', 'SIX', 'SEVEN', 'EIGHT'] },
        { text: '___ is a lucky number', missing: 'SEVEN', options: ['SIX', 'SEVEN', 'EIGHT', 'NINE'] },
        { text: '___ is after seven', missing: 'EIGHT', options: ['SEVEN', 'EIGHT', 'NINE', 'TEN'] },
        { text: '___ is before ten', missing: 'NINE', options: ['EIGHT', 'NINE', 'TEN', 'ELEVEN'] },
        { text: '___ is the last digit', missing: 'TEN', options: ['NINE', 'TEN', 'ELEVEN', 'TWELVE'] },
      ],
    },
  },
  {
    title: 'Unjumble Sentences',
    description: 'Arrange jumbled number words',
    type: 'unjumble',
    content: {
      sentences: [
        { jumbled: ['THREE', 'IS', 'THIS'], correct: ['THIS', 'IS', 'THREE'] },
        { jumbled: ['FINGERS', 'FIVE', 'ARE'], correct: ['FIVE', 'ARE', 'FINGERS'] },
        { jumbled: ['TEN', 'LAST', 'IS'], correct: ['TEN', 'IS', 'LAST'] },
        { jumbled: ['SEVEN', 'LUCKY', 'IS'], correct: ['SEVEN', 'IS', 'LUCKY'] },
        { jumbled: ['FOUR', 'CHAIRS', 'ARE'], correct: ['FOUR', 'CHAIRS', 'ARE'] },
        { jumbled: ['TWO', 'ARE', 'SHOES'], correct: ['TWO', 'SHOES', 'ARE'] },
        { jumbled: ['SIX', 'SIDES', 'DICE'], correct: ['DICE', 'HAS', 'SIX'] },
        { jumbled: ['EIGHT', 'LEGS', 'SPIDER'], correct: ['SPIDER', 'HAS', 'EIGHT'] },
        { jumbled: ['ONE', 'NOSE', 'HAVE'], correct: ['I', 'HAVE', 'ONE'] },
        { jumbled: ['NINE', 'CATS', 'LIVES'], correct: ['CATS', 'HAVE', 'NINE'] },
      ],
    },
  },
  {
    title: 'Gameshow Quiz Challenge',
    description: 'Quiz with 50-50 lifeline for each question',
    type: 'gameshow-quiz',
    content: {
      questions: [
        { question: 'What number comes after 3?', options: ['2', '4', '5', '6'], correct: 1, fiftyFifty: [0, 2] },
        { question: 'How many fingers on one hand?', options: ['4', '5', '6', '7'], correct: 1, fiftyFifty: [2, 3] },
        { question: 'What is 2 + 3?', options: ['4', '5', '6', '7'], correct: 1, fiftyFifty: [0, 3] },
        { question: 'How many legs on a dog?', options: ['2', '4', '6', '8'], correct: 1, fiftyFifty: [0, 2] },
        { question: 'What comes between 7 and 9?', options: ['6', '8', '10', '11'], correct: 1, fiftyFifty: [0, 2] },
        { question: 'Count: 1,2,3,4,5,6,7,8,?', options: ['7', '8', '9', '10'], correct: 2, fiftyFifty: [0, 1] },
        { question: 'What number is first?', options: ['0', '1', '2', '3'], correct: 1, fiftyFifty: [0, 3] },
        { question: 'What is 10 - 5?', options: ['3', '5', '7', '9'], correct: 1, fiftyFifty: [0, 2] },
        { question: 'How many sides on a square?', options: ['3', '4', '5', '6'], correct: 1, fiftyFifty: [0, 2] },
        { question: 'What is the last number we learn?', options: ['8', '9', '10', '11'], correct: 2, fiftyFifty: [1, 3] },
      ],
    },
  },
  {
    title: 'Hangman Numbers',
    description: 'Guess the number word letter by letter',
    type: 'hangman',
    content: {
      words: [
        { word: 'ONE', hint: 'First number', emoji: '1️⃣' },
        { word: 'TWO', hint: 'A pair', emoji: '2️⃣' },
        { word: 'THREE', hint: 'One plus two', emoji: '3️⃣' },
        { word: 'FOUR', hint: 'Two times two', emoji: '4️⃣' },
        { word: 'FIVE', hint: 'Hand fingers', emoji: '5️⃣' },
        { word: 'SIX', hint: 'One more than five', emoji: '6️⃣' },
        { word: 'SEVEN', hint: 'Lucky number', emoji: '7️⃣' },
        { word: 'EIGHT', hint: 'One less than nine', emoji: '8️⃣' },
        { word: 'NINE', hint: 'Before ten', emoji: '9️⃣' },
        { word: 'TEN', hint: 'Final digit we learn', emoji: '🔟' },
      ],
    },
  },
  {
    title: 'Random Wheel Challenge',
    description: 'Spin the wheel for a counting challenge',
    type: 'random-wheel',
    content: {
      items: [
        { label: 'Count 1-5 🎯', challenge: 'Count from 1 to 5' },
        { label: 'Count 5-10 🎯', challenge: 'Count from 5 to 10' },
        { label: 'What is 2+1? 🎯', challenge: 'Answer the math question' },
        { label: 'Count backwards 🎯', challenge: 'Count from 5 down to 1' },
        { label: 'Find number 7 🎯', challenge: 'Point to number 7' },
        { label: 'Skip counting 🎯', challenge: 'Count by 2s: 2,4,6,8,10' },
        { label: 'Double 3 🎯', challenge: 'What is 3 + 3?' },
        { label: 'How many left? 🎯', challenge: 'If you have 5 apples and eat 2, how many left?' },
        { label: 'Counting game 🎯', challenge: 'Count 10 objects' },
        { label: 'Number sequence 🎯', challenge: 'Complete: 1,2,3,4,_,6,7,8,9,10' },
      ],
    },
  },
  {
    title: 'Open the Mystery Box',
    description: 'Open boxes to reveal hidden counting items',
    type: 'open-box',
    content: {
      boxes: [
        { id: '1', hiddenItem: '🍎', question: 'How many apples are in the box?', answer: '1' },
        { id: '2', hiddenItem: '🌻🌻', question: 'How many flowers?', answer: '2' },
        { id: '3', hiddenItem: '⭐⭐⭐', question: 'How many stars?', answer: '3' },
        { id: '4', hiddenItem: '🎈🎈🎈🎈', question: 'How many balloons?', answer: '4' },
        { id: '5', hiddenItem: '🐝🐝🐝🐝🐝', question: 'How many bees?', answer: '5' },
        { id: '6', hiddenItem: '🐠🐠🐠🐠🐠🐠', question: 'How many fish?', answer: '6' },
        { id: '7', hiddenItem: '🦋🦋🦋🦋🦋🦋🦋', question: 'How many butterflies?', answer: '7' },
        { id: '8', hiddenItem: '🌸🌸🌸🌸🌸🌸🌸🌸', question: 'How many flowers?', answer: '8' },
        { id: '9', hiddenItem: '🎨🎨🎨🎨🎨🎨🎨🎨🎨', question: 'How many paint pots?', answer: '9' },
        { id: '10', hiddenItem: '🎁🎁🎁🎁🎁🎁🎁🎁🎁🎁', question: 'How many presents?', answer: '10' },
      ],
    },
  },
]

async function deleteAllGames() {
  console.log('Deleting all existing games...')
  try {
    // Use SQL to truncate the table
    const { error } = await supabase.from('activities').delete().gte('created_at', '1900-01-01')
    if (error) {
      console.error('Error deleting games:', error)
      return false
    }
    console.log('✅ All games deleted')
    return true
  } catch (error) {
    console.error('Error in deleteAllGames:', error)
    return false
  }
}

async function seedCountingGames() {
  console.log(`\n📚 Seeding ${countingGames.length} unique counting games...`)

  const gamesToInsert = countingGames.map((game) => ({
    title: `${game.title}`,
    description: game.description,
    type: game.type,
    subject: 'Math',
    grade: 'pre-k',
    language: 'en',
    curriculum: 'Pakistani',
    content: game.content,
    is_public: true,
  }))

  // Insert in batches of 5
  const batchSize = 5
  for (let i = 0; i < gamesToInsert.length; i += batchSize) {
    const batch = gamesToInsert.slice(i, i + batchSize)
    try {
      const { data, error } = await supabase.from('activities').insert(batch).select()
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
        return false
      }
      console.log(`✅ Inserted batch ${i / batchSize + 1}: ${batch.length} games`)
    } catch (error) {
      console.error('Error in batch insert:', error)
      return false
    }
  }

  return true
}

async function verifyGames() {
  console.log('\n🔍 Verifying games...')
  try {
    const { data, error } = await supabase.from('activities').select('count', { count: 'exact', head: true })

    if (error) {
      console.error('Error verifying games:', error)
      return false
    }

    console.log(`✅ Total games in database: ${data?.count || 0}`)
    return true
  } catch (error) {
    console.error('Error in verifyGames:', error)
    return false
  }
}

async function main() {
  console.log('🎮 Counting Games Setup Started')
  console.log('=' .repeat(50))

  try {
    // Delete all existing games
    const deleteSuccess = await deleteAllGames()
    if (!deleteSuccess) {
      console.error('❌ Failed to delete existing games')
      process.exit(1)
    }

    // Seed new games
    const seedSuccess = await seedCountingGames()
    if (!seedSuccess) {
      console.error('❌ Failed to seed new games')
      process.exit(1)
    }

    // Verify
    const verifySuccess = await verifyGames()
    if (!verifySuccess) {
      console.error('❌ Failed to verify games')
      process.exit(1)
    }

    console.log('\n' + '=' .repeat(50))
    console.log('🎉 Counting Games Setup Complete!')
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

main()
