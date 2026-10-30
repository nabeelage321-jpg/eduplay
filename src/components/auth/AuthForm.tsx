'use client'

// Shared login / signup form. Google is the only provider (see
// src/lib/auth/auth-options.ts for why). There is deliberately NO
// email+password form: no password store exists in this codebase, and
// inventing one would be a security surface, not a shortcut.
// "Sign up" is the same Google button as "Sign in" — the first Google
// sign-in creates the EduPlay account (users row upsert in auth-options).
// If Google is not configured yet (owner has not added the two Vercel env
// vars), this shows a setup notice instead of a button that fails.
import { signIn, signOut, useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { SupportedLocale } from '@/types'

interface AuthFormProps {
  mode: 'login' | 'signup'
  locale: SupportedLocale
  googleConfigured: boolean
}

export default function AuthForm({ mode, locale, googleConfigured }: AuthFormProps) {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const isSignup = mode === 'signup'
  const callbackUrl = isSignup ? `/${locale}/create` : `/${locale}/browse`

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        {isSignup ? 'Create your EduPlay account' : 'Sign in to EduPlay'}
      </h1>
      <p style={{ marginBottom: '1.5rem', opacity: 0.85 }}>
        {isSignup
          ? 'For teachers, students and parents. Your first Google sign-in creates your account — no password to remember.'
          : 'Use the Google account you signed up with. Teachers, students and parents all sign in the same way.'}
      </p>

      {error && (
        <p role="alert" style={{ marginBottom: '1rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          Sign-in did not complete ({error}). Please try again, or use a different Google account.
        </p>
      )}

      {status === 'authenticated' && session?.user?.email ? (
        <div>
          <p style={{ marginBottom: '1rem' }}>
            You are signed in as <strong>{session.user.email}</strong>.
          </p>
          <Link href={callbackUrl} className="btn-primary" style={{ minHeight: '48px', display: 'inline-flex', alignItems: 'center', marginRight: '0.75rem' }}>
            {isSignup ? 'Start creating' : 'Browse games'}
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `/${locale}` })}
            className="btn-ghost"
            style={{ minHeight: '48px' }}
          >
            Sign out
          </button>
        </div>
      ) : !googleConfigured ? (
        <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Google sign-in is not connected yet.</strong>
          </p>
          <p style={{ marginBottom: 0 }}>
            The site owner still needs to add the Google sign-in keys in
            Vercel and redeploy. Until then, sign-in cannot work — this is a
            setup step, not a broken button. Check back after the deploy.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl })}
          className="btn-primary"
          style={{ minHeight: '48px', width: '100%', justifyContent: 'center' }}
        >
          {isSignup ? 'Continue with Google — create account' : 'Continue with Google'}
        </button>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        {isSignup ? (
          <>Already have an account? <Link href={`/${locale}/login`}>Sign in</Link></>
        ) : (
          <>New to EduPlay? <Link href={`/${locale}/signup`}>Create an account</Link></>
        )}
      </p>
      <p>
        <Link href={`/${locale}`}>← Back to home</Link>
      </p>
    </div>
  )
}
