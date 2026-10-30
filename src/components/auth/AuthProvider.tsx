'use client'

// Wraps the locale layout so client components (Navbar, login/signup
// forms) can use useSession() / signIn() / signOut() from next-auth/react.
// No session data is hardcoded here; the session comes from /api/auth.
import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

export default function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
