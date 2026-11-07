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
  LADDER_CLIMB_LIVES,
  LADDER_CLIMB_MAX_ROUNDS,
  LADDER_CLIMB_POINTS_PER_LADDER,
  LADDER_CLIMB_FIELD_WIDTH,
  LADDER_CLIMB_FIELD_HEIGHT,
  LADDER_CLIMB_PLATFORM_Y,
  LADDER_CLIMB_BARREL_RADIUS,
  newLadderClimbGame,
  jumpKid,
  stepLadderClimb,
  buildLadderClimbRound,
  type LadderClimbState,
  type LadderClimbRound,
} from '@/lib/ladder-climb'

/**
 * Ladder Climb — EduPlay's own Donkey Kong-STYLE climber
 * (type 54).
 *
 * Donkey Kong-STYLE mechanic only: the kid climbs ladders
 * between platforms to the top while barrels roll down. No
 * Donkey Kong name, no ape or barrel-throwing character, no
 * Nintendo art: the climber is a plain figure, the barrels
 * plain brown circles, the ladders plain rails and rungs —
 * all drawn here, nothing copied. Sounds are the shared
 * interactive Web Audio system (synthesized, no assets).
 * Sound is ON by default for this game; the in-player toggle
 * mutes it in one tap. Background music is the shared
 * PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct ladder. Each round's tower is 3
 * ladders: the round's own answer at the top of one, wrong
 * answers borrowed from the game's other items at the tops
 * of the rest. No new save path was needed: the save route
 * already stores prompt/answer for every type, and the
 * adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per CORRECT ladder climbed (one correct
 *   ladder per round, one round per question, up to 10 rounds,
 *   shuffled once per item content). Score out of 10 x rounds.
 * - Climbing the CORRECT ladder to the top earns 10 points
 *   and wins the round. Climbing a WRONG ladder to the top
 *   earns no points and costs no life — the kid climbs back
 *   down and tries another ladder. A wrong ladder is marked
 *   tried, so climbing it again says nothing new.
 * - Hit by a barrel costs 1 life and ends the round at once.
 *   Barrels roll along the platforms and drop down a level
 *   at each edge. Jumping over a barrel dodges it — a barrel
 *   can only hit a kid on the ground or on a ladder, never
 *   one in the air. A climbing kid times the climb between
 *   barrels.
 * - Tap a ladder and the kid walks to it and climbs it on
 *   his own; or walk with the arrow keys, climb with up/down,
 *   and jump with Space.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Ladder Climb Complete!"). onComplete fires exactly
 *   once with the real score plus correct/total counts and lives
 *   left.
 * - Pause via the shared PlayShell freezes the kid, the barrels,
 *   and the controls (the shell overlay covers the field, and the
 *   game loop + control handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the wrong ladders, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, so any question list where
 *   every item has at least two different answers to borrow as
 *   wrong ladders plays. A question with fewer keeps the plain
 *   message — see convert.ts.
 *   Print: NOT printable (needs its platforms, ladders, rolling
 *   barrels, and climbing) — see print-worksheet.ts. Sitemap type
 *   list stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface LadderClimbGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** A steady colour per answer, so the same answer always looks the same. */
function plaqueColour(answer: string): string {
  const palette = ['#f59e0b', '#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#facc15', '#60a5fa']
  const code = answer.charCodeAt(0) || 0
  return palette[code % palette.length]!
}

/** Field units -> percent of the scene box (the scene is 100 x 60). */
const px = (v: number) => `${v}%`
const py = (v: number) => `${(v / LADDER_CLIMB_FIELD_HEIGHT) * 100}%`

function LadderClimbGame({ items, locale, onComplete, onProgress }: LadderClimbGameProps) {
  const [rounds, setRounds] = useState<LadderClimbRound[]>([])
  const [game, setGame] = useState<LadderClimbState | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(LADDER_CLIMB_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  const sceneRef = useRef<HTMLDivElement | null>(null)
  // Held keys: walking and climbing are held down, jumping is a tap.
  const heldKeysRef = useRef<Set<string>>(new Set())
  // Ladder the kid walks to and climbs on his own after a tap.
  const autoTargetRef = useRef<number | null>(null)

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
    const shuffled = shuffleArray(usable).slice(0, LADDER_CLIMB_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: LadderClimbRound[] = []
    for (const item of shuffled) {
      const round = buildLadderClimbRound(item.prompt, item.answer, allAnswers, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setGame(built[0] ? newLadderClimbGame(built[0]) : null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(LADDER_CLIMB_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    autoTargetRef.current = null
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(LADDER_CLIMB_LIVES)
  const correctRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { correctRef.current = correctCount })
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

  // Finish sound once: win on Ladder Climb Complete, lose on game over.
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
    const fresh = newLadderClimbGame(round)
    gameRef.current = fresh
    setGame(fresh)
    autoTargetRef.current = null
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
    advancingRef.current = true
    const from = currentRef.current
    setFeedback({
      type: 'wrong',
      msg: livesRef.current <= 0 ? `${msg} — and you are out of lives.` : msg,
    })
    setTimeout(() => advanceFrom(from), 1400)
  }, [advanceFrom])

  /** Resolve a physics event from the step. */
  const resolveEvent = useCallback((next: LadderClimbState) => {
    const event = next.lastEvent
    if (!event) return
    // Any event stops the kid's auto-walk — the player takes over.
    autoTargetRef.current = null
    if (event.kind === 'reached-correct') {
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      if (next.status === 'won') {
        advancingRef.current = true
        const from = currentRef.current
        setFeedback({
          type: 'correct',
          msg: `Climbed the ${event.answer} ladder! +${SCORE_PER_CORRECT} points — round won!`,
        })
        setTimeout(() => advanceFrom(from), 1200)
      }
      return
    }
    if (event.kind === 'reached-wrong') {
      playEduSound('wrong', readInteractiveSoundOn())
      // No life lost, no advance — the kid climbs back down and
      // tries another ladder. The ladder stays marked tried.
      setFeedback({
        type: 'wrong',
        msg: `That ladder led to ${event.answer} — the wrong one! Climb back down and try another ladder.`,
      })
      return
    }
    if (event.kind === 'barrel-hit') {
      loseRound('A barrel hit you!')
      return
    }
  }, [advanceFrom, loseRound])

  /** One physics tick: the kid walks and climbs, the barrels roll. */
  const doTick = useCallback(() => {
    if (advancingRef.current) return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    const held = heldKeysRef.current
    let move: -1 | 0 | 1 = held.has('arrowleft') ? -1 : held.has('arrowright') ? 1 : 0
    let climb: -1 | 0 | 1 = held.has('arrowup') ? -1 : held.has('arrowdown') ? 1 : 0
    // Auto-walk: after a tap, the kid walks to the tapped ladder
    // and climbs it on his own.
    const target = autoTargetRef.current
    if (target !== null) {
      const ladder = g.round.ladders[target]
      if (ladder) {
        if (g.kid.climbing !== null) {
          move = 0
          climb = -1
        } else {
          const dx = ladder.x - g.kid.x
          if (Math.abs(dx) <= 1.5) {
            move = 0
            climb = -1
          } else {
            move = dx > 0 ? 1 : -1
            climb = 0
          }
        }
      } else {
        autoTargetRef.current = null
      }
    }
    const next = stepLadderClimb(g, 0.03, { move, climb })
    gameRef.current = next
    setGame(next)
    if (next.lastEvent) resolveEvent(next)
  }, [resolveEvent])

  // Game loop: the kid and the barrels move while the shell is
  // playing, How-to-Play is closed, and the game is not finished
  // — pause and How-to-Play both freeze them.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    if (!game || game.status !== 'playing') return
    const id = setInterval(() => { doTick() }, 30)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current, game?.status, doTick])

  /** Jump to hop over a rolling barrel. */
  const doJump = useCallback(() => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    setFeedback(null)
    playEduSound('click', readInteractiveSoundOn())
    const next = jumpKid(g)
    gameRef.current = next
    setGame(next)
  }, [finished, shellStatus, showHowto])

  const doJumpRef = useRef(doJump)
  useEffect(() => { doJumpRef.current = doJump }, [doJump])

  /** Tap a ladder: walk to it and climb it. A manual key press
   *  takes over again. */
  const tapLadder = useCallback((clientX: number, clientY: number) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const el = sceneRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const x = ((clientX - rect.left) / rect.width) * LADDER_CLIMB_FIELD_WIDTH
    const g = gameRef.current
    if (!g || g.status !== 'playing') return
    let best = -1
    let bestDist = 9
    g.round.ladders.forEach((ladder, i) => {
      const d = Math.abs(ladder.x - x)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    if (best >= 0) {
      setFeedback(null)
      playEduSound('click', readInteractiveSoundOn())
      autoTargetRef.current = best
    }
  }, [finished, shellStatus, showHowto])

  const tapLadderRef = useRef(tapLadder)
  useEffect(() => { tapLadderRef.current = tapLadder }, [tapLadder])

  /** Hold a walk or climb key from an on-screen button. */
  const holdKey = useCallback((key: string, on: boolean) => {
    if (on) {
      autoTargetRef.current = null
      heldKeysRef.current.add(key)
    } else heldKeysRef.current.delete(key)
  }, [])

  // Keyboard: left/right walk (held), up/down climb (held), Space jumps.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      if (key === 'arrowleft' || key === 'arrowright' || key === 'arrowup' || key === 'arrowdown') {
        e.preventDefault()
        autoTargetRef.current = null
        heldKeysRef.current.add(key)
      } else if (key === ' ') {
        e.preventDefault()
        if (!e.repeat) doJumpRef.current()
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      heldKeysRef.current.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      heldKeysRef.current.clear()
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
      const fresh = newLadderClimbGame(first)
      gameRef.current = fresh
      setGame(fresh)
    }
    setLives(LADDER_CLIMB_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    completedRef.current = false
    advancingRef.current = false
    autoTargetRef.current = null
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no tower yet — it needs questions with at least two other different answers to climb to.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🪜</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Ladder Climb</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Climb the ladders to the top — and dodge the rolling barrels!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> three ladders stand in a tower of platforms, and every ladder has an answer at its top. Read the question at the top — for example, &ldquo;2+6 = ?&rdquo; — then climb the ladder that leads to the right answer, 8. Barrels roll along the platforms and drop down a level at each edge, so time your climb between them. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> climbing the ladder with the right answer earns {LADDER_CLIMB_POINTS_PER_LADDER} points. Each round has one right-answer ladder, so the game is scored out of {rounds.length * LADDER_CLIMB_POINTS_PER_LADDER} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}).</p>
          <p><strong>Objective:</strong> climb the correct ladder in every round without running out of lives.</p>
          <p><strong>Controls:</strong> hold the left/right arrow keys to walk, hold the up/down arrow keys to climb a ladder up or down, and press Space to jump over a barrel. Or use the on-screen buttons: ◀ ▶ to walk, ▲ ▼ to climb, JUMP to hop. Easiest of all: tap a ladder and the kid walks to it and climbs it on his own.</p>
          <p><strong>Lives:</strong> you start with {LADDER_CLIMB_LIVES} lives. A barrel that hits you costs 1 life and ends the round at once — jump over the barrels, and time your climb between them. A barrel can hit you on a ladder too, so never climb straight into one.</p>
          <p><strong>Wrong ladders:</strong> a wrong ladder costs no life — but it earns no points either! Climb back down and try another ladder. A ladder you already tried is marked with a ✗, so you never climb the same wrong one twice.</p>
          <p><strong>Rounds:</strong> one round per question, in shuffled order. A fresh set of barrels rolls in every round.</p>
          <p><strong>How you win and finish:</strong> climb the right ladder in every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many right ladders you climbed, and how many lives are left.</p>
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
          {won ? 'Ladder Climb Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} right ladders climbed
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

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, LADDER_CLIMB_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
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
          Climb the ladder to the right answer — wrong ladders mean climbing back down, and a barrel costs a life!
        </p>
      </div>

      {/* Tower: platforms, ladders with answer plaques, barrels, the kid. */}
      <div
        ref={sceneRef}
        role="application"
        aria-label={`Ladder Climb round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. ${lives} lives left. Hold the left or right arrow key to walk, up or down to climb a ladder, Space to jump — or tap a ladder to climb it.`}
        onPointerDown={(e) => tapLadderRef.current(e.clientX, e.clientY)}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '100 / 60',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
          touchAction: 'none',
          background: 'linear-gradient(to bottom, #7dd3fc 0%, #bae6fd 45%, #fde68a 100%)',
        }}
      >
        {/* Platforms */}
        {LADDER_CLIMB_PLATFORM_Y.map((y) => (
          <div
            key={`platform-${y}`}
            aria-hidden="true"
            style={{
              position: 'absolute', left: 0, right: 0, top: py(y),
              height: '8px', marginTop: '-2px',
              background: 'linear-gradient(to bottom, #b45309, #78350f)',
              borderTop: '2px solid #d97706',
            }}
          />
        ))}
        {/* Ladders: rails with rungs, ground to top. */}
        {round.ladders.map((ladder) => (
          <div
            key={ladder.id}
            aria-hidden="true"
            style={{
              position: 'absolute', left: px(ladder.x), top: py(LADDER_CLIMB_PLATFORM_Y[4]!),
              width: '22px', marginLeft: '-11px',
              height: `${((LADDER_CLIMB_PLATFORM_Y[0]! - LADDER_CLIMB_PLATFORM_Y[4]!) / LADDER_CLIMB_FIELD_HEIGHT) * 100}%`,
              borderLeft: '3px solid #92400e',
              borderRight: '3px solid #92400e',
              background: 'repeating-linear-gradient(to bottom, transparent 0 7px, #d97706 7px 10px)',
              boxSizing: 'border-box',
            }}
          />
        ))}
        {/* Answer plaques at the top of each ladder. */}
        {round.ladders.map((ladder) => (
          <div
            key={`plaque-${ladder.id}`}
            aria-label={`Ladder with ${ladder.answer}${ladder.tried ? ' — already tried, wrong' : ''}`}
            style={{
              position: 'absolute', left: px(ladder.x), top: py(LADDER_CLIMB_PLATFORM_Y[4]!),
              transform: 'translate(-50%, -115%)',
              minWidth: '44px', padding: '0.2rem 0.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: ladder.tried ? '#9ca3af' : plaqueColour(ladder.answer),
              borderRadius: 'var(--radius)', border: '2px solid rgba(255,255,255,0.7)',
              color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.95rem', textAlign: 'center', boxSizing: 'border-box',
              opacity: ladder.tried ? 0.75 : 1,
            }}
          >
            {ladder.tried ? `✗ ${ladder.answer}` : ladder.answer}
          </div>
        ))}
        {/* Barrels */}
        {game.barrels.map((b) => (
          <div
            key={b.id}
            aria-hidden="true"
            style={{
              position: 'absolute', left: px(b.x), top: py(LADDER_CLIMB_PLATFORM_Y[b.level]!),
              width: '20px', height: '20px', marginLeft: '-10px', marginTop: '-10px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #d97706, #78350f 70%)',
              border: '2px solid #451a03', boxSizing: 'border-box',
            }}
          />
        ))}
        {/* Kid: a plain climbing figure. */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: px(game.kid.x), top: py(game.kid.y),
            width: '28px', height: '28px', marginLeft: '-14px', marginTop: '-24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', lineHeight: 1,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
          }}
        >
          🧗
        </div>
      </div>

      {/* Walk / climb / jump controls */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onPointerDown={() => holdKey('arrowleft', true)}
          onPointerUp={() => holdKey('arrowleft', false)}
          onPointerLeave={() => holdKey('arrowleft', false)}
          aria-label="Hold to walk left"
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          ◀
        </button>
        <button
          onPointerDown={() => holdKey('arrowup', true)}
          onPointerUp={() => holdKey('arrowup', false)}
          onPointerLeave={() => holdKey('arrowup', false)}
          aria-label="Hold to climb up"
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          ▲
        </button>
        <button
          onPointerDown={() => holdKey('arrowdown', true)}
          onPointerUp={() => holdKey('arrowdown', false)}
          onPointerLeave={() => holdKey('arrowdown', false)}
          aria-label="Hold to climb down"
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          ▼
        </button>
        <button
          onPointerDown={() => holdKey('arrowright', true)}
          onPointerUp={() => holdKey('arrowright', false)}
          onPointerLeave={() => holdKey('arrowright', false)}
          aria-label="Hold to walk right"
          style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
            background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          ▶
        </button>
        <button
          onClick={() => doJump()}
          disabled={game.status !== 'playing' || game.kid.airborne || game.kid.climbing !== null}
          aria-label="Jump over a barrel"
          style={{
            padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: game.status === 'playing' && !game.kid.airborne && game.kid.climbing === null ? 'var(--color-primary)' : 'var(--color-border)',
            color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          ⬆ JUMP
        </button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        ← → walk, ↑ ↓ climb, Space jumps — or tap a ladder to climb it. Wrong ladders cost no life, but a barrel costs one!
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

export default function LadderClimbActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Ladder Climb" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <LadderClimbGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
