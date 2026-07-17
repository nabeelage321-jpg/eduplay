/**
 * Seed data for 100 Pre-K educational games (age 3-5)
 * Pakistani curriculum
 * 5 subjects × 5 categories × 4 game types = 100 games
 */

import { createServerClient } from '../server'

interface GameContent {
  questions: Array<{
    question: string
    options: string[]
    correct: number
    emoji?: string
  }>
}

interface GameSeed {
  title: string
  description: string
  type: string
  subject: string
  grade: string
  language: string
  curriculum: string
  content: GameContent
  is_public: boolean
}

// Game type definitions
const GAME_TYPES = ['quiz', 'flashcards', 'match-up', 'true-false']

// Subject and category definitions
const SUBJECTS = {
  math: {
    name: 'Math',
    categories: [
      'Counting (1-10)',
      'Shapes',
      'Colors and Numbers',
      'Big and Small',
      'Simple Addition',
    ],
  },
  urdu: {
    name: 'Urdu',
    categories: [
      'Urdu Alphabet',
      'Simple Urdu Words',
      'Animals in Urdu',
      'Body Parts in Urdu',
      'Fruits in Urdu',
    ],
  },
  english: {
    name: 'English',
    categories: [
      'ABC Alphabet',
      'Simple Words',
      'Colors in English',
      'Animals in English',
      'Numbers 1-10',
    ],
  },
  science: {
    name: 'Science',
    categories: [
      'Animals and Sounds',
      'Plants and Trees',
      'Weather',
      'My Body Parts',
      'Food we Eat',
    ],
  },
  islamiyat: {
    name: 'Islamiyat',
    categories: [
      'Allah and His Names',
      'Prophet Muhammad SAW',
      'Basic Duas',
      'Five Pillars',
      'Islamic Months and Days',
    ],
  },
}

// Question templates for each category
const QUESTIONS_BY_CATEGORY: Record<string, GameContent> = {
  // MATH
  'math-counting': {
    questions: [
      {
        question: 'How many apples? 🍎🍎🍎',
        options: ['Two', 'Three', 'Four', 'Five'],
        correct: 1,
        emoji: '🍎',
      },
      {
        question: 'Count the stars ⭐⭐⭐⭐',
        options: ['Three', 'Four', 'Five', 'Six'],
        correct: 1,
        emoji: '⭐',
      },
      {
        question: 'How many birds? 🐦🐦',
        options: ['One', 'Two', 'Three', 'Four'],
        correct: 1,
        emoji: '🐦',
      },
      {
        question: 'Count the flowers 🌸🌸🌸🌸🌸',
        options: ['Four', 'Five', 'Six', 'Seven'],
        correct: 1,
        emoji: '🌸',
      },
      {
        question: 'How many butterflies? 🦋🦋🦋',
        options: ['Two', 'Three', 'Four', 'Five'],
        correct: 1,
        emoji: '🦋',
      },
      {
        question: 'Count the hearts ❤️❤️❤️❤️',
        options: ['Three', 'Four', 'Five', 'Six'],
        correct: 1,
        emoji: '❤️',
      },
      {
        question: 'How many balls? 🎾🎾🎾🎾🎾🎾',
        options: ['Five', 'Six', 'Seven', 'Eight'],
        correct: 1,
        emoji: '🎾',
      },
      {
        question: 'Count the suns ☀️☀️☀️☀️☀️☀️☀️',
        options: ['Six', 'Seven', 'Eight', 'Nine'],
        correct: 1,
        emoji: '☀️',
      },
      {
        question: 'How many raindrops? 💧💧💧',
        options: ['Two', 'Three', 'Four', 'Five'],
        correct: 1,
        emoji: '💧',
      },
      {
        question: 'Count the moons 🌙🌙🌙🌙🌙🌙🌙🌙',
        options: ['Seven', 'Eight', 'Nine', 'Ten'],
        correct: 1,
        emoji: '🌙',
      },
    ],
  },
  'math-shapes': {
    questions: [
      {
        question: 'Which shape has 4 sides?',
        options: ['Circle', 'Triangle', 'Square', 'Star'],
        correct: 2,
        emoji: '⬜',
      },
      {
        question: 'Which shape is round?',
        options: ['Square', 'Circle', 'Triangle', 'Rectangle'],
        correct: 1,
        emoji: '⭕',
      },
      {
        question: 'Which shape has 3 sides?',
        options: ['Circle', 'Triangle', 'Square', 'Rectangle'],
        correct: 1,
        emoji: '🔺',
      },
      {
        question: 'Which shape looks like a star?',
        options: ['Circle', 'Square', 'Star', 'Triangle'],
        correct: 2,
        emoji: '⭐',
      },
      {
        question: 'Which is a rectangle?',
        options: ['Circle', 'Triangle', 'Rectangle', 'Diamond'],
        correct: 2,
        emoji: '▭',
      },
      {
        question: 'What shape is a ball?',
        options: ['Square', 'Circle', 'Triangle', 'Star'],
        correct: 1,
        emoji: '🔵',
      },
      {
        question: 'Find the triangle:',
        options: ['🔷', '🔺', '⬜', '⭕'],
        correct: 1,
        emoji: '🔺',
      },
      {
        question: 'What shape has 5 sides?',
        options: ['Pentagon', 'Square', 'Triangle', 'Circle'],
        correct: 0,
        emoji: '⬠',
      },
      {
        question: 'Which is a square?',
        options: ['Triangle', 'Circle', 'Square', 'Star'],
        correct: 2,
        emoji: '⬜',
      },
      {
        question: 'Find the circle:',
        options: ['🔺', '⬜', '🔵', '⭐'],
        correct: 2,
        emoji: '⭕',
      },
    ],
  },
  'math-colors': {
    questions: [
      {
        question: 'What color is the apple?',
        options: ['Blue', 'Red', 'Yellow', 'Green'],
        correct: 1,
        emoji: '🍎',
      },
      {
        question: 'What color is the banana?',
        options: ['Red', 'Yellow', 'Blue', 'Purple'],
        correct: 1,
        emoji: '🍌',
      },
      {
        question: 'What color is the sky?',
        options: ['Green', 'Blue', 'Red', 'Yellow'],
        correct: 1,
        emoji: '☁️',
      },
      {
        question: 'What color is the sun?',
        options: ['Green', 'Purple', 'Yellow', 'Blue'],
        correct: 2,
        emoji: '☀️',
      },
      {
        question: 'What color is the grass?',
        options: ['Red', 'Blue', 'Green', 'Yellow'],
        correct: 2,
        emoji: '🌱',
      },
      {
        question: 'What color is a cloud?',
        options: ['Blue', 'White', 'Black', 'Gray'],
        correct: 1,
        emoji: '☁️',
      },
      {
        question: 'What color is the sea?',
        options: ['Yellow', 'Blue', 'Red', 'Green'],
        correct: 1,
        emoji: '🌊',
      },
      {
        question: 'What color is a carrot?',
        options: ['Green', 'Orange', 'Purple', 'Red'],
        correct: 1,
        emoji: '🥕',
      },
      {
        question: 'What color is a grape?',
        options: ['Yellow', 'Orange', 'Purple', 'Red'],
        correct: 2,
        emoji: '🍇',
      },
      {
        question: 'What color is snow?',
        options: ['Gray', 'Blue', 'White', 'Black'],
        correct: 2,
        emoji: '❄️',
      },
    ],
  },
  'math-bigsmall': {
    questions: [
      {
        question: 'Which elephant is bigger?',
        options: ['Small', 'Big', 'Medium', 'Tiny'],
        correct: 1,
        emoji: '🐘',
      },
      {
        question: 'Which is smaller?',
        options: ['Big', 'Medium', 'Small', 'Large'],
        correct: 2,
        emoji: '📦',
      },
      {
        question: 'Which apple is big?',
        options: ['Small', 'Big', 'Tiny', 'Huge'],
        correct: 1,
        emoji: '🍎',
      },
      {
        question: 'Which is the biggest?',
        options: ['Medium', 'Big', 'Huge', 'Small'],
        correct: 2,
        emoji: '🎈',
      },
      {
        question: 'Which stone is smallest?',
        options: ['Large', 'Tiny', 'Big', 'Huge'],
        correct: 1,
        emoji: '🪨',
      },
      {
        question: 'Which is bigger: ant or elephant?',
        options: ['Ant', 'Elephant', 'Same', 'Ant is bigger'],
        correct: 1,
        emoji: '🐘',
      },
      {
        question: 'Which box is small?',
        options: ['Large', 'Huge', 'Small', 'Big'],
        correct: 2,
        emoji: '📦',
      },
      {
        question: 'Which is smaller: dog or cat?',
        options: ['Dog', 'Cat', 'Same', 'Dog is smaller'],
        correct: 1,
        emoji: '🐱',
      },
      {
        question: 'Which star is biggest?',
        options: ['Small', 'Medium', 'Big', 'Tiny'],
        correct: 2,
        emoji: '⭐',
      },
      {
        question: 'Which is smallest?',
        options: ['House', 'Ant', 'Tree', 'Car'],
        correct: 1,
        emoji: '🐜',
      },
    ],
  },
  'math-addition': {
    questions: [
      {
        question: '1 + 1 = ?',
        options: ['One', 'Two', 'Three', 'Four'],
        correct: 1,
        emoji: '➕',
      },
      {
        question: '2 + 1 = ?',
        options: ['One', 'Two', 'Three', 'Four'],
        correct: 2,
        emoji: '➕',
      },
      {
        question: '1 + 2 = ?',
        options: ['One', 'Two', 'Three', 'Four'],
        correct: 2,
        emoji: '➕',
      },
      {
        question: '3 + 1 = ?',
        options: ['Two', 'Three', 'Four', 'Five'],
        correct: 2,
        emoji: '➕',
      },
      {
        question: '2 + 2 = ?',
        options: ['Two', 'Three', 'Four', 'Five'],
        correct: 2,
        emoji: '➕',
      },
      {
        question: '1 + 3 = ?',
        options: ['Two', 'Three', 'Four', 'Five'],
        correct: 2,
        emoji: '➕',
      },
      {
        question: '2 + 3 = ?',
        options: ['Three', 'Four', 'Five', 'Six'],
        correct: 2,
        emoji: '➕',
      },
      {
        question: '4 + 1 = ?',
        options: ['Three', 'Four', 'Five', 'Six'],
        correct: 2,
        emoji: '➕',
      },
      {
        question: '3 + 2 = ?',
        options: ['Three', 'Four', 'Five', 'Six'],
        correct: 2,
        emoji: '➕',
      },
      {
        question: '1 + 4 = ?',
        options: ['Three', 'Four', 'Five', 'Six'],
        correct: 2,
        emoji: '➕',
      },
    ],
  },

  // URDU
  'urdu-alphabet': {
    questions: [
      {
        question: 'First letter of Urdu alphabet?',
        options: ['الف (Alif)', 'بے (Bay)', 'پے (Pay)', 'تے (Tay)'],
        correct: 0,
        emoji: 'ا',
      },
      {
        question: 'Second letter of Urdu?',
        options: ['الف', 'بے', 'پے', 'تے'],
        correct: 1,
        emoji: 'ب',
      },
      {
        question: 'Third letter?',
        options: ['الف', 'بے', 'پے', 'تے'],
        correct: 2,
        emoji: 'پ',
      },
      {
        question: 'Fourth letter?',
        options: ['الف', 'بے', 'پے', 'تے'],
        correct: 3,
        emoji: 'ت',
      },
      {
        question: 'Which is "بے"?',
        options: ['First', 'Second', 'Third', 'Fourth'],
        correct: 1,
        emoji: 'ب',
      },
      {
        question: 'Which is "پے"?',
        options: ['First', 'Second', 'Third', 'Fourth'],
        correct: 2,
        emoji: 'پ',
      },
      {
        question: 'Which is "الف"?',
        options: ['First', 'Second', 'Third', 'Fourth'],
        correct: 0,
        emoji: 'ا',
      },
      {
        question: 'Which is "تے"?',
        options: ['First', 'Second', 'Third', 'Fourth'],
        correct: 3,
        emoji: 'ت',
      },
      {
        question: '"ثے" is?',
        options: ['الف', 'بے', 'ثے', 'پے'],
        correct: 2,
        emoji: 'ث',
      },
      {
        question: 'First 2 letters together?',
        options: ['اب', 'بت', 'تپ', 'پا'],
        correct: 0,
        emoji: 'ا',
      },
    ],
  },
  'urdu-words': {
    questions: [
      {
        question: 'What is "آم" (aam)?',
        options: ['Mango', 'Apple', 'Orange', 'Banana'],
        correct: 0,
        emoji: '🥭',
      },
      {
        question: 'What is "گھر" (ghar)?',
        options: ['House', 'Tree', 'Car', 'Road'],
        correct: 0,
        emoji: '🏠',
      },
      {
        question: 'What is "پانی" (pani)?',
        options: ['Fire', 'Water', 'Air', 'Earth'],
        correct: 1,
        emoji: '💧',
      },
      {
        question: 'What is "بلی" (billee)?',
        options: ['Dog', 'Cat', 'Bird', 'Fish'],
        correct: 1,
        emoji: '🐱',
      },
      {
        question: 'What is "کتا" (kutta)?',
        options: ['Cat', 'Dog', 'Bird', 'Monkey'],
        correct: 1,
        emoji: '🐕',
      },
      {
        question: 'What is "روٹی" (roti)?',
        options: ['Rice', 'Bread', 'Milk', 'Meat'],
        correct: 1,
        emoji: '🍞',
      },
      {
        question: 'What is "چاندی" (chandi)?',
        options: ['Gold', 'Silver', 'Bronze', 'Copper'],
        correct: 1,
        emoji: '🔶',
      },
      {
        question: 'What is "سونا" (sona)?',
        options: ['Silver', 'Gold', 'Bronze', 'Copper'],
        correct: 1,
        emoji: '🟡',
      },
      {
        question: 'What is "نمک" (namak)?',
        options: ['Sugar', 'Salt', 'Spice', 'Pepper'],
        correct: 1,
        emoji: '🧂',
      },
      {
        question: 'What is "دودھ" (doodh)?',
        options: ['Water', 'Milk', 'Juice', 'Tea'],
        correct: 1,
        emoji: '🥛',
      },
    ],
  },
  'urdu-animals': {
    questions: [
      {
        question: 'What is "بلی" (billee)?',
        options: ['Dog', 'Cat', 'Cow', 'Pig'],
        correct: 1,
        emoji: '🐱',
      },
      {
        question: 'What is "کتا" (kutta)?',
        options: ['Cat', 'Dog', 'Lion', 'Tiger'],
        correct: 1,
        emoji: '🐕',
      },
      {
        question: 'What is "مچھلی" (machli)?',
        options: ['Frog', 'Fish', 'Turtle', 'Crab'],
        correct: 1,
        emoji: '🐟',
      },
      {
        question: 'What is "پرندہ" (parinda)?',
        options: ['Butterfly', 'Bird', 'Bee', 'Ant'],
        correct: 1,
        emoji: '🐦',
      },
      {
        question: 'What is "گھوڑا" (ghora)?',
        options: ['Camel', 'Horse', 'Donkey', 'Mule'],
        correct: 1,
        emoji: '🐴',
      },
      {
        question: 'What is "گائے" (gaaye)?',
        options: ['Goat', 'Sheep', 'Cow', 'Buffalo'],
        correct: 2,
        emoji: '🐄',
      },
      {
        question: 'What is "بکری" (bakri)?',
        options: ['Sheep', 'Goat', 'Cow', 'Buffalo'],
        correct: 1,
        emoji: '🐐',
      },
      {
        question: 'What is "شیر" (sher)?',
        options: ['Tiger', 'Lion', 'Leopard', 'Panther'],
        correct: 1,
        emoji: '🦁',
      },
      {
        question: 'What is "ہاتھی" (haathi)?',
        options: ['Camel', 'Horse', 'Elephant', 'Rhino'],
        correct: 2,
        emoji: '🐘',
      },
      {
        question: 'What is "میڑھا" (mairah)?',
        options: ['Donkey', 'Sheep', 'Ram', 'Goat'],
        correct: 2,
        emoji: '🐑',
      },
    ],
  },
  'urdu-bodyparts': {
    questions: [
      {
        question: 'What is "آنکھ" (ankh)?',
        options: ['Ear', 'Eye', 'Nose', 'Mouth'],
        correct: 1,
        emoji: '👁️',
      },
      {
        question: 'What is "ناک" (naak)?',
        options: ['Eye', 'Nose', 'Mouth', 'Ear'],
        correct: 1,
        emoji: '👃',
      },
      {
        question: 'What is "کان" (kaan)?',
        options: ['Eye', 'Nose', 'Ear', 'Mouth'],
        correct: 2,
        emoji: '👂',
      },
      {
        question: 'What is "منہ" (munh)?',
        options: ['Face', 'Mouth', 'Nose', 'Ear'],
        correct: 1,
        emoji: '👄',
      },
      {
        question: 'What is "دانت" (daant)?',
        options: ['Tongue', 'Tooth', 'Gum', 'Lip'],
        correct: 1,
        emoji: '🦷',
      },
      {
        question: 'What is "ہاتھ" (hath)?',
        options: ['Arm', 'Hand', 'Finger', 'Leg'],
        correct: 1,
        emoji: '🖐️',
      },
      {
        question: 'What is "پیر" (pair)?',
        options: ['Hand', 'Leg', 'Foot', 'Toe'],
        correct: 2,
        emoji: '🦶',
      },
      {
        question: 'What is "سر" (sir)?',
        options: ['Face', 'Head', 'Neck', 'Hair'],
        correct: 1,
        emoji: '🧠',
      },
      {
        question: 'What is "دل" (dil)?',
        options: ['Stomach', 'Heart', 'Lung', 'Liver'],
        correct: 1,
        emoji: '❤️',
      },
      {
        question: 'What is "بال" (baal)?',
        options: ['Head', 'Hair', 'Skin', 'Eye'],
        correct: 1,
        emoji: '💇',
      },
    ],
  },
  'urdu-fruits': {
    questions: [
      {
        question: 'What is "سیب" (seb)?',
        options: ['Orange', 'Apple', 'Banana', 'Mango'],
        correct: 1,
        emoji: '🍎',
      },
      {
        question: 'What is "کیلا" (kela)?',
        options: ['Mango', 'Apple', 'Banana', 'Orange'],
        correct: 2,
        emoji: '🍌',
      },
      {
        question: 'What is "آم" (aam)?',
        options: ['Apple', 'Mango', 'Orange', 'Banana'],
        correct: 1,
        emoji: '🥭',
      },
      {
        question: 'What is "نارنجی" (naaranji)?',
        options: ['Banana', 'Orange', 'Lemon', 'Lime'],
        correct: 1,
        emoji: '🍊',
      },
      {
        question: 'What is "امرود" (amrud)?',
        options: ['Mango', 'Guava', 'Papaya', 'Pineapple'],
        correct: 1,
        emoji: '🍐',
      },
      {
        question: 'What is "انگور" (angoor)?',
        options: ['Grape', 'Plum', 'Cherry', 'Peach'],
        correct: 0,
        emoji: '🍇',
      },
      {
        question: 'What is "تربوز" (turboz)?',
        options: ['Papaya', 'Watermelon', 'Cantaloupe', 'Honeydew'],
        correct: 1,
        emoji: '🍉',
      },
      {
        question: 'What is "ناریل" (nariyal)?',
        options: ['Cashew', 'Coconut', 'Almond', 'Walnut'],
        correct: 1,
        emoji: '🥥',
      },
      {
        question: 'What is "ملتائی" (miltayi)?',
        options: ['Papaya', 'Guava', 'Date', 'Fig'],
        correct: 2,
        emoji: '🍌',
      },
      {
        question: 'What is "کھجور" (khajoor)?',
        options: ['Prune', 'Date', 'Raisin', 'Berry'],
        correct: 1,
        emoji: '📅',
      },
    ],
  },

  // ENGLISH
  'english-alphabet': {
    questions: [
      {
        question: 'First letter of alphabet?',
        options: ['A', 'B', 'C', 'D'],
        correct: 0,
        emoji: '🅰️',
      },
      {
        question: 'Second letter?',
        options: ['A', 'B', 'C', 'D'],
        correct: 1,
        emoji: '🅱️',
      },
      {
        question: 'Third letter?',
        options: ['A', 'B', 'C', 'D'],
        correct: 2,
        emoji: '©️',
      },
      {
        question: 'Fourth letter?',
        options: ['A', 'B', 'C', 'D'],
        correct: 3,
        emoji: '🅳',
      },
      {
        question: 'What comes after A?',
        options: ['B', 'C', 'D', 'E'],
        correct: 0,
        emoji: '🅱️',
      },
      {
        question: 'What comes after B?',
        options: ['A', 'C', 'D', 'E'],
        correct: 1,
        emoji: '©️',
      },
      {
        question: 'What comes after C?',
        options: ['B', 'D', 'E', 'F'],
        correct: 1,
        emoji: '🅳',
      },
      {
        question: 'What comes after D?',
        options: ['C', 'E', 'F', 'G'],
        correct: 1,
        emoji: '🅴',
      },
      {
        question: 'Last letter of alphabet?',
        options: ['X', 'Y', 'Z', 'W'],
        correct: 2,
        emoji: '🆉',
      },
      {
        question: 'Letter before Z?',
        options: ['X', 'Y', 'W', 'V'],
        correct: 0,
        emoji: '❌',
      },
    ],
  },
  'english-simplewords': {
    questions: [
      {
        question: 'What is this? 🐱',
        options: ['Dog', 'Cat', 'Bird', 'Fish'],
        correct: 1,
        emoji: '🐱',
      },
      {
        question: 'What is this? 🐕',
        options: ['Cat', 'Dog', 'Bird', 'Rabbit'],
        correct: 1,
        emoji: '🐕',
      },
      {
        question: 'What is this? ☀️',
        options: ['Moon', 'Star', 'Sun', 'Cloud'],
        correct: 2,
        emoji: '☀️',
      },
      {
        question: 'What is this? 🏠',
        options: ['Tree', 'House', 'Car', 'Road'],
        correct: 1,
        emoji: '🏠',
      },
      {
        question: 'What is this? 🌳',
        options: ['House', 'Tree', 'Flower', 'Bush'],
        correct: 1,
        emoji: '🌳',
      },
      {
        question: 'What is this? 🚗',
        options: ['Bike', 'Car', 'Bus', 'Truck'],
        correct: 1,
        emoji: '🚗',
      },
      {
        question: 'What is this? 🍎',
        options: ['Banana', 'Apple', 'Orange', 'Mango'],
        correct: 1,
        emoji: '🍎',
      },
      {
        question: 'What is this? 🍞',
        options: ['Rice', 'Bread', 'Pasta', 'Cake'],
        correct: 1,
        emoji: '🍞',
      },
      {
        question: 'What is this? 💧',
        options: ['Ice', 'Fire', 'Water', 'Steam'],
        correct: 2,
        emoji: '💧',
      },
      {
        question: 'What is this? 🎈',
        options: ['Ball', 'Balloon', 'Bubble', 'Kite'],
        correct: 1,
        emoji: '🎈',
      },
    ],
  },
  'english-colors': {
    questions: [
      {
        question: 'What color is blood?',
        options: ['Blue', 'Red', 'Yellow', 'Green'],
        correct: 1,
        emoji: '🔴',
      },
      {
        question: 'What color is the sky?',
        options: ['Green', 'Blue', 'Yellow', 'Purple'],
        correct: 1,
        emoji: '🔵',
      },
      {
        question: 'What color is a banana?',
        options: ['Red', 'Yellow', 'Blue', 'Green'],
        correct: 1,
        emoji: '🟡',
      },
      {
        question: 'What color is grass?',
        options: ['Red', 'Yellow', 'Green', 'Purple'],
        correct: 2,
        emoji: '🟢',
      },
      {
        question: 'What color is snow?',
        options: ['Gray', 'Blue', 'White', 'Black'],
        correct: 2,
        emoji: '⚪',
      },
      {
        question: 'What color is coal?',
        options: ['White', 'Gray', 'Black', 'Brown'],
        correct: 2,
        emoji: '⚫',
      },
      {
        question: 'What color is the sea?',
        options: ['Green', 'Blue', 'Brown', 'Gray'],
        correct: 1,
        emoji: '🔵',
      },
      {
        question: 'What color is a carrot?',
        options: ['Red', 'Orange', 'Yellow', 'Brown'],
        correct: 1,
        emoji: '🟠',
      },
      {
        question: 'What color is a grape?',
        options: ['Red', 'Purple', 'Blue', 'Green'],
        correct: 1,
        emoji: '🟣',
      },
      {
        question: 'What color is a strawberry?',
        options: ['Orange', 'Red', 'Pink', 'Purple'],
        correct: 1,
        emoji: '🔴',
      },
    ],
  },
  'english-animals': {
    questions: [
      {
        question: 'What sound does a dog make?',
        options: ['Meow', 'Woof', 'Moo', 'Baa'],
        correct: 1,
        emoji: '🐕',
      },
      {
        question: 'What sound does a cat make?',
        options: ['Woof', 'Meow', 'Moo', 'Chirp'],
        correct: 1,
        emoji: '🐱',
      },
      {
        question: 'What sound does a cow make?',
        options: ['Woof', 'Moo', 'Baa', 'Chirp'],
        correct: 1,
        emoji: '🐄',
      },
      {
        question: 'What sound does a sheep make?',
        options: ['Moo', 'Baa', 'Woof', 'Chirp'],
        correct: 1,
        emoji: '🐑',
      },
      {
        question: 'What sound does a bird make?',
        options: ['Woof', 'Chirp', 'Moo', 'Baa'],
        correct: 1,
        emoji: '🐦',
      },
      {
        question: 'What sound does a duck make?',
        options: ['Chirp', 'Quack', 'Woof', 'Moo'],
        correct: 1,
        emoji: '🦆',
      },
      {
        question: 'What sound does a pig make?',
        options: ['Oink', 'Moo', 'Baa', 'Chirp'],
        correct: 0,
        emoji: '🐷',
      },
      {
        question: 'What sound does a horse make?',
        options: ['Neigh', 'Moo', 'Baa', 'Chirp'],
        correct: 0,
        emoji: '🐴',
      },
      {
        question: 'What sound does a lion make?',
        options: ['Roar', 'Moo', 'Baa', 'Chirp'],
        correct: 0,
        emoji: '🦁',
      },
      {
        question: 'What sound does a frog make?',
        options: ['Croak', 'Chirp', 'Woof', 'Moo'],
        correct: 0,
        emoji: '🐸',
      },
    ],
  },
  'english-numbers': {
    questions: [
      {
        question: 'Number 1 in word?',
        options: ['Two', 'One', 'Three', 'Four'],
        correct: 1,
        emoji: '1️⃣',
      },
      {
        question: 'Number 2 in word?',
        options: ['One', 'Two', 'Three', 'Four'],
        correct: 1,
        emoji: '2️⃣',
      },
      {
        question: 'Number 3 in word?',
        options: ['Two', 'Three', 'Four', 'Five'],
        correct: 1,
        emoji: '3️⃣',
      },
      {
        question: 'Number 4 in word?',
        options: ['Three', 'Four', 'Five', 'Six'],
        correct: 1,
        emoji: '4️⃣',
      },
      {
        question: 'Number 5 in word?',
        options: ['Four', 'Five', 'Six', 'Seven'],
        correct: 1,
        emoji: '5️⃣',
      },
      {
        question: 'Number 6 in word?',
        options: ['Five', 'Six', 'Seven', 'Eight'],
        correct: 1,
        emoji: '6️⃣',
      },
      {
        question: 'Number 7 in word?',
        options: ['Six', 'Seven', 'Eight', 'Nine'],
        correct: 1,
        emoji: '7️⃣',
      },
      {
        question: 'Number 8 in word?',
        options: ['Seven', 'Eight', 'Nine', 'Ten'],
        correct: 1,
        emoji: '8️⃣',
      },
      {
        question: 'Number 9 in word?',
        options: ['Eight', 'Nine', 'Ten', 'Eleven'],
        correct: 1,
        emoji: '9️⃣',
      },
      {
        question: 'Number 10 in word?',
        options: ['Nine', 'Ten', 'Eleven', 'Twelve'],
        correct: 1,
        emoji: '🔟',
      },
    ],
  },

  // SCIENCE
  'science-animals-sounds': {
    questions: [
      {
        question: 'Which animal says "Moo"?',
        options: ['Sheep', 'Cow', 'Horse', 'Pig'],
        correct: 1,
        emoji: '🐄',
      },
      {
        question: 'Which animal says "Chirp"?',
        options: ['Frog', 'Bird', 'Fish', 'Bee'],
        correct: 1,
        emoji: '🐦',
      },
      {
        question: 'Which animal says "Ribbit"?',
        options: ['Bird', 'Frog', 'Fish', 'Lizard'],
        correct: 1,
        emoji: '🐸',
      },
      {
        question: 'Which animal says "Buzz"?',
        options: ['Bird', 'Butterfly', 'Bee', 'Ant'],
        correct: 2,
        emoji: '🐝',
      },
      {
        question: 'Which animal says "Hiss"?',
        options: ['Lizard', 'Snake', 'Turtle', 'Frog'],
        correct: 1,
        emoji: '🐍',
      },
      {
        question: 'Which animal says "Roar"?',
        options: ['Tiger', 'Lion', 'Cat', 'Dog'],
        correct: 1,
        emoji: '🦁',
      },
      {
        question: 'Which animal says "Trumpet"?',
        options: ['Zebra', 'Elephant', 'Giraffe', 'Rhino'],
        correct: 1,
        emoji: '🐘',
      },
      {
        question: 'Which animal says "Squeak"?',
        options: ['Rat', 'Mouse', 'Hamster', 'Squirrel'],
        correct: 1,
        emoji: '🐭',
      },
      {
        question: 'Which animal says "Howl"?',
        options: ['Dog', 'Wolf', 'Coyote', 'Fox'],
        correct: 1,
        emoji: '🐺',
      },
      {
        question: 'Which animal says "Screech"?',
        options: ['Parrot', 'Owl', 'Eagle', 'Hawk'],
        correct: 1,
        emoji: '🦉',
      },
    ],
  },
  'science-plants-trees': {
    questions: [
      {
        question: 'What do plants need to grow?',
        options: ['Air', 'Water', 'Sunlight', 'All of above'],
        correct: 3,
        emoji: '🌱',
      },
      {
        question: 'What part of plant gives us fruits?',
        options: ['Root', 'Stem', 'Leaf', 'Flower'],
        correct: 3,
        emoji: '🌺',
      },
      {
        question: 'What part absorbs water?',
        options: ['Stem', 'Root', 'Leaf', 'Flower'],
        correct: 1,
        emoji: '🌿',
      },
      {
        question: 'What is green in a plant?',
        options: ['Root', 'Stem', 'Leaf', 'Flower'],
        correct: 2,
        emoji: '🍃',
      },
      {
        question: 'What gives tree its height?',
        options: ['Root', 'Stem', 'Leaf', 'Flower'],
        correct: 1,
        emoji: '🌳',
      },
      {
        question: 'A big plant with thick stem is?',
        options: ['Bush', 'Flower', 'Tree', 'Grass'],
        correct: 2,
        emoji: '🌲',
      },
      {
        question: 'A small plant with soft stem?',
        options: ['Tree', 'Flower', 'Bush', 'Herb'],
        correct: 3,
        emoji: '🌸',
      },
      {
        question: 'What do bees visit on plants?',
        options: ['Leaf', 'Stem', 'Flower', 'Root'],
        correct: 2,
        emoji: '🌺',
      },
      {
        question: 'Where do seeds come from?',
        options: ['Leaf', 'Root', 'Flower', 'Stem'],
        correct: 2,
        emoji: '🌼',
      },
      {
        question: 'What comes out of seed?',
        options: ['Root', 'Flower', 'Tree', 'Leaf'],
        correct: 0,
        emoji: '🌱',
      },
    ],
  },
  'science-weather': {
    questions: [
      {
        question: 'When is it sunny?',
        options: ['Cloudy', 'During day', 'At night', 'Always'],
        correct: 1,
        emoji: '☀️',
      },
      {
        question: 'What falls when it rains?',
        options: ['Snow', 'Water', 'Hail', 'Ice'],
        correct: 1,
        emoji: '🌧️',
      },
      {
        question: 'What is in the sky on cloudy day?',
        options: ['Sun', 'Stars', 'Clouds', 'Moon'],
        correct: 2,
        emoji: '☁️',
      },
      {
        question: 'What do we see at night?',
        options: ['Sun', 'Cloud', 'Moon', 'Star'],
        correct: 2,
        emoji: '🌙',
      },
      {
        question: 'What happens with lightning?',
        options: ['Rain', 'Wind', 'Thunder', 'Snow'],
        correct: 2,
        emoji: '⚡',
      },
      {
        question: 'When does wind blow?',
        options: ['Only day', 'Only night', 'Any time', 'Not at all'],
        correct: 2,
        emoji: '💨',
      },
      {
        question: 'What is snow made of?',
        options: ['Rain', 'Ice', 'Water', 'All above'],
        correct: 3,
        emoji: '❄️',
      },
      {
        question: 'When do rainbows appear?',
        options: ['At night', 'After rain', 'At noon', 'Always'],
        correct: 1,
        emoji: '🌈',
      },
      {
        question: 'What is hail?',
        options: ['Rain', 'Snow', 'Ice balls', 'Frost'],
        correct: 2,
        emoji: '🧊',
      },
      {
        question: 'When is it hottest?',
        options: ['Morning', 'Afternoon', 'Evening', 'Night'],
        correct: 1,
        emoji: '🔥',
      },
    ],
  },
  'science-bodyparts': {
    questions: [
      {
        question: 'What do we see with?',
        options: ['Nose', 'Eye', 'Ear', 'Mouth'],
        correct: 1,
        emoji: '👁️',
      },
      {
        question: 'What do we hear with?',
        options: ['Nose', 'Eye', 'Ear', 'Mouth'],
        correct: 2,
        emoji: '👂',
      },
      {
        question: 'What do we smell with?',
        options: ['Mouth', 'Eye', 'Nose', 'Ear'],
        correct: 2,
        emoji: '👃',
      },
      {
        question: 'What do we taste with?',
        options: ['Nose', 'Mouth', 'Ear', 'Eye'],
        correct: 1,
        emoji: '👅',
      },
      {
        question: 'What do we touch with?',
        options: ['Nose', 'Hand', 'Mouth', 'Ear'],
        correct: 1,
        emoji: '🖐️',
      },
      {
        question: 'What do we walk with?',
        options: ['Hand', 'Arm', 'Leg', 'Toe'],
        correct: 2,
        emoji: '🦶',
      },
      {
        question: 'What do we think with?',
        options: ['Heart', 'Brain', 'Stomach', 'Lung'],
        correct: 1,
        emoji: '🧠',
      },
      {
        question: 'What pumps blood?',
        options: ['Lung', 'Heart', 'Brain', 'Liver'],
        correct: 1,
        emoji: '❤️',
      },
      {
        question: 'What helps us breathe?',
        options: ['Heart', 'Lung', 'Brain', 'Liver'],
        correct: 1,
        emoji: '💨',
      },
      {
        question: 'What digests food?',
        options: ['Brain', 'Lung', 'Stomach', 'Heart'],
        correct: 2,
        emoji: '🫀',
      },
    ],
  },
  'science-food': {
    questions: [
      {
        question: 'Which is healthy?',
        options: ['Candy', 'Apple', 'Soda', 'Cake'],
        correct: 1,
        emoji: '🍎',
      },
      {
        question: 'Which is healthy?',
        options: ['Chips', 'Carrot', 'Cookie', 'Candy'],
        correct: 1,
        emoji: '🥕',
      },
      {
        question: 'Which is healthy?',
        options: ['Soda', 'Milk', 'Juice', 'Tea'],
        correct: 1,
        emoji: '🥛',
      },
      {
        question: 'Which is not healthy?',
        options: ['Apple', 'Banana', 'Cake', 'Orange'],
        correct: 2,
        emoji: '🎂',
      },
      {
        question: 'Which has protein?',
        options: ['Candy', 'Egg', 'Chocolate', 'Cake'],
        correct: 1,
        emoji: '🥚',
      },
      {
        question: 'Which is a grain?',
        options: ['Milk', 'Bread', 'Cheese', 'Butter'],
        correct: 1,
        emoji: '🍞',
      },
      {
        question: 'Which is a vegetable?',
        options: ['Apple', 'Broccoli', 'Banana', 'Orange'],
        correct: 1,
        emoji: '🥦',
      },
      {
        question: 'Which is a fruit?',
        options: ['Bread', 'Carrot', 'Mango', 'Potato'],
        correct: 2,
        emoji: '🥭',
      },
      {
        question: 'Which gives energy?',
        options: ['Water', 'Rice', 'Salt', 'Pepper'],
        correct: 1,
        emoji: '🍚',
      },
      {
        question: 'Which is unhealthy?',
        options: ['Spinach', 'Burger', 'Broccoli', 'Carrot'],
        correct: 1,
        emoji: '🍔',
      },
    ],
  },

  // ISLAMIYAT
  'islamiyat-allah': {
    questions: [
      {
        question: 'Who is Allah?',
        options: ['Prophet', 'God', 'Angel', 'Human'],
        correct: 1,
        emoji: '🕌',
      },
      {
        question: 'How many is Allah?',
        options: ['Two', 'Three', 'One', 'Many'],
        correct: 2,
        emoji: '☝️',
      },
      {
        question: 'What is Allah\'s power?',
        options: ['Limited', 'Unlimited', 'Small', 'None'],
        correct: 1,
        emoji: '⭐',
      },
      {
        question: 'Did Allah create the world?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '🌍',
      },
      {
        question: 'Is Allah everywhere?',
        options: ['No', 'Yes', 'Sometimes', 'Not sure'],
        correct: 1,
        emoji: '🌟',
      },
      {
        question: 'What is Allah merciful?',
        options: ['No', 'Yes', 'Sometimes', 'Not sure'],
        correct: 1,
        emoji: '💕',
      },
      {
        question: 'Did Allah create you?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '👶',
      },
      {
        question: 'Should we love Allah?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '❤️',
      },
      {
        question: 'Should we obey Allah?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '👂',
      },
      {
        question: 'Is Allah kind?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '😊',
      },
    ],
  },
  'islamiyat-prophet': {
    questions: [
      {
        question: 'Who is Prophet Muhammad?',
        options: ['Teacher', 'Messenger', 'King', 'Saint'],
        correct: 1,
        emoji: '📖',
      },
      {
        question: 'When was Muhammad born?',
        options: ['100 years ago', '1400 years ago', 'Yesterday', 'Tomorrow'],
        correct: 1,
        emoji: '👶',
      },
      {
        question: 'Did Muhammad teach?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '📚',
      },
      {
        question: 'Was Muhammad kind?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '💕',
      },
      {
        question: 'Did Muhammad pray?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '🙏',
      },
      {
        question: 'Did God reveal to Muhammad?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '✨',
      },
      {
        question: 'Should we follow Muhammad?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '👣',
      },
      {
        question: 'Did Muhammad help poor?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '🤝',
      },
      {
        question: 'Should we love Muhammad?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '❤️',
      },
      {
        question: 'Is Muhammad example?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '⭐',
      },
    ],
  },
  'islamiyat-duas': {
    questions: [
      {
        question: 'What do we say before eating?',
        options: ['Alhamdulillah', 'Bismillah', 'Assalamu', 'Wa alaikum'],
        correct: 1,
        emoji: '🍽️',
      },
      {
        question: 'What do we say after eating?',
        options: ['Bismillah', 'Alhamdulillah', 'Assalamu', 'Subhanallah'],
        correct: 1,
        emoji: '😋',
      },
      {
        question: 'What do we say before sleeping?',
        options: ['Bismillah', 'Alhamdulillah', 'Subhanallah', 'Allahu Akbar'],
        correct: 2,
        emoji: '😴',
      },
      {
        question: 'What do we say in morning?',
        options: ['Alhamdulillah', 'Subhanallah', 'Assalamu', 'Bismillah'],
        correct: 0,
        emoji: '🌅',
      },
      {
        question: 'Is dua prayer?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '🙏',
      },
      {
        question: 'Can kids make dua?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '👶',
      },
      {
        question: 'What means Bismillah?',
        options: ['After God', 'In God\'s name', 'God bless', 'Praise God'],
        correct: 1,
        emoji: '✨',
      },
      {
        question: 'What means Alhamdulillah?',
        options: ['God bless', 'Praise be to God', 'In God\'s name', 'God protect'],
        correct: 1,
        emoji: '🙏',
      },
      {
        question: 'Should we teach dua to kids?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '👨‍🏫',
      },
      {
        question: 'Is dua good practice?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '✅',
      },
    ],
  },
  'islamiyat-fivepillars': {
    questions: [
      {
        question: 'How many pillars of Islam?',
        options: ['Three', 'Four', 'Five', 'Six'],
        correct: 2,
        emoji: '🕌',
      },
      {
        question: 'First pillar is?',
        options: ['Zakat', 'Hajj', 'Kalimah', 'Salah'],
        correct: 2,
        emoji: '☝️',
      },
      {
        question: 'What is Salah?',
        options: ['Fasting', 'Prayer', 'Charity', 'Pilgrimage'],
        correct: 1,
        emoji: '🙏',
      },
      {
        question: 'What is Zakat?',
        options: ['Prayer', 'Fasting', 'Charity', 'Pilgrimage'],
        correct: 2,
        emoji: '🤝',
      },
      {
        question: 'What is Hajj?',
        options: ['Prayer', 'Fasting', 'Charity', 'Pilgrimage'],
        correct: 3,
        emoji: '🕌',
      },
      {
        question: 'What is Sawm?',
        options: ['Prayer', 'Fasting', 'Charity', 'Pilgrimage'],
        correct: 1,
        emoji: '🕐',
      },
      {
        question: 'When do we fast?',
        options: ['Everyday', 'Ramadan', 'Friday', 'Daily'],
        correct: 1,
        emoji: '📅',
      },
      {
        question: 'Should we pray daily?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '🙏',
      },
      {
        question: 'How many times pray?',
        options: ['Two', 'Three', 'Four', 'Five'],
        correct: 3,
        emoji: '🕐',
      },
      {
        question: 'Are pillars important?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '✅',
      },
    ],
  },
  'islamiyat-months': {
    questions: [
      {
        question: 'What is Ramadan?',
        options: ['Day', 'Month', 'Year', 'Week'],
        correct: 1,
        emoji: '📅',
      },
      {
        question: 'How many months in Islamic year?',
        options: ['10', '11', '12', '13'],
        correct: 2,
        emoji: '📆',
      },
      {
        question: 'First month of Islamic calendar?',
        options: ['Safar', 'Muharram', 'Rabi', 'Jumada'],
        correct: 1,
        emoji: '📖',
      },
      {
        question: 'What is Muharram?',
        options: ['Happy month', 'Holy month', 'Hot month', 'Fast month'],
        correct: 1,
        emoji: '🌙',
      },
      {
        question: 'Is Ramadan holy?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '✨',
      },
      {
        question: 'When is Eid?',
        options: ['During Ramadan', 'After Ramadan', 'Before Ramadan', 'Always'],
        correct: 1,
        emoji: '🎉',
      },
      {
        question: 'How many Eids?',
        options: ['One', 'Two', 'Three', 'Four'],
        correct: 1,
        emoji: '🎊',
      },
      {
        question: 'Is Friday special?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '📅',
      },
      {
        question: 'What is Friday?',
        options: ['Holiday', 'Jummah day', 'Rest day', 'Fun day'],
        correct: 1,
        emoji: '🕌',
      },
      {
        question: 'Should we celebrate Eid?',
        options: ['No', 'Yes', 'Maybe', 'Not sure'],
        correct: 1,
        emoji: '🎉',
      },
    ],
  },
}

// Generate all 100 games
function generateGames(): GameSeed[] {
  const games: GameSeed[] = []

  for (const [subjectKey, subjectData] of Object.entries(SUBJECTS)) {
    for (let categoryIdx = 0; categoryIdx < subjectData.categories.length; categoryIdx++) {
      const category = subjectData.categories[categoryIdx]
      const contentKey = `${subjectKey}-${['counting', 'shapes', 'colors', 'bigsmall', 'addition', 'alphabet', 'words', 'animals', 'bodyparts', 'fruits', 'alphabet', 'simplewords', 'colors', 'animals', 'numbers', 'animals-sounds', 'plants-trees', 'weather', 'bodyparts', 'food', 'allah', 'prophet', 'duas', 'fivepillars', 'months'][categoryIdx]}`

      const content = QUESTIONS_BY_CATEGORY[contentKey] || QUESTIONS_BY_CATEGORY['math-counting']

      for (const gameType of GAME_TYPES) {
        games.push({
          title: `${subjectData.name} - ${category} (${gameType})`,
          description: `Pre-K ${gameType.charAt(0).toUpperCase() + gameType.slice(1)} game for ${category} in ${subjectData.name}`,
          type: gameType,
          subject: subjectData.name,
          grade: 'pre-k',
          language: 'en',
          curriculum: 'Pakistani',
          content: content,
          is_public: true,
        })
      }
    }
  }

  return games.slice(0, 100) // Ensure exactly 100
}

export async function seedGames() {
  const supabase = createServerClient()
  const games = generateGames()

  console.log(`🌱 Seeding ${games.length} Pre-K games...`)

  try {
    const { data, error } = await supabase
      .from('activities')
      .insert(games)
      .select()

    if (error) {
      console.error('❌ Error seeding games:', error)
      throw error
    }

    console.log(`✅ Successfully seeded ${data?.length || 0} games!`)
    return data
  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  }
}
