'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import ActivityPlayer from '@/components/activity-types/ActivityPlayer'
import type { ActivityCompletion } from '@/components/activity-types/shared'
import { SCORE_PER_CORRECT } from '@/components/activity-types/shared'
import { adaptActivityItems, dbTypeOf } from '@/lib/activity-content'
import { canConvertTo, convertTargetLabel, resolveConvertTarget } from '@/lib/convert'
import PlayIntro from '@/components/game/PlayIntro'
// ITEM 37 (owner order 2026-11-07 14:07 PKT): the small right
// panel (Share, sound, Activity ID, game name, Game No.) lives
// in PlaySidePanel and shows on ALL THREE screens (intro, play,
// finish). It is NOT in the top header any more.
import PlaySidePanel from '@/components/game/PlaySidePanel'
import { typeIntro } from '@/lib/type-intro'
import ScorePill from '@/components/game/ScorePill'
import SoundToggle from '@/components/activity-types/SoundToggle'
import InteractiveSoundToggle from '@/components/activity-types/InteractiveSoundToggle'
// STREAK v1 (2026-11-04, master-list part 7): device-local streak +
// levels, recorded only here, on a real finish. Preview has its own
// handler and never touches this; game scoring is never altered.
import { recordFinish, type FinishResult } from '@/lib/streak'
import { StreakFinishLine } from '@/components/activity-types/StreakBadge'
// GAME FEEL (2026-11-07, build-list item 4): fireworks for good
// marks (>= 50%), warm "Play again" encouragement below 50%.
import { completionPercent, finishCelebration, isPerfectScore } from '@/lib/game-feel'
import Fireworks from '@/components/activity-types/Fireworks'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
// BATCH 1 (final list item 9): the finish screen shows a Top 10
// leaderboard built ONLY from this device's own real finishes —
// never invented scores, players, or names.
import { recordTop10Play, type Top10Entry } from '@/lib/top10'
import { useThemeStore } from '@/lib/store/theme-store'
import type { Activity, SupportedLocale } from '@/types'

// BATCH 1 (final list item 19): funky + bold letters on the play
// screen — Fredoka One, already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

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

  // LIVE-JOIN FIX 2026-11-08: a player who joined a live room arrives
  // with ?session=<sessionId>&player=<playerId> (the Play link in the
  // room). Used only to pick the session-scoped load path below — and
  // to hide the approval notice, which is for the creator, never for
  // a guest player.
  const isSessionPlayer =
    !!searchParams.get('session') && !!searchParams.get('player')

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
  // GAME FEEL: percent of correct answers at finish (null when the
  // player did not report counts — then the finish screen is plain,
  // exactly as before).
  const [finalPercent, setFinalPercent] = useState<number | null>(null)
  // PERFECT-SCORE HONESTY (batch-2 #4): the maximum score at finish
  // (totalCount x 10, when the player reported counts). "PERFECT
  // SCORE!" needs full marks, not just 100% right — a Categorize
  // player who used a hint can have every item right with 5 marks
  // lost, and that is not a perfect score. Null when unknown.
  const [finalMaxScore, setFinalMaxScore] = useState<number | null>(null)
  // QUIZ INTRO (2026-11-07, build-list item 5) — SUPERSEDED by the
  // SHARED PLAY INTRO (batch 1, final list item 4): the name the
  // player typed on the intro screen, owned by this page now (the
  // intro is shared for ALL types, not Quiz-only). Shown on the
  // finish screen only, never used for scoring or rules.
  const [pagePlayerName, setPagePlayerName] = useState<string>('')
  // BATCH 1 (item 4): the shared intro shows once per page load.
  // Play Again never re-asks — only a fresh page load does.
  const [introDone, setIntroDone] = useState(false)
  // BATCH 1 (item 9): this device's Top 10 for this game, shown on
  // the finish screen. Recorded once per finish (same ref-guard as
  // the streak, below).
  const [top10, setTop10] = useState<Top10Entry[]>([])
  // BATCH 1 (item 10): perfect score (100%) gets SPECIAL fireworks
  // the KID triggers by pressing a button — never auto-fired.
  const [kidFireworks, setKidFireworks] = useState(false)
  const [finalPlayerName, setFinalPlayerName] = useState<string | null>(null)
  // STREAK v1: the finish just recorded (null until a finish). The ref
  // guards one finish against a player calling onComplete twice for
  // the same completion; it resets only on Play Again, when a genuinely
  // new finish begins. It never touches the game's own score.
  const [streakResult, setStreakResult] = useState<FinishResult | null>(null)
  const streakRecordedRef = useRef(false)
  // LIVE SCORE FIX 2026-11-08: a session player's finish must reach
  // the host's Live leaderboard. Guarded to one report per finish.
  const liveScoreReportedRef = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playRecorded = useRef(false)

  const isRTL = locale === 'ur' || locale === 'ar'
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    async function fetchActivity() {
      try {
        // LIVE-JOIN FIX 2026-11-08: a hosted PRIVATE game 404s on the
        // general route for anyone but its owner, so a session player
        // loads it through the session-scoped endpoint instead — it
        // serves the game only to a joined player of that session
        // (or the owner). Everyone else uses the general route
        // exactly as before.
        const sessionParam = searchParams.get('session')
        const playerParam = searchParams.get('player')
        const url =
          sessionParam && playerParam
            ? `/api/live-sessions/${sessionParam}/activity?playerId=${encodeURIComponent(playerParam)}`
            : `/api/activities/${id}`
        const res = await fetch(url)
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
  }, [id, searchParams])

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
    const percent = completionPercent(details)
    if (!streakRecordedRef.current) {
      streakRecordedRef.current = true
      setStreakResult(recordFinish(score))
      // BATCH 1 (item 9): the same real finish joins this device's
      // Top 10 for this game — real finishes only, never invented.
      setTop10(
        recordTop10Play({
          activityId: id,
          title: activity?.title ?? '',
          score,
          name: pagePlayerName,
          percent,
          date: new Date().toISOString(),
        }),
      )
    }
    setFinalScore(score)
    setFinalPercent(percent)
    // LIVE SCORE FIX 2026-11-08: until this line, a session
    // player's finish only recorded the device-local streak + Top
    // 10 — the score never reached the live session, so the host's
    // leaderboard stayed empty even after a perfect 100. A player
    // who arrived with ?session=&player= now reports the finish to
    // that session (highest score wins server-side; a report after
    // the host ended the room is refused and ignored here). A
    // non-session player is untouched — nothing is sent.
    if (isSessionPlayer && !liveScoreReportedRef.current) {
      liveScoreReportedRef.current = true
      const sessionId = searchParams.get('session')
      const playerId = searchParams.get('player')
      if (sessionId && playerId) {
        fetch(`/api/live-sessions/${sessionId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'score',
            playerId,
            score,
            correctAnswers: details?.correctCount ?? 0,
          }),
        }).catch(() => {})
      }
    }
    setFinalMaxScore(details?.totalCount != null ? details.totalCount * SCORE_PER_CORRECT : null)
    // BATCH 1 (item 4): the name comes from the shared intro (this
    // page owns it now); a player-reported name is the fallback.
    setFinalPlayerName(pagePlayerName || details?.playerName || null)
    // Shell-wrapped types: the shell's elapsed (0-based from play
    // start). Other types: details carry no elapsed, so fall back
    // to this page's own timer, exactly as before.
    setFinalElapsed(details?.elapsedSeconds ?? elapsed)
  }

  // GAME FEEL: a win fanfare when the finish is good marks (>= 50%).
  // Below 50% there is no sad sound — the encouragement line on the
  // finish screen does the cheering instead.
  useEffect(() => {
    if (finalScore !== null && finalPercent !== null && finalPercent >= 50) {
      playEduSound('win', readInteractiveSoundOn())
    }
  }, [finalScore, finalPercent])

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
    // BATCH 1 (item 23, ONE SCREEN): the page is one viewport tall
    // (100dvh flex column) — the game fits on ONE screen with no
    // page scroll. The game area below scrolls only as a safety net
    // when a screen is shorter than the content; the touched
    // players are sized to fit without it.
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--color-background)' }}>
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
            color: 'var(--color-text-primary)', fontFamily: FUNKY_FONT,
            fontWeight: 700, fontSize: '1.1rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
          }}>
            {activity.title}
          </p>
        </div>
        {/* ITEM 37: Activity ID + Share moved OUT of this header —
            they live in the right panel (PlaySidePanel) on every
            screen now, so they are never duplicated. The header
            keeps only the title, the sound toggle, and the timer. */}
        {/* MATCH UP SOUNDS 2026-11-04, extended to QUIZ 2026-11-07
            (game feel): the header toggle and the in-player sounds
            must drive ONE setting. The header's old SoundToggle
            ('eduplay-sound-on', default muted) is a different key
            from the interactive setting
            ('eduplay-interactive-sound-on', default ON) that Quiz
            and Match Up sounds now read, so for Quiz and Match Up —
            keyed on the EFFECTIVE type so a ?as= conversion counts
            too — the header renders the interactive toggle instead.
            Both toggles then stay in sync via the interactive
            storage event. Every other type's header is untouched. */}
        {effectiveActivity && ['quiz', 'match-up'].includes(dbTypeOf(effectiveActivity)) ? (
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

      {/* Approval notice: pending games show this instead of a share prompt.
          A session player never sees it — they are a guest player, never
          an approver (LIVE-JOIN FIX 2026-11-08). */}
      {isPending || isRejected ? (
        !isSessionPlayer ? (
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
        ) : null
      ) : approvalMessage ? (
        <div style={{ maxWidth: '700px', margin: '1rem auto 0', padding: '1rem' }}>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{approvalMessage}</p>
        </div>
      ) : null}

      {/* Game area — BATCH 1 (item 23, ONE SCREEN + item 8, LIVELY):
          the area fills the rest of the viewport. Floating shapes
          drift behind the game (static when the player prefers
          reduced motion) so the screen feels alive, not plain. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative' }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {[
            { char: '⭐', left: '4%', top: '12%', size: '1.6rem', delay: 0 },
            { char: '🎈', left: '92%', top: '10%', size: '1.8rem', delay: 0.8 },
            { char: '🌈', left: '88%', top: '72%', size: '1.8rem', delay: 0.4 },
            { char: '☁️', left: '6%', top: '76%', size: '1.6rem', delay: 1.2 },
          ].map((f) =>
            reduceMotion ? (
              <span key={f.char + f.left} style={{ position: 'absolute', left: f.left, top: f.top, fontSize: f.size, opacity: 0.35 }}>
                {f.char}
              </span>
            ) : (
              <motion.span
                key={f.char + f.left}
                style={{ position: 'absolute', left: f.left, top: f.top, fontSize: f.size, opacity: 0.35 }}
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, delay: f.delay, ease: 'easeInOut' }}
              >
                {f.char}
              </motion.span>
            ),
          )}
        </div>
        <div style={{ position: 'relative', zIndex: 1, padding: '0.5rem', maxWidth: '1120px', margin: '0 auto' }}>
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
        {/* ITEM 37 (owner order 2026-11-07 14:07 PKT): the right
            panel sits beside the game on EVERY screen — intro,
            play, finish. One grid, one panel; it never remounts
            when the screen changes, and it is never duplicated in
            the header. Below 720px it stacks under the game. */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}
          className="eduplay-play-grid"
        >
          <style>{`
            @media (min-width: 720px) {
              .eduplay-play-grid { grid-template-columns: minmax(0, 1fr) 220px !important; }
            }
          `}</style>
          <div style={{ minWidth: 0 }}>
        <AnimatePresence mode="wait">
          {finalScore !== null ? (
            <motion.div
              key="complete"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                textAlign: 'center', padding: '1.75rem 1rem',
                background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--color-success)', boxShadow: 'var(--shadow-card)',
                marginTop: '0.75rem', position: 'relative', overflow: 'hidden',
              }}
            >
              {/* GAME FEEL: fireworks for good marks (>= 50%) — the
                  canvas sits behind the text, decorative only.
                  BATCH 1 (item 10): a PERFECT score (100%) gets NO
                  auto fireworks — the kid presses the button below
                  to launch SPECIAL fireworks themselves. */}
              {finalPercent !== null && finalPercent >= 50 && finalPercent < 100 && finishCelebration(finalPercent) === 'fireworks' ? <Fireworks /> : null}
              {kidFireworks ? <Fireworks /> : null}
              <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏆</div>
              <h2 style={{ color: 'var(--color-text-primary)', fontFamily: FUNKY_FONT, fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                Activity Complete!
              </h2>
              {finalPlayerName ? (
                <p style={{ color: 'var(--color-text-primary)', fontFamily: FUNKY_FONT, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  Well done, {finalPlayerName}!
                </p>
              ) : null}
              {finalPercent !== null && finalPercent >= 50 && finalPercent < 100 ? (
                <p style={{ color: 'var(--color-text-primary)', fontFamily: FUNKY_FONT, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  Amazing! You did great! 🎆
                </p>
              ) : null}
              {isPerfectScore(finalPercent, finalScore, finalMaxScore) ? (
                <p style={{ color: 'var(--color-text-primary)', fontFamily: FUNKY_FONT, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  PERFECT SCORE! 💯🎉
                </p>
              ) : null}
              {finalPercent !== null && finishCelebration(finalPercent) === 'encourage' ? (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', marginBottom: '0.25rem' }}>
                  Good try! 🌟 Play again and beat your score — every try makes you sharper.
                </p>
              ) : null}
              {/* BOLD + COLOURFUL final score (owner 12:55 PKT). */}
              <p style={{ marginBottom: '0.25rem' }}>
                <ScorePill score={finalScore} big />
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Time: {formatTime(finalElapsed ?? elapsed)}
              </p>
              {streakResult ? (
                <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                  <StreakFinishLine result={streakResult} />
                </div>
              ) : null}
              {/* BATCH 1 (item 10): perfect score — the KID launches
                  the special fireworks with this button. */}
              {isPerfectScore(finalPercent, finalScore, finalMaxScore) && !kidFireworks ? (
                <div style={{ marginBottom: '1rem' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => { playEduSound('win', readInteractiveSoundOn()); setKidFireworks(true) }}
                    style={{
                      padding: '0.9rem 1.75rem', borderRadius: '9999px', minHeight: '56px',
                      border: 'none', background: 'linear-gradient(90deg, #ff5a8a, #f59e0b, #22c55e, #3b82f6)',
                      color: '#fff', fontFamily: FUNKY_FONT, fontSize: '1.05rem',
                      cursor: 'pointer', boxShadow: 'var(--shadow)',
                    }}
                  >
                    🎆 Press for FIREWORKS!
                  </motion.button>
                </div>
              ) : null}
              {/* ITEM 37: the finish screen's Share lives in the
                  right panel (PlaySidePanel) now, not as a second
                  button here — one place for Share on every screen. */}
              {/* BATCH 1 (item 9): Top 10 from THIS device's own real
                  finishes — never invented. */}
              <div style={{ maxWidth: '420px', margin: '0 auto 1.25rem', textAlign: 'left' }}>
                <h3 style={{ fontFamily: FUNKY_FONT, fontSize: '1.05rem', color: 'var(--color-text-primary)', margin: '0 0 0.5rem', textAlign: 'center' }}>
                  🏆 Top 10 on this device
                </h3>
                {top10.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
                    No scores saved on this device yet — finish a game to start your Top 10.
                  </p>
                ) : (
                  <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.35rem' }}>
                    {top10.map((entry, i) => (
                      <li
                        key={`${entry.date}-${i}`}
                        style={{
                          display: 'flex', gap: '0.5rem', alignItems: 'center',
                          background: i === 0 ? 'color-mix(in srgb, var(--color-warning) 18%, var(--color-surface))' : 'var(--color-surface-alt)',
                          border: '1px solid var(--color-border)', borderRadius: 'var(--radius)',
                          padding: '0.45rem 0.75rem', fontSize: '0.9rem',
                        }}
                      >
                        <span style={{ fontWeight: 800, width: '1.5rem', textAlign: 'center' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                        </span>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-primary)' }}>
                          {entry.name || 'You'}
                        </span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          {new Date(entry.date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
                        </span>
                        <strong style={{ color: 'var(--color-primary)' }}>{entry.score}</strong>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setFinalScore(null); setFinalElapsed(null); setFinalPercent(null); setFinalMaxScore(null); setFinalPlayerName(null); setElapsed(0); setStreakResult(null); setTop10([]); setKidFireworks(false); streakRecordedRef.current = false }}
                  style={{
                    padding: '1rem 1.75rem', borderRadius: 'var(--radius)', minHeight: '56px',
                    border: 'none', background: 'var(--gradient-btn)',
                    color: '#fff', fontFamily: FUNKY_FONT, fontSize: '0.95rem',
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
                    color: 'var(--color-text-primary)', fontFamily: FUNKY_FONT, fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  Browse More
                </motion.button>
              </div>
            </motion.div>
          ) : !introDone ? (
            // BATCH 1 (item 4): the shared instruction scene — every
            // type, before Start. Once per page load; Play Again
            // never re-asks.
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PlayIntro
                typeSlug={dbTypeOf(effectiveActivity ?? activity)}
                itemCount={originalItems.length}
                locale={locale}
                onStart={(name) => { setPagePlayerName(name); setIntroDone(true) }}
              />
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
                  autoStart
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
          </div>
          <PlaySidePanel
            gameId={id}
            gameTitle={activity.title}
            typeName={typeIntro(dbTypeOf(effectiveActivity ?? activity), originalItems.length).name}
            itemCount={originalItems.length}
            locale={locale}
            showShare={showShare}
            gameNumber={activity.game_number ?? null}
          />
        </div>
        </div>
      </div>
    </div>
  )
}
