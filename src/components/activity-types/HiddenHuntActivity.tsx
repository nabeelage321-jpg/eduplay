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
  HIDDEN_HUNT_LIVES,
  HIDDEN_HUNT_MAX_ROUNDS,
  HIDDEN_HUNT_POINTS_PER_FIND,
  HIDDEN_HUNT_MAX_PER_ROUND,
  HIDDEN_HUNT_HINT_AFTER_WRONGS,
  newHiddenHuntGame,
  peekAt,
  resolvePeek,
  hiddenHuntHintSide,
  buildHiddenHuntRound,
  type HiddenHuntState,
  type HiddenHuntRound,
  type HiddenHuntPlace,
} from '@/lib/hidden-hunt'

/**
 * Hidden Hunt — EduPlay's own seek-and-find game (type 62).
 *
 * Own name, own art, own words: six hiding places invented
 * here (the big tree, the grey rock, the green bush, the red
 * mushroom, the sunny flower, the picnic basket), and the kid
 * peeks behind them to find the one hiding the right answer.
 * No other seek-and-find game's art, name, wording, or audio
 * is copied, and no trademarked game name is used. Sounds are
 * the shared interactive Web Audio system (synthesized, no
 * assets) for correct / wrong / win / lose, plus a small peek
 * rustle, a found sparkle chime, and a gentle not-here note
 * of our own below. Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music
 * is the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question
 * (for example "Find the 8" or "2+6 = ?"), answer = the
 * hidden thing to find. Each round's clearing holds 6 hiding
 * places: the round's own answer behind one, wrong answers
 * borrowed from the game's other items behind the other five.
 * No new save path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes
 * creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per hidden thing FOUND. One find per
 *   round, 10 rounds — score out of 10 x rounds.
 * - Tap (or click) a hiding place to peek behind it — or
 *   press 1 to 6 for the first to sixth hiding place. The
 *   place lifts for a moment and shows what is behind it.
 * - Peek behind the RIGHT place and the hidden thing is
 *   found: it pops out with a sparkle, +10 points, and the
 *   round is won.
 * - Peek behind a WRONG place and it is a gentle miss: the
 *   wrong answer shows, no points — and the peek costs 1
 *   life, but the round goes ON, so you keep hunting. A
 *   wrong peek is never a harsh fail state and never ends
 *   the round on its own. A place already peeked stays open,
 *   so you remember where you looked.
 * - After 2 wrong peeks in a round, a gentle hint appears:
 *   which side of the clearing to look on (left, middle, or
 *   right) — the hint names a side, never the hiding place
 *   itself, so you still have to look.
 * - 0 lives = game over (lose). All rounds done with lives
 *   left = win ("Hidden Hunt Complete!"). onComplete fires
 *   exactly once with the real score plus rounds won / total
 *   rounds and lives left.
 * - If a question carries its own picture (imageUrl), the
 *   picture shows above the question — it is part of the
 *   question, never decoration, never invented.
 * - Pause via the shared PlayShell blocks new peeks and
 *   holds a peek already in progress until play resumes
 *   (the shell overlay covers the scene, and the peek
 *   handlers all require status 'playing'). Reading How to
 *   Play mid-game also blocks peeks.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the gentle misses, the hint, the streak, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least five different answers to borrow as
 *   wrong hiding places plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its park clearing, hiding places,
 *   and peeking) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface HiddenHuntGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Our own peek rustle + found sparkle + gentle not-here note:
 *  synthesized Web Audio, no recording, no asset. */
let huntCtx: AudioContext | null = null
function huntAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!huntCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      huntCtx = new AC()
    }
    if (huntCtx.state === 'suspended') void huntCtx.resume()
    return huntCtx
  } catch {
    return null
  }
}
function playTone(soundOn: boolean, notes: { freq: number; at: number; dur: number; type: OscillatorType; vol: number }[]) {
  if (!soundOn) return
  const ctx = huntAudioCtx()
  if (!ctx) return
  try {
    const t0 = ctx.currentTime
    for (const n of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = n.type
      osc.frequency.setValueAtTime(n.freq, t0 + n.at)
      gain.gain.setValueAtTime(0.0001, t0 + n.at)
      gain.gain.exponentialRampToValueAtTime(n.vol, t0 + n.at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + n.at + n.dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t0 + n.at)
      osc.stop(t0 + n.at + n.dur + 0.05)
    }
  } catch {
    /* sound is best-effort — a peek still counts without it */
  }
}
/** A soft rustle as a hiding place lifts. */
function playPeekRustle(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 500, at: 0, dur: 0.14, type: 'sine', vol: 0.12 },
    { freq: 750, at: 0.07, dur: 0.14, type: 'sine', vol: 0.1 },
  ])
}
/** Two bright rising notes when the hidden thing is found. */
function playFoundChime(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 784, at: 0, dur: 0.18, type: 'sine', vol: 0.18 },
    { freq: 1175, at: 0.12, dur: 0.3, type: 'sine', vol: 0.18 },
  ])
}
/** One soft low note for a gentle miss — quiet on purpose,
 *  so a wrong peek never sounds harsh. */
function playNotHereNote(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 330, at: 0, dur: 0.25, type: 'sine', vol: 0.12 },
  ])
}

function HiddenHuntGame({ items, locale, onComplete, onProgress }: HiddenHuntGameProps) {
  const [rounds, setRounds] = useState<HiddenHuntRound[]>([])
  const [game, setGame] = useState<HiddenHuntState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(HIDDEN_HUNT_LIVES)
  const [score, setScore] = useState(0)
  const [roundsWon, setRoundsWon] = useState(0)
  const [foundCount, setFoundCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()
  const shellStatusRef = useRef(shellStatus)
  useEffect(() => { shellStatusRef.current = shellStatus }, [shellStatus])

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
    const shuffled = shuffleArray(usable).slice(0, HIDDEN_HUNT_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: HiddenHuntRound[] = []
    for (const item of shuffled) {
      const round = buildHiddenHuntRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newHiddenHuntGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(HIDDEN_HUNT_LIVES)
    setScore(0)
    setRoundsWon(0)
    setFoundCount(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(HIDDEN_HUNT_LIVES)
  const roundsWonRef = useRef(0)
  const streakRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { roundsWonRef.current = roundsWon })
  useEffect(() => { streakRef.current = streak })
  useEffect(() => { onProgress(score, finished) }, [score, finished, onProgress])

  const finishGame = useCallback((didWin: boolean) => {
    setWon(didWin)
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(scoreRef.current, {
        correctCount: roundsWonRef.current,
        totalCount: rounds.length,
        livesLeft: livesRef.current,
      })
    }
  }, [rounds.length])

  // Finish sound once: win on Hidden Hunt Complete, lose on game over.
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
    const fresh = newHiddenHuntGame(round)
    gameRef.current = fresh
    setGame(fresh)
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

  /** Lose one life on a gentle miss. The round goes on — the
   *  kid keeps hunting — unless the lives just ran out. */
  const loseLifeOnMiss = useCallback((msg: string) => {
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setStreak(0)
    streakRef.current = 0
    setFeedback({
      type: 'wrong',
      msg: livesRef.current <= 0 ? `${msg} — and you are out of lives.` : msg,
    })
    if (livesRef.current <= 0) {
      advancingRef.current = true
      const from = currentRef.current
      setTimeout(() => advanceFrom(from), 1600)
    }
  }, [advanceFrom])

  /** Settle a peek once the hiding place has lifted. */
  const resolvePeekNow = useCallback(() => {
    // A paused game holds the peek until play resumes.
    if (shellStatusRef.current !== 'playing' || showHowto) {
      setTimeout(resolvePeekNow, 200)
      return
    }
    const g = gameRef.current
    if (!g || g.phase !== 'peeking') return
    const next = resolvePeek(g)
    gameRef.current = next
    setGame(next)
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'found') {
      playFoundChime(readInteractiveSoundOn())
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setFoundCount((c) => c + 1)
      setRoundsWon((r) => r + 1)
      roundsWonRef.current = roundsWonRef.current + 1
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      advancingRef.current = true
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `Found it! ${event.answer} was hiding behind ${event.name}! +${SCORE_PER_CORRECT} points!`,
      })
      setTimeout(() => advanceFrom(from), 1600)
      return
    }
    if (event.kind === 'not-here') {
      playNotHereNote(readInteractiveSoundOn())
      loseLifeOnMiss(`Not here — ${event.answer} was behind ${event.name}, not the one you are hunting for. Keep looking!`)
    }
  }, [advanceFrom, loseLifeOnMiss, showHowto])

  /** Peek behind one hiding place. */
  const peekBehind = useCallback((placeId: string) => {
    if (shellStatusRef.current !== 'playing' || showHowto || finished) return
    if (advancingRef.current) return
    if (livesRef.current <= 0) return
    const g = gameRef.current
    if (!g) return
    const next = peekAt(g, placeId)
    if (next === g) return
    playPeekRustle(readInteractiveSoundOn())
    gameRef.current = next
    setGame(next)
    // The hiding place takes a moment to lift.
    setTimeout(resolvePeekNow, 450)
  }, [showHowto, finished, resolvePeekNow])

  // Keyboard: 1 to 6 peeks behind the first to sixth hiding place.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      const idx = ['1', '2', '3', '4', '5', '6'].indexOf(e.key)
      if (idx < 0) return
      const place = gameRef.current?.round.places[idx]
      if (!place) return
      e.preventDefault()
      peekBehind(place.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shellStatus, showHowto, finished, peekBehind])

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
      const fresh = newHiddenHuntGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(HIDDEN_HUNT_LIVES)
    setScore(0)
    setRoundsWon(0)
    setFoundCount(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    completedRef.current = false
    advancingRef.current = false
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has nothing to hunt for yet — it needs questions with at least five other different answers to hide.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🔍</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Hidden Hunt</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Hunt through the park and peek behind the right hiding place to find the hidden answer!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> six hiding places wait in the park clearing — the big tree, the grey rock, the green bush, the red mushroom, the sunny flower, and the picnic basket — and each one hides an answer. Read the question at the top — for example, &ldquo;Find the 8&rdquo; or &ldquo;2+6 = ?&rdquo; — and peek behind the hiding place with the right answer. Tap (or click) the hiding place, or press 1 to 6. The place lifts for a moment and shows what is behind it. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> finding the hidden thing earns {HIDDEN_HUNT_POINTS_PER_FIND} points — one find per round, so {HIDDEN_HUNT_MAX_PER_ROUND} points a round at most and the game is scored out of {rounds.length * HIDDEN_HUNT_MAX_PER_ROUND} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}).</p>
          <p><strong>Objective:</strong> find the hidden thing in every round — and keep your streak of finds in a row with no wrong peek in between going!</p>
          <p><strong>Controls:</strong> tap (or click) a hiding place to peek behind it, or press 1 to 6 for the first to sixth hiding place. You can peek as many times as you like in a round — but every wrong peek costs a life, so look carefully first!</p>
          <p><strong>Lives:</strong> you start with {HIDDEN_HUNT_LIVES} lives. A wrong peek costs 1 life.</p>
          <p><strong>Gentle misses:</strong> peek behind a hiding place with the wrong answer and it is just a gentle miss — the wrong answer shows, you get no points, and the place stays open so you remember where you looked. The round goes on, so you keep hunting — a wrong peek never ends the round on its own.</p>
          <p><strong>Hint:</strong> after 2 wrong peeks in a round, a gentle hint appears under the clearing telling you which side to look on — left, middle, or right. The hint names a side, never the hiding place itself, so you still have to look.</p>
          <p><strong>Rounds:</strong> one clearing per question, in shuffled order. A fresh set of hiding places waits in every round, and the right answer hides behind a different place each time.</p>
          <p><strong>How you win and finish:</strong> find the hidden thing in every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many hidden things you found, and how many lives are left.</p>
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
          {won ? 'Hidden Hunt Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * HIDDEN_HUNT_MAX_PER_ROUND} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {foundCount} of {rounds.length} hidden things found
          {` · ${roundsWon} of ${rounds.length} rounds won`}
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

  const target = game.targetId
    ? round.places.find((p) => p.id === game.targetId) ?? null
    : null
  const canPeek = game.phase === 'hiding' && shellStatus === 'playing' && !showHowto && !finished && lives > 0
  const showHint = game.revealedIds.length >= HIDDEN_HUNT_HINT_AFTER_WRONGS && game.phase !== 'found'
  const hintSide = showHint ? hiddenHuntHintSide(round) : null

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * HIDDEN_HUNT_MAX_PER_ROUND} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, HIDDEN_HUNT_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
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
          Tap a hiding place to peek behind it — find the one hiding the right answer!
        </p>
      </div>

      {/* Park clearing: six hiding places, each hiding an answer. */}
      <div
        role="application"
        aria-label={`Hidden Hunt round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${lives} lives left. Tap a hiding place to peek behind it, or press 1 to 6. Find the place hiding the right answer — a wrong peek costs a life but the round goes on, so keep hunting.`}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '100 / 62',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
          background: 'linear-gradient(to bottom, #bae6fd 0%, #bbf7d0 45%, #86efac 100%)',
        }}
      >
        {/* Decorative park — decoration only, never content. */}
        <span aria-hidden="true" style={{ position: 'absolute', left: '6%', top: '6%', fontSize: '1.4rem' }}>☀️</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '72%', top: '4%', fontSize: '1.1rem' }}>☁️</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '44%', top: '8%', fontSize: '1rem' }}>🦋</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '4%', top: '88%', fontSize: '1rem' }}>🌼</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '92%', top: '88%', fontSize: '1rem' }}>🌷</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '48%', top: '90%', fontSize: '1rem' }}>🌱</span>

        {round.places.map((p: HiddenHuntPlace, i: number) => {
          const isTarget = target?.id === p.id
          const isFound = game.phase === 'found' && isTarget
          const isPeeking = game.phase === 'peeking' && isTarget
          const isRevealedWrong = game.revealedIds.includes(p.id)
          return (
            <motion.button
              key={p.id}
              type="button"
              onClick={() => peekBehind(p.id)}
              disabled={!canPeek || isRevealedWrong}
              aria-label={isRevealedWrong
                ? `${p.name} — already peeked, it was hiding ${p.answer}, not the right one.`
                : isFound
                  ? `${p.name} — found! It was hiding ${p.answer}, the right answer!`
                  : `${p.name}. Tap to peek behind ${p.name}, or press ${i + 1}.`}
              animate={
                isPeeking
                  ? { x: [0, -6, 6, -4, 4, 0], y: [0, -10, 0] }
                  : isFound
                    ? { scale: [1, 1.12, 1], y: [0, -8, 0] }
                    : { y: [0, -4, 0] }
              }
              transition={
                isPeeking
                  ? { duration: 0.45 }
                  : isFound
                    ? { duration: 0.6 }
                    : { duration: 1.8 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }
              }
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                marginLeft: '-46px',
                marginTop: '-46px',
                width: '92px',
                height: '92px',
                borderRadius: '50%',
                border: `4px solid ${isFound ? '#16a34a' : isRevealedWrong ? '#9ca3af' : p.color}`,
                background: isRevealedWrong ? '#e5e7eb' : '#fff',
                cursor: canPeek && !isRevealedWrong ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.1rem',
                boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                opacity: isRevealedWrong ? 0.7 : 1,
                padding: 0,
              }}
            >
              <span style={{ fontSize: isRevealedWrong ? '1.4rem' : '2rem', lineHeight: 1 }} aria-hidden="true">
                {isFound ? '✨' : isPeeking ? '🔍' : p.emoji}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.7rem', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                {p.name}
              </span>
              {(isFound || isRevealedWrong) && (
                <span
                  style={{
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', lineHeight: 1,
                    background: isFound ? '#16a34a' : '#9ca3af', color: '#fff',
                    borderRadius: '999px', padding: '0.2rem 0.6rem',
                  }}
                >
                  {p.answer}
                </span>
              )}
            </motion.button>
          )
        })}
      </div>
      {hintSide && (
        <p role="status" style={{ textAlign: 'center', color: '#92400e', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 'var(--radius)', padding: '0.5rem 0.75rem', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: 0 }}>
          💡 Hint: look on the {hintSide} side of the clearing!
        </p>
      )}
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Tap a hiding place (or press 1 to 6) to peek — find the right one for +{HIDDEN_HUNT_POINTS_PER_FIND} points! A wrong peek costs a life, but you keep hunting!
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
            {feedback.type === 'correct' ? '⭐ ' : '🔍 '}{feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function HiddenHuntActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Hidden Hunt" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <HiddenHuntGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
