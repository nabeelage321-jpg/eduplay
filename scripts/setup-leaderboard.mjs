import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function setupLeaderboardTable() {
  console.log('Setting up leaderboard table...')

  try {
    // Create the leaderboard table with all necessary fields and indexes
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS leaderboard (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
          player_name TEXT NOT NULL,
          score INTEGER NOT NULL DEFAULT 0,
          correct_answers INTEGER NOT NULL DEFAULT 0,
          time_taken INTEGER NOT NULL DEFAULT 0,
          played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_leaderboard_activity_id ON leaderboard(activity_id);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_played_at ON leaderboard(played_at DESC);

        ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Enable read access for all users" ON leaderboard;
        DROP POLICY IF EXISTS "Enable insert for service role" ON leaderboard;
        DROP POLICY IF EXISTS "Enable update for service role" ON leaderboard;

        CREATE POLICY "Enable read access for all users" ON leaderboard
          FOR SELECT USING (true);

        CREATE POLICY "Enable insert for service role" ON leaderboard
          FOR INSERT WITH CHECK (true);

        CREATE POLICY "Enable update for service role" ON leaderboard
          FOR UPDATE USING (true) WITH CHECK (true);
      `,
    })

    if (error) {
      console.error('Error setting up leaderboard table:', error)
      return false
    }

    console.log('✅ Leaderboard table setup complete')
    return true
  } catch (error) {
    // The RPC function might not exist, try alternative method
    console.log('Attempting alternative setup method...')

    // Try creating the table directly using the client
    try {
      // First, check if table exists by trying to select from it
      const { error: checkError } = await supabase.from('leaderboard').select('id').limit(1)

      if (checkError?.code === 'PGRST116') {
        // Table doesn't exist, provide instructions
        console.log('ℹ️  Leaderboard table does not exist')
        console.log('')
        console.log('Please run the following SQL in your Supabase dashboard:')
        console.log('')
        console.log(`
        CREATE TABLE IF NOT EXISTS leaderboard (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
          player_name TEXT NOT NULL,
          score INTEGER NOT NULL DEFAULT 0,
          correct_answers INTEGER NOT NULL DEFAULT 0,
          time_taken INTEGER NOT NULL DEFAULT 0,
          played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_leaderboard_activity_id ON leaderboard(activity_id);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
        CREATE INDEX IF NOT EXISTS idx_leaderboard_played_at ON leaderboard(played_at DESC);

        ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Enable read access for all users" ON leaderboard
          FOR SELECT USING (true);

        CREATE POLICY "Enable insert for service role" ON leaderboard
          FOR INSERT WITH CHECK (true);

        CREATE POLICY "Enable update for service role" ON leaderboard
          FOR UPDATE USING (true) WITH CHECK (true);
        `)
        return false
      }

      console.log('✅ Leaderboard table already exists')
      return true
    } catch (innerError) {
      console.error('Error checking leaderboard table:', innerError)
      return false
    }
  }
}

setupLeaderboardTable().then((success) => {
  if (!success) {
    console.log('\n⚠️  Please run the SQL migration manually in Supabase')
    process.exit(0)
  }
  console.log('\n✅ Leaderboard setup complete!')
})
