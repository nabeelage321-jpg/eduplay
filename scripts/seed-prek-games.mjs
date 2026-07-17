#!/usr/bin/env node

/**
 * Seed Pre-K games data for EduPlay
 * Run with: node scripts/seed-prek-games.mjs
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Questions template for each category
const QUESTIONS_BY_CATEGORY = {
  'math-counting': [
    { question: 'How many apples? 🍎🍎🍎', options: ['Two', 'Three', 'Four', 'Five'], correct: 1, emoji: '🍎' },
    { question: 'Count the stars ⭐⭐⭐⭐', options: ['Three', 'Four', 'Five', 'Six'], correct: 1, emoji: '⭐' },
    { question: 'How many birds? 🐦🐦', options: ['One', 'Two', 'Three', 'Four'], correct: 1, emoji: '🐦' },
    { question: 'Count the flowers 🌸🌸🌸🌸🌸', options: ['Four', 'Five', 'Six', 'Seven'], correct: 1, emoji: '🌸' },
    { question: 'How many butterflies? 🦋🦋🦋', options: ['Two', 'Three', 'Four', 'Five'], correct: 1, emoji: '🦋' },
    { question: 'Count the hearts ❤️❤️❤️❤️', options: ['Three', 'Four', 'Five', 'Six'], correct: 1, emoji: '❤️' },
    { question: 'How many balls? 🎾🎾🎾🎾🎾🎾', options: ['Five', 'Six', 'Seven', 'Eight'], correct: 1, emoji: '🎾' },
    { question: 'Count the suns ☀️☀️☀️☀️☀️☀️☀️', options: ['Six', 'Seven', 'Eight', 'Nine'], correct: 1, emoji: '☀️' },
    { question: 'How many raindrops? 💧💧💧', options: ['Two', 'Three', 'Four', 'Five'], correct: 1, emoji: '💧' },
    { question: 'Count the moons 🌙🌙🌙🌙🌙🌙🌙🌙', options: ['Seven', 'Eight', 'Nine', 'Ten'], correct: 1, emoji: '🌙' },
  ],
  'math-shapes': [
    { question: 'Which shape has 4 sides?', options: ['Circle', 'Triangle', 'Square', 'Star'], correct: 2, emoji: '⬜' },
    { question: 'Which shape is round?', options: ['Square', 'Circle', 'Triangle', 'Rectangle'], correct: 1, emoji: '⭕' },
    { question: 'Which shape has 3 sides?', options: ['Circle', 'Triangle', 'Square', 'Rectangle'], correct: 1, emoji: '🔺' },
    { question: 'Which shape looks like a star?', options: ['Circle', 'Square', 'Star', 'Triangle'], correct: 2, emoji: '⭐' },
    { question: 'Which is a rectangle?', options: ['Circle', 'Triangle', 'Rectangle', 'Diamond'], correct: 2, emoji: '▭' },
    { question: 'What shape is a ball?', options: ['Square', 'Circle', 'Triangle', 'Star'], correct: 1, emoji: '🔵' },
    { question: 'Find the triangle:', options: ['🔷', '🔺', '⬜', '⭕'], correct: 1, emoji: '🔺' },
    { question: 'What shape has 5 sides?', options: ['Pentagon', 'Square', 'Triangle', 'Circle'], correct: 0, emoji: '⬠' },
    { question: 'Which is a square?', options: ['Triangle', 'Circle', 'Square', 'Star'], correct: 2, emoji: '⬜' },
    { question: 'Find the circle:', options: ['🔺', '⬜', '🔵', '⭐'], correct: 2, emoji: '⭕' },
  ],
  'math-colors': [
    { question: 'What color is the apple?', options: ['Blue', 'Red', 'Yellow', 'Green'], correct: 1, emoji: '🍎' },
    { question: 'What color is the banana?', options: ['Red', 'Yellow', 'Blue', 'Purple'], correct: 1, emoji: '🍌' },
    { question: 'What color is the sky?', options: ['Green', 'Blue', 'Red', 'Yellow'], correct: 1, emoji: '☁️' },
    { question: 'What color is the sun?', options: ['Green', 'Purple', 'Yellow', 'Blue'], correct: 2, emoji: '☀️' },
    { question: 'What color is the grass?', options: ['Red', 'Blue', 'Green', 'Yellow'], correct: 2, emoji: '🌱' },
    { question: 'What color is a cloud?', options: ['Blue', 'White', 'Black', 'Gray'], correct: 1, emoji: '☁️' },
    { question: 'What color is the sea?', options: ['Yellow', 'Blue', 'Red', 'Green'], correct: 1, emoji: '🌊' },
    { question: 'What color is a carrot?', options: ['Green', 'Orange', 'Purple', 'Red'], correct: 1, emoji: '🥕' },
    { question: 'What color is a grape?', options: ['Yellow', 'Orange', 'Purple', 'Red'], correct: 2, emoji: '🍇' },
    { question: 'What color is snow?', options: ['Gray', 'Blue', 'White', 'Black'], correct: 2, emoji: '❄️' },
  ],
  'math-bigsmall': [
    { question: 'Which elephant is bigger?', options: ['Small', 'Big', 'Medium', 'Tiny'], correct: 1, emoji: '🐘' },
    { question: 'Which is smaller?', options: ['Big', 'Medium', 'Small', 'Large'], correct: 2, emoji: '📦' },
    { question: 'Which apple is big?', options: ['Small', 'Big', 'Tiny', 'Huge'], correct: 1, emoji: '🍎' },
    { question: 'Which is the biggest?', options: ['Medium', 'Big', 'Huge', 'Small'], correct: 2, emoji: '🎈' },
    { question: 'Which stone is smallest?', options: ['Large', 'Tiny', 'Big', 'Huge'], correct: 1, emoji: '🪨' },
    { question: 'Which is bigger: ant or elephant?', options: ['Ant', 'Elephant', 'Same', 'Ant is bigger'], correct: 1, emoji: '🐘' },
    { question: 'Which box is small?', options: ['Large', 'Huge', 'Small', 'Big'], correct: 2, emoji: '📦' },
    { question: 'Which is smaller: dog or cat?', options: ['Dog', 'Cat', 'Same', 'Dog is smaller'], correct: 1, emoji: '🐱' },
    { question: 'Which star is biggest?', options: ['Small', 'Medium', 'Big', 'Tiny'], correct: 2, emoji: '⭐' },
    { question: 'Which is smallest?', options: ['House', 'Ant', 'Tree', 'Car'], correct: 1, emoji: '🐜' },
  ],
  'math-addition': [
    { question: '1 + 1 = ?', options: ['One', 'Two', 'Three', 'Four'], correct: 1, emoji: '➕' },
    { question: '2 + 1 = ?', options: ['One', 'Two', 'Three', 'Four'], correct: 2, emoji: '➕' },
    { question: '1 + 2 = ?', options: ['One', 'Two', 'Three', 'Four'], correct: 2, emoji: '➕' },
    { question: '3 + 1 = ?', options: ['Two', 'Three', 'Four', 'Five'], correct: 2, emoji: '➕' },
    { question: '2 + 2 = ?', options: ['Two', 'Three', 'Four', 'Five'], correct: 2, emoji: '➕' },
    { question: '1 + 3 = ?', options: ['Two', 'Three', 'Four', 'Five'], correct: 2, emoji: '➕' },
    { question: '2 + 3 = ?', options: ['Three', 'Four', 'Five', 'Six'], correct: 2, emoji: '➕' },
    { question: '4 + 1 = ?', options: ['Three', 'Four', 'Five', 'Six'], correct: 2, emoji: '➕' },
    { question: '3 + 2 = ?', options: ['Three', 'Four', 'Five', 'Six'], correct: 2, emoji: '➕' },
    { question: '1 + 4 = ?', options: ['Three', 'Four', 'Five', 'Six'], correct: 2, emoji: '➕' },
  ],
}

// Generate 100 games with simpler structure for now
function generateGames() {
  const games = []
  
  const subjects = ['Math', 'Urdu', 'English', 'Science', 'Islamiyat']
  const categories = [
    'Counting', 'Shapes', 'Colors', 'Big & Small', 'Addition',
  ]
  const types = ['quiz', 'flashcards', 'match-up', 'true-false']
  
  let gameIndex = 0
  
  for (const subject of subjects) {
    for (const category of categories) {
      for (const type of types) {
        if (gameIndex >= 100) break
        
        const categoryKey = `math-${['counting', 'shapes', 'colors', 'bigsmall', 'addition'][categories.indexOf(category)]}`
        const questions = QUESTIONS_BY_CATEGORY[categoryKey] || QUESTIONS_BY_CATEGORY['math-counting']
        
        games.push({
          title: `${subject} - ${category} (${type})`,
          description: `Pre-K ${type} game for ${category} in ${subject}`,
          type,
          subject,
          grade: 'pre-k',
          language: 'en',
          curriculum: 'Pakistani',
          content: { questions: questions.slice(0, 10) },
          is_public: true,
          play_count: 0,
        })
        gameIndex++
      }
      if (gameIndex >= 100) break
    }
    if (gameIndex >= 100) break
  }
  
  return games.slice(0, 100)
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting Pre-K games seed...\n')
    
    // Check if table exists
    const { data: tableExists, error: checkError } = await supabase
      .from('activities')
      .select('count', { count: 'exact', head: true })
    
    if (checkError && checkError.code === '42P01') {
      console.log('❌ activities table does not exist!')
      console.log('📝 Please run the migration first:')
      console.log('   1. Go to Supabase console')
      console.log('   2. Run the SQL from: supabase/migrations/001_create_activities_table.sql')
      process.exit(1)
    }
    
    // Generate games
    const games = generateGames()
    console.log(`📦 Generated ${games.length} games\n`)
    
    // Clear existing games (optional)
    const { error: deleteError } = await supabase
      .from('activities')
      .delete()
      .eq('grade', 'pre-k')
    
    if (deleteError) {
      console.log('⚠️  Could not clear existing Pre-K games:', deleteError.message)
    }
    
    // Seed games in batches
    const batchSize = 20
    let seeded = 0
    
    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize)
      const { data, error } = await supabase
        .from('activities')
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error)
        process.exit(1)
      }
      
      seeded += batch.length
      console.log(`✅ Seeded ${seeded}/${games.length} games`)
    }
    
    // Verify count
    const { count, error: countError } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('grade', 'pre-k')
    
    console.log(`\n✨ Seeding complete!`)
    console.log(`📊 Total Pre-K games in database: ${count}`)
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seedDatabase()
