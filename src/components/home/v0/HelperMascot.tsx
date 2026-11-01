'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CircleHelp, Search, Sparkles, X } from 'lucide-react'

// V0 ZIP #2 helper-mascot port (adapted, not copied): V0 used Tailwind-4
// tokens and a 1408×768 mascot image at scale 1.9. Here the mascot is the
// same original orange star + teal book image, cropped and optimised to
// 512×512 (979 KB → 281 KB), shown with Next Image. The panel is quick
// actions only — no chat backend, no personal data, never pretending to
// be a human. Greeting is dismissible and remembered on this device only.
const GREETING_KEY = 'eduplay-helper-greeted'

export default function HelperMascot({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false)
  const [showGreeting, setShowGreeting] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(GREETING_KEY)) setShowGreeting(true)
    } catch {
      setShowGreeting(true)
    }
  }, [])

  const dismissGreeting = () => {
    setShowGreeting(false)
    try {
      window.localStorage.setItem(GREETING_KEY, '1')
    } catch {
      // Ignore unavailable storage; the bubble simply returns next visit.
    }
  }

  const actions = [
    { label: 'Find a game', href: '#popular', Icon: Search },
    { label: 'Make a game from a prompt', href: `/${locale}/create`, Icon: Sparkles },
    { label: 'How does EduPlay work?', href: '#how-it-works', Icon: CircleHelp },
  ] as const

  return (
    <div style={{ position: 'fixed', insetInlineEnd: '1rem', bottom: '6.5rem', zIndex: 40, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }} className="lg:bottom-6">
      {open && (
        <div
          role="dialog"
          aria-label="EduPlay helper"
          style={{ width: 'min(20rem, calc(100vw - 2rem))', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '1rem', boxShadow: '0 8px 0 0 var(--color-border)', color: 'var(--color-text-primary)' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
            <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>EduPlay helper</p>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                triggerRef.current?.focus()
              }}
              aria-label="Close helper"
              style={{ display: 'inline-flex', minWidth: '48px', minHeight: '48px', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'transparent', border: 'none' }}
            >
              <X style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true" />
            </button>
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>I am EduPlay&apos;s helper, not a human.</p>
          <ul style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', padding: 0 }}>
            {actions.map(({ label, href, Icon }) => (
              <li key={label}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  style={{ display: 'flex', minHeight: '48px', alignItems: 'center', gap: '0.75rem', borderRadius: '1rem', border: '2px solid var(--color-border)', background: 'var(--color-background)', padding: '0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}
                >
                  <Icon style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0 }} aria-hidden="true" />
                  <span style={{ flex: 1 }}>{label}</span>
                  <ArrowRight style={{ width: '1rem', height: '1rem', color: 'var(--color-text-secondary)' }} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {showGreeting && !open && (
        <div
          role="status"
          style={{ position: 'relative', display: 'flex', maxWidth: '16rem', alignItems: 'flex-start', gap: '0.25rem', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0.75rem 0.25rem 0.75rem 1rem', color: 'var(--color-text-primary)', boxShadow: '0 6px 0 0 var(--color-border)' }}
        >
          <p style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 }}>
            Hi! I am EduPlay&apos;s helper. I can help you find a game or make one from a prompt.
          </p>
          <button
            type="button"
            onClick={dismissGreeting}
            aria-label="Dismiss greeting"
            style={{ display: 'inline-flex', minWidth: '48px', minHeight: '48px', flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', color: 'var(--color-text-secondary)', cursor: 'pointer', background: 'transparent', border: 'none' }}
          >
            <X style={{ width: '1rem', height: '1rem' }} aria-hidden="true" />
          </button>
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          dismissGreeting()
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        aria-label={open ? 'Close EduPlay helper' : 'Open EduPlay helper'}
        style={{ position: 'relative', width: '64px', height: '64px', overflow: 'hidden', borderRadius: '9999px', border: '2px solid var(--color-border)', background: '#FFF8E7', boxShadow: '0 4px 0 0 var(--color-primary-dark)', cursor: 'pointer', padding: 0 }}
      >
        <Image src="/eduplay-mascot.png" alt="" width={512} height={512} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </button>
    </div>
  )
}
