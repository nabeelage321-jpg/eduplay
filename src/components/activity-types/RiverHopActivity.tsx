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
  RIVER_HOP_LIVES,
  RIVER_HOP_MAX_ROUNDS,
  RIVER_HOP_TICK_MS,
  RIVER_HOP_COLS,
  RIVER_HOP_ROWS,
  RIVER_HOP_START,
  RIVER_HOP_GOAL_ROW,
  RIVER_HOP_MIDDLE_ROW,
  RIVER_HOP_START_ROW,
  isRiverRow,
  hopPlayer,
  advanceTraffic,
  nextExpectedLabel,
  sequenceTerms,
  borrowNumericWrongAnswers,
  buildRiverHopRound,
  type RiverHopPad,
  type RiverHopCar,
  type RiverHopPlayer,
  type RiverHopRound,
  type HopDirection,
} from '@/lib/river-hop'

/**
 * River Hop — EduPlay's own Frogger-STYLE crossing game (type 48).
 *
 * Frogger-STYLE mechanic only: the kid hops across a busy road and
 * then a river on logs and lily pads to reach the far bank. No
 * Frogger name, no frog, no Konami art: the hopper is a plain kid
 * emoji, the pads are plain log and lily-pad emojis with a number
 * written on them, the cars are plain car emojis — all drawn here,
 * nothing copied.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = the last number of the counting sequence. Each round's
 * pads are the three numbers before the answer (at the question's
 * counting step) plus wrong numbers borrowed from the game's other
 * items. No new save path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes creator rows
 * through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per completed crossing (per round, NOT per
 *   hop — a hop itself earns nothing), score out of 10 x rounds.
 *   One round per question, up to 10 rounds, shuffled once per
 *   item content. The question is shown above the field; the
 *   correct answer is NEVER shown as a pad — the kid has to know
 *   the next number in the sequence. The "Next hop" indicator
 *   always shows which number comes next.
 * - Hop with the arrow keys / WASD or the on-screen hop buttons.
 *   Pads and cars move one cell per tick and wrap around the
 *   edges; a kid standing on a pad rides it as it moves. Adjacent
 *   rows move in opposite directions.
 * - Hopping onto the pad with the NEXT number in the sequence is
 *   safe. Hopping onto any other pad sinks it, hopping onto open
 *   water splashes, and hopping onto a car — or a car driving onto
 *   the kid — is a hit: each costs 1 life, the kid is back at the
 *   start bank, and the sequence starts over. Once all three
 *   numbers are hopped, any pad is safe to stand on while crossing
 *   to the far bank.
 * - Reaching the far bank completes the round: +10, one crossing
 *   counted, next round. A round needs a whole-number answer of 4
 *   or more and at least two other different number answers to
 *   borrow as wrong pads.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("River Hop Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the traffic and the
 *   hopping (the shell overlay covers the field, and the tick loop
 *   + hop handlers all require status 'playing'). Reading How
 *   to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the cars and the river, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, the pads are the counting
 *   numbers before the item's own answer plus wrong numbers
 *   borrowed from the other items, so any question list where
 *   every item has a whole-number answer of 4 or more and at least
 *   two different number answers to borrow plays. A question whose
 *   answer is not such a number keeps the plain message — see
 *   convert.ts. Print: NOT printable (needs its river, moving pads
 *   and cars) — see print-worksheet.ts. Sitemap type list stays at
 *   23 by decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface RiverHopGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

function RiverHopGame({ items, locale, onComplete, onProgress }: RiverHopGameProps) {
  const [rounds, setRounds] = useState<RiverHopRound[]>([])
  const [pads, setPads] = useState<RiverHopPad[]>([])
  const [cars, setCars] = useState<RiverHopCar[]>([])
  const [player, setPlayer] = useState<RiverHopPlayer>(RIVER_HOP_START)
  const [expectedIndex, setExpectedIndex] = useState(0)
  const [hopNote, setHopNote] = useState<string | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(RIVER_HOP_LIVES)
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
    const shuffled = shuffleArray(usable).slice(0, RIVER_HOP_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: RiverHopRound[] = []
    for (const item of shuffled) {
      const seq = sequenceTerms(item.prompt, item.answer)
      if (!seq) continue
      const wrongs = borrowNumericWrongAnswers(allAnswers, item.answer, seq.terms)
      const round = buildRiverHopRound(item.prompt, item.answer, wrongs, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setPads([])
    setCars([])
    setPlayer(RIVER_HOP_START)
    setExpectedIndex(0)
    setHopNote(null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(RIVER_HOP_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(RIVER_HOP_LIVES)
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

  // Finish sound once: win on River Hop Complete, lose on game over.
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
  const padsRef = useRef(pads)
  useEffect(() => { padsRef.current = pads }, [pads])
  const carsRef = useRef(cars)
  useEffect(() => { carsRef.current = cars }, [cars])
  const playerRef = useRef(player)
  useEffect(() => { playerRef.current = player }, [player])
  const expectedRef = useRef(expectedIndex)
  useEffect(() => { expectedRef.current = expectedIndex }, [expectedIndex])
  useEffect(() => {
    const round = rounds[current]
    if (!round) return
    setPads(round.pads)
    setCars(round.cars)
    setPlayer(RIVER_HOP_START)
    setExpectedIndex(0)
    setHopNote(null)
  }, [current, rounds])

  /** Advance after the current round ends. `lostLife` already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    setHopNote(null)
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

  /** Back to the start bank with the sequence starting over. */
  const respawn = useCallback(() => {
    playerRef.current = RIVER_HOP_START
    setPlayer(RIVER_HOP_START)
    expectedRef.current = 0
    setExpectedIndex(0)
    setHopNote(null)
  }, [])

  /** Lose one life for a wrong pad, a splash, or a car hit. Returns true when that ends the game. */
  const loseLife = useCallback((msg: string) => {
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    if (livesRef.current <= 0) {
      advancingRef.current = true
      setFeedback({ type: 'wrong', msg: `${msg} — and you are out of lives.` })
      const from = currentRef.current
      setTimeout(() => advanceFrom(from), 1400)
      return true
    }
    setFeedback({ type: 'wrong', msg })
    return false
  }, [advanceFrom])

  /** One hop in a direction. Blocked hops do nothing. */
  const doHop = useCallback((dir: HopDirection) => {
    if (advancingRef.current || showHowto || finished) return
    if (shellStatus !== 'playing') return
    const round = roundsRef.current[currentRef.current]
    if (!round) return
    const res = hopPlayer(playerRef.current, padsRef.current, carsRef.current, round.terms, expectedRef.current, dir)
    if (res.outcome === 'blocked') return
    if (res.outcome === 'goal') {
      advancingRef.current = true
      playerRef.current = res.player
      setPlayer(res.player)
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `Across! +${SCORE_PER_CORRECT} points — you reached the far bank!`,
      })
      setTimeout(() => advanceFrom(from), 1000)
      return
    }
    if (res.outcome === 'wrong-pad' || res.outcome === 'splash' || res.outcome === 'car-hit') {
      playEduSound('wrong', readInteractiveSoundOn())
      respawn()
      if (res.outcome === 'wrong-pad') {
        loseLife('That pad sank — it was not the next number in the sequence. Back to the start bank!')
      } else if (res.outcome === 'splash') {
        loseLife('Splash! There was no pad there — only open water. Back to the start bank!')
      } else {
        loseLife('Crash! A car hit you. Watch the road and hop between the cars!')
      }
      return
    }
    // A plain hop, or the next number in the sequence.
    playEduSound('jump', readInteractiveSoundOn())
    playerRef.current = res.player
    setPlayer(res.player)
    if (res.outcome === 'correct-pad') {
      const hoppedLabel = round.terms[expectedRef.current]
      expectedRef.current = res.expectedIndex
      setExpectedIndex(res.expectedIndex)
      const nextLabel = nextExpectedLabel(round.terms, res.expectedIndex)
      setHopNote(
        nextLabel === null
          ? `Nice hop — ${hoppedLabel} is right! The sequence is done, hop to the far bank!`
          : `Nice hop — ${hoppedLabel} is right! Next: ${nextLabel}.`,
      )
    }
  }, [advanceFrom, finished, loseLife, respawn, shellStatus, showHowto])

  const doHopRef = useRef(doHop)
  useEffect(() => { doHopRef.current = doHop }, [doHop])

  // Game tick: move the pads and cars, ride the pads, and catch
  // splashes and car hits. Runs only while the shell is playing,
  // How-to-Play is closed, and the game is not finished — pause
  // and How-to-Play both freeze the traffic.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => {
      if (advancingRef.current) return
      const res = advanceTraffic(padsRef.current, carsRef.current, playerRef.current)
      padsRef.current = res.pads
      setPads(res.pads)
      carsRef.current = res.cars
      setCars(res.cars)
      playerRef.current = res.player
      setPlayer(res.player)
      if (res.outcome === 'splash') {
        playEduSound('wrong', readInteractiveSoundOn())
        respawn()
        loseLife('Splash! The pad drifted away and left you in open water. Back to the start bank!')
      } else if (res.outcome === 'hit') {
        playEduSound('wrong', readInteractiveSoundOn())
        respawn()
        loseLife('Crash! A car drove onto you. Watch the road and hop between the cars!')
      }
    }, RIVER_HOP_TICK_MS)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current, loseLife, respawn])

  // Keyboard hopping: arrow keys or WASD. Held keys do not repeat
  // hops — one key press is one hop.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return
      const key = e.key.toLowerCase()
      const dir: HopDirection | null =
        key === 'arrowup' || key === 'w' ? 'up'
        : key === 'arrowdown' || key === 's' ? 'down'
        : key === 'arrowleft' || key === 'a' ? 'left'
        : key === 'arrowright' || key === 'd' ? 'right'
        : null
      if (!dir) return
      e.preventDefault()
      doHopRef.current(dir)
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
    // Re-deal round 1's traffic here too: when the game ended on
    // round 1, `current` does not change, so the round effect
    // would not fire on its own.
    const first = roundsRef.current[0]
    if (first) {
      setPads(first.pads)
      setCars(first.cars)
    }
    setPlayer(RIVER_HOP_START)
    setExpectedIndex(0)
    setHopNote(null)
    setLives(RIVER_HOP_LIVES)
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
        This game has no crossings to hop yet — it needs number answers of 4 or more, with at least two other different number answers to borrow.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🌊</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play River Hop</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Hop the pads in counting order and reach the far bank!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each round asks one counting question, like &ldquo;Count by 2s&rdquo;. Hop across the road, then across the river on the logs and lily pads — but only on the numbers in order: 2, then 4, then 6. The &ldquo;Next hop&rdquo; line always shows which number comes next. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> reaching the far bank earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}). Single hops earn no points — only a finished crossing does.</p>
          <p><strong>Objective:</strong> cross to the far bank in every round without running out of lives.</p>
          <p><strong>Controls:</strong> arrow keys or W/A/S/D to hop up, down, left, and right — or tap the on-screen hop buttons. Pads and cars keep moving, and a pad you stand on carries you along with it, so time your hops.</p>
          <p><strong>Lives:</strong> you start with {RIVER_HOP_LIVES} lives. A wrong pad sinks, open water splashes, and a car hit each cost 1 life — and send you back to the start bank with the sequence starting over. Once all three numbers are hopped, any pad is safe while you cross to the far bank.</p>
          <p><strong>Cars and river:</strong> cars drive across the road — never hop onto a car, and never stand where one is about to drive. Logs 🪵 and lily pads 🍃 float across the river — hop only on the pad with the next number.</p>
          <p><strong>Rounds:</strong> one round per question, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> finish every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many crossings you finished, and how many lives are left.</p>
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
          {won ? 'River Hop Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} crossings finished
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
  if (!round) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Loading…</div>
    )
  }

  const nextLabel = nextExpectedLabel(round.terms, expectedIndex)

  function rowBackground(row: number): string {
    if (row === RIVER_HOP_GOAL_ROW || row === RIVER_HOP_START_ROW) return '#86efac'
    if (isRiverRow(row)) return '#7dd3fc'
    if (row === RIVER_HOP_MIDDLE_ROW) return '#fde68a'
    return '#475569'
  }

  const hopButtonStyle: React.CSSProperties = {
    width: '3rem', height: '3rem', borderRadius: 'var(--radius-lg)',
    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontSize: '1.4rem', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, RIVER_HOP_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">✅ {correctCount}</span>
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
        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }} aria-live="polite">
          {round.terms.map((term, i) => (
            <span
              key={`${term}-${i}`}
              style={{
                padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700,
                background: i < expectedIndex ? '#22c55e' : i === expectedIndex ? '#f59e0b' : 'var(--color-surface)',
                color: i < expectedIndex || i === expectedIndex ? '#fff' : 'var(--color-text-muted)',
                border: '2px solid var(--color-border)',
              }}
            >
              {i < expectedIndex ? `✓ ${term}` : term}
            </span>
          ))}
          <span
            style={{
              padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700,
              background: nextLabel === null ? '#22c55e' : 'var(--color-surface)',
              color: nextLabel === null ? '#fff' : 'var(--color-text-muted)',
              border: '2px solid var(--color-border)',
            }}
          >
            🏁 {round.correctAnswer}
          </span>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
          {nextLabel === null
            ? 'Sequence done — hop to the far bank!'
            : `Next hop: ${nextLabel} — count by ${round.step}s.`}
        </p>
        {hopNote && (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', marginBottom: 0 }}>
            {hopNote}
          </p>
        )}
      </div>

      {/* The crossing: far bank, river, middle bank, road, start bank. */}
      <div
        role="application"
        aria-label={`River Hop round ${current + 1} of ${rounds.length}. ${nextLabel === null ? 'Sequence done, hop to the far bank.' : `Next hop: ${nextLabel}.`} ${lives} lives left.`}
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          userSelect: 'none',
        }}
      >
        {Array.from({ length: RIVER_HOP_ROWS }, (_, row) => (
          <div key={row} style={{ display: 'flex', height: '46px', background: rowBackground(row) }}>
            {Array.from({ length: RIVER_HOP_COLS }, (_, col) => {
              const pad = pads.find((p) => p.row === row && p.col === col)
              const car = cars.find((c) => c.row === row && c.col === col)
              const isPlayer = player.col === col && player.row === row
              return (
                <div
                  key={col}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: pad ? 'rgba(255,255,255,0.65)' : 'transparent',
                    borderRadius: pad ? '6px' : 0, margin: pad ? '2px' : 0,
                    fontFamily: 'var(--font-display)', lineHeight: 1.1, textAlign: 'center',
                  }}
                  aria-label={
                    isPlayer
                      ? 'You are here'
                      : pad
                        ? `Pad saying ${pad.label}`
                        : car
                          ? 'Car — do not hop here'
                          : undefined
                  }
                >
                  {isPlayer ? (
                    <span aria-hidden="true" style={{ fontSize: '1.6rem', lineHeight: 1 }}>🧒</span>
                  ) : pad ? (
                    <>
                      <span aria-hidden="true" style={{ fontSize: '1.1rem', lineHeight: 1 }}>{pad.kind === 'log' ? '🪵' : '🍃'}</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{pad.label}</span>
                    </>
                  ) : car ? (
                    <span aria-hidden="true" style={{ fontSize: '1.5rem', lineHeight: 1 }}>{car.emoji}</span>
                  ) : row === RIVER_HOP_GOAL_ROW && (col === 0 || col === RIVER_HOP_COLS - 1) ? (
                    <span aria-hidden="true" style={{ fontSize: '1.2rem', lineHeight: 1 }}>🏁</span>
                  ) : row === RIVER_HOP_MIDDLE_ROW && (col === 0 || col === RIVER_HOP_COLS - 1) ? (
                    <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }}>🌼</span>
                  ) : row === RIVER_HOP_START_ROW && (col === 0 || col === RIVER_HOP_COLS - 1) ? (
                    <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }}>🌿</span>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* On-screen hop buttons. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 3rem)', gap: '0.35rem', justifyContent: 'center', marginTop: '0.75rem' }}>
        <span aria-hidden="true" />
        <button onClick={() => doHop('up')} aria-label="Hop up" style={hopButtonStyle}>⬆️</button>
        <span aria-hidden="true" />
        <button onClick={() => doHop('left')} aria-label="Hop left" style={hopButtonStyle}>⬅️</button>
        <button onClick={() => doHop('down')} aria-label="Hop down" style={hopButtonStyle}>⬇️</button>
        <button onClick={() => doHop('right')} aria-label="Hop right" style={hopButtonStyle}>➡️</button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Arrow keys / WASD or the buttons hop you. Only hop on the next number — a wrong pad sinks and a car costs a life!
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

export default function RiverHopActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="River Hop" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <RiverHopGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
