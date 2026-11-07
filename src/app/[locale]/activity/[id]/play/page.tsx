'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import ActivityPlayer from '@/components/activity-types/ActivityPlayer'
import type { ActivityCompletion } from '@/components/activity-types/shared'
import { adaptActivityItems, dbTypeOf } from '@/lib/activity-content'
import { canConvertTo, convertTargetLabel, resolveConvertTarget } from '@/lib/convert'
import ActivityIdLine from '@/components/activity-types/ActivityIdLine'
import ShareGameButton from '@/components/home/ShareGameButton'
import SoundToggle from '@/components/activity-types/SoundToggle'
import InteractiveSoundToggle from '@/components/activity-types/InteractiveSoundToggle'
// STREAK v1 (2026-11-04, master-list part 7): device-local streak +
// levels, recorded only here, on a real finish. Preview has its own
// handler and never touches this; game scoring is never altered.
import { recordFinish, type FinishResult } from '@/lib/streak'
import { StreakFinishLine } from '@/components/activity-types/StreakBadge'
import { useThemeStore } from '@/lib/store/theme-store'
import type { Activity, SupportedLocale } from '@/types'

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Loading activity…</p>
        </div>
      }
    >
      <PlayPageInner />
    </Suspense>
  )
}

function PlayPageInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { audience } = useThemeStore()
  const locale = (params?.locale as SupportedLocale) ?? 'en'
  const id = params?.id as string

  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null)

  // APPROVAL BATCH 2026-10-30: pending/rejected games never show a public
  // share prompt. The creator can still play privately via this link.
  const approvalStatus = activity?.approval_status ?? null
  const isPending = approvalStatus === 'pending'
  const isRejected = approvalStatus === 'rejected'
  const showShare = !isPending && !isRejected

  // ─── PLAY AS ANOTHER TYPE (convert, 2026-11-04) ─────────────────────
  // ?as=<type> is a PLAY-TIME view only. The original activity object
  // is never mutated and never re-saved: the converted view is a
  // shallow copy whose type is overridden and whose items are the
  // original game's own adapted items, passed verbatim. ActivityPlayer
  // returns activity.items untouched when non-empty, so the target
  // type's existing player never re-reads the original content shape.
  // If the target cannot play every item as-is, the player is NOT
  // rendered at all — a plain cannot-play message is shown instead.
  const originalSlug = activity ? dbTypeOf(activity) : 'quiz'
  const convertTarget = activity ? resolveConvertTarget(searchParams.get('as'), originalSlug) : null
  const originalItems = useMemo(() => (activity ? adaptActivityItems(activity) : []), [activity])
  const convertCheck = convertTarget ? canConvertTo(originalItems, convertTarget) : null

  // Private-game gate for CONVERT ONLY (same ownership check
  // HostLiveGame uses: GET /api/my-activities lists the signed-in
  // user's own games; signed out, or viewing someone else's game,
  // yields no match). Convert adds no new data path: it reuses the
  // activity this page already loaded, and a private game's
  // converted view is refused to anyone but its owner. The original
  // play behaviour above is untouched — fixing the pre-existing
  // GET /api/activities/[id] route (which serves any id) is a
  // separate security batch, not this one, and is flagged in the
  // batch report rather than silently widened or narrowed here.
  const needsOwnerCheck = convertTarget !== null && activity !== null && activity.is_public === false
  const [convertOwner, setConvertOwner] = useState<boolean | null>(null)
  useEffect(() => {
    if (!needsOwnerCheck || !activity) {
      setConvertOwner(null)
      return
    }
    let cancelled = false
    setConvertOwner(null)
    fetch('/api/my-activities')
      .then((res) => (res.ok ? res.json() : { activities: [] }))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data.activities) ? data.activities : []
        setConvertOwner(list.some((g: { id?: string }) => g.id === activity.id))
      })
      .catch(() => {
        if (!cancelled) setConvertOwner(false)
      })
    return () => {
      cancelled = true
    }
  }, [needsOwnerCheck, activity])

  const convertBlockedPrivate = needsOwnerCheck && convertOwner === false
  const convertCheckingOwner = needsOwnerCheck && convertOwner === null
  const effectiveActivity: Activity | null =
    activity && convertTarget && convertCheck?.ok && !convertBlockedPrivate && !convertCheckingOwner
      ? { ...activity, type: convertTarget, type_id: convertTarget, items: originalItems, content: null }
      : activity

  async function decideApproval(action: 'approve' | 'reject') {
    setApprovalMessage(null)
    const res = await fetch(`/api/activities/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setApprovalMessage(data.error ?? 'Could not update approval.')
      return
    }
    setActivity((prev) => (prev ? { ...prev, approval_status: action === 'approve' ? 'approved' : 'rejected' } : prev))
    setApprovalMessage(
      action === 'approve'
        ? data.badge_earned
          ? 'Approved! This creator has earned the ⭐ Creator badge.'
          : 'Approved! The creator can now make this game public.'
        : 'Rejected. The creator can edit it to resubmit for approval.',
    )
  }
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null)
  // STREAK v1: the finish just recorded (null until a finish). The ref
  // guards one finish against a player calling onComplete twice for
  // the same completion; it resets only on Play Again, when a genuinely
  // new finish begins. It never touches the game's own score.
  const [streakResult, setStreakResult] = useState<FinishResult | null>(null)
  const streakRecordedRef = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playRecorded = useRef(false)

  const isRTL = locale === 'ur' || locale === 'ar'
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/activities/${id}`)
        if (!res.ok) throw new Error('Activity not found')
        const { activity } = await res.json()
        setActivity(activity)
        // Record play
        if (!playRecorded.current) {
          playRecorded.current = true
          fetch(`/api/activities/${id}/play`, { method: 'POST' }).catch(() => {})
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity')
      } finally {
        setLoading(false)
      }
    }
    fetchActivity()
  }, [id])

  // TIMER FIX 2026-11-03 — one elapsed timer, not two. This page
  // used to run its OWN timer from the moment the activity loaded:
  // it ticked through the loading spinner, the shell's Start screen
  // and the 3-2-1 countdown, and it kept ticking while the shell
  // was paused (it knew nothing about pause). That was the second,
  // top-right timer players saw next to the shell's own header
  // timer, and the final Time it reported included pre-start
  // seconds. For Quiz — the only type with a shell so far — this
  // page timer is now disabled entirely: the shell's elapsed time
  // (0 from play start, countdown excluded, frozen on pause)
  // arrives via the completion details and is used as the final
  // Time instead. Every other type is unchanged: it has no shell
  // yet, so this page timer still runs for it exactly as before,
  // and it will be unified the same way when its shell lands.
  // A converted shell-wrapped type must behave exactly like the
  // original (single shell timer), and a type converted FROM a
  // shell-wrapped type must behave like its new type (page timer,
  // as that type normally runs). The effective
  // type — not the saved type — decides, so converting can never
  // resurrect the double timer the 2026-11-03 fix removed.
  // PLAYSHELL ROLLOUT 2026-11-04, FIRST TYPE: Match Up joins Quiz
  // here — its shell lands in this batch, so it is unified the
  // same way (page timer off, shell elapsed as the final Time).
  // Every other type is still unchanged: no shell yet, so this
  // page timer still runs for it exactly as before.
  const isShellWrapped = effectiveActivity
    ? ['quiz', 'match-up'].includes(dbTypeOf(effectiveActivity))
    : false
  useEffect(() => {
    if (!activity || finalScore !== null || isShellWrapped) return
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activity, finalScore, isShellWrapped])

  function handleComplete(score: number, details?: ActivityCompletion) {
    if (timerRef.current) clearInterval(timerRef.current)
    // STREAK v1: record ONLY a real finish (this handler fires when a
    // player completes, never on page open, game start, or preview).
    // Same-day finishes add points but not streak days, and a missed
    // day wipes the old streak — see src/lib/streak.ts for the rules.
    if (!streakRecordedRef.current) {
      streakRecordedRef.current = true
      setStreakResult(recordFinish(score))
    }
    setFinalScore(score)
    // Shell-wrapped types: the shell's elapsed (0-based from play
    // start). Other types: details carry no elapsed, so fall back
    // to this page's own timer, exactly as before.
    setFinalElapsed(details?.elapsedSeconds ?? elapsed)
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-background)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '4px solid var(--color-border)', borderTopColor: 'var(--color-primary)',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>Loading activity…</p>
        </div>
      </div>
    )
  }

  if (error || !activity) {
    // JOIN FLOW FIX 2026-11-02 — the not-found state was a bare
    // heading + button. It now explains what happened and carries
    // the same light floating shapes as the Join page (static when
    // the user prefers reduced motion). Routing is unchanged; the
    // Join page no longer sends anyone here for a bad code.
    const floaters = [
      { char: '⭐', left: '10%', top: '18%', size: '2rem', delay: 0 },
      { char: '☁️', left: '84%', top: '16%', size: '2.2rem', delay: 0.6 },
      { char: '🎲', left: '14%', top: '70%', size: '2rem', delay: 1.1 },
      { char: '🌈', left: '86%', top: '64%', size: '2rem', delay: 0.3 },
    ]
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-background)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {floaters.map((f) =>
          reduceMotion ? (
            <span key={f.char + f.left} aria-hidden="true" style={{ position: 'absolute', left: f.left, top: f.top, fontSize: f.size, opacity: 0.7 }}>
              {f.char}
            </span>
          ) : (
            <motion.span
              key={f.char + f.left}
              aria-hidden="true"
              style={{ position: 'absolute', left: f.left, top: f.top, fontSize: f.size, opacity: 0.7 }}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, delay: f.delay, ease: 'easeInOut' }}
            >
              {f.char}
            </motion.span>
          ),
        )}
        <div style={{ textAlign: 'center', maxWidth: '400px', position: 'relative' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>😕</div>
          <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            Activity Not Found
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
            This game or room could not be found. Check the code or link and try again.
          </p>
          {error && error !== 'Activity not found' && (
            <p style={{ color: 'var(--color-text-muted)', marginTop: '-0.75rem', marginBottom: '1.25rem', fontSize: '0.875rem' }}>{error}</p>
          )}
          <button
            onClick={() => router.push(`/${locale}/activities`)}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)',
              border: 'none', background: 'var(--gradient-btn)',
              color: '#fff', fontFamily: 'var(--font-display)', cursor: 'pointer',
            }}
          >
            ← Browse Activities
          </button>
        </div>
      </div>
    )
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Game header */}
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0.625rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: 'var(--shadow)',
      }}>
        <button
          onClick={() => router.push(`/${locale}/activity/${id}`)}
          aria-label="Exit activity"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', fontSize: '1.25rem', lineHeight: 1,
            padding: '0.25rem',
          }}
        >
          ✕
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)',
            fontWeight: 700, fontSize: '1.1rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
          }}>
            {activity.title}
          </p>
          {/* TEACHER-ID BATCH 2026-11-02: the id was only in the URL. */}
          <ActivityIdLine id={id} />
        </div>
        {showShare ? (
          <ShareGameButton locale={locale} gameId={id} gameTitle={activity.title} />
        ) : (
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', flexShrink: 0 }}>
            {isPending ? '⏳ Waiting for teacher/parent approval' : '✕ Not approved'}
          </span>
        )}
        {/* MATCH UP SOUNDS 2026-11-04: the header toggle and the
            in-player toggle must drive ONE setting for Match Up.
            The header's old SoundToggle ('eduplay-sound-on',
            default muted) is a different key from the interactive
            setting ('eduplay-interactive-sound-on', default ON)
            that Match Up's sounds read, so for Match Up — and
            only Match Up, keyed on the EFFECTIVE type so a
            ?as=match-up converted view counts too — the header
            renders the interactive toggle instead. Both toggles
            then stay in sync via the interactive storage event.
            Every other type's header is untouched. */}
        {effectiveActivity && dbTypeOf(effectiveActivity) === 'match-up' ? (
          <InteractiveSoundToggle />
        ) : (
          <SoundToggle />
        )}
        {/* TIMER FIX 2026-11-03, extended 2026-11-04 to Match Up:
            hidden for shell-wrapped types, whose shell header
            already shows the single elapsed time. Showing this too
            would leave two elapsed timers on one screen again. */}
        {!isShellWrapped && (
          <span style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '1rem', flexShrink: 0 }}>
            {formatTime(elapsed)}
          </span>
        )}
      </div>

      {/* Approval notice: pending games show this instead of a share prompt. */}
      {isPending || isRejected ? (
        <div style={{
          maxWidth: '700px', margin: '1rem auto 0', padding: '1rem',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 0.75rem' }}>
            {isPending
              ? '⏳ Waiting for teacher/parent approval. This game can be played privately here, but it cannot go public yet.'
              : '✕ This game was not approved. The creator can edit it to resubmit for approval.'}
          </p>
          {isPending ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => decideApproval('approve')}
                style={{ minHeight: '48px', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius)', border: 'none', background: 'var(--gradient-btn)', color: '#fff', cursor: 'pointer' }}
              >
                Approve (teacher / parent)
              </button>
              <button
                type="button"
                onClick={() => decideApproval('reject')}
                style={{ minHeight: '48px', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
              >
                Reject
              </button>
            </div>
          ) : null}
          {approvalMessage ? (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: '0.75rem 0 0' }}>
              {approvalMessage}
            </p>
          ) : null}
        </div>
      ) : approvalMessage ? (
        <div style={{ maxWidth: '700px', margin: '1rem auto 0', padding: '1rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{approvalMessage}</p>
        </div>
      ) : null}

      {/* Game area */}
      <div style={{ padding: '1rem 0.5rem', maxWidth: '700px', margin: '0 auto' }}>
        {convertTarget && !convertBlockedPrivate && convertCheck?.ok ? (
          <p style={{
            maxWidth: '700px', margin: '0 auto 1rem', padding: '0.75rem 1rem',
            background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius)', color: 'var(--color-text-secondary)', textAlign: 'center',
          }}>
            Playing as <strong style={{ color: 'var(--color-text-primary)' }}>{convertTargetLabel(convertTarget)}</strong>
            {' '}— the same {originalItems.length} questions as the original game.
            The original game is not changed.
          </p>
        ) : null}
        <AnimatePresence mode="wait">
          {finalScore !== null ? (
            <motion.div
              key="complete"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                textAlign: 'center', padding: '2.5rem 1rem',
                background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--color-success)', boxShadow: 'var(--shadow-card)',
                marginTop: '2rem',
              }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🏆</div>
              <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                Activity Complete!
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                Final Score: <strong style={{ color: 'var(--color-primary)' }}>{finalScore}</strong>
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Time: {formatTime(finalElapsed ?? elapsed)}
              </p>
              {streakResult ? (
                <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                  <StreakFinishLine result={streakResult} />
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setFinalScore(null); setFinalElapsed(null); setElapsed(0); setStreakResult(null); streakRecordedRef.current = false }}
                  style={{
                    padding: '1rem 1.75rem', borderRadius: 'var(--radius)', minHeight: '56px',
                    border: 'none', background: 'var(--gradient-btn)',
                    color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.95rem',
                    cursor: 'pointer', boxShadow: 'var(--shadow)',
                  }}
                >
                  ↺ Play Again
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => router.push(`/${locale}/activities`)}
                  style={{
                    padding: '1rem 1.75rem', borderRadius: 'var(--radius)', minHeight: '56px',
                    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  Browse More
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {convertTarget && convertCheckingOwner ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '2rem' }}>
                  Checking who owns this private game…
                </p>
              ) : convertTarget && convertBlockedPrivate ? (
                <div style={{
                  textAlign: 'center', padding: '2rem 1rem',
                  background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                  border: '2px solid var(--color-border)',
                }}>
                  <p style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: '0.5rem' }}>
                    This private game can only be played as another type by its owner.
                  </p>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                    The original game is unchanged. Play it in its original type instead.
                  </p>
                  <a href={`/${locale}/activity/${id}/play`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    ← Back to the original type
                  </a>
                </div>
              ) : convertTarget && convertCheck && !convertCheck.ok ? (
                <div style={{
                  textAlign: 'center', padding: '2rem 1rem',
                  background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                  border: '2px solid var(--color-border)',
                }}>
                  <p style={{ color: 'var(--color-text-primary)', fontWeight: 700, marginBottom: '0.5rem' }}>
                    {convertTargetLabel(convertTarget)} cannot play these questions.
                  </p>
                  <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                    {convertCheck.reason} No questions were changed, dropped, or invented to force it —
                    the original game is unchanged.
                  </p>
                  <a href={`/${locale}/activity/${id}/play`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    ← Back to the original type
                  </a>
                </div>
              ) : (
                <ActivityPlayer
                  activity={effectiveActivity ?? activity}
                  theme={audience}
                  locale={locale}
                  onComplete={handleComplete}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
