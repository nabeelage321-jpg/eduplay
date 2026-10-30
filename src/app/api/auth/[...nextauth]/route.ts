// NextAuth route handler (App Router). This route did not exist before the
// AUTH batch, even though next-auth was in package.json and API routes
// already called getServerSession(). It is intentionally OUTSIDE [locale]:
// /api/* is excluded from the next-intl middleware matcher, so auth URLs
// stay locale-free (/api/auth/signin, /api/auth/session, ...).
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
