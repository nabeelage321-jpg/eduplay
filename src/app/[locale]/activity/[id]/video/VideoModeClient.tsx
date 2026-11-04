'use client'

/**
 * VERTICAL VIDEO MODE page (2026-11-04, master-list section C).
 *
 * Loads the game's own items through the same /api/activities/[id]
 * route the play page uses, then presents them vertically:
 * - the interactive vertical player (no sign-in),
 * - the simple editor + real download (title/end cards, shape),
 * - the share panel (ready caption + hosted-page link).
 *
 * Audience rule, same as convert: a public game opens for anyone;
 * a private game opens ONLY for its owner (proven via
 * /api/my-activities, like HostLiveGame). Anyone else sees a plain
 * message — no questions, no video. v1 scope is Quiz games only; any
 * other type gets a plain message, never a forced or mangled video.
 * The original game is never mutated or re-saved here.
 */

import { useState, useEffect, useMemo } from 'react'
import { adaptActivityItems, dbTypeOf } from '@/lib/activity-content'
import { buildVerticalQuestions, VIDEO_MODE_TYPES, videoPageUrl } from '@/lib/video-mode'
import VerticalQuizPlay from '@/components/game/VerticalQuizPlay'
import VerticalVideoMaker from '@/components/game/VerticalVideoMaker'
import type { Activity, SupportedLocale } from '@/types'

interface VideoModeClientProps {
  locale: string
  id: string
}

export default function VideoModeClient({ locale, id }: VideoModeClientProps) {
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [owner, setOwner] = useState<boolean | null>(null)

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/activities/${id}`)
        if (!res.ok) throw new Error('Activity not found')
        const { activity: data } = await res.json()
        setActivity(data as Activity)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity')
      } finally {
        setLoading(false)
      }
    }
    fetchActivity()
  }, [id])

  const isPrivate = activity !== null && activity.is_public === false
  useEffect(() => {
    if (!isPrivate || !activity) {
      setOwner(null)
      return
    }
    let cancelled = false
    setOwner(null)
    fetch('/api/my-activities')
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.activities) ? data.activities : []
        setOwner(list.some((g: { id?: string }) => g.id === activity.id))
      })
      .catch(() => {
        if (!cancelled) setOwner(false)
      })
    return () => {
      cancelled = true
    }
  }, [isPrivate, activity])

  const items = useMemo(() => (activity ? adaptActivityItems(activity) : []), [activity])
  const questions = useMemo(() => buildVerticalQuestions(items), [items])
  const typeSlug = activity ? dbTypeOf(activity) : 'quiz'
  const supported = (VIDEO_MODE_TYPES as readonly string[]).includes(typeSlug)
  const blockedPrivate = isPrivate && owner === false
  const checkingOwner = isPrivate && owner === null
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eduplay-self.vercel.app'
  const pageUrl = videoPageUrl(locale, id, origin)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading vertical video mode…</p>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>😕</div>
          <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Activity Not Found</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>This game could not be found. Check the link and try again.</p>
          <a href={`/${locale}/activity/${id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>← Back to the game</a>
        </div>
      </div>
    )
  }

  if (checkingOwner) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Checking who owns this private game…</p>
      </div>
    )
  }

  if (blockedPrivate) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>This private game can only be opened in vertical mode by its owner.</p>
          <p style={{ color: 'var(--color-text-secondary)' }}>The original game is unchanged.</p>
          <a href={`/${locale}/activity/${id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>← Back to the game</a>
        </div>
      </div>
    )
  }

  if (!supported) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>Vertical video mode works with Quiz games in this version.</p>
          <p style={{ color: 'var(--color-text-secondary)' }}>This game is a different type, so no vertical video is made from it here — nothing was changed or forced.</p>
          <a href={`/${locale}/activity/${id}/play`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>← Play it in its own type</a>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>This game has no questions yet.</p>
          <p style={{ color: 'var(--color-text-secondary)' }}>Add questions first, then open vertical mode again.</p>
          <a href={`/${locale}/activity/${id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>← Back to the game</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-background)', padding: '1rem 0.75rem 3rem' }}>
      <div style={{ maxWidth: '430px', margin: '0 auto 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href={`/${locale}/activity/${id}`} style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>← Back to the game</a>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Vertical video mode</span>
      </div>
      <h1 style={{ textAlign: 'center', color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0 0 1.25rem' }}>
        {activity.title}
      </h1>
      <VerticalQuizPlay items={items} locale={locale as SupportedLocale} gameTitle={activity.title} />
      <VerticalVideoMaker questions={questions} gameTitle={activity.title} pageUrl={pageUrl} />
    </div>
  )
}
