'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, shuffleArray } from './shared'
import ScorePill from '@/components/game/ScorePill'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  NUMBER_SLIDER_LIVES,
  NUMBER_SLIDER_POINTS_EXACT,
  NUMBER_SLIDER_POINTS_NEAR,
  NUMBER_SLIDER_ROUND_SECONDS,
  NUMBER_SLIDER_WARNING_SECONDS,
  buildNumberSliderLine,
  buildNumberSliderRounds,
  formatLineValue,
  scoreNumberSliderGuess,
  type NumberSliderLine,
  type NumberSliderRound,
} from '@/lib/number-slider'

/**
 * Number Slider — EduPlay's own number-line game (type 40,
 * last of the 8 remaining types toward 40).
 *
 * NOT a copy of any rival: no rival art, wording, or layout.
 * NOT a duplicate of Typing Race, Order, Quiz, or Speed
 * Judge (audit, 2026-11-04 — see lib/number-slider.ts):
 * Typing Race types digits against the clock; Order drags
 * ALL items into one sequence and checks the whole set
 * once; Quiz picks one option; Speed Judge judges one
 * claim at a time. Number Slider never types a digit,
 * never arranges a sequence, never picks an option, and
 * never judges a claim: it slides a marker along a
 * number line to the answer value and locks it in — the
 * skill is judging magnitude and position.
 *
 * Data: the standard creator item shape — prompt = the
 * question, answer = the number answer. Rounds are real
 * items only (see lib/number-slider.ts); no new save
 * path was needed: the save route already stores
 * prompt/answer for every type, and the adapter passes
 * creator rows through untouched.
 *
 * Rules (exact):
 * - ONE shared number line per game, built from ALL the
 *   game's numeric answers (never per round, so the line
 *   never moves between rounds and can never leak one
 *   round's answer). The line starts at 0 when every
 *   answer is >= 0, with padding past the highest
 *   answer, so the highest answer never sits exactly on
 *   the end of the line.
 * - ONE round per usable item (prompt present, answer a
 *   plain number). A game with no usable item shows
 *   "This game has no numbers to slide to yet."
 *   Non-numeric items are skipped in the player's own
 *   rounds — they are never forced onto a slider.
 * - Slide the marker (drag, touch, or arrow keys) to the
 *   answer value, then tap "Lock it in".
 * - EXACT hit: +10 points. NEAR miss (off by more than
 *   zero but no more than the tolerance — the larger of
 *   one step and 5% of the line span): +5 points.
 *   FAR miss (beyond the tolerance): 0 points and -1
 *   life. Score is out of 10 x rounds; the end screen
 *   also reports exact hits, because a near miss is not
 *   an exact hit even though it scores.
 * - 30 seconds per round, one timer warning at 5
 *   seconds left. Time-up: -1 life, "Time's up!", the
 *   round is skipped.
 * - 3 lives. All rounds done with lives left = win
 *   ("Number Slider Complete!"); 0 lives = game over
 *   ("Out of lives!"). onComplete fires exactly once
 *   with the real score plus exact/total counts and
 *   lives left.
 * - Pause via the shared PlayShell freezes the round
 *   timer and the slider (the timer effect + confirm
 *   handler both require status 'playing'). Reading How
 *   to Play mid-game also freezes the timer.
 *
 * Player-visible beats:
 * - How to Play on demand only — the shared PlayIntro on the play page shows the instructions first, so this page is never shown automatically at start; it explains how to play,
 *   how scores are given, the objective, the controls, the lives, the timer, the rounds, and how you win/finish — with
 *   a "Back to game" button. The same page is re-readable mid-game from the "How to play" button, and returning from
 *   it resumes the game; it never resets progress.
 * - Convert: COMPATIBLE only when EVERY answer is a
 *   number (a word answer can never be slid to, so a
 *   mixed game is refused up front instead of dropping
 *   items — see convert.ts). Print: printable as a
 *   number-line worksheet (prompt + line to mark +
 *   key; see print-worksheet.ts and PrintExport.tsx).
 *   Sitemap type list stays at 23 by decision — see
 *   seo/sitemap.ts.
 * - NOTE from the Maze Run / Speed Judge / Spell It /
 *   Picture Answer / Memory Recall / Claim Line /
 *   Opinion Cloud live checks: in draft Preview, the
 *   Preview shell shows its own generic "Preview
 *   Complete!" panel instead of this player's own
 *   win/lose wording. That is Preview design, not a
 *   bug here; the win/lose screens below still live
 *   in the player for saved play, with their real score.
 * - NOTE from the Opinion Cloud live check: the shared
 *   PlayShell header shows an elapsed-time counter and
 *   a generic "Score:" label even for untimed games.
 *   That chrome is fine here — Number Slider IS timed
 *   (30 seconds per round) — and it is deliberately NOT
 *   "fixed" in this batch.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are
 * built once per item CONTENT (fingerprint + ref guard),
 * never on render, so play-page timer ticks can never
 * reshuffle a game in progress. onComplete fires exactly
 * once per finished game.
 */

type NumberSliderEnd = 'win' | 'out-of-lives'

interface NumberSliderGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

function NumberSliderGame({ items, locale, onComplete, onProgress }: NumberSliderGameProps) {
  const [rounds, setRounds] = useState<NumberSliderRound[]>([])
  const [line, setLine] = useState<NumberSliderLine | null>(null)
  const [roundIndex, setRoundIndex] = useState(0)
  const [sliderValue, setSliderValue] = useState(0)
  const [showHowto, setShowHowto] = useState(false)
  const [started, setStarted] = useState(true)
  const [lives, setLives] = useState(NUMBER_SLIDER_LIVES)
  const [score, setScore] = useState(0)
  const [exactCount, setExactCount] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [timeLeft, setTimeLeft] = useState(NUMBER_SLIDER_ROUND_SECONDS)
  const [feedback, setFeedback] = useState<{ type: 'exact' | 'near' | 'far'; msg: string } | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [finished, setFinished] = useState(false)
  const [endKind, setEndKind] = useState<NumberSliderEnd | null>(null)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()

  // Build rounds + line once per content fingerprint
  // (prompt + answer: a changed item rebuilds the game,
  // same as a changed question would).
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    const built = buildNumberSliderRounds(items, { shuffle: shuffleArray })
    setRounds(built)
    setLine(built.length > 0 ? buildNumberSliderLine(built.map((r) => r.answer)) : null)
    setRoundIndex(0)
    setShowHowto(false)
    setStarted(true)
    setLives(NUMBER_SLIDER_LIVES)
    setScore(0)
    setExactCount(0)
    setAttempts(0)
    setTimeLeft(NUMBER_SLIDER_ROUND_SECONDS)
    setFeedback(null)
    setConfirmed(false)
    setFinished(false)
    setEndKind(null)
  }, [itemsFingerprint, items])

  // Slider starts at the line midpoint (rounded to a step)
  // each round — never on an answer, so a confirm without
  // moving is still a guess, not a free exact hit.
  useEffect(() => {
    if (!line) return
    const mid = Math.round(((line.min + line.max) / 2 / line.step)) * line.step
    setSliderValue(Math.min(line.max, Math.max(line.min, mid)))
    setTimeLeft(NUMBER_SLIDER_ROUND_SECONDS)
    setFeedback(null)
    setConfirmed(false)
  }, [roundIndex, line])

  const scoreRef = useRef(0)
  const livesRef = useRef(NUMBER_SLIDER_LIVES)
  const exactRef = useRef(0)
  const attemptsRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  const warnedRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { exactRef.current = exactCount })
  useEffect(() => { attemptsRef.current = attempts })
  useEffect(() => { onProgress(score, finished) }, [score, finished, onProgress])

  const finishGame = useCallback((kind: NumberSliderEnd) => {
    setEndKind(kind)
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(scoreRef.current, {
        correctCount: exactRef.current,
        totalCount: attemptsRef.current,
        livesLeft: livesRef.current,
      })
    }
  }, [])

  // Finish sound once: win on completing all rounds with
  // lives left, lose on 0 lives.
  useEffect(() => {
    if (!finished || !endKind) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    if (endKind === 'win') playEduSound('win', readInteractiveSoundOn())
    else playEduSound('lose', readInteractiveSoundOn())
  }, [finished, endKind])

  /** Advance after the feedback beat, or finish the game. */
  const advanceAfterFeedback = useCallback(() => {
    advancingRef.current = false
    warnedRef.current = false
    if (livesRef.current <= 0) {
      finishGame('out-of-lives')
      return
    }
    if (roundIndex + 1 >= rounds.length) {
      finishGame('win')
      return
    }
    setRoundIndex(roundIndex + 1)
  }, [finishGame, roundIndex, rounds.length])

  function handleConfirm() {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || confirmed || !line) return
    const round = rounds[roundIndex]
    if (!round) return
    const result = scoreNumberSliderGuess(sliderValue, round.answer, line)
    setConfirmed(true)
    setAttempts((a) => a + 1)
    attemptsRef.current = attemptsRef.current + 1
    advancingRef.current = true
    if (result.kind === 'exact') {
      playEduSound('correct', readInteractiveSoundOn())
      setScore((s) => s + NUMBER_SLIDER_POINTS_EXACT)
      scoreRef.current = scoreRef.current + NUMBER_SLIDER_POINTS_EXACT
      setExactCount((c) => c + 1)
      exactRef.current = exactRef.current + 1
      setFeedback({ type: 'exact', msg: `Exact! +${NUMBER_SLIDER_POINTS_EXACT} points.` })
    } else if (result.kind === 'near') {
      playEduSound('correct', readInteractiveSoundOn())
      setScore((s) => s + NUMBER_SLIDER_POINTS_NEAR)
      scoreRef.current = scoreRef.current + NUMBER_SLIDER_POINTS_NEAR
      setFeedback({ type: 'near', msg: `Close! +${NUMBER_SLIDER_POINTS_NEAR} points — the answer was ${formatLineValue(round.answer)}.` })
    } else {
      playEduSound('wrong', readInteractiveSoundOn())
      setLives((l) => Math.max(0, l - 1))
      livesRef.current = Math.max(0, livesRef.current - 1)
      setFeedback({ type: 'far', msg: `Too far — the answer was ${formatLineValue(round.answer)}. You lost a life.` })
    }
    setTimeout(advanceAfterFeedback, 1600)
  }

  /** Lose one life on a time-up, then advance after the feedback beat. */
  const timeUp = useCallback(() => {
    if (advancingRef.current) return
    const round = rounds[roundIndex]
    if (!round) return
    advancingRef.current = true
    setConfirmed(true)
    setAttempts((a) => a + 1)
    attemptsRef.current = attemptsRef.current + 1
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setFeedback({ type: 'far', msg: `Time's up! The answer was ${formatLineValue(round.answer)}. You lost a life.` })
    setTimeout(advanceAfterFeedback, 1600)
  }, [advanceAfterFeedback, roundIndex, rounds])

  // Round timer: ticks only while the shell is playing,
  // the How-to-Play page is closed, and the game is not
  // finished. Pause and How-to-Play both freeze it; it
  // never drains away while the player cannot answer.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || confirmed) return
    const id = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, confirmed])

  useEffect(() => {
    if (timeLeft !== 0 || shellStatus !== 'playing' || showHowto || finished) return
    playEduSound('wrong', readInteractiveSoundOn())
    timeUp()
  }, [timeLeft, shellStatus, showHowto, finished, timeUp])

  // Timer warning: one short warning when 5 seconds remain.
  useEffect(() => {
    if (timeLeft !== NUMBER_SLIDER_WARNING_SECONDS || shellStatus !== 'playing' || showHowto || finished || confirmed) return
    if (warnedRef.current) return
    warnedRef.current = true
    playEduSound('timerWarning', readInteractiveSoundOn())
  }, [timeLeft, shellStatus, showHowto, finished, confirmed])

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    const built = buildNumberSliderRounds(items, { shuffle: shuffleArray })
    setRounds(built)
    setLine(built.length > 0 ? buildNumberSliderLine(built.map((r) => r.answer)) : null)
    setRoundIndex(0)
    setShowHowto(false)
    setStarted(true)
    setLives(NUMBER_SLIDER_LIVES)
    livesRef.current = NUMBER_SLIDER_LIVES
    setScore(0)
    scoreRef.current = 0
    setExactCount(0)
    exactRef.current = 0
    setAttempts(0)
    attemptsRef.current = 0
    setTimeLeft(NUMBER_SLIDER_ROUND_SECONDS)
    setFeedback(null)
    setConfirmed(false)
    setFinished(false)
    setEndKind(null)
    completedRef.current = false
    advancingRef.current = false
    warnedRef.current = false
  }

  if (rounds.length === 0 || !line) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no numbers to slide to yet.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🎚️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Number Slider</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Slide to the number on the line.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each round shows a question and one number line. Slide the marker along the line to the answer value, then tap &ldquo;Lock it in&rdquo;. The line is the same every round — it is built from all the game&apos;s answers, so it never moves and never gives one round&apos;s answer away.</p>
          <p><strong>How scores are given:</strong> landing exactly on the answer earns {NUMBER_SLIDER_POINTS_EXACT} points. Landing close — within one step or 5% of the line, whichever is larger — earns {NUMBER_SLIDER_POINTS_NEAR} points, because a close estimate is good estimating. Landing further away earns 0 points and costs 1 life.</p>
          <p><strong>Objective:</strong> finish every round with lives left. Your score is out of {NUMBER_SLIDER_POINTS_EXACT} per round, and the end screen also tells you how many you hit exactly.</p>
          <p><strong>Controls:</strong> drag the slider with a mouse or finger, or move it with the arrow keys, then tap &ldquo;Lock it in&rdquo;. A confirmed value is locked — it cannot be moved afterwards.</p>
          <p><strong>Lives:</strong> you start with {NUMBER_SLIDER_LIVES} lives. A far miss costs 1 life, and so does letting a round&apos;s timer run out. Exact and close answers never cost a life.</p>
          <p><strong>Timer:</strong> {NUMBER_SLIDER_ROUND_SECONDS} seconds per round. You hear one warning when {NUMBER_SLIDER_WARNING_SECONDS} seconds are left. The timer pauses when you pause the game or re-read this page.</p>
          <p><strong>Rounds:</strong> one round per question with a number answer. A question whose answer is not a number is skipped — it is never forced onto the line.</p>
          <p><strong>How you win and finish:</strong> finish all rounds with lives left and you win. Reach 0 lives and the game ends at once. The end screen shows your score, how many you hit exactly, and how many lives are left.</p>
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
    const title = endKind === 'win' ? 'Number Slider Complete!' : 'Out of lives!'
    const emoji = endKind === 'win' ? '🏆' : '💔'
    const maxScore = NUMBER_SLIDER_POINTS_EXACT * rounds.length
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">{emoji}</div>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          {title}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          <ScorePill score={score} total={maxScore} big />
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {exactCount} exact of {rounds.length} rounds
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

  // ---- Round view: one question, one line, one confirm. ----
  const round = rounds[roundIndex]
  const timerPct = (timeLeft / NUMBER_SLIDER_ROUND_SECONDS) * 100
  const sliderPct = line.max === line.min ? 0 : ((sliderValue - line.min) / (line.max - line.min)) * 100
  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <ScorePill score={score} total={NUMBER_SLIDER_POINTS_EXACT * rounds.length} />
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, NUMBER_SLIDER_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite" style={{ color: timeLeft <= NUMBER_SLIDER_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
        <span aria-live="polite">Round {roundIndex + 1} of {rounds.length}</span>
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
      <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
        <motion.div style={{
          height: '100%', borderRadius: 'var(--radius)',
          background: timerPct > 50 ? 'var(--color-success)' : timerPct > 20 ? 'var(--color-warning)' : 'var(--color-danger)',
        }} animate={{ width: `${timerPct}%` }} transition={{ duration: 1, ease: 'linear' }} />
      </div>

      <motion.div animate={{ x: feedback?.type === 'far' ? [0, -8, 8, -4, 4, 0] : 0 }} transition={{ duration: 0.4 }}>
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.25rem',
          color: 'var(--color-text-primary)', fontSize: '1.125rem',
          fontFamily: 'var(--font-display)', boxShadow: 'var(--shadow-card)', textAlign: 'center',
        }}>
          {round.prompt}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <motion.span key={sliderValue} initial={{ scale: 1.2 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }} style={{ display: 'inline-block', fontSize: '2rem', fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }} aria-live="polite">
            {formatLineValue(sliderValue)}
          </motion.span>
        </div>

        <div style={{ position: 'relative', padding: '0.5rem 0 0.25rem' }}>
          <input
            type="range"
            min={line.min}
            max={line.max}
            step={line.step}
            value={sliderValue}
            disabled={confirmed}
            onChange={(e) => {
              if (confirmed) return
              playEduSound('click', readInteractiveSoundOn())
              setSliderValue(parseFloat(e.target.value))
            }}
            aria-label={`Slide to your answer, between ${formatLineValue(line.min)} and ${formatLineValue(line.max)}`}
            style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: confirmed ? 'default' : 'pointer' }}
          />
          <div style={{ position: 'relative', height: '1.25rem', marginTop: '0.15rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
            {line.ticks.map((tick, i) => (
              <span key={i} style={{ position: 'absolute', left: `${(i / 4) * 100}%`, transform: i === 0 ? 'translateX(0)' : i === 4 ? 'translateX(-100%)' : 'translateX(-50%)' }}>
                {formatLineValue(tick)}
              </span>
            ))}
          </div>
          <div style={{ position: 'relative', height: '6px', marginTop: '0.1rem' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '6px', background: 'var(--color-border)', borderRadius: 'var(--radius)' }} />
            <motion.div style={{ position: 'absolute', left: 0, top: 0, height: '6px', background: 'var(--color-primary)', borderRadius: 'var(--radius)' }} animate={{ width: `${sliderPct}%` }} transition={{ duration: 0.15 }} />
          </div>
        </div>

        <button
          onClick={handleConfirm}
          disabled={confirmed}
          style={{
            marginTop: '1.25rem', width: '100%', padding: '0.9rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: confirmed ? 'var(--color-border)' : 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)',
            fontSize: '1.05rem', cursor: confirmed ? 'default' : 'pointer',
          }}
        >
          {confirmed ? 'Locked in' : 'Lock it in'}
        </button>
      </motion.div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              marginTop: '1rem', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)',
              background: feedback.type === 'exact' ? 'var(--color-success)' : feedback.type === 'near' ? 'var(--color-warning)' : 'var(--color-danger)',
              color: '#fff', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem',
            }}>
            {feedback.type === 'exact' ? '⭐ ' : feedback.type === 'near' ? '🎯 ' : '❌ '}{feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function NumberSliderActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Number Slider" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <NumberSliderGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
