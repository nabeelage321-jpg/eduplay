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
//
// APPROVAL BATCH 2026-10-30: also resolves the recorded role and Creator
// badge (migration 007: users.role, users.creator_badge). If migration 007
// has not been run yet, the select falls back to id-only so sign-in and
// creating do NOT break — role is then null and the gate treats the user
// as a non-student (see src/lib/approval.ts).

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { createServerClient } from '@/lib/supabase/server'

export interface SessionUser {
  email: string
  userId: string | null
  /** Recorded users.role ('teacher' | 'student' | 'parent' | 'admin'), or null. */
  role: string | null
  /** True when the user holds the auto-earned Kid Creator badge. */
  creatorBadge: boolean
}

export async function resolveSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null

  const supabase = createServerClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('id, role, creator_badge')
    .eq('email', session.user.email)
    .single()

  if (!error && user) {
    return {
      email: session.user.email,
      userId: user.id ?? null,
      role: (user as { role?: string | null }).role ?? null,
      creatorBadge: (user as { creator_badge?: boolean | null }).creator_badge === true,
    }
  }

  // Migration 007 not run yet (or another select error): fall back to
  // id-only so existing behaviour keeps working, gate inactive.
  const { data: fallback } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  return {
    email: session.user.email,
    userId: fallback?.id ?? null,
    role: null,
    creatorBadge: false,
  }
}
