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
  CREATURE_CATCH_LIVES,
  CREATURE_CATCH_MAX_ROUNDS,
  CREATURE_CATCH_POINTS_PER_CATCH,
  CREATURE_CATCH_MAX_PER_ROUND,
  CREATURE_CATCH_ROSTER,
  CREATURE_CATCH_COLLECTION_SIZE,
  newCreatureCatchGame,
  throwAt,
  resolveThrow,
  addToCollection,
  buildCreatureCatchRound,
  type CreatureCatchState,
  type CreatureCatchRound,
  type CreatureCatchSpot,
} from '@/lib/creature-catch'

/**
 * Creature Catch — EduPlay's own Pokémon-STYLE creature
 * collector (type 59).
 *
 * Pokémon-STYLE mechanic only: wild creatures each hold an
 * answer, and the kid throws a catch ball at the creature
 * holding the right one. No Pokémon name, no Pokémon
 * creature, no Poké Ball, no Nintendo art: every creature is
 * an ORIGINAL creature invented here (Bubblip, Flammit,
 * Leaflet, Sparkpup, Snowpuff, Rocklet, Breezy, Glimmer,
 * Sunnip, Lunip, Nimbelle, Foxtail — own names, own emoji
 * faces, own colours), and the ball is a plain catch ball
 * drawn here (violet top, cream bottom, gold band — not a
 * red-and-white Poké Ball). Sounds are the shared interactive
 * Web Audio system (synthesized, no assets) for correct /
 * wrong / win / lose, plus a small whoosh, catch chime, and
 * break-free pop of our own below. Sound is ON by default
 * for this game; the in-player toggle mutes it in one tap.
 * Background music is the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct creature's answer. Each round's meadow
 * holds 3 wild creatures: the round's own answer on one,
 * wrong answers borrowed from the game's other items on the
 * other two. No new save path was needed: the save route
 * already stores prompt/answer for every type, and the
 * adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per CORRECT creature caught. One throw
 *   per round, 10 rounds — score out of 10 x rounds.
 * - Tap (or click) a creature to throw the ball at it — or
 *   press 1, 2, or 3 for the first, second, or third creature.
 *   The ball flies to the creature you tapped (it homes in, so
 *   the skill is picking the right creature and the throw is
 *   the fun); the creatures bob and wander while you aim, but
 *   a tap always resolves on the creature tapped.
 * - Throw at the RIGHT creature and it is caught: it hops into
 *   the ball with a sparkle, +10 points, the round is won, and
 *   the creature joins your collection — 12 original creatures
 *   to find, kept on this device so they are still there next
 *   time you play. A creature already in the collection is not
 *   added twice.
 * - Throw at a WRONG creature and it BREAKS FREE: the ball
 *   bounces off, the creature shakes itself loose and hops
 *   away, no points — and the round ends at once and costs
 *   1 life. There is only one ball per round, so a break-free
 *   is the round lost, not a retry.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Creature Catch Complete!"). onComplete fires exactly
 *   once with the real score plus rounds won / total rounds
 *   and lives left.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - Pause via the shared PlayShell blocks new throws and holds a
 *   ball already in flight until play resumes (the shell overlay
 *   covers the scene, and the throw handlers all require status
 *   'playing'). Reading How to Play mid-game also blocks throws.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the breaking free, the collection, the streak, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least two different answers to borrow as
 *   wrong creatures plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its wild creatures, thrown ball,
 *   and breaking free) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface CreatureCatchGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Our own throw whoosh + catch chime + break-free pop:
 *  synthesized Web Audio, no recording, no asset. */
let catchCtx: AudioContext | null = null
function catchAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!catchCtx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      catchCtx = new AC()
    }
    if (catchCtx.state === 'suspended') void catchCtx.resume()
    return catchCtx
  } catch {
    return null
  }
}
function playTone(soundOn: boolean, notes: { freq: number; at: number; dur: number; type: OscillatorType; vol: number }[]) {
  if (!soundOn) return
  const ctx = catchAudioCtx()
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
    /* sound is best-effort — a throw still counts without it */
  }
}
/** A quick whoosh as the ball leaves the trainer's hand. */
function playWhoosh(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 900, at: 0, dur: 0.22, type: 'sine', vol: 0.12 },
    { freq: 500, at: 0.08, dur: 0.2, type: 'sine', vol: 0.1 },
  ])
}
/** Two rising notes when a creature is caught. */
function playCatchChime(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 660, at: 0, dur: 0.18, type: 'sine', vol: 0.18 },
    { freq: 990, at: 0.12, dur: 0.3, type: 'sine', vol: 0.18 },
  ])
}
/** A falling pop when a creature breaks free. */
function playBreakFree(soundOn: boolean) {
  playTone(soundOn, [
    { freq: 420, at: 0, dur: 0.16, type: 'triangle', vol: 0.18 },
    { freq: 180, at: 0.1, dur: 0.25, type: 'triangle', vol: 0.16 },
  ])
}

/** The plain catch ball, drawn here: violet top, cream bottom,
 *  gold band, round button — not a red-and-white Poké Ball. */
function CatchBall({ size = 34 }: { size?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(to bottom, #7c3aed 0 48%, #fbbf24 48% 54%, #fef3c7 54% 100%)',
        border: '3px solid #4c1d95',
        position: 'relative',
        boxSizing: 'border-box',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute', left: '50%', top: '50%', width: size * 0.32, height: size * 0.32,
          marginLeft: -size * 0.16, marginTop: -size * 0.16, borderRadius: '50%',
          background: '#fff', border: '2px solid #4c1d95', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

/** Where the kid's collection lives on this device, so the
 *  creatures a kid catches are still there next time. */
const COLLECTION_KEY = 'eduplay-creature-catch-collection'
function loadCollection(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(COLLECTION_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    return []
  }
}
function saveCollection(collection: string[]) {
  try {
    window.localStorage.setItem(COLLECTION_KEY, JSON.stringify(collection))
  } catch {
    /* the collection is best-effort — a catch still counts */
  }
}

function CreatureCatchGame({ items, locale, onComplete, onProgress }: CreatureCatchGameProps) {
  const [rounds, setRounds] = useState<CreatureCatchRound[]>([])
  const [game, setGame] = useState<CreatureCatchState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(CREATURE_CATCH_LIVES)
  const [score, setScore] = useState(0)
  const [roundsWon, setRoundsWon] = useState(0)
  const [creaturesCaught, setCreaturesCaught] = useState(0)
  const [streak, setStreak] = useState(0)
  const [collection, setCollection] = useState<string[]>(() => loadCollection())
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
    const shuffled = shuffleArray(usable).slice(0, CREATURE_CATCH_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: CreatureCatchRound[] = []
    for (const item of shuffled) {
      const round = buildCreatureCatchRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newCreatureCatchGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(CREATURE_CATCH_LIVES)
    setScore(0)
    setRoundsWon(0)
    setCreaturesCaught(0)
    setStreak(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(CREATURE_CATCH_LIVES)
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

  // Finish sound once: win on Creature Catch Complete, lose on game over.
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
    const fresh = newCreatureCatchGame(round)
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
    setTimeout(() => advanceFrom(from), 1600)
  }, [advanceFrom])

  /** Settle a thrown ball once it reaches the creature. */
  const resolveFlight = useCallback(() => {
    // A paused game holds the ball in flight until play resumes.
    if (shellStatusRef.current !== 'playing' || showHowto) {
      setTimeout(resolveFlight, 200)
      return
    }
    const g = gameRef.current
    if (!g || g.phase !== 'flying') return
    const next = resolveThrow(g)
    gameRef.current = next
    setGame(next)
    const event = next.lastEvent
    if (!event) return
    if (event.kind === 'caught') {
      playCatchChime(readInteractiveSoundOn())
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCreaturesCaught((c) => c + 1)
      setRoundsWon((r) => r + 1)
      roundsWonRef.current = roundsWonRef.current + 1
      setStreak((s) => s + 1)
      streakRef.current = streakRef.current + 1
      setCollection((prev) => {
        const nextCollection = addToCollection(prev, event.creatureId)
        if (nextCollection !== prev) saveCollection(nextCollection)
        return nextCollection
      })
      advancingRef.current = true
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `Caught ${event.name}! It was holding ${event.answer}! +${SCORE_PER_CORRECT} points — ${event.name} joined your collection!`,
      })
      setTimeout(() => advanceFrom(from), 1600)
      return
    }
    if (event.kind === 'broke-free') {
      playBreakFree(readInteractiveSoundOn())
      loseRound(`${event.name} broke free! It was holding ${event.answer} — the wrong one — and it hopped away!`)
    }
  }, [advanceFrom, loseRound, showHowto])

  /** Throw the ball at one creature. */
  const throwBallAt = useCallback((creatureId: string) => {
    if (shellStatusRef.current !== 'playing' || showHowto || finished) return
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g) return
    const next = throwAt(g, creatureId)
    if (next === g) return
    playWhoosh(readInteractiveSoundOn())
    gameRef.current = next
    setGame(next)
    // The ball takes half a second to reach the creature.
    setTimeout(resolveFlight, 500)
  }, [showHowto, finished, resolveFlight])

  // Keyboard: 1, 2, or 3 throws at the first, second, or third creature.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      const idx = ['1', '2', '3'].indexOf(e.key)
      if (idx < 0) return
      const creature = gameRef.current?.round.creatures[idx]
      if (!creature) return
      e.preventDefault()
      throwBallAt(creature.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shellStatus, showHowto, finished, throwBallAt])

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
      const fresh = newCreatureCatchGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(CREATURE_CATCH_LIVES)
    setScore(0)
    setRoundsWon(0)
    setCreaturesCaught(0)
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
        This game has no wild creatures yet — it needs questions with at least two other different answers to catch.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🐾</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Creature Catch</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Throw a catch ball at the creature holding the right answer — and grow your collection!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> three wild creatures wait in the meadow, and each one holds an answer. Read the question at the top — for example, &ldquo;2+6 = ?&rdquo; — and throw your catch ball at the creature holding 8. Tap (or click) the creature, or press 1, 2, or 3. The creatures bob and wander while you aim, but the ball always flies to the creature you tapped. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> catching the creature with the right answer earns {CREATURE_CATCH_POINTS_PER_CATCH} points — one catch per round, so {CREATURE_CATCH_MAX_PER_ROUND} points a round at most and the game is scored out of {rounds.length * CREATURE_CATCH_MAX_PER_ROUND} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}).</p>
          <p><strong>Objective:</strong> catch the right creature in every round — and find all {CREATURE_CATCH_COLLECTION_SIZE} creatures for your collection! Every creature you catch joins your collection and stays there on this device, so come back and play again to find the ones you are still missing.</p>
          <p><strong>Controls:</strong> tap (or click) a creature to throw the ball at it, or press 1, 2, or 3 for the first, second, or third creature. You get one throw per round — choose carefully!</p>
          <p><strong>Lives:</strong> you start with {CREATURE_CATCH_LIVES} lives. A creature that breaks free costs 1 life and ends the round.</p>
          <p><strong>Breaking free:</strong> throw at a creature with the wrong answer and it breaks free — the ball bounces off, the creature shakes itself loose and hops away, and you get no points. There is only one ball per round, so a break-free is the round lost, not a retry.</p>
          <p><strong>Rounds:</strong> one meadow per question, in shuffled order. A fresh set of wild creatures waits in every round, and the right answer sits on a different creature each time.</p>
          <p><strong>How you win and finish:</strong> catch the right creature in every round with at least one life left and you win. Reach 0 lives and the game ends — your score and your collection still count. The end screen shows your score, how many creatures you caught, and how many lives are left.</p>
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
          {won ? 'Creature Catch Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * CREATURE_CATCH_MAX_PER_ROUND} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {creaturesCaught} of {rounds.length} creatures caught
          {` · ${roundsWon} of ${rounds.length} rounds won`}
          {` · ${lives} ${lives === 1 ? 'life' : 'lives'} left`}
          {` · Collection ${collection.length} of ${CREATURE_CATCH_COLLECTION_SIZE}`}
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
    ? round.creatures.find((c) => c.id === game.targetId) ?? null
    : null
  const canThrow = game.phase === 'aim' && shellStatus === 'playing' && !showHowto && !finished

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * CREATURE_CATCH_MAX_PER_ROUND} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, CREATURE_CATCH_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
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
          Tap a creature to throw your catch ball at it — catch the one holding the right answer!
        </p>
      </div>

      {/* Meadow: three wild creatures, each holding an answer. */}
      <div
        role="application"
        aria-label={`Creature Catch round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${lives} lives left. Tap a creature to throw the catch ball at it, or press 1, 2, or 3. Catch the creature holding the right answer — a wrong creature breaks free and costs a life.`}
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
        {/* Decorative meadow flowers — decoration only, never content. */}
        <span aria-hidden="true" style={{ position: 'absolute', left: '6%', top: '78%', fontSize: '1.2rem' }}>🌼</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '88%', top: '72%', fontSize: '1.2rem' }}>🌷</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '42%', top: '84%', fontSize: '1rem' }}>🌼</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '68%', top: '8%', fontSize: '1rem' }}>☁️</span>
        <span aria-hidden="true" style={{ position: 'absolute', left: '12%', top: '10%', fontSize: '1rem' }}>☀️</span>

        {round.creatures.map((c: CreatureCatchSpot, i: number) => {
          const isTarget = target?.id === c.id
          const isCaught = game.phase === 'caught' && isTarget
          const isBrokeFree = game.phase === 'broke-free' && isTarget
          return (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => throwBallAt(c.id)}
              disabled={!canThrow}
              aria-label={`${c.name}, holding ${c.answer}. Tap to throw the catch ball at ${c.name}.`}
              animate={
                isBrokeFree
                  ? { x: [0, -8, 8, -6, 6, 0], y: [0, -6, 0] }
                  : isCaught
                    ? { scale: [1, 1.15, 0.55], y: [0, -10, 0] }
                    : { y: [0, -8, 0] }
              }
              transition={
                isBrokeFree
                  ? { duration: 0.6 }
                  : isCaught
                    ? { duration: 0.7 }
                    : { duration: 1.6 + i * 0.35, repeat: Infinity, ease: 'easeInOut' }
              }
              style={{
                position: 'absolute',
                left: `${c.x}%`,
                top: `${c.y}%`,
                marginLeft: '-52px',
                marginTop: '-52px',
                width: '104px',
                height: '104px',
                borderRadius: '50%',
                border: `4px solid ${isBrokeFree ? '#9ca3af' : c.color}`,
                background: isBrokeFree ? '#e5e7eb' : '#fff',
                cursor: canThrow ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.1rem',
                boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
                opacity: isBrokeFree ? 0.75 : 1,
                padding: 0,
              }}
            >
              <span style={{ fontSize: '2rem', lineHeight: 1 }} aria-hidden="true">
                {isCaught ? '✨' : isBrokeFree ? '💨' : c.emoji}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--color-text-primary)', lineHeight: 1 }}>
                {c.name}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1,
                  background: isBrokeFree ? '#9ca3af' : c.color, color: '#fff',
                  borderRadius: '999px', padding: '0.2rem 0.6rem',
                }}
              >
                {c.answer}
              </span>
            </motion.button>
          )
        })}

        {/* The flying catch ball: from the trainer to the tapped creature. */}
        {game.phase === 'flying' && target && (
          <motion.div
            aria-hidden="true"
            initial={{ left: '50%', top: '88%' }}
            animate={{ left: `${target.x}%`, top: `${target.y}%` }}
            transition={{ duration: 0.45, ease: 'easeIn' }}
            style={{ position: 'absolute', marginLeft: '-17px', marginTop: '-17px', zIndex: 2 }}
          >
            <CatchBall size={34} />
          </motion.div>
        )}
        {/* A caught creature sits inside its ball, sparkling. */}
        {game.phase === 'caught' && target && (
          <motion.div
            aria-hidden="true"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              position: 'absolute', left: `${target.x}%`, top: `${target.y}%`,
              marginLeft: '-24px', marginTop: '-24px', zIndex: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CatchBall size={48} />
            <span style={{ position: 'absolute', fontSize: '1.1rem' }}>✨</span>
          </motion.div>
        )}

        {/* The trainer, ball in hand, at the bottom of the meadow. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: '50%', top: '88%',
            marginLeft: '-30px', marginTop: '-30px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem',
          }}
        >
          <span style={{ fontSize: '1.9rem', lineHeight: 1 }}>🧒</span>
          {game.phase === 'aim' && <CatchBall size={26} />}
        </div>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Tap a creature (or press 1, 2, or 3) to throw — one throw per round! Catch the right one for +{CREATURE_CATCH_POINTS_PER_CATCH} points and your collection; a wrong one breaks free and costs a life!
      </p>

      {/* My Collection: all 12 original creatures — caught ones in
          colour, ones still to find as grey silhouettes. */}
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '0.75rem 1rem', marginTop: '0.75rem',
        color: 'var(--color-text-primary)',
      }}>
        <p style={{ margin: '0 0 0.5rem', fontFamily: 'var(--font-display)', fontSize: '0.95rem', textAlign: 'center' }}>
          🐾 My Collection — {collection.length} of {CREATURE_CATCH_COLLECTION_SIZE} found
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
          {CREATURE_CATCH_ROSTER.map((creature) => {
            const found = collection.includes(creature.id)
            return (
              <span
                key={creature.id}
                title={found ? creature.name : 'Not found yet — keep playing!'}
                style={{
                  width: '44px', height: '52px', borderRadius: 'var(--radius)',
                  border: `2px solid ${found ? creature.color : 'var(--color-border)'}`,
                  background: found ? '#fff' : 'var(--color-border)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  opacity: found ? 1 : 0.55,
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1 }} aria-hidden="true">
                  {found ? creature.emoji : '?'}
                </span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.1, textAlign: 'center' }}>
                  {found ? creature.name : '???'}
                </span>
              </span>
            )
          })}
        </div>
      </div>

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

export default function CreatureCatchActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Creature Catch" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <CreatureCatchGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
