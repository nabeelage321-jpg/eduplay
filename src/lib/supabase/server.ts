import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client (uses service role for API routes)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return a mock client during build/test when env vars not set
    return createClient('https://placeholder.supabase.co', 'placeholder-key')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
