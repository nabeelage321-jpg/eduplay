'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, SCORE_PER_CORRECT, shuffleArray } from './shared'
import ScorePill from '@/components/game/ScorePill'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  BEAT_TAP_LIVES,
  BEAT_TAP_MAX_ROUNDS,
  BEAT_TAP_POINTS_PER_TAP,
  BEAT_TAP_NOTES_PER_ROUND,
  BEAT_TAP_FIELD_HEIGHT,
  BEAT_TAP_LINE_Y,
  BEAT_TAP_BEAT,
  beatTapBeatIndex,
  beatTapNoteY,
  newBeatTapGame,
  stepBeatTap,
  tapBeatTap,
  buildBeatTapRound,
  type BeatTapState,
  type BeatTapRound,
} from '@/lib/beat-tap'

/**
 * Beat Tap — EduPlay's own Guitar Hero-STYLE rhythm tapper
 * (type 55).
 *
 * Guitar Hero-STYLE mechanic only: notes fall down a track
 * and the kid taps the drum when a note crosses the line, in
 * time with the beat. No Guitar Hero name, no Activision
 * notes or art: the notes are plain circles with an answer
 * written on each, the drum is a plain drum circle — all
 * drawn here, nothing copied. Sounds are the shared
 * interactive Web Audio system (synthesized, no assets) for
 * correct / wrong / win / lose, plus a small drum of our own
 * below — a sine drop, 150 Hz down to 50 Hz — that thumps on
 * every beat and on every drum tap. Sound is ON by default
 * for this game; the in-player toggle mutes it in one tap.
 * Background music is the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct note. Each round's track is 4 notes:
 * the round's own answer on one, wrong answers borrowed from
 * the game's other items on the rest. No new save path was
 * needed: the save route already stores prompt/answer for
 * every type, and the adapter passes creator rows through
 * untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per CORRECT on-beat tap (one correct
 *   note per round, one round per question, up to 10 rounds,
 *   shuffled once per item content). Score out of 10 x rounds.
 * - Tapping the drum while the CORRECT note is on the line
 *   (within 0.22s of its crossing) earns 10 points and wins
 *   the round. A tap within 0.10s is PERFECT; a wider on-beat
 *   tap is GOOD — both earn the same 10 points, only the word
 *   differs. A correct tap adds one to the streak.
 * - Tapping while a WRONG note is on the line bursts that
 *   note, earns no points, and breaks the streak — but costs
 *   no life and the round goes on, so the kid can still wait
 *   for the right note. A burst note cannot be tapped again.
 * - Tapping with no note on the line (off-beat) earns no
 *   points and breaks the streak — the drum just thuds, no
 *   life lost. Notes are a beat apart and the window is
 *   narrower than half a beat, so a tap is only ever judged
 *   against one note.
 * - Letting the CORRECT note pass the line untapped costs 1
 *   life and ends the round at once — that was the round's
 *   one chance. Wrong notes passing the line cost nothing.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Beat Tap Complete!"). onComplete fires exactly
 *   once with the real score plus correct/total counts and lives
 *   left.
 * - Pause via the shared PlayShell freezes the falling notes,
 *   the beat, and the controls (the shell overlay covers the
 *   track, and the game loop + control handlers all require
 *   status 'playing'). Reading How to Play mid-game also
 *   freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the wrong notes, the streak, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least two different answers to borrow as
 *   wrong notes plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its falling notes, beat, and
 *   drum) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface BeatTapGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** A steady colour per answer, so the same answer always looks the same. */
function noteColour(answer: string): string {
  const palette = ['#f59e0b', '#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#facc15', '#60a5fa']
  const code = answer.charCodeAt(0) || 0
  return palette[code % palette.length]!
}

/** Field units -> percent of the scene box (the scene is 100 x 60). */
const px = (v: number) => `${v}%`
const py = (v: number) => `${(v / BEAT_TAP_FIELD_HEIGHT) * 100}%`

/** Our own drum: a synthesized sine drop, no recording, no
 *  asset. The beat thump is soft; a tap on the drum is louder. */
let drumCtx: AudioContext | null = null
function playDrumThump(soundOn: boolean, accent: boolean) {
  if (!soundOn || typeof window === 'undefined') return
  try {
    if (!drumCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return
      drumCtx = new AC()
    }
    if (drumCtx.state === 'suspended') void drumCtx.resume()
    const t0 = drumCtx.currentTime
    const osc = drumCtx.createOscillator()
    const gain = drumCtx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(accent ? 180 : 150, t0)
    osc.frequency.exponentialRampToValueAtTime(50, t0 + 0.15)
    gain.gain.setValueAtTime(accent ? 0.25 : 0.16, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18)
    osc.connect(gain)
    gain.connect(drumCtx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.2)
  } catch {
    /* sound is best-effort — a tap still counts without it */
  }
}

function BeatTapGame({ items, locale, onComplete, onProgress }: BeatTapGameProps) {
  const [rounds, setRounds] = useState<BeatTapRound[]>([])
  const [game, setGame] = useState<BeatTapState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(BEAT_TAP_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  const sceneRef = useRef<HTMLDivElement | null>(null)
  // Which beat the drum last thumped on, so it thumps once a beat.
  const lastBeatRef = useRef(-1)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()

  useEffect(() => {
    if (feedback) playEduSound(feedback.type, readInteractiveSoundOn())
  }, [feedback])

  // Build rounds once per content fingerprint.
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}\u0000${i.imageUrl ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    const usable = items.filter((i) => i.prompt && i.answer)
    const shuffled = shuffleArray(usable).slice(0, BEAT_TAP_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: BeatTapRound[] = []
    for (const item of shuffled) {
      const round = buildBeatTapRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newBeatTapGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(BEAT_TAP_LIVES)
    setScore(0)
    setCorrectCount(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    lastBeatRef.current = -1
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(BEAT_TAP_LIVES)
  const correctRef = useRef(0)
  const streakRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => { streakRef.current = streak })
  useEffect(() => { onProgress(score, finished) }, [score, finished, onProgress])

  const finishGame = useCallback((didWin: boolean) => {
    setWon(didWin)
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(scoreRef.current, {
        correctCount: correctRef.current,
        totalCount: rounds.length,
        livesLeft: livesRef.current,
      })
    }
  }, [rounds.length])

  // Finish sound once: win on Beat Tap Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  // A fresh round whenever the round changes.
  const roundsRef = useRef(rounds)
  useEffect(() => { roundsRef.current = rounds }, [rounds])
  const currentRef = useRef(current)
  useEffect(() => { currentRef.current = current }, [current])
  const gameRef = useRef(game)
  useEffect(() => { gameRef.current = game }, [game])
  useEffect(() => {
    const round = rounds[current]
    if (!round) return
    const fresh = newBeatTapGame(round)
    gameRef.current = fresh
    setGame(fresh)
    lastBeatRef.current = -1
  }, [current, rounds])

  /** Advance after the current round ends. Lives already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    if (livesRef.current <= 0) {
      finishGame(false)
      return
    }
    if (from + 1 >= roundsRef.current.length) {
      finishGame(true)
      return
    }
    setCurrent(from + 1)
  }, [finishGame])

  /** Lose one life and end the round. */
  const loseRound = useCallback((msg: string) => {
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setStreak(0)
    streakRef.current = 0
    advancingRef.current = true
    const from = currentRef.current
    setFeedback({
      type: 'wrong',
      msg: livesRef.current <= 0 ? `${msg} — and you are out of lives.` : msg,
    })
    setTimeout(() => advanceFrom(from), 1400)
  }, [advanceFrom])

  /** Resolve a tap or clock event from the lib. */
  const resolveEvent = useCallback((next: BeatTapState) => {
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'hit-correct') {
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      if (next.status === 'won') {
        advancingRef.current = true
        const from = currentRef.current
        setFeedback({
          type: 'correct',
          msg: event.perfect
            ? `PERFECT! You tapped ${event.answer} right on the beat! +${SCORE_PER_CORRECT} points — round won!`
            : `Good — right on the beat! You tapped ${event.answer}! +${SCORE_PER_CORRECT} points — round won!`,
        })
        setTimeout(() => advanceFrom(from), 1200)
      }
      return
    }
    if (event.kind === 'hit-wrong') {
      playEduSound('wrong', readInteractiveSoundOn())
      // No life lost, no advance — that note bursts and the round
      // goes on, so the kid can still wait for the right note.
      // The streak breaks.
      setStreak(0)
      streakRef.current = 0
      setFeedback({
        type: 'wrong',
        msg: `That note said ${event.answer} — the wrong one! Streak broken. Wait for the right note.`,
      })
      return
    }
    if (event.kind === 'missed-correct') {
      loseRound(`The ${event.answer} note passed the line untapped!`)
      return
    }
    if (event.kind === 'off-beat') {
      // No life lost — the drum just thuds. The streak breaks.
      setStreak(0)
      streakRef.current = 0
      setFeedback({
        type: 'wrong',
        msg: 'Off-beat! Wait for the note to reach the line, then tap the drum.',
      })
      return
    }
  }, [advanceFrom, loseRound])

  /** One clock tick: the notes fall, the drum thumps each beat. */
  const doTick = useCallback(() => {
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    const next = stepBeatTap(g, 0.03)
    gameRef.current = next
    setGame(next)
    const beat = beatTapBeatIndex(next.t)
    if (beat !== lastBeatRef.current) {
      lastBeatRef.current = beat
      playDrumThump(readInteractiveSoundOn(), false)
    }
    if (next.lastEvent) resolveEvent(next)
  }, [resolveEvent])

  // Game loop: the notes fall while the shell is playing,
  // How-to-Play is closed, and the game is not finished —
  // pause and How-to-Play both freeze them.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    if (!game || game.status !== 'playing') return
    const id = setInterval(() => { doTick() }, 30)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current, game?.status, doTick])

  /** Tap the drum (or a note, or Space) — judged on the beat. */
  const doTap = useCallback(() => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    setFeedback(null)
    playDrumThump(readInteractiveSoundOn(), true)
    const next = tapBeatTap(g)
    gameRef.current = next
    setGame(next)
    if (next.lastEvent) resolveEvent(next)
  }, [finished, shellStatus, showHowto, resolveEvent])

  const doTapRef = useRef(doTap)
  useEffect(() => { doTapRef.current = doTap }, [doTap])

  // Keyboard: Space taps the drum.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === ' ') {
        e.preventDefault()
        if (!e.repeat) doTapRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [shellStatus, showHowto, finished])

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    const first = roundsRef.current[0]
    if (first) {
      const fresh = newBeatTapGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(BEAT_TAP_LIVES)
    setScore(0)
    setCorrectCount(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    completedRef.current = false
    advancingRef.current = false
    lastBeatRef.current = -1
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no beat yet — it needs questions with at least two other different answers to tap to.
      </div>
    )
  }

  // ---- How to Play: FIRST, before play, and re-readable mid-game. ----
  if (showHowto) {
    return (
      <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto', color: 'var(--color-text-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-end', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Sound <InteractiveSoundToggle />
        </div>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🥁</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Beat Tap</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Notes fall down the track — tap the drum when the right one crosses the line, on the beat!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> notes fall down the track, one per beat, and every note carries an answer. Read the question at the top — for example, &ldquo;2+6 = ?&rdquo; — and watch for the note that says 8. The drum thumps on every beat and the line flashes with it. Tap the drum the moment the 8 note crosses the line. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> tapping the drum while the right-answer note is on the line earns {BEAT_TAP_POINTS_PER_TAP} points. A tap right on the beat is PERFECT, a slightly wider one is GOOD — both earn the same {BEAT_TAP_POINTS_PER_TAP} points. Each round has one right-answer note, so the game is scored out of {rounds.length * BEAT_TAP_POINTS_PER_TAP} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}).</p>
          <p><strong>Objective:</strong> tap the right note on the beat in every round without running out of lives — and keep your streak going!</p>
          <p><strong>Controls:</strong> tap the big drum, press Space, or tap a note on the track. Feel the beat: the drum thumps once per beat, and every note crosses the line exactly on a beat.</p>
          <p><strong>Lives:</strong> you start with {BEAT_TAP_LIVES} lives. Letting the right-answer note pass the line untapped costs 1 life and ends the round at once — that was your one chance. Wrong notes passing the line cost nothing, so don&apos;t rush: wait for the right one.</p>
          <p><strong>Wrong notes and off-beat taps:</strong> tapping while a wrong note is on the line bursts it — no points, no life lost, but your streak breaks. Tapping with no note on the line is off-beat — again no points and the streak breaks. Only a right-note tap on the beat keeps the streak alive.</p>
          <p><strong>Rounds:</strong> one round per question, in shuffled order. A fresh set of notes falls in every round, and the right note falls in a different place each time.</p>
          <p><strong>How you win and finish:</strong> tap the right note on the beat in every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many right notes you tapped, and how many lives are left.</p>
        </div>
        <button
          onClick={startPlaying}
          style={{
            marginTop: '1.25rem', width: '100%', padding: '0.9rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)',
            fontSize: '1.05rem', cursor: 'pointer',
          }}
        >
          {started ? 'Back to game' : 'Skip instructions — start playing'}
        </button>
        {!started && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.6rem' }}>
            You can re-read this page any time from the &ldquo;How to play&rdquo; button during the game.
          </p>
        )}
      </div>
    )
  }

  // ---- End screen ----
  if (finished) {
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">{won ? '🏆' : '💔'}</div>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          {won ? 'Beat Tap Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} right notes tapped on the beat
          {` · ${lives} ${lives === 1 ? 'life' : 'lives'} left`}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
          <InteractiveSoundToggle />
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowHowto(true)}
            style={{
              padding: '0.8rem 1.25rem', borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            How to play
          </button>
          <button
            onClick={playAgain}
            style={{
              padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-lg)',
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Play again
          </button>
        </div>
      </motion.div>
    )
  }

  const round = rounds[current]
  if (!round || !game) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  // The line flashes on each beat: bright just after a beat lands.
  const beatPhase = game.t % BEAT_TAP_BEAT
  const lineHot = beatPhase < 0.18
  // Spent flags live on the live round, not the pristine built one.
  const visibleNotes = game.round.notes.filter((n) => !n.spent && beatTapNoteY(n, game.t) > -6)

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, BEAT_TAP_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        {streak >= 2 && (
          <span aria-live="polite" style={{ color: '#ea580c', fontWeight: 700 }}>🔥 streak x{streak}</span>
        )}
        <span aria-live="polite">Round {current + 1} of {rounds.length}</span>
        <button
          onClick={() => setShowHowto(true)}
          style={{
            padding: '0.35rem 0.7rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          How to play
        </button>
        <InteractiveSoundToggle />
      </div>

      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1rem',
        color: 'var(--color-text-primary)', textAlign: 'center', boxShadow: 'var(--shadow-card)',
      }}>
        <p style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', margin: 0 }}>
          {round.prompt}
        </p>
        {round.imageUrl && (
          <figure style={{ margin: '0.75rem 0 0' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={round.imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: 'var(--radius)' }} />
            {round.imageCredit && (
              <figcaption style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {round.imageCredit}
              </figcaption>
            )}
          </figure>
        )}
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginTop: '0.5rem', marginBottom: 0 }}>
          Tap the drum when the note with the right answer crosses the line — on the beat!
        </p>
      </div>

      {/* Track: falling notes, the hit line, the drum. */}
      <div
        ref={sceneRef}
        role="application"
        aria-label={`Beat Tap round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${lives} lives left. Tap the drum, press Space, or tap a note when the note with the right answer crosses the line, on the beat.`}
        onPointerDown={() => doTapRef.current()}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '100 / 60',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
          background: 'linear-gradient(to bottom, #1e1b4b 0%, #312e81 55%, #4c1d95 100%)',
        }}
      >
        {/* Track rails */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '38%', top: 0, bottom: 0, width: '3px', background: 'rgba(255,255,255,0.25)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', left: '62%', top: 0, bottom: 0, width: '3px', background: 'rgba(255,255,255,0.25)' }} />
        {/* Falling notes */}
        {visibleNotes.map((note) => (
          <div
            key={note.id}
            aria-label={`Note with ${note.answer}`}
            style={{
              position: 'absolute', left: px(50), top: py(beatTapNoteY(note, game.t)),
              width: '52px', height: '52px', marginLeft: '-26px', marginTop: '-26px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: noteColour(note.answer),
              borderRadius: '50%', border: '3px solid rgba(255,255,255,0.85)',
              color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '1.05rem', textAlign: 'center', boxSizing: 'border-box',
              boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
            }}
          >
            {note.answer}
          </div>
        ))}
        {/* Hit line — flashes on each beat. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: 0, right: 0, top: py(BEAT_TAP_LINE_Y),
            height: lineHot ? '8px' : '4px', marginTop: lineHot ? '-4px' : '-2px',
            background: lineHot ? '#facc15' : 'rgba(250,204,21,0.55)',
            boxShadow: lineHot ? '0 0 16px #facc15' : 'none',
            transition: 'height 60ms, background 60ms',
          }}
        />
        {/* Drum under the line. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: px(50), top: py(56),
            width: '64px', height: '34px', marginLeft: '-32px', marginTop: '-17px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at 50% 35%, #fca5a5, #b91c1c 70%)',
            borderRadius: '50%', border: '3px solid #7f1d1d',
            fontSize: '1.4rem', lineHeight: 1, boxSizing: 'border-box',
          }}
        >
          🥁
        </div>
      </div>

      {/* Big drum button */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => doTap()}
          disabled={game.status !== 'playing'}
          aria-label="Tap the drum"
          style={{
            padding: '0.9rem 2.5rem', borderRadius: '999px', border: 'none',
            background: game.status === 'playing' ? 'var(--color-primary)' : 'var(--color-border)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1.25rem', cursor: 'pointer',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          🥁 TAP THE DRUM
        </button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Space taps the drum too — or tap a note on the track. {BEAT_TAP_NOTES_PER_ROUND} notes fall each round, one per beat; only the right one wins it. A wrong note or an off-beat tap breaks your streak, and letting the right note pass costs a life!
      </p>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              marginTop: '1rem', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              color: '#fff', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem',
            }}>
            {feedback.type === 'correct' ? '⭐ ' : '❌ '}{feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function BeatTapActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Beat Tap" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <BeatTapGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
