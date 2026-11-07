'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, shuffleArray } from './shared'
import ScorePill from '@/components/game/ScorePill'
import { playGameSound, readSoundOn } from '@/lib/game-sound'
import type { ActivityItem } from '@/types'

/**
 * Video Quiz — EduPlay's own video-first quiz, NOT a copy of any
 * rival: no rival art, wording, or audio. Structure only follows the
 * shape every video-quiz editor shares: a video first, then questions
 * about it.
 *
 * Player-visible beats (v1):
 * - The video is a URL the teacher pastes — their own hosted video
 *   file, or a YouTube link for EMBEDDING ONLY. There is no teacher
 *   video-upload infrastructure in this batch, and nothing is
 *   extracted from YouTube: no captions, no transcript, no content
 *   taken from somebody else's video. The creator labels the URL
 *   "own / CC-licensed video only" for exactly this reason.
 * - Each question carries a time in seconds, stored in the item's
 *   hint field (e.g. "45", or "1:30"). While a direct video file
 *   plays, the video PAUSES at that time, the question is shown with
 *   answer options, the player answers, then the video resumes.
 * - A question with no usable timestamp is asked AFTER the video
 *   ends, in creator order, together with any timestamp question the
 *   video never reached (timestamp beyond the video's length, or a
 *   video that could not play). A "Skip video" button and, on a video
 *   error, a "Continue to questions" button mean the player is never
 *   stuck on a video that will not play.
 * - YouTube links play through the YouTube IFrame API so timestamp
 *   pausing works there too; if the API cannot load, the game falls
 *   back to a plain YouTube embed and the questions are asked after
 *   the video, with a "Show questions" button — the fallback is
 *   stated on screen, never silently pretended to be pausing.
 * - If no video URL is set at all, the game shows a plain message
 *   saying so and does NOT invent a video.
 * - Score is split 0–100 across questions. End screen shows score
 *   /100, questions correct, and "Play again" (video restarts and
 *   every question is asked again).
 * - Sound: the video's own audio is ON by default (the video IS the
 *   lesson) with a mute toggle; correct/wrong feedback tones follow
 *   the usual device sound setting like every other player.
 *
 * Stability (the 2026-11-02 quiz lesson): the play page re-renders
 * every second for its elapsed timer. Questions are therefore built
 * once per item CONTENT (fingerprint + ref guard), never on render,
 * so parent ticks can never reshuffle or reset a game in progress.
 * onComplete fires exactly once per finished game.
 */

export type VideoSource =
  | { kind: 'youtube'; videoId: string }
  | { kind: 'file'; url: string }
  | { kind: 'none' }

/** Extract a YouTube video id from a watch / youtu.be / embed /
 *  shorts / live URL, or null when the URL is not a YouTube link
 *  with a usable id. A YouTube URL without an id falls through to
 *  the file path, where the video element will error and the
 *  question fallback takes over — never a crash. */
export function youTubeId(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null
  try {
    const u = new URL(trimmed)
    const host = u.hostname.toLowerCase()
    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\/+/, '').split('/')[0]
      return id || null
    }
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const v = u.searchParams.get('v')
      if (v) return v
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{6,})/)
      if (m) return m[1]
    }
    return null
  } catch {
    const m = trimmed.match(/(?:youtube\.com\/(?:watch\?[^#]*v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
    return m ? m[1] : null
  }
}

/** Classify a pasted video URL. Empty = none. YouTube with an id =
 *  youtube. Everything else = file, played with an HTML5 video
 *  element (which handles .mp4/.webm/.mov and any other URL the
 *  browser can play, and errors cleanly when it cannot). */
export function parseVideoSource(url: string): VideoSource {
  const trimmed = (url || '').trim()
  if (!trimmed) return { kind: 'none' }
  const id = youTubeId(trimmed)
  if (id) return { kind: 'youtube', videoId: id }
  return { kind: 'file', url: trimmed }
}

/** Parse a question's time from its hint field: "45", "45s", or
 *  "1:30" (minutes:seconds). Anything else — empty, words, a
 *  negative number — is null, which means "ask after the video". */
export function parseTimestamp(hint: string | undefined): number | null {
  if (!hint) return null
  const t = hint.trim().toLowerCase()
  if (!t) return null
  const mmss = t.match(/^(\d+):(\d{1,2})(?:\.\d+)?$/)
  if (mmss) {
    const secs = Number(mmss[1]) * 60 + Number(mmss[2])
    return Number.isFinite(secs) ? secs : null
  }
  const secs = t.match(/^(\d+(?:\.\d+)?)s?$/)
  if (secs) {
    const n = Number(secs[1])
    return Number.isFinite(n) ? n : null
  }
  return null
}

export interface VideoQuestion {
  /** Index in the built question list (creator order). */
  index: number
  item: ActivityItem
  options: string[]
  correctIndex: number
  /** Seconds into the video, or null = ask after the video. */
  timeSec: number | null
}

export interface BuiltVideoQuiz {
  videoUrl: string
  questions: VideoQuestion[]
  /** Timed questions, earliest first. */
  timed: VideoQuestion[]
  /** Untimed questions, in creator order. */
  untimed: VideoQuestion[]
}

/** Build the playable quiz from player items. The video URL is the
 *  first non-empty imageUrl across items (the creator stores it on
 *  every item, like Map Quiz and Jigsaw). Options are built the same
 *  way Quiz builds them: the correct answer plus up to 3 other
 *  questions' answers as distractors, shuffled. */
export function buildVideoQuestions(items: ActivityItem[]): BuiltVideoQuiz {
  const videoUrl = items.map((i) => (i.imageUrl || '').trim()).find(Boolean) || ''
  const allAnswers = items.map((i) => i.answer).filter(Boolean)
  const questions: VideoQuestion[] = items
    .filter((i) => i.prompt && i.answer)
    .map((item, index) => {
      const wrong = shuffleArray(allAnswers.filter((a) => a !== item.answer)).slice(0, 3)
      const options = shuffleArray([item.answer, ...wrong])
      return {
        index,
        item,
        options,
        correctIndex: options.indexOf(item.answer),
        timeSec: parseTimestamp(item.hint),
      }
    })
  return {
    videoUrl,
    questions,
    timed: questions.filter((q) => q.timeSec !== null).sort((a, b) => (a.timeSec as number) - (b.timeSec as number)),
    untimed: questions.filter((q) => q.timeSec === null),
  }
}

/** The next timed question due at `currentTime` that has not been
 *  asked yet, or null. Seeking backwards never re-asks a question:
 *  asked questions stay asked. */
export function nextDueQuestion(
  timed: VideoQuestion[],
  asked: ReadonlySet<number>,
  currentTime: number,
): VideoQuestion | null {
  for (const q of timed) {
    if (!asked.has(q.index) && (q.timeSec as number) <= currentTime) return q
  }
  return null
}

/** Score split evenly across questions, rounded once at the end. */
export function videoQuizScore(correctCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0
  return Math.round((100 * correctCount) / totalCount)
}

type Stage = 'video' | 'question' | 'done'

interface YTPlayerLike {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  getCurrentTime: () => number
  getPlayerState: () => number
  mute: () => void
  unMute: () => void
  destroy: () => void
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: string | HTMLElement, opts: Record<string, unknown>) => YTPlayerLike
      PlayerState?: { ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

export default function VideoQuizActivity({ items, locale, onComplete }: ActivityProps) {
  const [built, setBuilt] = useState<BuiltVideoQuiz | null>(null)
  const [stage, setStage] = useState<Stage>('video')
  const [currentQ, setCurrentQ] = useState<VideoQuestion | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [asked, setAsked] = useState<ReadonlySet<number>>(new Set())
  const [videoError, setVideoError] = useState(false)
  const [videoMuted, setVideoMuted] = useState(false)
  const [ytMode, setYtMode] = useState<'api' | 'iframe'>('api')
  const [finished, setFinished] = useState(false)

  const rtl = isRTL(locale)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const ytDivRef = useRef<HTMLDivElement | null>(null)
  const ytPlayerRef = useRef<YTPlayerLike | null>(null)
  const ytPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const askedRef = useRef<ReadonlySet<number>>(new Set())
  const correctRef = useRef(0)
  const builtRef = useRef<BuiltVideoQuiz | null>(null)
  const stageRef = useRef<Stage>('video')
  const currentQRef = useRef<VideoQuestion | null>(null)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const afterQueueRef = useRef<VideoQuestion[]>([])

  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { askedRef.current = asked })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => { builtRef.current = built })
  useEffect(() => { stageRef.current = stage })
  useEffect(() => { currentQRef.current = currentQ })
  useEffect(() => () => {
    if (ytPollRef.current) clearInterval(ytPollRef.current)
    try { ytPlayerRef.current?.destroy() } catch { /* player already gone */ }
  }, [])

  useEffect(() => {
    if (feedback) playGameSound(feedback.type, readSoundOn())
  }, [feedback])

  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}\u0000${i.hint ?? ''}\u0000${i.imageUrl ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    setBuilt(buildVideoQuestions(items))
    resetGame()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsFingerprint, items])

  function resetGame() {
    setStage('video')
    setCurrentQ(null)
    setSelected(null)
    setFeedback(null)
    setCorrectCount(0)
    setAsked(new Set())
    setVideoError(false)
    setFinished(false)
    completedRef.current = false
    afterQueueRef.current = []
  }

  function finish(finalCorrect: number, total: number) {
    setFinished(true)
    setStage('done')
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(videoQuizScore(finalCorrect, total), {
        correctCount: finalCorrect,
        totalCount: total,
      })
    }
  }

  /** Ask the next question from the after-video queue, or finish. */
  function askNextAfterVideo() {
    const queue = afterQueueRef.current
    if (queue.length === 0) {
      const b = builtRef.current
      if (b) finish(correctRef.current, b.questions.length)
      return
    }
    const [next, ...rest] = queue
    afterQueueRef.current = rest
    // Mark it asked here, not only in pauseForQuestion: otherwise
    // the last after-video answer would find "remaining" questions
    // and resume the video instead of finishing (caught by test).
    setAsked((prev) => new Set(prev).add(next.index))
    setCurrentQ(next)
    setSelected(null)
    setFeedback(null)
    setStage('question')
  }

  /** Build the after-video queue (everything not yet asked, in
   *  creator order) and start asking it. Used when the video ends,
   *  when it errors, when the player skips it, and when a YouTube
   *  embed cannot report its time. */
  function startAfterVideo() {
    const b = builtRef.current
    if (!b) return
    const remaining = b.questions.filter((q) => !askedRef.current.has(q.index))
    afterQueueRef.current = remaining
    askNextAfterVideo()
  }

  function pauseForQuestion(q: VideoQuestion) {
    try { videoRef.current?.pause() } catch { /* no video element (YouTube path) */ }
    try { ytPlayerRef.current?.pauseVideo() } catch { /* no YouTube player */ }
    setAsked((prev) => new Set(prev).add(q.index))
    setCurrentQ(q)
    setSelected(null)
    setFeedback(null)
    setStage('question')
  }

  function handleHtmlTimeUpdate() {
    if (stageRef.current !== 'video' || !builtRef.current) return
    const el = videoRef.current
    if (!el) return
    const due = nextDueQuestion(builtRef.current.timed, askedRef.current, el.currentTime)
    if (due) pauseForQuestion(due)
  }

  function handleHtmlEnded() {
    if (stageRef.current !== 'video') return
    startAfterVideo()
  }

  function resumeVideo() {
    setCurrentQ(null)
    setSelected(null)
    setFeedback(null)
    setStage('video')
    const el = videoRef.current
    if (el) {
      try {
        const p = el.play() as unknown
        if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {})
      } catch { /* autoplay blocked or no media — player can still skip */ }
      return
    }
    try { ytPlayerRef.current?.playVideo() } catch { /* iframe fallback: nothing to resume */ }
  }

  /** After answering a question: with more after-video questions
   *  queued, ask the next one; if this question paused the video,
   *  resume it; otherwise finish. */
  function continueAfterAnswer() {
    if (afterQueueRef.current.length > 0) {
      askNextAfterVideo()
      return
    }
    const b = builtRef.current
    if (!b) return
    const remaining = b.questions.filter((q) => !askedRef.current.has(q.index))
    if (remaining.length === 0) {
      finish(correctRef.current, b.questions.length)
      return
    }
    // This question paused the video and more timed questions may
    // still be due: resume so their pauses can fire.
    resumeVideo()
  }

  function handleSelect(idx: number) {
    if (selected !== null || !currentQ) return
    setSelected(idx)
    if (idx === currentQ.correctIndex) {
      const next = correctCount + 1
      setCorrectCount(next)
      correctRef.current = next
      setFeedback({ type: 'correct', msg: 'Correct!' })
    } else {
      setFeedback({ type: 'wrong', msg: `Not quite — the answer was: ${currentQ.item.answer}` })
    }
  }

  function toggleMute() {
    const next = !videoMuted
    setVideoMuted(next)
    try {
      if (next) ytPlayerRef.current?.mute()
      else ytPlayerRef.current?.unMute()
    } catch { /* iframe fallback has no player to mute */ }
  }

  // YouTube IFrame API: create the player once the API is ready so
  // timestamp pausing works for YouTube links too. If the API has
  // not produced a player, the render falls back to a plain embed
  // (ytMode 'iframe') and questions are asked after the video.
  const source = built ? parseVideoSource(built.videoUrl) : { kind: 'none' as const }
  useEffect(() => {
    if (!built || source.kind !== 'youtube' || ytMode !== 'api') return
    let cancelled = false
    const createPlayer = () => {
      if (cancelled || ytPlayerRef.current || !ytDivRef.current || !window.YT) return
      try {
        ytPlayerRef.current = new window.YT.Player(ytDivRef.current, {
          videoId: (source as { videoId: string }).videoId,
          playerVars: { rel: 0, playsinline: 1 },
          events: {
            onStateChange: (e: { data: number }) => {
              const ended = window.YT?.PlayerState?.ENDED ?? 0
              if (e.data === ended && stageRef.current === 'video') startAfterVideo()
            },
          },
        })
        ytPollRef.current = setInterval(() => {
          if (stageRef.current !== 'video' || !builtRef.current) return
          let t = NaN
          try { t = ytPlayerRef.current?.getCurrentTime() ?? NaN } catch { t = NaN }
          if (!Number.isFinite(t)) return
          const due = nextDueQuestion(builtRef.current.timed, askedRef.current, t)
          if (due) pauseForQuestion(due)
        }, 500)
      } catch {
        if (!cancelled) setYtMode('iframe')
      }
    }
    if (window.YT?.Player) {
      createPlayer()
    } else {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { try { prev?.() } catch { /* ignore */ } createPlayer() }
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const s = document.createElement('script')
        s.src = 'https://www.youtube.com/iframe_api'
        s.async = true
        document.head.appendChild(s)
      }
      const fallback = setTimeout(() => { if (!cancelled && !ytPlayerRef.current) setYtMode('iframe') }, 6000)
      return () => { cancelled = true; clearTimeout(fallback) }
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built?.videoUrl, ytMode])

  if (!built) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>Loading video quiz…</p>
      </div>
    )
  }

  if (built.questions.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>This video quiz has no questions yet.</p>
      </div>
    )
  }

  if (!built.videoUrl) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎬</div>
        <p style={{ fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>
          This video quiz has no video set yet.
        </p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
          Add a video URL — your own hosted video file, or a YouTube link for embedding only
          (own or CC-licensed video only) — to play it. No video is invented here.
        </p>
      </div>
    )
  }

  if (finished) {
    const score = videoQuizScore(correctCount, built.questions.length)
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🎬</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Video Quiz Complete!</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
          <ScorePill score={score} total={100} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {correctCount} of {built.questions.length} correct
        </p>
        <button
          onClick={resetGame}
          style={{
            marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)',
            border: 'none', background: 'var(--color-primary)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          Play again
        </button>
      </motion.div>
    )
  }

  const askedCount = asked.size
  const ytId = source.kind === 'youtube' ? source.videoId : null

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>Questions answered: {askedCount} / {built.questions.length}</span>
        <span>{correctCount} correct so far</span>
      </div>

      {stage === 'video' && (
        <div>
          {source.kind === 'file' && (
            <video
              ref={videoRef}
              src={built.videoUrl}
              controls
              muted={videoMuted}
              preload="metadata"
              onTimeUpdate={handleHtmlTimeUpdate}
              onEnded={handleHtmlEnded}
              onError={() => setVideoError(true)}
              data-testid="video-quiz-video"
              style={{ width: '100%', borderRadius: 'var(--radius-lg)', background: '#000' }}
            />
          )}
          {source.kind === 'youtube' && ytMode === 'api' && (
            <div
              ref={ytDivRef}
              data-testid="video-quiz-youtube"
              style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 'var(--radius-lg)', background: '#000' }}
            />
          )}
          {source.kind === 'youtube' && ytMode === 'iframe' && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`}
              title="Video Quiz video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              data-testid="video-quiz-youtube-iframe"
              style={{ width: '100%', aspectRatio: '16 / 9', border: 'none', borderRadius: 'var(--radius-lg)', background: '#000' }}
            />
          )}
          {videoError && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              This video could not play here. You can still answer every question below.
            </p>
          )}
          {source.kind === 'youtube' && ytMode === 'iframe' && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              With a YouTube embed, questions appear after the video — timestamp pausing needs a
              direct video file. Use the video&apos;s own sound control.
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            {source.kind !== 'youtube' || ytMode === 'api' ? (
              <button
                type="button"
                onClick={toggleMute}
                style={{
                  padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)',
                  border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.9rem',
                }}
              >
                {videoMuted ? '🔇 Sound off' : '🔊 Sound on'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={startAfterVideo}
              style={{
                padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.9rem',
              }}
            >
              {videoError || (source.kind === 'youtube' && ytMode === 'iframe')
                ? 'Show questions'
                : 'Skip video · show questions'}
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Watch the video — it will pause with a question at the right moment.
          </p>
        </div>
      )}

      {stage === 'question' && currentQ && (
        <div style={{
          padding: '1.25rem', borderRadius: 'var(--radius-lg)',
          background: 'var(--color-surface)', border: '2px solid var(--color-border)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎬</div>
          <p style={{ fontSize: '1.15rem', lineHeight: 1.5, color: 'var(--color-text-primary)' }}>{currentQ.item.prompt}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {currentQ.options.map((opt, idx) => {
              const isPicked = selected === idx
              const isCorrectOpt = idx === currentQ.correctIndex
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  disabled={selected !== null}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)',
                    border: '2px solid var(--color-border)',
                    background: selected !== null && isCorrectOpt
                      ? 'var(--color-success)'
                      : selected !== null && isPicked
                        ? 'var(--color-danger)'
                        : 'var(--color-surface)',
                    color: selected !== null && (isCorrectOpt || isPicked) ? '#fff' : 'var(--color-text-primary)',
                    cursor: selected !== null ? 'default' : 'pointer',
                    fontSize: '1rem', textAlign: 'left',
                  }}
                >
                  {selected !== null && isCorrectOpt ? '✓ ' : selected !== null && isPicked ? '✗ ' : ''}{opt}
                </button>
              )
            })}
          </div>
          <AnimatePresence>
            {feedback && (
              <motion.p
                key={feedback.msg}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                aria-live="polite"
                style={{
                  marginTop: '0.75rem', fontWeight: 700,
                  color: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-text-primary)',
                }}
              >
                {feedback.type === 'correct' ? '✓ ' : '✗ '}{feedback.msg}
              </motion.p>
            )}
          </AnimatePresence>
          {selected !== null && (
            <button
              type="button"
              onClick={continueAfterAnswer}
              style={{
                marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)',
                border: 'none', background: 'var(--color-primary)', color: '#fff',
                fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
              }}
            >
              Continue
            </button>
          )}
        </div>
      )}
    </div>
  )
}
