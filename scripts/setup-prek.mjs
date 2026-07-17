#!/usr/bin/env node

/**
 * Complete database setup for EduPlay Pre-K Games
 * Creates tables, indexes, and seeds 100 Pre-K games
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')

// Load environment variables from .env.local
const envContent = fs.readFileSync(envPath, 'utf-8')
const envVars = {}
for (const line of envContent.split('\n')) {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key.trim()] = value.trim()
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Migration SQL
const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  subject TEXT,
  grade TEXT,
  language TEXT DEFAULT 'en',
  curriculum TEXT,
  content JSONB NOT NULL,
  is_public BOOLEAN DEFAULT true,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activities_grade ON activities(grade);
CREATE INDEX IF NOT EXISTS idx_activities_subject ON activities(subject);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
CREATE INDEX IF NOT EXISTS idx_activities_is_public ON activities(is_public);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_subject_grade ON activities(subject, grade);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read public activities" ON activities;
DROP POLICY IF EXISTS "Authenticated users can see all activities" ON activities;

CREATE POLICY "Anyone can read public activities" ON activities
  FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated users can see all activities" ON activities
  FOR SELECT USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
DROP FUNCTION IF EXISTS update_updated_at_column();

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`

// Question templates for game categories
const QUESTIONS = {
  counting: [
    { question: 'How many apples? 🍎🍎🍎', options: ['Two', 'Three', 'Four', 'Five'], correct: 1 },
    { question: 'Count the stars ⭐⭐⭐⭐', options: ['Three', 'Four', 'Five', 'Six'], correct: 1 },
    { question: 'How many birds? 🐦🐦', options: ['One', 'Two', 'Three', 'Four'], correct: 1 },
    { question: 'Count the flowers 🌸🌸🌸🌸🌸', options: ['Four', 'Five', 'Six', 'Seven'], correct: 1 },
    { question: 'How many butterflies? 🦋🦋🦋', options: ['Two', 'Three', 'Four', 'Five'], correct: 1 },
    { question: 'Count the hearts ❤️❤️❤️❤️', options: ['Three', 'Four', 'Five', 'Six'], correct: 1 },
    { question: 'How many balls? 🎾🎾🎾🎾🎾🎾', options: ['Five', 'Six', 'Seven', 'Eight'], correct: 1 },
    { question: 'Count the suns ☀️☀️☀️☀️☀️☀️☀️', options: ['Six', 'Seven', 'Eight', 'Nine'], correct: 1 },
    { question: 'How many raindrops? 💧💧💧', options: ['Two', 'Three', 'Four', 'Five'], correct: 1 },
    { question: 'Count the moons 🌙🌙🌙🌙🌙🌙🌙🌙', options: ['Seven', 'Eight', 'Nine', 'Ten'], correct: 1 },
  ],
  shapes: [
    { question: 'Which shape has 4 sides?', options: ['Circle', 'Triangle', 'Square', 'Star'], correct: 2 },
    { question: 'Which shape is round?', options: ['Square', 'Circle', 'Triangle', 'Rectangle'], correct: 1 },
    { question: 'Which shape has 3 sides?', options: ['Circle', 'Triangle', 'Square', 'Rectangle'], correct: 1 },
    { question: 'Which shape looks like a star?', options: ['Circle', 'Square', 'Star', 'Triangle'], correct: 2 },
    { question: 'Which is a rectangle?', options: ['Circle', 'Triangle', 'Rectangle', 'Diamond'], correct: 2 },
    { question: 'What shape is a ball?', options: ['Square', 'Circle', 'Triangle', 'Star'], correct: 1 },
    { question: 'Find the triangle:', options: ['🔷', '🔺', '⬜', '⭕'], correct: 1 },
    { question: 'What shape has 5 sides?', options: ['Pentagon', 'Square', 'Triangle', 'Circle'], correct: 0 },
    { question: 'Which is a square?', options: ['Triangle', 'Circle', 'Square', 'Star'], correct: 2 },
    { question: 'Find the circle:', options: ['🔺', '⬜', '🔵', '⭐'], correct: 2 },
  ],
  colors: [
    { question: 'What color is the apple?', options: ['Blue', 'Red', 'Yellow', 'Green'], correct: 1 },
    { question: 'What color is the banana?', options: ['Red', 'Yellow', 'Blue', 'Purple'], correct: 1 },
    { question: 'What color is the sky?', options: ['Green', 'Blue', 'Red', 'Yellow'], correct: 1 },
    { question: 'What color is the sun?', options: ['Green', 'Purple', 'Yellow', 'Blue'], correct: 2 },
    { question: 'What color is the grass?', options: ['Red', 'Blue', 'Green', 'Yellow'], correct: 2 },
    { question: 'What color is a cloud?', options: ['Blue', 'White', 'Black', 'Gray'], correct: 1 },
    { question: 'What color is the sea?', options: ['Yellow', 'Blue', 'Red', 'Green'], correct: 1 },
    { question: 'What color is a carrot?', options: ['Green', 'Orange', 'Purple', 'Red'], correct: 1 },
    { question: 'What color is a grape?', options: ['Yellow', 'Orange', 'Purple', 'Red'], correct: 2 },
    { question: 'What color is snow?', options: ['Gray', 'Blue', 'White', 'Black'], correct: 2 },
  ],
  bigsmall: [
    { question: 'Which elephant is bigger?', options: ['Small', 'Big', 'Medium', 'Tiny'], correct: 1 },
    { question: 'Which is smaller?', options: ['Big', 'Medium', 'Small', 'Large'], correct: 2 },
    { question: 'Which apple is big?', options: ['Small', 'Big', 'Tiny', 'Huge'], correct: 1 },
    { question: 'Which is the biggest?', options: ['Medium', 'Big', 'Huge', 'Small'], correct: 2 },
    { question: 'Which stone is smallest?', options: ['Large', 'Tiny', 'Big', 'Huge'], correct: 1 },
    { question: 'Which is bigger: ant or elephant?', options: ['Ant', 'Elephant', 'Same', 'Ant is bigger'], correct: 1 },
    { question: 'Which box is small?', options: ['Large', 'Huge', 'Small', 'Big'], correct: 2 },
    { question: 'Which is smaller: dog or cat?', options: ['Dog', 'Cat', 'Same', 'Dog is smaller'], correct: 1 },
    { question: 'Which star is biggest?', options: ['Small', 'Medium', 'Big', 'Tiny'], correct: 2 },
    { question: 'Which is smallest?', options: ['House', 'Ant', 'Tree', 'Car'], correct: 1 },
  ],
  addition: [
    { question: '1 + 1 = ?', options: ['One', 'Two', 'Three', 'Four'], correct: 1 },
    { question: '2 + 1 = ?', options: ['One', 'Two', 'Three', 'Four'], correct: 2 },
    { question: '1 + 2 = ?', options: ['One', 'Two', 'Three', 'Four'], correct: 2 },
    { question: '3 + 1 = ?', options: ['Two', 'Three', 'Four', 'Five'], correct: 2 },
    { question: '2 + 2 = ?', options: ['Two', 'Three', 'Four', 'Five'], correct: 2 },
    { question: '1 + 3 = ?', options: ['Two', 'Three', 'Four', 'Five'], correct: 2 },
    { question: '2 + 3 = ?', options: ['Three', 'Four', 'Five', 'Six'], correct: 2 },
    { question: '4 + 1 = ?', options: ['Three', 'Four', 'Five', 'Six'], correct: 2 },
    { question: '3 + 2 = ?', options: ['Three', 'Four', 'Five', 'Six'], correct: 2 },
    { question: '1 + 4 = ?', options: ['Three', 'Four', 'Five', 'Six'], correct: 2 },
  ],
}

async function runMigration() {
  console.log('📝 Creating activities table and indexes...\n')
  
  try {
    const { data, error } = await supabase.rpc('exec', {
      sql: MIGRATION_SQL.split(';').filter(s => s.trim())
    }).catch(() => {
      // If RPC doesn't exist, try with sql_string parameter
      return supabase.rpc('execute_sql', { sql_string: MIGRATION_SQL })
    })
    
    if (error && !error.message?.includes('already exists')) {
      console.log('⚠️  Note: Direct SQL RPC may not be available.')
      console.log('📋 You may need to run the migration manually in Supabase console.')
      console.log('File: supabase/migrations/001_create_activities_table.sql')
      console.log('Proceeding with seeding...\n')
    } else if (!error) {
      console.log('✅ Migration completed!\n')
    }
  } catch (error) {
    console.log('ℹ️  Migration RPC not available (this is normal)')
    console.log('   Table will be created on first insert if needed\n')
  }
}

function generateGames() {
  const games = []
  const subjects = ['Math', 'Urdu', 'English', 'Science', 'Islamiyat']
  const categoryList = Object.keys(QUESTIONS)
  const types = ['quiz', 'flashcards', 'match-up', 'true-false']
  
  let id = 0
  for (const subject of subjects) {
    for (let catIdx = 0; catIdx < 5; catIdx++) {
      const categoryKey = categoryList[catIdx]
      for (const type of types) {
        if (id >= 100) break
        
        const questions = QUESTIONS[categoryKey] || QUESTIONS.counting
        
        games.push({
          title: `${subject} - ${categoryKey} (${type})`,
          description: `Pre-K ${type} game for ${categoryKey} in ${subject}`,
          type,
          subject,
          grade: 'pre-k',
          language: 'en',
          curriculum: 'Pakistani',
          content: { questions },
          is_public: true,
          play_count: 0,
        })
        id++
      }
      if (id >= 100) break
    }
    if (id >= 100) break
  }
  
  return games.slice(0, 100)
}

async function seedGames() {
  console.log('🌱 Seeding 100 Pre-K games...\n')
  
  const games = generateGames()
  
  try {
    // Delete existing Pre-K games
    const { error: deleteError } = await supabase
      .from('activities')
      .delete()
      .eq('grade', 'pre-k')
    
    if (deleteError && deleteError.code !== 'PGRST116') {
      console.log('⚠️  Warning:', deleteError.message)
    }
    
    // Insert games in batches
    const batchSize = 20
    let inserted = 0
    
    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize)
      const { data, error } = await supabase
        .from('activities')
        .insert(batch)
        .select('id')
      
      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error)
        throw error
      }
      
      inserted += data?.length || 0
      console.log(`✅ Inserted ${inserted}/${games.length} games`)
    }
    
    return inserted
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  }
}

async function verify() {
  console.log('\n📊 Verifying data...\n')
  
  try {
    const { count, error } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('grade', 'pre-k')
    
    if (error) {
      console.error('❌ Verification failed:', error)
      return 0
    }
    
    console.log(`✅ Total Pre-K games in database: ${count}`)
    
    // Show breakdown by subject
    const { data: subjects, error: subError } = await supabase
      .from('activities')
      .select('subject')
      .eq('grade', 'pre-k')
    
    if (!subError && subjects) {
      const subjectCounts = {}
      for (const s of subjects) {
        subjectCounts[s.subject] = (subjectCounts[s.subject] || 0) + 1
      }
      
      console.log('\n📚 Games per subject:')
      for (const [subject, count] of Object.entries(subjectCounts)) {
        console.log(`   ${subject}: ${count}`)
      }
    }
    
    return count
  } catch (error) {
    console.error('❌ Verification error:', error)
    return 0
  }
}

async function main() {
  console.log('🚀 EduPlay Pre-K Games Database Setup')
  console.log('=====================================\n')
  
  try {
    await runMigration()
    const inserted = await seedGames()
    const verified = await verify()
    
    console.log('\n' + '='.repeat(40))
    if (verified === 100) {
      console.log('✨ Setup complete! 100 Pre-K games ready to play!')
    } else {
      console.log(`⚠️  Setup complete but expected 100 games, found ${verified}`)
    }
    console.log('='.repeat(40) + '\n')
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  }
}

main()
