/**
 * Preview of the 100 Pre-K games that will be created
 * This file shows exactly what data will be in the database
 */

// MATH - 20 Games (5 categories × 4 types)
const MATH_GAMES = [
  // Counting (4 games)
  { title: 'Math - Counting (quiz)', type: 'quiz', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Counting (flashcards)', type: 'flashcards', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Counting (match-up)', type: 'match-up', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Counting (true-false)', type: 'true-false', subject: 'Math', grade: 'pre-k' },
  // Shapes (4 games)
  { title: 'Math - Shapes (quiz)', type: 'quiz', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Shapes (flashcards)', type: 'flashcards', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Shapes (match-up)', type: 'match-up', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Shapes (true-false)', type: 'true-false', subject: 'Math', grade: 'pre-k' },
  // Colors (4 games)
  { title: 'Math - Colors and Numbers (quiz)', type: 'quiz', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Colors and Numbers (flashcards)', type: 'flashcards', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Colors and Numbers (match-up)', type: 'match-up', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Colors and Numbers (true-false)', type: 'true-false', subject: 'Math', grade: 'pre-k' },
  // Big & Small (4 games)
  { title: 'Math - Big and Small (quiz)', type: 'quiz', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Big and Small (flashcards)', type: 'flashcards', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Big and Small (match-up)', type: 'match-up', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Big and Small (true-false)', type: 'true-false', subject: 'Math', grade: 'pre-k' },
  // Addition (4 games)
  { title: 'Math - Simple Addition (quiz)', type: 'quiz', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Simple Addition (flashcards)', type: 'flashcards', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Simple Addition (match-up)', type: 'match-up', subject: 'Math', grade: 'pre-k' },
  { title: 'Math - Simple Addition (true-false)', type: 'true-false', subject: 'Math', grade: 'pre-k' },
]

// URDU - 20 Games (5 categories × 4 types)
const URDU_GAMES = [
  // Alphabet (4 games)
  { title: 'Urdu - Urdu Alphabet (quiz)', type: 'quiz', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Urdu Alphabet (flashcards)', type: 'flashcards', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Urdu Alphabet (match-up)', type: 'match-up', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Urdu Alphabet (true-false)', type: 'true-false', subject: 'Urdu', grade: 'pre-k' },
  // Words (4 games)
  { title: 'Urdu - Simple Urdu Words (quiz)', type: 'quiz', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Simple Urdu Words (flashcards)', type: 'flashcards', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Simple Urdu Words (match-up)', type: 'match-up', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Simple Urdu Words (true-false)', type: 'true-false', subject: 'Urdu', grade: 'pre-k' },
  // Animals (4 games)
  { title: 'Urdu - Animals in Urdu (quiz)', type: 'quiz', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Animals in Urdu (flashcards)', type: 'flashcards', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Animals in Urdu (match-up)', type: 'match-up', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Animals in Urdu (true-false)', type: 'true-false', subject: 'Urdu', grade: 'pre-k' },
  // Body Parts (4 games)
  { title: 'Urdu - Body Parts in Urdu (quiz)', type: 'quiz', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Body Parts in Urdu (flashcards)', type: 'flashcards', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Body Parts in Urdu (match-up)', type: 'match-up', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Body Parts in Urdu (true-false)', type: 'true-false', subject: 'Urdu', grade: 'pre-k' },
  // Fruits (4 games)
  { title: 'Urdu - Fruits in Urdu (quiz)', type: 'quiz', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Fruits in Urdu (flashcards)', type: 'flashcards', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Fruits in Urdu (match-up)', type: 'match-up', subject: 'Urdu', grade: 'pre-k' },
  { title: 'Urdu - Fruits in Urdu (true-false)', type: 'true-false', subject: 'Urdu', grade: 'pre-k' },
]

// ENGLISH - 20 Games (5 categories × 4 types)
const ENGLISH_GAMES = [
  // Alphabet (4 games)
  { title: 'English - ABC Alphabet (quiz)', type: 'quiz', subject: 'English', grade: 'pre-k' },
  { title: 'English - ABC Alphabet (flashcards)', type: 'flashcards', subject: 'English', grade: 'pre-k' },
  { title: 'English - ABC Alphabet (match-up)', type: 'match-up', subject: 'English', grade: 'pre-k' },
  { title: 'English - ABC Alphabet (true-false)', type: 'true-false', subject: 'English', grade: 'pre-k' },
  // Simple Words (4 games)
  { title: 'English - Simple Words (quiz)', type: 'quiz', subject: 'English', grade: 'pre-k' },
  { title: 'English - Simple Words (flashcards)', type: 'flashcards', subject: 'English', grade: 'pre-k' },
  { title: 'English - Simple Words (match-up)', type: 'match-up', subject: 'English', grade: 'pre-k' },
  { title: 'English - Simple Words (true-false)', type: 'true-false', subject: 'English', grade: 'pre-k' },
  // Colors (4 games)
  { title: 'English - Colors in English (quiz)', type: 'quiz', subject: 'English', grade: 'pre-k' },
  { title: 'English - Colors in English (flashcards)', type: 'flashcards', subject: 'English', grade: 'pre-k' },
  { title: 'English - Colors in English (match-up)', type: 'match-up', subject: 'English', grade: 'pre-k' },
  { title: 'English - Colors in English (true-false)', type: 'true-false', subject: 'English', grade: 'pre-k' },
  // Animals (4 games)
  { title: 'English - Animals in English (quiz)', type: 'quiz', subject: 'English', grade: 'pre-k' },
  { title: 'English - Animals in English (flashcards)', type: 'flashcards', subject: 'English', grade: 'pre-k' },
  { title: 'English - Animals in English (match-up)', type: 'match-up', subject: 'English', grade: 'pre-k' },
  { title: 'English - Animals in English (true-false)', type: 'true-false', subject: 'English', grade: 'pre-k' },
  // Numbers (4 games)
  { title: 'English - Numbers 1-10 (quiz)', type: 'quiz', subject: 'English', grade: 'pre-k' },
  { title: 'English - Numbers 1-10 (flashcards)', type: 'flashcards', subject: 'English', grade: 'pre-k' },
  { title: 'English - Numbers 1-10 (match-up)', type: 'match-up', subject: 'English', grade: 'pre-k' },
  { title: 'English - Numbers 1-10 (true-false)', type: 'true-false', subject: 'English', grade: 'pre-k' },
]

// SCIENCE - 20 Games (5 categories × 4 types)
const SCIENCE_GAMES = [
  // Animals & Sounds (4 games)
  { title: 'Science - Animals and Sounds (quiz)', type: 'quiz', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Animals and Sounds (flashcards)', type: 'flashcards', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Animals and Sounds (match-up)', type: 'match-up', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Animals and Sounds (true-false)', type: 'true-false', subject: 'Science', grade: 'pre-k' },
  // Plants (4 games)
  { title: 'Science - Plants and Trees (quiz)', type: 'quiz', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Plants and Trees (flashcards)', type: 'flashcards', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Plants and Trees (match-up)', type: 'match-up', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Plants and Trees (true-false)', type: 'true-false', subject: 'Science', grade: 'pre-k' },
  // Weather (4 games)
  { title: 'Science - Weather (quiz)', type: 'quiz', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Weather (flashcards)', type: 'flashcards', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Weather (match-up)', type: 'match-up', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Weather (true-false)', type: 'true-false', subject: 'Science', grade: 'pre-k' },
  // Body Parts (4 games)
  { title: 'Science - My Body Parts (quiz)', type: 'quiz', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - My Body Parts (flashcards)', type: 'flashcards', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - My Body Parts (match-up)', type: 'match-up', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - My Body Parts (true-false)', type: 'true-false', subject: 'Science', grade: 'pre-k' },
  // Food (4 games)
  { title: 'Science - Food we Eat (quiz)', type: 'quiz', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Food we Eat (flashcards)', type: 'flashcards', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Food we Eat (match-up)', type: 'match-up', subject: 'Science', grade: 'pre-k' },
  { title: 'Science - Food we Eat (true-false)', type: 'true-false', subject: 'Science', grade: 'pre-k' },
]

// ISLAMIYAT - 20 Games (5 categories × 4 types)
const ISLAMIYAT_GAMES = [
  // Allah (4 games)
  { title: 'Islamiyat - Allah and His Names (quiz)', type: 'quiz', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Allah and His Names (flashcards)', type: 'flashcards', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Allah and His Names (match-up)', type: 'match-up', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Allah and His Names (true-false)', type: 'true-false', subject: 'Islamiyat', grade: 'pre-k' },
  // Prophet (4 games)
  { title: 'Islamiyat - Prophet Muhammad SAW (quiz)', type: 'quiz', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Prophet Muhammad SAW (flashcards)', type: 'flashcards', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Prophet Muhammad SAW (match-up)', type: 'match-up', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Prophet Muhammad SAW (true-false)', type: 'true-false', subject: 'Islamiyat', grade: 'pre-k' },
  // Duas (4 games)
  { title: 'Islamiyat - Basic Duas (quiz)', type: 'quiz', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Basic Duas (flashcards)', type: 'flashcards', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Basic Duas (match-up)', type: 'match-up', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Basic Duas (true-false)', type: 'true-false', subject: 'Islamiyat', grade: 'pre-k' },
  // Five Pillars (4 games)
  { title: 'Islamiyat - Five Pillars (quiz)', type: 'quiz', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Five Pillars (flashcards)', type: 'flashcards', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Five Pillars (match-up)', type: 'match-up', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Five Pillars (true-false)', type: 'true-false', subject: 'Islamiyat', grade: 'pre-k' },
  // Islamic Months (4 games)
  { title: 'Islamiyat - Islamic Months and Days (quiz)', type: 'quiz', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Islamic Months and Days (flashcards)', type: 'flashcards', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Islamic Months and Days (match-up)', type: 'match-up', subject: 'Islamiyat', grade: 'pre-k' },
  { title: 'Islamiyat - Islamic Months and Days (true-false)', type: 'true-false', subject: 'Islamiyat', grade: 'pre-k' },
]

// ALL 100 GAMES
const ALL_GAMES = [
  ...MATH_GAMES,
  ...URDU_GAMES,
  ...ENGLISH_GAMES,
  ...SCIENCE_GAMES,
  ...ISLAMIYAT_GAMES,
]

// SUMMARY
console.log('📊 100 Pre-K Games Preview')
console.log('===========================\n')

console.log(`Total games: ${ALL_GAMES.length}`)
console.log(`\nBreakdown:`)
console.log(`  Math:      ${MATH_GAMES.length} games`)
console.log(`  Urdu:      ${URDU_GAMES.length} games`)
console.log(`  English:   ${ENGLISH_GAMES.length} games`)
console.log(`  Science:   ${SCIENCE_GAMES.length} games`)
console.log(`  Islamiyat: ${ISLAMIYAT_GAMES.length} games`)

console.log(`\nBy Type:`)
const byType = {}
for (const game of ALL_GAMES) {
  byType[game.type] = (byType[game.type] || 0) + 1
}
for (const [type, count] of Object.entries(byType)) {
  console.log(`  ${type}: ${count}`)
}

console.log(`\n✅ Ready to seed! Run: node scripts/setup-prek.mjs`)
