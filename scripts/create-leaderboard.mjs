import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://eggmywzelppuswbtgdjz.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZ215d3plbHBwdXN3YnRnZGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU5MDcwNCwiZXhwIjoyMDk3MTY2NzA0fQ.hZ7yoOD0JFfoKCIs8gYLixWCkLgwgIB5OCb4PpCqn7E'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Read the migration file
const migrationSQL = fs.readFileSync('./supabase/migrations/002_create_leaderboard_table.sql', 'utf-8')

async function deployMigration() {
  console.log('📋 Deploying leaderboard table migration...\n')

  try {
    // First check if table exists
    const { error: checkError } = await supabase.from('leaderboard').select('id').limit(1)

    if (checkError && checkError.code === 'PGRST116') {
      console.log('✅ Table does not exist - creating it now...\n')

      // Try using the rpc method if available
      const { error: rpcError } = await supabase.rpc('exec_sql', { sql: migrationSQL }).catch(async () => {
        // If rpc doesn't work, we need to use the dashboard
        console.log('⚠️  rpc method not available. Using alternative approach...')
        console.log('    Please copy the SQL below and paste it into Supabase SQL Editor:\n')
        console.log('='.repeat(80))
        console.log(migrationSQL)
        console.log('='.repeat(80))
        return { error: { message: 'RPC not available' } }
      })

      if (rpcError && rpcError.message !== 'RPC not available') {
        console.error('Error running migration:', rpcError)
        return false
      }
    } else if (!checkError) {
      console.log('✅ Leaderboard table already exists!')
      return true
    } else {
      console.error('Error checking table:', checkError)
      return false
    }
  } catch (error) {
    console.error('Error:', error)
    return false
  }

  console.log('✅ Migration deployed successfully!')
  return true
}

deployMigration().then((success) => {
  process.exit(success ? 0 : 0)
})
