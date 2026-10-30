// ─── Resolve a signed-in NextAuth user to their public.users row ──────────
// CREATE-SAVE FIX 2026-10-30. Why this file exists:
//   /api/activities used to call supabase.auth.getUser() on the service-role
//   client. That client carries no user token (persistSession: false, no
//   cookie is ever attached), so getUser() ALWAYS failed and POST/PUT/
//   DELETE always returned 401 — even for a signed-in user.
//   The app's real session is NextAuth (see auth-options.ts), whose session
//   carries only email/name. The DB owner id is therefore resolved here:
//   session email -> public.users.id (migration 004). That id is what
//   activities.teacher_id and ai_generations.teacher_id store.
//
//   Return values:
//     null                        — no signed-in NextAuth session (401)
//     { email, userId: null }     — signed in, but no public.users row yet
//                                   (migration 004 not run, or the sign-in
//                                   upsert has not run — callers return 404
//                                   "User not found", matching /api/ai/*)
//     { email, userId: string }   — the owner id to store / compare against

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { createServerClient } from '@/lib/supabase/server'

export interface SessionUser {
  email: string
  userId: string | null
}

export async function resolveSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const supabase = createServerClient()
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  return { email: session.user.email, userId: user?.id ?? null }
}
