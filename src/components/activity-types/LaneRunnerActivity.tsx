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
  LANE_RUNNER_LIVES,
  LANE_RUNNER_MAX_ROUNDS,
  LANE_RUNNER_TICK_MS,
  LANE_RUNNER_LANES,
  LANE_RUNNER_GATE_SPAWN_DIST,
  LANE_RUNNER_START_LANE,
  LANE_RUNNER_METRES_PER_TICK,
  switchLane,
  startJump,
  newLaneRunnerWorld,
  tickWorld,
  borrowWrongAnswers,
  buildLaneRunnerRound,
  type LaneRunnerWorld,
  type LaneRunnerRound,
  type LaneRunnerLane,
  type LaneSwitchDirection,
} from '@/lib/lane-runner'

/**
 * Lane Runner — EduPlay's own Subway Surfers-STYLE 3-lane endless
 * runner (type 49).
 *
 * Subway Surfers-STYLE mechanic only: the kid runs forward down a
 * 3-lane track, switches lanes, jumps barriers, collects coins,
 * and runs through answer gates. No Subway Surfers name, no
 * character, no SYBO art: the runner is a plain kid emoji, the
 * gates are plain boxes with a number written on them, the
 * barriers are plain construction barriers, the coins are plain
 * coin emojis — all drawn here, nothing copied.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the correct gate. Each round's gates are the round's
 * answer plus wrong answers borrowed from the game's other items.
 * No new save path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes creator
 * rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct gate (one round per question,
 *   up to 10 rounds, shuffled once per item content). Score out
 *   of 10 x rounds; coins are a collected count only, worth no
 *   points. The question is shown above the track; the correct
 *   answer IS shown — on one of the three gates.
 * - The gate row spawns 8 steps away and takes 8 ticks (~2.8s)
 *   to reach the runner. Running through the CORRECT gate: +10,
 *   round done. Running through a WRONG gate: crash, -1 life,
 *   round over with no points.
 * - Coins: a trail of 3 coins runs down the CORRECT gate's lane
 *   ahead of the gate, so following the coins leads to the right
 *   gate. A coin in the runner's lane is collected as it arrives.
 * - Barriers: one barrier per round sits 4 steps away in a random
 *   lane — it may be the correct lane, in which case the kid must
 *   jump it. A jump lasts 2 ticks: jumping while the barrier is 1
 *   or 2 steps away clears it; jumping a tick earlier does not.
 *   A barrier that reaches the runner's lane while grounded is a
 *   crash: -1 life, round over. No double jump.
 * - Switch lanes with the left/right arrow keys or A/D, jump with
 *   up/W/Space — or the on-screen buttons, or tap a lane to run
 *   in it. One press is one move; held keys do not repeat.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Lane Runner Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the world and the
 *   controls (the shell overlay covers the track, and the tick
 *   loop + control handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the coins and barriers, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, the gates are the item's
 *   own answer plus wrong answers borrowed from the other items,
 *   so any question list where every item has at least two
 *   different answers to borrow plays. A question with no other
 *   answer to borrow keeps the plain message — see convert.ts.
 *   Print: NOT printable (needs its moving track, gates, coins
 *   and barriers) — see print-worksheet.ts. Sitemap type list
 *   stays at 23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface LaneRunnerGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

function LaneRunnerGame({ items, locale, onComplete, onProgress }: LaneRunnerGameProps) {
  const [rounds, setRounds] = useState<LaneRunnerRound[]>([])
  const [world, setWorld] = useState<LaneRunnerWorld | null>(null)
  const [distance, setDistance] = useState(0)
  const [coins, setCoins] = useState(0)
  const [runNote, setRunNote] = useState<string | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(LANE_RUNNER_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)

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
    const shuffled = shuffleArray(usable).slice(0, LANE_RUNNER_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: LaneRunnerRound[] = []
    for (const item of shuffled) {
      const wrongs = borrowWrongAnswers(allAnswers, item.answer)
      const round = buildLaneRunnerRound(item.prompt, item.answer, wrongs, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setWorld(built[0] ? newLaneRunnerWorld(built[0]) : null)
    setDistance(0)
    setCoins(0)
    setRunNote(null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(LANE_RUNNER_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(LANE_RUNNER_LIVES)
  const correctRef = useRef(0)
  const coinsRef = useRef(0)
  const distanceRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { correctRef.current = correctCount })
  useEffect(() => { coinsRef.current = coins })
  useEffect(() => { distanceRef.current = distance })
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

  // Finish sound once: win on Lane Runner Complete, lose on game over.
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
  const worldRef = useRef(world)
  useEffect(() => { worldRef.current = world }, [world])
  useEffect(() => {
    const round = rounds[current]
    if (!round) return
    const fresh = newLaneRunnerWorld(round)
    worldRef.current = fresh
    setWorld(fresh)
    setRunNote(null)
  }, [current, rounds])

  /** Advance after the current round ends. Lives already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    setRunNote(null)
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

  /** Lose one life and end the round (wrong gate or barrier crash). */
  const crashRound = useCallback((msg: string) => {
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

  /** One game tick: the world runs a step closer; resolve what arrives. */
  const doTick = useCallback(() => {
    if (advancingRef.current) return
    const round = roundsRef.current[currentRef.current]
    const w = worldRef.current
    if (!round || !w) return
    const res = tickWorld(w, round.gates)
    worldRef.current = res.world
    setWorld(res.world)
    distanceRef.current = distanceRef.current + LANE_RUNNER_METRES_PER_TICK
    setDistance(distanceRef.current)
    if (res.coinsCollected > 0) {
      playEduSound('click', readInteractiveSoundOn())
      coinsRef.current = coinsRef.current + res.coinsCollected
      setCoins(coinsRef.current)
      setRunNote(`🪙 Coin! ${coinsRef.current} collected — follow the coins, they lead to the right gate!`)
    }
    if (res.barrierHit) {
      playEduSound('wrong', readInteractiveSoundOn())
      crashRound('Crash! You ran into a barrier. Jump over barriers with ⬆️ or Space!')
      return
    }
    if (res.gateResult === 'correct') {
      advancingRef.current = true
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `Right gate! +${SCORE_PER_CORRECT} points — ${round.correctAnswer} is correct!`,
      })
      setTimeout(() => advanceFrom(from), 1000)
      return
    }
    if (res.gateResult === 'wrong') {
      playEduSound('wrong', readInteractiveSoundOn())
      const hitGate = round.gates.find((g) => g.lane === w.lane)
      crashRound(
        `Wrong gate! That gate said ${hitGate?.label ?? '?'}. The answer was ${round.correctAnswer} — follow the coins next time!`,
      )
    }
  }, [advanceFrom, crashRound])

  // Game tick: the world runs towards the runner. Runs only while
  // the shell is playing, How-to-Play is closed, and the game is
  // not finished — pause and How-to-Play both freeze the run.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => { doTick() }, LANE_RUNNER_TICK_MS)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current, doTick])

  /** Switch to the lane next door. */
  const doSwitch = useCallback((dir: LaneSwitchDirection) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const w = worldRef.current
    if (!w) return
    const next = switchLane(w.lane, dir)
    if (next === w.lane) return
    playEduSound('click', readInteractiveSoundOn())
    const updated = { ...w, lane: next }
    worldRef.current = updated
    setWorld(updated)
  }, [finished, shellStatus, showHowto])

  /** Run in a lane — tapping a lane column. */
  const doRunInLane = useCallback((lane: LaneRunnerLane) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const w = worldRef.current
    if (!w || w.lane === lane) return
    playEduSound('click', readInteractiveSoundOn())
    const updated = { ...w, lane }
    worldRef.current = updated
    setWorld(updated)
  }, [finished, shellStatus, showHowto])

  /** Jump — airborne for 2 ticks, enough to clear a barrier. */
  const doJump = useCallback(() => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const w = worldRef.current
    if (!w || w.jumpTicksLeft > 0) return
    playEduSound('jump', readInteractiveSoundOn())
    const updated = startJump(w)
    worldRef.current = updated
    setWorld(updated)
  }, [finished, shellStatus, showHowto])

  const doSwitchRef = useRef(doSwitch)
  useEffect(() => { doSwitchRef.current = doSwitch }, [doSwitch])
  const doJumpRef = useRef(doJump)
  useEffect(() => { doJumpRef.current = doJump }, [doJump])

  // Keyboard controls: left/right or A/D to switch lanes, up/W/Space
  // to jump. Held keys do not repeat moves — one press is one move.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return
      const key = e.key.toLowerCase()
      if (key === 'arrowleft' || key === 'a') { e.preventDefault(); doSwitchRef.current('left') }
      else if (key === 'arrowright' || key === 'd') { e.preventDefault(); doSwitchRef.current('right') }
      else if (key === 'arrowup' || key === 'w' || key === ' ') { e.preventDefault(); doJumpRef.current() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
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
      const fresh = newLaneRunnerWorld(first)
      worldRef.current = fresh
      setWorld(fresh)
    }
    setDistance(0)
    distanceRef.current = 0
    setCoins(0)
    coinsRef.current = 0
    setRunNote(null)
    setLives(LANE_RUNNER_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    completedRef.current = false
    advancingRef.current = false
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no runs yet — it needs at least one different answer to borrow as a wrong gate in every round.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🏃</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Lane Runner</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Run down the track and race through the gate with the right answer!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> you keep running forward — the gates, coins, and barriers come to you. Each round asks one question, like &ldquo;2+6 = ?&rdquo;. Three gates race towards you, one in each lane, each with an answer on it. Run through the gate that says the right answer — 8! Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> the right gate earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}). Coins are collected along the way but earn no points — they are your clue: the coin trail runs down the right gate&apos;s lane, so follow the coins!</p>
          <p><strong>Objective:</strong> run through the right gate in every round without running out of lives.</p>
          <p><strong>Controls:</strong> left/right arrow keys or A/D to switch lanes, up arrow, W, or Space to jump — or the on-screen ◀️ ▶️ and ⬆️ JUMP buttons, or tap a lane to run in it. One press is one move.</p>
          <p><strong>Lives:</strong> you start with {LANE_RUNNER_LIVES} lives. A wrong gate or a barrier crash costs 1 life and ends the round. A jump lasts 2 ticks — jump while a barrier is 1 or 2 steps away to clear it; jumping a moment too early leaves you on the ground when it arrives. There is no double jump.</p>
          <p><strong>Coins and barriers:</strong> coins 🪙 run down the right gate&apos;s lane — collect them as they reach you. Barriers 🚧 sit in a random lane — they can even sit in the right lane, so watch ahead and jump!</p>
          <p><strong>Rounds:</strong> one round per question, in shuffled order. Each gate takes about 3 seconds to reach you — enough time to read the question and pick a lane.</p>
          <p><strong>How you win and finish:</strong> finish every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many right gates you ran through, how many coins you collected, how far you ran, and how many lives are left.</p>
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
          {won ? 'Lane Runner Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} right gates
          {` · 🪙 ${coins} coins · 🏃 ${distance} m · ${lives} ${lives === 1 ? 'life' : 'lives'} left`}
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
  if (!round || !world) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  const jumping = world.jumpTicksLeft > 0
  const controlButtonStyle: React.CSSProperties = {
    minWidth: '4.5rem', height: '3rem', borderRadius: 'var(--radius-lg)',
    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontSize: '1.1rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
    fontFamily: 'var(--font-display)',
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, LANE_RUNNER_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">🪙 {coins}</span>
        <span aria-live="polite">🏃 {distance} m</span>
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
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
          Run through the gate with the right answer — follow the coins, they lead to it!
        </p>
        {runNote && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: 0 }}>
            {runNote}
          </p>
        )}
      </div>

      {/* The track: sky on top, then the gates, coins and barriers running at the kid. */}
      <div
        role="application"
        aria-label={`Lane Runner round ${current + 1} of ${rounds.length}. Question: ${round.prompt}. You are in lane ${world.lane + 1} of 3. ${lives} lives left.`}
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(#7dd3fc, #bae6fd)', padding: '0.15rem 0.75rem',
          fontSize: '1.1rem', lineHeight: 1.4,
        }} aria-hidden="true">
          <span>☀️</span><span>☁️</span><span>☁️</span><span>🏃</span>
        </div>
        {Array.from({ length: LANE_RUNNER_GATE_SPAWN_DIST + 1 }, (_, i) => {
          const dist = LANE_RUNNER_GATE_SPAWN_DIST - i
          const isRunnerRow = dist === 0
          return (
            <div
              key={dist}
              style={{
                display: 'flex', height: isRunnerRow ? '56px' : '44px',
                background: isRunnerRow ? '#86efac' : dist % 2 === 0 ? '#4ade80' : '#22c55e',
              }}
            >
              {Array.from({ length: LANE_RUNNER_LANES }, (_, lane) => {
                const gate = dist === world.gateDist ? round.gates.find((g) => g.lane === lane) : undefined
                const item = world.items.find((it) => it.dist === dist && it.lane === lane)
                const isPlayer = isRunnerRow && world.lane === lane
                return (
                  <div
                    key={lane}
                    onClick={() => doRunInLane(lane as LaneRunnerLane)}
                    role="button"
                    aria-label={
                      isPlayer
                        ? 'You are here'
                        : gate
                          ? `Gate saying ${gate.label}`
                          : item?.kind === 'coin'
                            ? 'Coin'
                            : item?.kind === 'barrier'
                              ? 'Barrier — jump over it'
                              : `Run in lane ${lane + 1}`
                    }
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      borderLeft: lane > 0 ? '2px dashed rgba(255,255,255,0.7)' : 'none',
                      background: gate ? 'rgba(255,255,255,0.9)' : 'transparent',
                      borderRadius: gate ? '6px' : 0, margin: gate ? '2px' : 0,
                      fontFamily: 'var(--font-display)', lineHeight: 1.1, textAlign: 'center',
                    }}
                  >
                    {isPlayer ? (
                      <motion.span
                        aria-hidden="true"
                        animate={jumping ? { y: -16 } : { y: [0, -3, 0] }}
                        transition={jumping ? { duration: 0.2 } : { duration: 0.6, repeat: Infinity }}
                        style={{ fontSize: '1.7rem', lineHeight: 1, display: 'inline-block' }}
                      >
                        🧒
                      </motion.span>
                    ) : gate ? (
                      <>
                        <span aria-hidden="true" style={{ fontSize: '0.9rem', lineHeight: 1 }}>🚪</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{gate.label}</span>
                      </>
                    ) : item?.kind === 'coin' ? (
                      <motion.span
                        aria-hidden="true"
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        style={{ fontSize: '1.3rem', lineHeight: 1, display: 'inline-block' }}
                      >
                        🪙
                      </motion.span>
                    ) : item?.kind === 'barrier' ? (
                      <span aria-hidden="true" style={{ fontSize: '1.4rem', lineHeight: 1 }}>🚧</span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* On-screen controls: switch lanes, jump. */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
        <button onClick={() => doSwitch('left')} aria-label="Switch to the left lane" style={controlButtonStyle}>◀️ Lane</button>
        <button onClick={doJump} aria-label="Jump" style={{ ...controlButtonStyle, background: 'var(--color-primary)', color: '#fff', border: 'none' }}>⬆️ JUMP</button>
        <button onClick={() => doSwitch('right')} aria-label="Switch to the right lane" style={controlButtonStyle}>Lane ▶️</button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Arrow keys / A,D to switch lanes, Space to jump — or tap a lane to run in it. Follow the coins to the right gate, and jump the barriers!
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

export default function LaneRunnerActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Lane Runner" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <LaneRunnerGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
