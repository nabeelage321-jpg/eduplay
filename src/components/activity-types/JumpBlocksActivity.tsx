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
  JUMP_BLOCKS_LIVES,
  JUMP_BLOCKS_MAX_ROUNDS,
  JUMP_BLOCKS_COLS,
  JUMP_BLOCKS_FIELD_HEIGHT,
  JUMP_BLOCKS_GROUND_HEIGHT,
  JUMP_BLOCKS_GROUND_TOP,
  JUMP_BLOCKS_KID_HEIGHT,
  JUMP_BLOCKS_KID_WIDTH_PCT,
  JUMP_BLOCKS_BLOCK_TOP,
  JUMP_BLOCKS_BLOCK_HEIGHT,
  JUMP_BLOCKS_TICK_MS,
  JUMP_BLOCKS_MOVE_PCT_PER_TICK,
  JUMP_BLOCKS_JUMP_VELOCITY,
  blockColLeftPct,
  clampKidXPct,
  nextJumpState,
  borrowWrongAnswers,
  buildJumpBlocksRound,
  blockHitAt,
  crackBlock,
  type JumpBlocksBlock,
  type JumpBlocksRound,
} from '@/lib/jump-blocks'

/**
 * Jump Blocks — EduPlay's own Mario-STYLE platformer game (type 46).
 *
 * Mario-STYLE mechanic only: the kid runs along the ground and
 * jumps to hit the question block hanging in the air that carries
 * the correct answer. No Mario name, no Mario character, no
 * Nintendo art: the runner is a generic running-kid emoji, the
 * blocks are plain amber boxes with a "?" and the answer written
 * on them, the hills and clouds are CSS shapes and emoji — all
 * drawn here, nothing copied.
 * Sounds are the shared interactive Web Audio system
 * (synthesized, no assets). Sound is ON by default for this game;
 * the in-player toggle mutes it in one tap. Background music is
 * the shared PlayShell loop.
 *
 * Data: the standard creator item shape — prompt = question,
 * answer = correct answer. Each round's blocks are the correct
 * answer plus wrong answers borrowed from the game's other items.
 * No new save path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes creator
 * rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. 10 points per correct block hit, score out of
 *   10 x rounds. Every correct hit also collects one coin.
 * - One round (one level) per question, up to 10 rounds, shuffled
 *   once per item content. The question is shown above the level;
 *   the correct answer is NEVER shown — the kid has to know it.
 * - The kid runs left and right along the ground: hold the Left
 *   and Right arrow keys or A and D, or hold the on-screen ◀ ▶
 *   buttons. Jump with Space, Arrow Up, or W — or the JUMP button.
 *   A jump only works from the ground, so there is no double jump.
 * - A block is hit when the kid's head reaches its underside
 *   while rising under it. Hitting the CORRECT block: +10, one
 *   coin, round done. Hitting a WRONG block: -1 life, the block
 *   cracks and can never be hit again, and the kid drops back to
 *   the ground. The blocks are all visible before the kid jumps,
 *   so a wrong hit is a genuine wrong answer.
 * - If a question carries its own picture (imageUrl), the picture
 *   shows above the question — it is part of the question, never
 *   decoration, never invented.
 * - 0 lives = game over (lose). All rounds done with lives left
 *   = win ("Jump Blocks Complete!"). onComplete fires exactly once
 *   with the real score plus correct/total counts and lives left.
 * - Pause via the shared PlayShell freezes the run and the jump
 *   (the shell overlay covers the level, and the tick loop + key
 *   and button handlers all require status 'playing').
 *   Reading How to Play mid-game also freezes them.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the coins, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE — the level is generated from the game's
 *   own items, one level per question, the blocks are the item's
 *   own answer plus wrong answers borrowed from the other items,
 *   so any question list where every item has a different answer
 *   to borrow plays. A lone question with no other answer to
 *   borrow keeps the plain message — see convert.ts. Print: NOT
 *   printable (needs its level and jumping kid) — see
 *   print-worksheet.ts. Sitemap type list stays at 23 by
 *   decision — see seo/sitemap.ts.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface JumpBlocksGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

/** Fixed cloud positions (own CSS/emoji decoration, never an image). */
const CLOUDS: { left: string; top: string }[] = [
  { left: '6%', top: '4%' },
  { left: '42%', top: '10%' },
  { left: '74%', top: '3%' },
]

function JumpBlocksGame({ items, locale, onComplete, onProgress }: JumpBlocksGameProps) {
  const [rounds, setRounds] = useState<JumpBlocksRound[]>([])
  const [blocks, setBlocks] = useState<JumpBlocksBlock[]>([])
  const [kidXPct, setKidXPct] = useState(0)
  const [jumpY, setJumpY] = useState(0)
  const [burst, setBurst] = useState<{ id: number; emoji: string } | null>(null)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(JUMP_BLOCKS_LIVES)
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
    const shuffled = shuffleArray(usable).slice(0, JUMP_BLOCKS_MAX_ROUNDS)
    const allAnswers = usable.map((i) => i.answer)
    const built: JumpBlocksRound[] = []
    for (const item of shuffled) {
      const wrongs = borrowWrongAnswers(allAnswers, item.answer)
      const round = buildJumpBlocksRound(item.prompt, item.answer, wrongs, item.imageUrl, item.imageCredit)
      if (round) built.push(round)
    }
    setRounds(built)
    setBlocks([])
    setKidXPct(0)
    setJumpY(0)
    setBurst(null)
    setShowHowto(false)
    setStarted(true)
    setCurrent(0)
    setLives(JUMP_BLOCKS_LIVES)
    setScore(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(JUMP_BLOCKS_LIVES)
  const correctRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  const vyRef = useRef(0)
  const jumpYRef = useRef(0)
  const kidXRef = useRef(0)
  const heldRef = useRef<Set<'left' | 'right'>>(new Set())
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

  // Finish sound once: win on Jump Blocks Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  // A fresh level whenever the round changes.
  const roundsRef = useRef(rounds)
  useEffect(() => { roundsRef.current = rounds }, [rounds])
  const currentRef = useRef(current)
  useEffect(() => { currentRef.current = current }, [current])
  const blocksRef = useRef(blocks)
  useEffect(() => { blocksRef.current = blocks }, [blocks])
  useEffect(() => {
    const round = rounds[current]
    if (!round) return
    setBlocks(round.blocks)
    setKidXPct(0)
    kidXRef.current = 0
    setJumpY(0)
    jumpYRef.current = 0
    vyRef.current = 0
    heldRef.current.clear()
    setBurst(null)
  }, [current, rounds])

  /** Advance after the current round ends. `lostLife` already applied. */
  const advanceFrom = useCallback((from: number) => {
    advancingRef.current = false
    setFeedback(null)
    setBurst(null)
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

  /** A block was hit while the kid rose under it. Correct: +10,
   *  one coin, round done. Wrong: -1 life, the block cracks, and
   *  the kid drops back to the ground. */
  const handleBlockHit = useCallback((block: JumpBlocksBlock) => {
    if (advancingRef.current) return
    if (block.correct) {
      advancingRef.current = true
      setScore((s) => s + SCORE_PER_CORRECT)
      scoreRef.current = scoreRef.current + SCORE_PER_CORRECT
      setCorrectCount((c) => c + 1)
      correctRef.current = correctRef.current + 1
      setBurst({ id: block.id, emoji: '🪙' })
      const from = currentRef.current
      setFeedback({
        type: 'correct',
        msg: `Right block! +${SCORE_PER_CORRECT} points — "${block.label}" is right, and you collected a coin!`,
      })
      setTimeout(() => advanceFrom(from), 1000)
      return
    }
    setBlocks((prev) => crackBlock(prev, block.id))
    setBurst({ id: block.id, emoji: '💥' })
    setTimeout(() => setBurst(null), 600)
    // The kid drops: the jump ends at once.
    vyRef.current = 0
    jumpYRef.current = 0
    setJumpY(0)
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    if (livesRef.current <= 0) {
      advancingRef.current = true
      setFeedback({ type: 'wrong', msg: `"${block.label}" is not the answer — that block cracked, and you are out of lives.` })
      const from = currentRef.current
      setTimeout(() => advanceFrom(from), 1400)
      return
    }
    setFeedback({
      type: 'wrong',
      msg: `"${block.label}" is not the answer — that block cracked and you lost a life. Try another block!`,
    })
  }, [advanceFrom])

  const handleBlockHitRef = useRef(handleBlockHit)
  useEffect(() => { handleBlockHitRef.current = handleBlockHit }, [handleBlockHit])

  // Game tick: run left/right while a key or button is held, and
  // step the jump. Runs only while the shell is playing, How-to-Play
  // is closed, and the game is not finished — pause and How-to-Play
  // both freeze the level.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => {
      if (advancingRef.current) return
      // Run.
      const held = heldRef.current
      if (held.size > 0) {
        const delta = (held.has('right') ? JUMP_BLOCKS_MOVE_PCT_PER_TICK : 0)
          - (held.has('left') ? JUMP_BLOCKS_MOVE_PCT_PER_TICK : 0)
        if (delta !== 0) {
          const next = clampKidXPct(kidXRef.current + delta)
          kidXRef.current = next
          setKidXPct(next)
        }
      }
      // Jump physics — only while airborne.
      if (vyRef.current !== 0 || jumpYRef.current > 0) {
        const next = nextJumpState(jumpYRef.current, vyRef.current)
        vyRef.current = next.vy
        jumpYRef.current = next.y
        setJumpY(next.y)
        // A block is hit only while rising under it.
        if (next.vy > 0 && !next.landed) {
          const hit = blockHitAt(blocksRef.current, kidXRef.current, next.y)
          if (hit) handleBlockHitRef.current(hit)
        }
      }
    }, JUMP_BLOCKS_TICK_MS)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current])

  function jump() {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current) return
    if (jumpYRef.current !== 0 || vyRef.current !== 0) return // no double jump
    vyRef.current = JUMP_BLOCKS_JUMP_VELOCITY
    playEduSound('click', readInteractiveSoundOn())
  }

  const jumpRef = useRef(jump)
  useEffect(() => { jumpRef.current = jump }, [jump])

  function holdDir(dir: 'left' | 'right', on: boolean) {
    if (on) heldRef.current.add(dir)
    else heldRef.current.delete(dir)
  }

  // Keyboard controls: hold arrows / A,D to run, Space / Arrow Up / W to jump.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (shellStatus !== 'playing' || showHowto || finished) return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        holdDir('left', true)
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        holdDir('right', true)
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        if (!e.repeat) jumpRef.current()
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') holdDir('left', false)
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') holdDir('right', false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      heldRef.current.clear()
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
    // Re-deal level 1's blocks here too: when the game ended on
    // level 1, `current` does not change, so the level effect
    // would not fire on its own.
    const first = roundsRef.current[0]
    if (first) {
      setBlocks(first.blocks)
    }
    setKidXPct(0)
    kidXRef.current = 0
    setJumpY(0)
    jumpYRef.current = 0
    vyRef.current = 0
    heldRef.current.clear()
    setBurst(null)
    setLives(JUMP_BLOCKS_LIVES)
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
        This game has no questions to jump for yet — it needs at least two different answers.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🧱</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Jump Blocks</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Run and jump to hit the block with the right answer.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each level asks one question. Four blocks hang in the air, and every block carries an answer. Run under the block with the correct answer and jump to hit it from below. Some questions show a picture above them — look at it, it is part of the question.</p>
          <p><strong>How scores are given:</strong> hitting the correct block earns {SCORE_PER_CORRECT} points and one coin 🪙. The game is scored out of {rounds.length * SCORE_PER_CORRECT} ({rounds.length} {rounds.length === 1 ? 'level' : 'levels'}). Hitting a wrong block earns no points.</p>
          <p><strong>Objective:</strong> hit the right block in every level without running out of lives.</p>
          <p><strong>Controls:</strong> hold the Left and Right arrow keys or A and D to run, jump with Space, Arrow Up, or W — or hold the on-screen ◀ ▶ buttons to run and tap JUMP. You can only jump from the ground, so there is no double jump.</p>
          <p><strong>Lives:</strong> you start with {JUMP_BLOCKS_LIVES} lives. A wrong block costs 1 life and cracks so you cannot hit it again — the kid drops back to the ground. The blocks are all visible before you jump, so look before you leap.</p>
          <p><strong>Coins:</strong> every correct block gives you one coin. Coins are your correct answers collected — finish with as many as you can.</p>
          <p><strong>Rounds:</strong> one level per question, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> finish every level with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many levels you cleared, your coins, and how many lives are left.</p>
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
          {won ? 'Jump Blocks Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {correctCount} of {rounds.length} levels cleared
          {` · 🪙 ${correctCount} ${correctCount === 1 ? 'coin' : 'coins'}`}
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

  const colWidthPct = 100 / JUMP_BLOCKS_COLS
  const controlBtn: CSSProperties = {
    padding: '0.7rem 1.1rem', borderRadius: 'var(--radius-lg)',
    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)',
    fontSize: '1.1rem', cursor: 'pointer', minWidth: '3.2rem',
    touchAction: 'none', userSelect: 'none',
  }

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={rounds.length * SCORE_PER_CORRECT} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, JUMP_BLOCKS_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite">🪙 {correctCount}</span>
        <span aria-live="polite">Level {current + 1} of {rounds.length}</span>
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
          Run under the block with the right answer and jump to hit it!
        </p>
      </div>

      {/* The level: sky, hanging blocks, ground, and the running kid. */}
      <div
        role="application"
        aria-label={`Jump Blocks level ${current + 1} of ${rounds.length}. ${blocks.filter((b) => b.alive).length} blocks left. ${lives} lives left.`}
        style={{
          position: 'relative',
          height: `${JUMP_BLOCKS_FIELD_HEIGHT}px`,
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(180deg, #7ec8f7 0%, #bfe6fb 55%, #d8f3d8 55.5%, #8ed081 100%)',
          border: '2px solid var(--color-border)',
          overflow: 'hidden',
          touchAction: 'manipulation',
        }}
      >
        {CLOUDS.map((c, i) => (
          <span key={i} aria-hidden="true" style={{
            position: 'absolute', left: c.left, top: c.top, fontSize: '2rem', lineHeight: 1, opacity: 0.9,
          }}>
            ☁️
          </span>
        ))}
        {/* Hills on the horizon. */}
        <div aria-hidden="true" style={{
          position: 'absolute', left: '8%', bottom: `${JUMP_BLOCKS_GROUND_HEIGHT}px`,
          width: '120px', height: '46px', borderRadius: '60px 60px 0 0', background: '#6cbf5e',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', right: '10%', bottom: `${JUMP_BLOCKS_GROUND_HEIGHT}px`,
          width: '150px', height: '60px', borderRadius: '75px 75px 0 0', background: '#5cb34f',
        }} />

        {blocks.map((block) => (
          <motion.div
            key={block.id}
            animate={block.alive ? { y: 0, rotate: 0 } : { y: 4, rotate: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              left: `${blockColLeftPct(block.col) + 1}%`,
              top: `${JUMP_BLOCKS_BLOCK_TOP}px`,
              width: `${colWidthPct - 2}%`,
              height: `${JUMP_BLOCKS_BLOCK_HEIGHT}px`,
              borderRadius: 'var(--radius)',
              background: block.alive ? '#f59e0b' : '#9ca3af',
              border: `3px solid ${block.alive ? '#92400e' : '#4b5563'}`,
              color: '#fff',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700,
              lineHeight: 1.1, textAlign: 'center', padding: '0.15rem', overflow: 'hidden',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: '0.9rem', lineHeight: 1 }}>{block.alive ? '?' : '✕'}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{block.label}</span>
          </motion.div>
        ))}

        {burst && (() => {
          const block = blocks.find((b) => b.id === burst.id)
          if (!block) return null
          return (
            <span key={`burst-${burst.id}`} aria-hidden="true" style={{
              position: 'absolute',
              left: `${blockColLeftPct(block.col) + 1}%`,
              top: `${JUMP_BLOCKS_BLOCK_TOP - 8}px`,
              width: `${colWidthPct - 2}%`,
              textAlign: 'center', fontSize: '1.8rem', lineHeight: 1,
            }}>
              {burst.emoji}
            </span>
          )
        })()}

        {/* Ground strip. */}
        <div aria-hidden="true" style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: `${JUMP_BLOCKS_GROUND_HEIGHT}px`,
          background: 'linear-gradient(180deg, #65a30d 0%, #65a30d 30%, #92400e 30%, #78350f 100%)',
          borderTop: '2px solid #3f6212',
        }} />

        {/* The running kid. */}
        <motion.div
          animate={{ left: `${kidXPct}%` }}
          transition={{ duration: 0.05, ease: 'linear' }}
          style={{
            position: 'absolute',
            bottom: `${JUMP_BLOCKS_GROUND_HEIGHT + jumpY}px`,
            width: `${JUMP_BLOCKS_KID_WIDTH_PCT}%`,
            height: `${JUMP_BLOCKS_KID_HEIGHT}px`,
            textAlign: 'center', fontSize: '2rem', lineHeight: 1,
          }}
          aria-label={`Your runner, ${Math.round(kidXPct)} percent across the level${jumpY > 0 ? ', jumping' : ''}`}
        >
          🏃
        </motion.div>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
        Hold ◀ ▶ to run, tap JUMP under the right block. A wrong block costs a life!
      </p>

      {/* Controls: run + jump. */}
      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button" aria-label="Run left"
          onPointerDown={() => holdDir('left', true)}
          onPointerUp={() => holdDir('left', false)}
          onPointerLeave={() => holdDir('left', false)}
          onPointerCancel={() => holdDir('left', false)}
          onContextMenu={(e) => e.preventDefault()}
          style={controlBtn}
        >
          ◀
        </button>
        <button
          type="button" aria-label="Jump"
          onPointerDown={jump}
          style={{
            ...controlBtn, flex: 1, maxWidth: '12rem',
            background: 'var(--color-primary)', color: '#fff', border: 'none',
            fontSize: '1.2rem', fontWeight: 800,
          }}
        >
          ⬆ JUMP
        </button>
        <button
          type="button" aria-label="Run right"
          onPointerDown={() => holdDir('right', true)}
          onPointerUp={() => holdDir('right', false)}
          onPointerLeave={() => holdDir('right', false)}
          onPointerCancel={() => holdDir('right', false)}
          onContextMenu={(e) => e.preventDefault()}
          style={controlBtn}
        >
          ▶
        </button>
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

export default function JumpBlocksActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Jump Blocks" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <JumpBlocksGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
