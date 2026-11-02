'use client'

// Sign-in dialog opened from the Navbar "Sign in" button (homepage and
// site-wide, wherever Navbar renders). This is the PRIMARY sign-in path:
// it opens on the current page instead of navigating away to the full
// /[locale]/login page. The full page is NOT deleted — it stays as the
// fallback / deep link, linked from the bottom of this dialog.
//
// Google is the only provider, exactly as on the full login page
// (see src/lib/auth/auth-options.ts): signIn('google') with the same
// post-sign-in destination the login page uses today, /[locale]/browse.
// No email+password form, no support email, no price, and no
// verification claim are invented here.
//
// Accessibility, all in this one file:
//   * role="dialog" + aria-modal + aria-labelledby
//   * Escape closes, clicking the backdrop closes, × closes
//   * focus is trapped inside while open (Tab / Shift+Tab wrap)
//   * focus returns to the element that opened the dialog on close
//   * body scroll is locked while open and restored on close
import { useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { X } from 'lucide-react'
import type { SupportedLocale } from '@/types'

interface SignInModalProps {
  open: boolean
  onClose: () => void
  locale: SupportedLocale
}

export default function SignInModal({ open, onClose, locale }: SignInModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const googleButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    // Remember what opened the dialog so focus can go back to it.
    const previouslyFocused = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Initial focus: the one clear action in the dialog.
    googleButtonRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      // Every control in this dialog is visible by construction (the
      // dialog only renders while open), so no offsetParent/layout
      // check: that check breaks for fixed-position content, where
      // offsetParent is null even for visible elements, and in jsdom.
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]',
        ),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
      // Return focus to the Navbar "Sign in" button that opened this.
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="signin-modal-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '420px',
          padding: '1.5rem',
          borderRadius: '16px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow)',
          color: 'var(--color-text-primary)',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign-in dialog"
          className="btn-ghost"
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            minWidth: '48px',
            minHeight: '48px',
            padding: 0,
          }}
        >
          <X size={20} />
        </button>

        {/* Same branding as the Navbar: book mark + EduPlay name. */}
        <div
          className="heading-display"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            marginBottom: '0.25rem',
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>📚</span>
          <span>EduPlay</span>
        </div>

        <h2
          id="signin-modal-title"
          style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}
        >
          Sign in to EduPlay
        </h2>
        <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }}>
          You stay on EduPlay — Google only confirms your account.
        </p>

        <button
          ref={googleButtonRef}
          type="button"
          onClick={() => signIn('google', { callbackUrl: `/${locale}/browse` })}
          className="btn-primary"
          style={{ minHeight: '48px', width: '100%', justifyContent: 'center' }}
        >
          Continue with Google
        </button>

        <p
          style={{
            marginTop: '1rem',
            marginBottom: 0,
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          New here? Your first Google sign-in creates your EduPlay account.
        </p>
        <p
          style={{
            marginTop: '0.75rem',
            marginBottom: 0,
            fontSize: '0.875rem',
            color: 'var(--color-text-secondary)',
          }}
        >
          Prefer the full page?{' '}
          <Link href={`/${locale}/login`} onClick={onClose}>
            Open the sign-in page
          </Link>
        </p>
      </div>
    </div>
  )
}
