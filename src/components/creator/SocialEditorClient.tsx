'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { adaptActivityItems } from '@/lib/activity-content'
import { buildVerticalQuestions, videoPageUrl } from '@/lib/video-mode'
import {
  VERIFICATION_PLATFORMS,
  socialEditorAccess,
  type CreatorVerificationStatus,
  type VerificationPlatform,
} from '@/lib/creator-verification'
import VerticalVideoMaker from '@/components/game/VerticalVideoMaker'
import type { Activity, SupportedLocale } from '@/types'

// SOCIAL EDITOR (2026-11-07, build-list final 6, item 13). Two
// creator types, handled separately:
//   (a) KIDS make games for their friends only — private, safety
//       first. They NEVER see this editor (role 'student' gets a
//       plain refusal, no form, no editor).
//   (b) SOCIAL MEDIA CREATORS make games for reach/audience. The
//       editor is GATED: the creator puts our website link on their
//       social media and submits the profile/post URL here; status is
//       'pending' until the TEAM verifies it by hand, then the editor
//       tab opens. The editor checks status AT OPEN TIME (this fetch
//       runs on mount) — if the team later revokes the link, the
//       editor closes. Videos made here carry OUR NAME (branded
//       renders) so they are identifiable as ours. Automatic
//       re-checking of the link is PHASE 2; the team re-checks by
//       hand in this version.

interface VerificationResponse {
  signedIn?: boolean
  role?: string | null
  status?: CreatorVerificationStatus
  platform?: string | null
  profileUrl?: string | null
  setupReady?: boolean
  error?: string
}

interface MyGame {
  id: string
  title: string
  type: string
}

const PLATFORM_LABELS: Record<VerificationPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
}

export default function SocialEditorClient({ locale }: { locale: string }) {
  const [loading, setLoading] = useState(true)
  const [verification, setVerification] = useState<VerificationResponse | null>(null)
  const [platform, setPlatform] = useState<VerificationPlatform>('tiktok')
  const [profileUrl, setProfileUrl] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [games, setGames] = useState<MyGame[]>([])
  const [gamesLoaded, setGamesLoaded] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState('')
  const [activity, setActivity] = useState<Activity | null>(null)
  const [activityLoading, setActivityLoading] = useState(false)

  async function loadVerification() {
    try {
      const res = await fetch('/api/creator-verification')
      const data = (await res.json()) as VerificationResponse
      setVerification(data)
    } catch {
      setVerification({ signedIn: false, role: null, status: 'none', setupReady: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVerification()
  }, [])

  const access = useMemo(() => {
    if (!verification) return { kind: 'signin' } as const
    return socialEditorAccess({
      signedIn: verification.signedIn === true,
      role: verification.role ?? null,
      status: verification.status ?? 'none',
      setupReady: verification.setupReady !== false,
    })
  }, [verification])

  // Load the creator's own Quiz games once the editor is open.
  useEffect(() => {
    if (access.kind !== 'verified' || gamesLoaded) return
    setGamesLoaded(true)
    fetch('/api/my-activities')
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((data: { activities?: MyGame[] }) => {
        const list = (data.activities ?? []).filter((g) => g.type === 'quiz')
        setGames(list)
        if (list.length > 0) setSelectedGameId(list[0].id)
      })
      .catch(() => setGames([]))
  }, [access.kind, gamesLoaded])

  // Load the picked game's questions for the editor.
  useEffect(() => {
    if (!selectedGameId) {
      setActivity(null)
      return
    }
    let cancelled = false
    setActivityLoading(true)
    fetch(`/api/activities/${selectedGameId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Game not found')
        return res.json()
      })
      .then((data: { activity?: Activity }) => {
        if (!cancelled) setActivity(data.activity ?? null)
      })
      .catch(() => {
        if (!cancelled) setActivity(null)
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedGameId])

  const questions = useMemo(() => (activity ? buildVerticalQuestions(adaptActivityItems(activity)) : []), [activity])
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eduplay-self.vercel.app'
  const pageUrl = selectedGameId ? videoPageUrl(locale, selectedGameId, origin) : ''

  async function submit() {
    const url = profileUrl.trim()
    if (url.length < 8) {
      setNote('Paste the full link to your social profile or post.')
      return
    }
    setSending(true)
    setNote(null)
    try {
      const res = await fetch('/api/creator-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, profileUrl: url }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setNote(data.error ?? 'Your link could not be submitted. Try again.')
        return
      }
      setNote('Sent — the EduPlay team will check your link.')
      setShowForm(false)
      await loadVerification()
    } catch {
      setNote('Your link could not be submitted. Try again.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '40rem', margin: '0 auto', textAlign: 'center', padding: '2rem 1rem' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading the social editor…</p>
      </div>
    )
  }

  if (access.kind === 'signin') {
    return (
      <div style={{ maxWidth: '40rem', margin: '0 auto', textAlign: 'center', padding: '2rem 1rem' }}>
        <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Social editor</h1>
        <p style={{ marginTop: '0.75rem', color: 'var(--color-text-secondary)' }}>
          The social editor is for creators who post games on TikTok, Instagram, YouTube, or Facebook. Sign in to open it.
        </p>
        <Link
          href={`/${locale}/login`}
          style={{ display: 'inline-block', marginTop: '1.5rem', minHeight: '48px', borderRadius: '9999px', background: 'var(--color-primary)', padding: '0.75rem 1.5rem', fontWeight: 800, color: 'white', textDecoration: 'none' }}
        >
          Sign in →
        </Link>
      </div>
    )
  }

  if (access.kind === 'kid') {
    return (
      <div style={{ maxWidth: '40rem', margin: '0 auto', textAlign: 'center', padding: '2rem 1rem' }}>
        <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Social editor</h1>
        <p style={{ marginTop: '0.75rem', color: 'var(--color-text-secondary)' }}>
          Kids make games for their friends — the social editor is for social media creators, so it is not open to kids.
          Your games stay with your friends, as they should.
        </p>
        <Link
          href={`/${locale}/create`}
          style={{ display: 'inline-block', marginTop: '1.5rem', minHeight: '48px', borderRadius: '9999px', background: 'var(--color-primary)', padding: '0.75rem 1.5rem', fontWeight: 800, color: 'white', textDecoration: 'none' }}
        >
          Make a game for your friends →
        </Link>
      </div>
    )
  }

  if (access.kind === 'setup') {
    return (
      <div style={{ maxWidth: '40rem', margin: '0 auto', textAlign: 'center', padding: '2rem 1rem' }}>
        <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>Social editor</h1>
        <p style={{ marginTop: '0.75rem', color: 'var(--color-text-secondary)' }}>
          Creator verification is not set up yet — check back soon.
        </p>
      </div>
    )
  }

  // Verification form (no verification yet, or revoked): the deal is
  // stated plainly before anything is submitted.
  const form = (
    <div style={{ marginTop: '1.5rem', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '1.25rem', textAlign: 'start' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Get the editor verified</h2>
      <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
        Put our website link on your social media, then paste the link to your profile or post below. The EduPlay team
        checks it by hand — when it is verified, the editor tab opens. If you remove the link later, the editor closes,
        and videos made here carry the EduPlay name, so the team can ask the platform to remove them.
      </p>
      <label style={{ display: 'block', marginTop: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        Where is your link?
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as VerificationPlatform)}
          aria-label="Social platform"
          style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.6rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        >
          {VERIFICATION_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_LABELS[p]}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: 'block', marginTop: '0.75rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        Link to your profile or post
        <input
          type="url"
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          placeholder="https://www.tiktok.com/@yourname"
          aria-label="Link to your profile or post"
          style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.6rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={sending}
        style={{ marginTop: '1rem', minHeight: '48px', borderRadius: '9999px', border: 'none', background: 'var(--color-primary)', padding: '0 1.5rem', fontSize: '1rem', fontWeight: 800, color: 'white', cursor: sending ? 'wait' : 'pointer' }}
      >
        {sending ? 'Sending…' : 'Submit my link for verification'}
      </button>
      {note ? <p role="status" style={{ marginTop: '0.75rem', color: 'var(--color-text-primary)' }}>{note}</p> : null}
    </div>
  )

  if (access.kind === 'submit') {
    return (
      <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', textAlign: 'center' }}>Social editor</h1>
        <p style={{ marginTop: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          Edit your game into a reel or post for your audience — title card, end card, shape, trim, caption, and thumbnail.
        </p>
        {form}
      </div>
    )
  }

  if (access.kind === 'pending') {
    return (
      <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '2rem 1rem' }}>
        <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', textAlign: 'center' }}>Social editor</h1>
        <div style={{ marginTop: '1.5rem', borderRadius: '1.5rem', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Your link is with the EduPlay team for checking.
          </p>
          <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
            {verification?.platform ? `${PLATFORM_LABELS[verification.platform as VerificationPlatform] ?? verification.platform}: ` : ''}
            {verification?.profileUrl ?? ''}
          </p>
          <p style={{ marginTop: '0.5rem', color: 'var(--color-text-secondary)' }}>
            The editor opens once the team verifies that our website link is on your social media.
          </p>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            style={{ marginTop: '1rem', minHeight: '48px', borderRadius: '9999px', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0 1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', cursor: 'pointer' }}
          >
            {showForm ? 'Hide the form' : 'Submitted a different link?'}
          </button>
        </div>
        {showForm ? form : null}
      </div>
    )
  }

  // Verified: the editor tab.
  return (
    <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', textAlign: 'center' }}>Social editor</h1>
      <p style={{ marginTop: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
        Verified — your link is on your social media. Pick one of your Quiz games and edit it into a reel or post.
        Videos made here carry the EduPlay name.
      </p>
      {games.length === 0 ? (
        <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          You have no Quiz games yet — make a Quiz game first, then edit it here.
        </p>
      ) : (
        <>
          <label style={{ display: 'block', marginTop: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Your Quiz game
            <select
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              aria-label="Your Quiz game"
              style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.6rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          {activityLoading ? (
            <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading your game…</p>
          ) : activity && questions.length > 0 ? (
            <VerticalVideoMaker
              questions={questions}
              gameTitle={activity.title}
              pageUrl={pageUrl}
              branded
              showTrimControls
            />
          ) : (
            <p style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              This game has no questions yet — add questions first, then edit it here.
            </p>
          )}
        </>
      )}
    </div>
  )
}
