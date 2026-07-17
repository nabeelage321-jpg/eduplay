import fs from 'fs'
import fetch from 'node-fetch'

const supabaseUrl = 'https://eggmywzelppuswbtgdjz.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZ215d3plbHBwdXN3YnRnZGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5MDcwNCwiZXhwIjoyMDk3MTY2NzA0fQ.hZ7yoOD0JFfoKCIs8gYLixWCkLgwgIB5OCb4PpCqn7E'

// Read the migration file
const migrationSQL = fs.readFileSync('./supabase/migrations/002_create_leaderboard_table.sql', 'utf-8')

async function createLeaderboardTable() {
  console.log('📋 Creating leaderboard table...\n')

  try {
    // Call Supabase SQL API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Apikey': serviceRoleKey,
      },
      body: JSON.stringify({
        sql: migrationSQL,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.log('ℹ️  Could not create table via RPC. Manual SQL needed.\n')
      console.log('Please run this SQL in Supabase SQL Editor:')
      console.log('='.repeat(80))
      console.log(migrationSQL)
      console.log('='.repeat(80))
      return false
    }

    console.log('✅ Leaderboard table created successfully!')
    return true
  } catch (error) {
    console.error('Connection error:', error.message)
    console.log('\nℹ️  Please run this SQL manually in Supabase SQL Editor:')
    console.log('='.repeat(80))
    console.log(migrationSQL)
    console.log('='.repeat(80))
    return false
  }
}

createLeaderboardTable()
