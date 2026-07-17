import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Create activities table using direct SQL
    const sql = `
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
    `

    // Use Postgres RPC to execute raw SQL
    const { error: sqlError } = await supabase
      .rpc('exec', { sql: sql })
      .catch(() => {
        // If exec RPC doesn't exist, try another approach
        return { error: { message: 'RPC not available' } }
      })

    if (sqlError && !sqlError.message?.includes('already exists')) {
      // Table might already exist, try to check
      const { error: checkError } = await supabase
        .from('activities')
        .select('count', { count: 'exact', head: true })

      if (checkError && checkError.code === '42P01') {
        return NextResponse.json(
          { error: 'Table creation failed. Please run SQL manually.' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Database initialized successfully'
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Database initialization error:', error)
    return NextResponse.json(
      { error: 'Database initialization failed' },
      { status: 500 }
    )
  }
}
