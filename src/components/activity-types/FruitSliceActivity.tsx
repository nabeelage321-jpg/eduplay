'use client'

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, SCORE_PER_CORRECT, shuffleArray } from './shared'
import ScorePill from '@/components/game/ScorePill'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  FRUIT_SLICE_LIVES,
  FRUIT_SLICE_MAX_ROUNDS,
  FRUIT_SLICE_FIELD_HEIGHT,
  FRUIT_SLICE_RADIUS_PX,
  FRUIT_SLICE_WIDTH_PCT,
  FRUIT_SLICE_TICK_MS,
  sliceHitsFruit,
  sliceFruit,
  correctFruitEscaped,
  nextFruitState,
  borrowWrongAnswers,
  buildFruitSliceRound,
  type FruitSliceFruit,
  type FruitSliceRound,
} from '@/lib/fruit-slice'

/**
 * Fruit Slice — EduPlay's own Fruit Ninja-STYLE slicing game (type 47).
 *
 * Fruit Ninja-STYLE mechanic only: fruits carrying answers fly up
 * in arcs and the kid slices the fruit with the correct answer.
 * No Fruit Ninja name, no Halfbrick art: the fruits are plain
 * emoji circles with the answer written on them, the juice burst
 * is a coloured circle — all drawn here, nothing copied.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = correct answer. Each round's fruits are the correct
 * answer plus wrong answers borrowed from the game's other items,
 * plus exactly one bomb fruit. No new save path was needed: the
 * save route already stores prompt/answer for every type, and the
 * adapter passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct slice, score out of
 *   10 x rounds. One round per question, up to 10 rounds, shuffled
 *   once per item content. The question is shown above the field;
 *   the correct answer is NEVER shown — the kid has to know it.
 * - Fruits fly up in arcs, staggered, and drift sideways, bouncing
 *   off the field walls. Swipe across a fruit (mouse drag or touch
 *   swipe) or tap it to slice it. One swipe can slice every fruit
 *   its line crosses.
 * - Slicing the CORRECT fruit: +10, round done. Slicing a WRONG
 *   fruit: -1 life, the fruit is gone, the round goes on. Slicing
 *   the BOMB fruit: -1 life, the fruit is gone, the round goes on.
 * - A fruit that flies off the bottom unsliced is gone. If the
 *   CORRECT fruit escapes unsliced, the round ends with 0 points
 *   and no life lost (Balloon Pop's escape rule). Wrong fruits and
 *   the bomb escaping cost nothing.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Fruit Slice Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the flight and the
 *   slicing (the shell overlay covers the field, and the tick loop
 *   + pointer handlers all require status 'playing'). Reading How
 *   to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the bomb, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the round is generated from the game's
 *   own items, one round per question, the fruits are the item's
 *   own answer plus wrong answers borrowed from the other items,
 *   so any question list where every item has a different answer
 *   to borrow plays. A lone question with no other answer to
 *   borrow keeps the plain message — see convert.ts. Print: NOT
 *   printable (needs its flying fruits and slicing) — see
 *   print-worksheet.ts. Sitemap type list stays at 23 by
 *   decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface FruitSliceGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** A point on the field: x in percent of field width, y in px above the bottom. */
interface FieldPoint {
  xPct: number
  yPx: number
}

function FruitSliceGame({ items, locale, onComplete, onProgress }: FruitSliceGameProps) {
  const [rounds, setRounds] = useState<FruitSliceRound[]>([])
  const [fruits, setFruits] = useState<FruitSliceFruit[]>([])
  const [trail, setTrail] = useState<FieldPoint[]>([])
  const [bursts, setBursts] = useState<{ id: number; emoji: string; juice: string; xPct: number; yPx: number }[]>([])
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(FRUIT_SLICE_LIVES)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()
  const fieldRef = useRef<HTMLDivElement>(null)

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
    const shuffled = shuffleArray(usable).slice(0, FRUIT_SLICE_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: FruitSliceRound[] = []
    for (const item of shuffled) {
      const wrongs = borrowWrongAnswers(allAnswers, item.answer)
      const round = buildFruitSliceRound(item.prompt, item.answer, wrongs, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setFruits([])
    setTrail([])
    setBursts([])
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(FRUIT_SLICE_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(FRUIT_SLICE_LIVES)
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

  // Finish sound once: win on Fruit Slice Complete, lose on game over.
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
  const fruitsRef = useRef(fruits)
  useEffect(() => { fruitsRef.current = fruits }, [fruits])
  useEffect(() => {
    const round = rounds[current]
    if (!round) return
    setFruits(round.fruits)
    setTrail([])
    setBursts([])
  }, [current, rounds])

  /** Advance after the current round ends. `lostLife` already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    setBursts([])
    setTrail([])
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

  /** Show a juice burst where a fruit was sliced, then clear it. */
  const showBurst = useCallback((fruit: FruitSliceFruit) => {
    const burst = { id: fruit.id, emoji: fruit.emoji, juice: fruit.juice, xPct: fruit.xPct, yPx: fruit.yPx }
    setBursts((prev) => [...prev.filter((b) => b.id !== fruit.id), burst])
    setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== fruit.id)), 600)
  }, [])

  /** Lose one life for a wrong fruit or a bomb. Returns true when that ends the game. */
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

  /** A fruit was sliced. Correct: +10, round done. Wrong or bomb: -1 life, round goes on. */
  const handleSlice = useCallback((fruit: FruitSliceFruit) => {
    if (advancingRef.current) return
    if (fruit.correct) {
      advancingRef.current = true
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      showBurst(fruit)
      setFruits((prev) => sliceFruit(prev, fruit.id))
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `Sweet slice! +${SCORE_PER_CORRECT} points — "${fruit.label}" is right!`,
      })
      setTimeout(() => advanceFrom(from), 1000)
      return
    }
    showBurst(fruit)
    setFruits((prev) => sliceFruit(prev, fruit.id))
    playEduSound('wrong', readInteractiveSoundOn())
    if (fruit.kind === 'bomb') {
      loseLife('💣 That was a bomb! You lost a life — never slice the bomb.')
    } else {
      loseLife(`"${fruit.label}" is not the answer — that fruit is gone and you lost a life.`)
    }
  }, [advanceFrom, loseLife, showBurst])

  const handleSliceRef = useRef(handleSlice)
  useEffect(() => { handleSliceRef.current = handleSlice }, [handleSlice])

  // Game tick: launch and fly the fruits. Runs only while the shell
  // is playing, How-to-Play is closed, and the game is not finished
  // — pause and How-to-Play both freeze the flight.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => {
      if (advancingRef.current) return
      const next = fruitsRef.current.map(nextFruitState)
      fruitsRef.current = next
      setFruits(next)
      // The correct fruit escaped unsliced: round over, 0 points,
      // no life lost (Balloon Pop's escape rule).
      if (correctFruitEscaped(next)) {
        advancingRef.current = true
        const from = currentRef.current
        setFeedback({
          type: 'wrong',
          msg: 'The right fruit flew away unsliced — no points this round. Watch for it next time!',
        })
        setTimeout(() => advanceFrom(from), 1200)
      }
    }, FRUIT_SLICE_TICK_MS)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current, advanceFrom])

  /** Field coordinates of a pointer event: x in percent, y in px above the field bottom. */
  function eventPoint(e: React.PointerEvent): FieldPoint | null {
    const rect = fieldRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return null
    return {
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPx: rect.bottom - e.clientY,
    }
  }

  /** Check one swipe segment (or tap point) against every flying fruit. */
  function checkSegment(from: FieldPoint, to: FieldPoint) {
    const rect = fieldRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    // Snapshot: a fruit sliced by this segment must not be re-checked.
    for (const fruit of fruitsRef.current) {
      if (fruit.state !== 'flying') continue
      if (sliceHitsFruit(fruit, from.xPct, from.yPx, to.xPct, to.yPx, rect.width)) {
        handleSliceRef.current(fruit)
      }
    }
  }

  const swipingRef = useRef(false)
  const lastPointRef = useRef<FieldPoint | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current) return
    const point = eventPoint(e)
    if (!point) return
    e.preventDefault()
    swipingRef.current = true
    lastPointRef.current = point
    setTrail([point])
    // A tap slices the fruit under the finger at once.
    checkSegment(point, point)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!swipingRef.current) return
    const point = eventPoint(e)
    if (!point) return
    const prev = lastPointRef.current
    lastPointRef.current = point
    setTrail((t) => [...t.slice(-11), point])
    if (prev) checkSegment(prev, point)
  }

  function endSwipe() {
    swipingRef.current = false
    lastPointRef.current = null
    setTrail([])
  }

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
    // Re-deal round 1's fruits here too: when the game ended on
    // round 1, `current` does not change, so the round effect
    // would not fire on its own.
    const first = roundsRef.current[0]
    if (first) {
      setFruits(first.fruits)
    }
    setTrail([])
    setBursts([])
    setLives(FRUIT_SLICE_LIVES)
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
        This game has no questions to slice for yet — it needs at least two different answers.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🍉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Fruit Slice</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Slice the fruit with the right answer — never the bomb!
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each round asks one question. Fruits fly up in arcs, and every fruit carries an answer. Swipe across the fruit with the correct answer — or just tap it — to slice it. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> slicing the correct fruit earns {SCORE_PER_CORRECT} points. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'round' : 'rounds'}). Slicing a wrong fruit or the bomb earns no points.</p>
          <p><strong>Objective:</strong> slice the right fruit in every round without running out of lives.</p>
          <p><strong>Controls:</strong> swipe across a fruit with your finger or mouse, or tap a fruit to slice it. One long swipe can slice more than one fruit — so aim carefully.</p>
          <p><strong>Lives:</strong> you start with {FRUIT_SLICE_LIVES} lives. A wrong fruit costs 1 life and a bomb costs 1 life. If the right fruit flies away unsliced, the round ends with no points — but you keep your lives.</p>
          <p><strong>Bomb:</strong> one bomb fruit flies up in every round. It looks like 💣. Never slice it — it costs a life just like a wrong fruit.</p>
          <p><strong>Rounds:</strong> one round per question, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> finish every round with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many fruits you sliced right, and how many lives are left.</p>
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
          {won ? 'Fruit Slice Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} fruits sliced right
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

  // Swipe trail as an SVG polyline over the field (x in %, y in px from the top).
  const trailPoints = trail
    .map((p) => `${p.xPct},${FRUIT_SLICE_FIELD_HEIGHT - p.yPx}`)
    .join(' ')

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, FRUIT_SLICE_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">🍉 {correctCount}</span>
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
          Swipe across the fruit with the right answer — never slice the bomb!
        </p>
      </div>

      {/* The field: sky, flying fruits, juice bursts, and the swipe trail. */}
      <div
        ref={fieldRef}
        role="application"
        aria-label={`Fruit Slice round ${current + 1} of ${rounds.length}. ${fruits.filter((f) => f.state === 'flying').length} fruits flying. ${lives} lives left.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={endSwipe}
        onPointerLeave={endSwipe}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'relative',
          height: `${FRUIT_SLICE_FIELD_HEIGHT}px`,
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(180deg, #0ea5e9 0%, #7dd3fc 45%, #fef3c7 100%)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <span aria-hidden="true" style={{ position: 'absolute', left: '8%', top: '6%', fontSize: '2rem', lineHeight: 1, opacity: 0.9 }}>☀️</span>
        <span aria-hidden="true" style={{ position: 'absolute', right: '10%', top: '12%', fontSize: '1.8rem', lineHeight: 1, opacity: 0.9 }}>☁️</span>

        {fruits.map((fruit) => {
          if (fruit.state !== 'flying') return null
          const isBomb = fruit.kind === 'bomb'
          return (
            <motion.div
              key={fruit.id}
              animate={{ left: `${fruit.xPct}%`, bottom: `${fruit.yPx - FRUIT_SLICE_RADIUS_PX}px` }}
              transition={{ duration: 0.05, ease: 'linear' }}
              style={{
                position: 'absolute',
                width: `${FRUIT_SLICE_WIDTH_PCT}%`,
                height: `${FRUIT_SLICE_RADIUS_PX * 2}px`,
                borderRadius: '50%',
                background: isBomb ? '#1f2937' : '#fffbeb',
                border: `3px solid ${isBomb ? '#111827' : fruit.juice}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)', lineHeight: 1.1, textAlign: 'center',
                padding: '0.1rem', overflow: 'hidden', pointerEvents: 'none',
              }}
              aria-label={isBomb ? 'Bomb fruit — do not slice' : `Fruit saying ${fruit.label}`}
            >
              <span aria-hidden="true" style={{ fontSize: '1.4rem', lineHeight: 1 }}>{fruit.emoji}</span>
              {!isBomb && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                  {fruit.label}
                </span>
              )}
            </motion.div>
          )
        })}

        {bursts.map((burst) => (
          <span
            key={`burst-${burst.id}`}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${burst.xPct}%`,
              bottom: `${burst.yPx - FRUIT_SLICE_RADIUS_PX}px`,
              width: `${FRUIT_SLICE_WIDTH_PCT}%`,
              height: `${FRUIT_SLICE_RADIUS_PX * 2}px`,
              borderRadius: '50%',
              background: burst.juice,
              opacity: 0.55,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.8rem', lineHeight: 1, pointerEvents: 'none',
            }}
          >
            💥
          </span>
        ))}

        {/* Swipe trail. */}
        {trail.length > 1 && (
          <svg
            aria-hidden="true"
            viewBox={`0 0 100 ${FRUIT_SLICE_FIELD_HEIGHT}`}
            preserveAspectRatio="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          >
            <polyline
              points={trailPoints}
              fill="none"
              stroke="#ffffff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Swipe across a fruit to slice it, or tap it. Wrong fruit or bomb costs a life!
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

export default function FruitSliceActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Fruit Slice" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <FruitSliceGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
