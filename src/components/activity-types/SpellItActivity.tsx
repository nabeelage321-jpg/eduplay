'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, shuffleArray } from './shared'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import type { ActivityItem } from '@/types'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  SPELL_IT_LETTER_POINTS,
  SPELL_IT_LIVES,
  SPELL_IT_WARNING_SECONDS,
  SPELL_IT_WORD_BONUS,
  SPELL_IT_WORD_SECONDS,
  buildSpellItRounds,
  type SpellItRound,
} from '@/lib/spell-it'

/**
 * Spell It — EduPlay's own spelling game (type 35, third of the
 * 8 remaining types toward 40).
 *
 * NOT a copy of any rival: no rival art, wording, or layout. The
 * player sees a clue and must spell the answer word, letter by
 * letter, in order — by typing or by tapping the on-screen
 * A–Z keyboard. Sounds are the shared interactive Web Audio
 * system (synthesized, no assets). Sound is ON by default for
 * this game; the in-player toggle mutes it in one tap.
 *
 * Data: the standard creator item shape — prompt = clue, answer
 * = the word to spell. Rounds are real items only (see
 * lib/spell-it.ts); no new save path was needed: the save route
 * already stores prompt/answer for every type, and the adapter
 * passes creator rows through untouched.
 *
 * Rules (exact):
 * - 3 lives. +1 point per correct letter, +5 bonus per completed
 *   word. A round's max is its letter count + 5, so the game's
 *   max is the sum of its rounds' maxima.
 * - One round per usable item (answer containing at least one
 *   letter), rounds shuffled once per item content. Letters are
 *   entered in order; comparison is case-insensitive.
 * - Correct letter: locks green, correct sound, +1 point.
 *   Wrong letter: red flash, wrong sound, rejected — the blank
 *   stays empty and NO life is lost (it costs time only).
 * - Spaces show as word gaps; digits, hyphens, apostrophes and
 *   other non-letters are shown revealed and earn no points.
 * - 60 seconds per word. At 10 seconds left, one timer-warning
 *   sound. Time up: -1 life, "Time's up!", word skipped. The
 *   "Skip word" button also costs 1 life and skips the word.
 * - 0 lives = game over (lose). All words attempted with lives
 *   left = win ("Spell It Complete!"). onComplete fires exactly
 *   once with the real score plus words completed/total counts
 *   and lives left.
 * - Pause via the shared PlayShell freezes the word timer and
 *   the letter input (the timer effect + letter handler both
 *   require status 'playing'). Reading How to Play mid-game
 *   also freezes the timer.
 *
 * Player-visible beats:
 * - How to Play FIRST, before any play, explaining how to play,
 *   how scores are given, the objective, the controls, the
 *   lives, the timer, the rounds, and how you win/finish — with
 *   a Skip button ("Skip instructions — start playing"). The
 *   same page is re-readable mid-game from the "How to play"
 *   button, and returning from it resumes the game; it never
 *   resets progress.
 * - The on-screen keyboard is A–Z (Latin letters). Answers in
 *   other scripts are typed on the device keyboard — the letter
 *   handler accepts any typed letter, not just A–Z.
 * - Convert: COMPATIBLE when every answer contains a letter
 *   (see convert.ts) — otherwise a plain refusal, never a
 *   mangled game. Print: printable as a spelling worksheet
 *   (clue + letter blanks, key lists the word — see
 *   print-worksheet.ts and PrintExport.tsx). Sitemap type list
 *   stays at 23 by decision — see seo/sitemap.ts.
 * - NOTE from the Maze Run / Speed Judge live checks: in draft
 *   Preview, the Preview shell shows its own generic "Preview
 *   Complete!" panel instead of this player's own win/lose
 *   wording. That is Preview design, not a bug here; the
 *   win/lose screens below still live in the player for saved
 *   play, with their real score.
 *
 * Stability (the 2026-11-02 quiz lesson): rounds are built once
 * per item CONTENT (fingerprint + ref guard), never on render,
 * so play-page timer ticks can never reshuffle a game in
 * progress. onComplete fires exactly once per finished game.
 */

interface SpellItGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

const KEYBOARD_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

function SpellItGame({ items, locale, onComplete, onProgress }: SpellItGameProps) {
  const [rounds, setRounds] = useState<SpellItRound[]>([])
  const [maxScore, setMaxScore] = useState(0)
  const [showHowto, setShowHowto] = useState(true)
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [lives, setLives] = useState(SPELL_IT_LIVES)
  const [score, setScore] = useState(0)
  const [wordsDone, setWordsDone] = useState(0)
  const [filled, setFilled] = useState(0)
  const [timeLeft, setTimeLeft] = useState(SPELL_IT_WORD_SECONDS)
  const [wrongKey, setWrongKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; msg: string } | null>(null)
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()

  // Build rounds once per content fingerprint.
  const itemsFingerprint = items
    .map((i) => `${i.prompt}\u0000${i.answer ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    const built = buildSpellItRounds(items, { shuffle: shuffleArray })
    setRounds(built)
    setMaxScore(built.reduce((sum, r) => sum + r.maxPoints, 0))
    setShowHowto(true)
    setStarted(false)
    setCurrent(0)
    setLives(SPELL_IT_LIVES)
    setScore(0)
    setWordsDone(0)
    setFilled(0)
    setTimeLeft(SPELL_IT_WORD_SECONDS)
    setWrongKey(null)
    setFeedback(null)
    setFinished(false)
    setWon(false)
  }, [itemsFingerprint, items])

  const scoreRef = useRef(0)
  const livesRef = useRef(SPELL_IT_LIVES)
  const wordsRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  const warnedRoundRef = useRef(-1)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { scoreRef.current = score })
  useEffect(() => { livesRef.current = lives })
  useEffect(() => { wordsRef.current = wordsDone })
  useEffect(() => { onProgress(score, finished) }, [score, finished, onProgress])

  const finishGame = useCallback((didWin: boolean) => {
    setWon(didWin)
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(scoreRef.current, {
        correctCount: wordsRef.current,
        totalCount: rounds.length,
        livesLeft: livesRef.current,
      })
    }
  }, [rounds.length])

  // Finish sound once: win on Spell It Complete, lose on game over.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound(won ? 'win' : 'lose', readInteractiveSoundOn())
  }, [finished, won])

  /** Advance after the current word ends. `lostLife` already applied. */
  const advanceFrom = useCallback((from: number, wordCompleted: boolean) => {
    advancingRef.current = false
    setWrongKey(null)
    setFeedback(null)
    if (wordCompleted) {
      setWordsDone((w) => w + 1)
      wordsRef.current = wordsRef.current + 1
    }
    if (livesRef.current <= 0) {
      finishGame(false)
      return
    }
    if (from + 1 >= rounds.length) {
      finishGame(true)
      return
    }
    setCurrent(from + 1)
    setFilled(0)
    setTimeLeft(SPELL_IT_WORD_SECONDS)
    warnedRoundRef.current = -1
  }, [finishGame])

  /** Lose one life and skip the current word (time-up or Skip word). */
  const loseLifeAndSkip = useCallback((msg: string) => {
    if (advancingRef.current) return
    advancingRef.current = true
    setLives((l) => Math.max(0, l - 1))
    livesRef.current = Math.max(0, livesRef.current - 1)
    setFeedback({ type: 'wrong', msg })
    const from = current
    setTimeout(() => advanceFrom(from, false), 1400)
  }, [current, advanceFrom])

  // Word timer: ticks only while the shell is playing, the
  // How-to-Play page is closed, and the game is not finished.
  // Pause and How-to-Play both freeze it; it never drains away
  // while the player cannot type.
  useEffect(() => {
    if (shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    const id = setInterval(() => setTimeLeft((t) => (t > 1 ? t - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [shellStatus, showHowto, finished, rounds.length, current])

  useEffect(() => {
    if (timeLeft !== 0 || shellStatus !== 'playing' || showHowto || finished || rounds.length === 0) return
    loseLifeAndSkip("Time's up! You lost a life.")
  }, [timeLeft, shellStatus, showHowto, finished, rounds.length, loseLifeAndSkip])

  // Timer warning: one short warning when 10 seconds remain.
  useEffect(() => {
    if (timeLeft !== SPELL_IT_WARNING_SECONDS || shellStatus !== 'playing' || showHowto || finished) return
    if (warnedRoundRef.current === current) return
    warnedRoundRef.current = current
    playEduSound('timerWarning', readInteractiveSoundOn())
  }, [timeLeft, shellStatus, showHowto, finished, current])

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  /** The next letter cell the player must fill, or null if the word is done. */
  function nextLetterIndex(round: SpellItRound): number | null {
    let seen = 0
    for (let i = 0; i < round.cells.length; i++) {
      if (round.cells[i].kind !== 'letter') continue
      if (seen === filled) return i
      seen++
    }
    return null
  }

  function handleLetter(raw: string) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current) return
    const round = rounds[current]
    if (!round) return
    const idx = nextLetterIndex(round)
    if (idx === null) return
    const wanted = round.cells[idx].char.toLowerCase()
    const typed = raw.toLowerCase()
    if (typed !== wanted) {
      // Wrong letter: red flash + wrong sound, rejected. The
      // blank stays empty and NO life is lost — it costs time
      // only. Lives are lost only by time-up or Skip word.
      playEduSound('wrong', readInteractiveSoundOn())
      setWrongKey(raw.toUpperCase())
      setTimeout(() => setWrongKey(null), 500)
      return
    }
    playEduSound('correct', readInteractiveSoundOn())
    const newFilled = filled + 1
    setFilled(newFilled)
    setScore((s) => s + SPELL_IT_LETTER_POINTS)
    scoreRef.current = scoreRef.current + SPELL_IT_LETTER_POINTS
    if (newFilled >= round.letterCount) {
      // Word complete: +5 bonus, then the next word.
      advancingRef.current = true
      setScore((s) => s + SPELL_IT_WORD_BONUS)
      scoreRef.current = scoreRef.current + SPELL_IT_WORD_BONUS
      setFeedback({ type: 'correct', msg: `Word complete! +${SPELL_IT_WORD_BONUS} bonus points.` })
      const from = current
      setTimeout(() => advanceFrom(from, true), 1200)
    }
  }

  // Keyboard: any single typed letter. Guarded by the same rules
  // as the on-screen keyboard (handleLetter re-checks them).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current) return
      if (e.key.length === 1 && /\p{L}/u.test(e.key)) {
        e.preventDefault()
        handleLetter(e.key)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // handleLetter reads current render state; re-subscribe on change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellStatus, showHowto, finished, current, filled, rounds])

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    setShowHowto(true)
    setStarted(false)
    setCurrent(0)
    setLives(SPELL_IT_LIVES)
    setScore(0)
    setWordsDone(0)
    setFilled(0)
    setTimeLeft(SPELL_IT_WORD_SECONDS)
    setWrongKey(null)
    setFeedback(null)
    setFinished(false)
    setWon(false)
    completedRef.current = false
    advancingRef.current = false
    warnedRoundRef.current = -1
  }

  if (rounds.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no words to spell yet.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">🔡</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Spell It</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Read the clue, spell the word — letter by letter.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> each round shows one clue and a row of blanks — one blank per letter of the answer word. Spell the word in order: type the next letter, or tap it on the letter keyboard. A correct letter locks green and you move to the next blank. Spaces between words show as gaps, and digits or punctuation are already shown for you.</p>
          <p><strong>How scores are given:</strong> each correct letter earns {SPELL_IT_LETTER_POINTS} point, and finishing a word earns a {SPELL_IT_WORD_BONUS}-point bonus. The game is scored out of {maxScore} ({rounds.length} {rounds.length === 1 ? 'word' : 'words'}).</p>
          <p><strong>Objective:</strong> spell every word, without running out of lives.</p>
          <p><strong>Controls:</strong> type the letters on your keyboard, or tap them on the on-screen A–Z keyboard. Words in other scripts are typed on your device keyboard.</p>
          <p><strong>Lives:</strong> you start with {SPELL_IT_LIVES} lives. A wrong letter flashes red and is rejected — it costs NO life, only time. You lose a life only when a word's timer runs out, or when you press Skip word.</p>
          <p><strong>Timer:</strong> {SPELL_IT_WORD_SECONDS} seconds per word. You hear one warning when {SPELL_IT_WARNING_SECONDS} seconds are left. The timer pauses when you pause the game or re-read this page.</p>
          <p><strong>Rounds:</strong> one word per clue, in shuffled order.</p>
          <p><strong>How you win and finish:</strong> attempt every word with at least one life left and you win. Reach 0 lives and the game ends — your score still counts. The end screen shows your score, how many words you completed, and how many lives are left.</p>
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
          {won ? 'Spell It Complete!' : 'Out of lives!'}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.25rem' }}>
          Score: {score} / {maxScore}
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          {wordsDone} of {rounds.length} words completed
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

  // Locked letters are the answer's own characters, in order.
  let letterSeen = 0
  const cells = round.cells.map((cell, i) => {
    if (cell.kind !== 'letter') return { ...cell, locked: false, display: cell.kind === 'gap' ? '' : cell.char }
    const locked = letterSeen < filled
    letterSeen++
    return { ...cell, locked, display: locked ? cell.char : '' }
  })
  const nextIdx = (() => {
    let seen = 0
    for (let i = 0; i < round.cells.length; i++) {
      if (round.cells[i].kind !== 'letter') continue
      if (seen === filled) return i
      seen++
    }
    return -1
  })()

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <motion.span key={score} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} style={{ display: 'inline-block' }} aria-live="polite">Score: <strong style={{ color: 'var(--color-primary)' }}>{score} / {maxScore}</strong></motion.span>
        <span aria-live="polite">{'♥'.repeat(Math.max(0, lives))}{'♡'.repeat(Math.max(0, SPELL_IT_LIVES - lives))} {lives} {lives === 1 ? 'life' : 'lives'}</span>
        <span aria-live="polite" style={{ color: timeLeft <= SPELL_IT_WARNING_SECONDS ? 'var(--color-danger)' : undefined }}>⏱ {timeLeft}s</span>
        <span aria-live="polite">Word {current + 1} of {rounds.length}</span>
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

      <motion.div animate={{ x: wrongKey ? [0, -8, 8, -4, 4, 0] : 0 }} transition={{ duration: 0.4 }}>
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.25rem',
          color: 'var(--color-text-primary)', textAlign: 'center', boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ fontSize: '1.5rem', lineHeight: 1, marginBottom: '0.5rem' }} aria-hidden="true">⭐</div>
          <p style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            {round.prompt}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center', marginTop: '1.25rem' }} aria-label="Word to spell">
            {cells.map((cell, i) => {
              if (cell.kind === 'gap') {
                return <span key={i} style={{ width: '1rem' }} aria-hidden="true" />
              }
              const isNext = i === nextIdx
              return (
                <span
                  key={i}
                  style={{
                    minWidth: '2.2rem', height: '2.6rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 'var(--radius)', fontSize: '1.4rem', fontFamily: 'var(--font-display)',
                    border: `2px solid ${cell.locked ? 'var(--color-success)' : isNext ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: cell.locked ? 'var(--color-success)' : 'var(--color-surface)',
                    color: cell.locked ? '#fff' : 'var(--color-text-primary)',
                  }}
                >
                  {cell.display || (cell.kind === 'shown' ? cell.char : '')}
                </span>
              )
            })}
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
            {filled} of {round.letterCount} letters spelled
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
          {KEYBOARD_ROWS.map((row) => (
            <div key={row} style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[...row].map((letter) => (
                <button
                  key={letter}
                  type="button"
                  aria-label={`Letter ${letter}`}
                  onClick={() => handleLetter(letter)}
                  style={{
                    minWidth: '2.4rem', padding: '0.65rem 0.3rem', borderRadius: 'var(--radius)',
                    border: `2px solid ${wrongKey === letter ? 'var(--color-danger)' : 'var(--color-border)'}`,
                    background: wrongKey === letter ? 'var(--color-danger)' : 'var(--color-surface)',
                    color: wrongKey === letter ? '#fff' : 'var(--color-text-primary)',
                    fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Type the letters, or tap them above. A wrong letter flashes red and is rejected — it costs no life.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
          <button
            onClick={() => loseLifeAndSkip('Word skipped. You lost a life.')}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--color-border)', background: 'var(--color-surface)',
              color: 'var(--color-text-secondary)', fontFamily: 'var(--font-display)', fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            Skip word (−1 life)
          </button>
        </div>
      </motion.div>

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

export default function SpellItActivity({ items, theme, locale, onComplete }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { correctCount?: number; totalCount?: number; livesLeft?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Spell It" score={shellScore} finished={shellFinished} onElapsed={handleElapsed}>
      <SpellItGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
