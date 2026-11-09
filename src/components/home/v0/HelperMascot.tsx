'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, X } from 'lucide-react'
import {
  HELPER_FEATURES,
  HELPER_OPEN_EVENT,
  MASCOT_GREETING,
  MASCOT_NAME,
  MASCOT_ANCHORS,
  MASCOT_PLAY_ANCHORS,
  MASCOT_MOVE_MS,
  MASCOT_WANDER_MS,
  isPlayPath,
  pickNextAnchor,
  popupPlacement,
  type MascotAnchor,
} from '@/lib/mascot'

// Twinkle — EduPlay's helper star. The art is the ORIGINAL orange star
// + teal book portrait (/eduplay-mascot.png, V0 ZIP #2 port, cropped to
// 512×512) — the cute one the owner picked; the inline-SVG character
// from the Twinkle upgrade looked odd and is gone. The PNG's cream
// background was cleaned to real transparency (2026-11-07), so the star
// and book stand on ANY page colour with no square tile — no blend mode.
// The mascot is FREE on the screen, not locked in a little circle: the
// button is the picture itself (up to 128px, no border, no background,
// no round frame). It ROAMS the whole screen — top, middle and bottom
// on both edges — drifting slowly with a soft bob, and it never covers
// buttons, game controls, the Start button, or the right panel: the
// wrapper takes no pointer events, only the mascot button itself is
// tappable, and on play pages it stays at the bottom corners only.
// The helper panel / greeting float above the button as absolutely
// positioned popups that grow INWARD from the button's edge, so they
// can never run past the viewport edge (right side opens to the left;
// top anchors open below the button, where there is room). Tapping the
// mascot opens the helper panel (quick actions only — no chat backend,
// no personal data, never pretending to be a human). The greeting is
// dismissible and remembered on this device only.
const GREETING_KEY = 'eduplay-helper-greeted'

export default function HelperMascot({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false)
  const [showGreeting, setShowGreeting] = useState(false)
  const [anchor, setAnchor] = useState<MascotAnchor>(MASCOT_ANCHORS[0])
  const triggerRef = useRef<HTMLButtonElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  const pathname = usePathname()
  const onPlayPage = isPlayPath(pathname)
  const allowed = onPlayPage ? MASCOT_PLAY_ANCHORS : MASCOT_ANCHORS

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(GREETING_KEY)) setShowGreeting(true)
    } catch {
      setShowGreeting(true)
    }
  }, [])

  // The wheel's Twinkle picture is a separate small image, not this
  // button — it asks for the panel with a window event (owner order:
  // clicking Twinkle opens "What we have" wherever she appears).
  useEffect(() => {
    const openFromElsewhere = () => {
      dismissGreeting()
      setOpen(true)
    }
    window.addEventListener(HELPER_OPEN_EVENT, openFromElsewhere)
    return () => window.removeEventListener(HELPER_OPEN_EVENT, openFromElsewhere)
  }, [])

  // Wander: drift to a new spot every so often. Never while the helper
  // panel is open — the panel must not drift away from the reader.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (openRef.current) return
      setAnchor((current) => pickNextAnchor(current.id, allowed))
    }, MASCOT_WANDER_MS)
    return () => window.clearInterval(id)
  }, [allowed])

  // If a top or middle spot is showing when a play page opens, drift
  // back down to a bottom corner (play pages use the bottom corners only).
  useEffect(() => {
    if (onPlayPage && anchor.id !== 'bottom-right' && anchor.id !== 'bottom-left') {
      setAnchor(MASCOT_ANCHORS[0])
    }
  }, [onPlayPage, anchor.id])

  const dismissGreeting = () => {
    setShowGreeting(false)
    try {
      window.localStorage.setItem(GREETING_KEY, '1')
    } catch {
      // Ignore unavailable storage; the bubble simply returns next visit.
    }
  }

  // Where the helper panel / greeting opens: above the button, growing
  // inward from the button's edge (right side opens to the left, so it
  // can never run past the viewport's right edge); below the button at
  // the top anchors, where there is no room above.
  const placement = popupPlacement(anchor)
  const popupPos: CSSProperties = {
    position: 'absolute',
    ...(placement.vertical === 'below'
      ? { top: 'calc(100% + 0.75rem)' }
      : { bottom: 'calc(100% + 0.75rem)' }),
    ...(placement.horizontal === 'right' ? { right: 0 } : { left: 0 }),
  }

  return (
    // The wrapper is EXACTLY the button wide (up to 128px) — the panel /
    // greeting are absolutely positioned popups, so they can never widen
    // the wrapper and push the mascot (or themselves) past the viewport
    // edge. Right anchors sit 9rem in, the button is at most 8rem wide,
    // so the mascot's right edge is always ≥1rem inside the viewport.
    <div
      style={{
        position: 'fixed',
        left: anchor.left,
        top: anchor.top,
        width: 'clamp(84px, 12vw, 128px)',
        height: 'clamp(84px, 12vw, 128px)',
        zIndex: 40,
        pointerEvents: 'none',
        transition: `left ${MASCOT_MOVE_MS}ms ease-in-out, top ${MASCOT_MOVE_MS}ms ease-in-out`,
      }}
    >
      {open && (
        <>
          {/* Tap-outside close: a transparent layer over the whole
              screen, behind the panel. It exists only while the panel
              is open, so it never blocks the page otherwise. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'transparent', border: 'none', padding: 0, cursor: 'default', pointerEvents: 'auto' }}
          />
          <div
            role="dialog"
            aria-label={`${MASCOT_NAME} — EduPlay's helper`}
            style={{ ...popupPos, width: 'min(20rem, calc(100vw - 2rem))', maxHeight: 'min(70dvh, 32rem)', overflowY: 'auto', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '1rem', boxShadow: '0 8px 0 0 var(--color-border)', color: 'var(--color-text-primary)', pointerEvents: 'auto' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>{MASCOT_NAME}</p>
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
            <p style={{ marginTop: '0.75rem', fontSize: '1rem', fontWeight: 800 }}>What we have</p>
            <ul style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', listStyle: 'none', padding: 0 }}>
              {HELPER_FEATURES.map(({ title, line, path }) => (
                <li key={title}>
                  <Link
                    href={path.startsWith('/#') ? `/${locale}${path.slice(1)}` : `/${locale}${path}`}
                    onClick={() => setOpen(false)}
                    style={{ display: 'flex', minHeight: '48px', alignItems: 'center', gap: '0.75rem', borderRadius: '1rem', border: '2px solid var(--color-border)', background: 'var(--color-background)', padding: '0.5rem 1rem', color: 'var(--color-text-primary)' }}
                  >
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: '1rem', fontWeight: 700 }}>{title}</span>
                      <span style={{ display: 'block', fontSize: '0.875rem', fontWeight: 400, color: 'var(--color-text-secondary)' }}>{line}</span>
                    </span>
                    <ArrowRight style={{ width: '1rem', height: '1rem', color: 'var(--color-text-secondary)', flexShrink: 0 }} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      {showGreeting && !open && (
        <div
          role="status"
          style={{ ...popupPos, width: 'min(16rem, calc(100vw - 2rem))', display: 'flex', alignItems: 'flex-start', gap: '0.25rem', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0.75rem 0.25rem 0.75rem 1rem', color: 'var(--color-text-primary)', boxShadow: '0 6px 0 0 var(--color-border)', pointerEvents: 'auto' }}
        >
          <p style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5 }}>
            {MASCOT_GREETING}
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
        aria-label={open ? `Close ${MASCOT_NAME} helper` : `Open ${MASCOT_NAME} helper`}
        className="eduplay-mascot-bob"
        style={{ position: 'relative', width: '100%', height: '100%', border: 'none', background: 'transparent', boxShadow: 'none', cursor: 'pointer', padding: 0, pointerEvents: 'auto' }}
      >
        <Image src="/eduplay-mascot.png" alt={`${MASCOT_NAME}, EduPlay's helper star`} width={512} height={512} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </button>
    </div>
  )
}
