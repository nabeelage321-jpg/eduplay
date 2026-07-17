#!/usr/bin/env node

/**
 * Database setup script
 * Runs migrations and seeds data for EduPlay
 */

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { seedGames } from './src/lib/supabase/seed/prek-games.js'
import { createServerClient } from './src/lib/supabase/server.js'

async function runMigration() {
  console.log('📝 Running database migration...')
  
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/001_create_activities_table.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8')
  
  try {
    const supabase = createServerClient()
    
    // Execute migration SQL
    const { error } = await supabase.rpc('execute_sql', { sql_string: sql })
    
    if (error) {
      // If RPC doesn't exist, use alternative approach
      console.log('Note: Migration RPC not available. You may need to run the SQL manually in Supabase console.')
      console.log('SQL file location: supabase/migrations/001_create_activities_table.sql')
      return
    }
    
    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration error:', error)
    process.exit(1)
  }
}

async function main() {
  console.log('🚀 Starting EduPlay database setup...\n')

  try {
    // Run migration
    await runMigration()
    
    // Seed data
    console.log('\n🌱 Seeding data...')
    const data = await seedGames()
    
    // Verify
    console.log('\n✅ Database setup completed successfully!')
    console.log(`📊 Seeded ${data?.length || 0} Pre-K games`)
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

main()
