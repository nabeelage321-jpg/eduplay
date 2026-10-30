// ─── EduPlay auth options (NextAuth v4) ─────────────────────────────────────
// AUTH BATCH 2026-10-30. This is the ONE session definition the whole app
// shares. Every API route that used to call `getServerSession()` with no
// argument must call `getServerSession(authOptions)` — without options the
// session is never resolved and every AI / Stripe route returns 401.
//
// Session shape (UNCHANGED — this is what existing routes already expect):
//   session.user.email  — required by /api/ai/* and /api/stripe/checkout
//   session.user.name   — used by /api/stripe/checkout for the customer
//   session.user.image  — Google avatar, informational only
// Nothing else in the session shape changed; no route's auth check was
// rewritten, only the missing options argument was supplied.
//
// Provider choice — Google only, and why (see AUTH_REPORT.md):
//   * NextAuth was already in package.json and Vercel already has
//     NEXTAUTH_SECRET + NEXTAUTH_URL set, so Google needs only two more
//     env vars from the owner (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).
//   * A Supabase email/magic-link flow would NOT fit better: it would
//     require rewriting all 7 NextAuth call sites and changing the session
//     shape, and Supabase Auth would still need its own email-provider
//     setup. A Credentials (email+password) provider was rejected: there
//     is no password store in the codebase and adding one (hashing, reset
//     flow) is a security surface, not a shortcut.
//   * If the Google env vars are absent, the provider list is empty on
//     purpose: the /api/auth route still serves, but the login/signup
//     pages show a setup notice instead of a button that fails. No secret
//     is ever in this file — values come only from Vercel env vars.

import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createServerClient } from '@/lib/supabase/server'

export const isGoogleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
)

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: isGoogleConfigured
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
      ]
    : [],
  callbacks: {
    // First sign-in = account creation. Upsert the public.users row that
    // /api/ai/* looks up by email (it returns 404 "User not found" without
    // one). Never overwrite is_premium / tier / stripe columns — those are
    // owned by the Stripe webhook. Never block sign-in on a DB failure:
    // if Supabase is down or migration 004 has not been run yet, the user
    // still signs in and the AI routes fail with their own clear 404.
    async signIn({ user }) {
      if (!user?.email) return true
      try {
        const supabase = createServerClient()
        await supabase.from('users').upsert(
          {
            email: user.email,
            name: user.name ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' },
        )
      } catch (err) {
        console.error('[auth] users upsert failed (sign-in still allowed):', err)
      }
      return true
    },
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email
      if (user?.name) token.name = user.name
      return token
    },
    async session({ session, token }) {
      if (token?.email && session.user) {
        session.user.email = token.email as string
      }
      if (token?.name && session.user) {
        session.user.name = token.name as string
      }
      return session
    },
  },
}
