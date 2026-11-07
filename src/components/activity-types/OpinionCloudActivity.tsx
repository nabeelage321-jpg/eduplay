'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL, shuffleArray } from './shared'
import PlayShell, { usePlayShellStatus } from './PlayShell'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'
import {
  OPINION_CLOUD_REACTIONS,
  OPINION_REACTION_EMOJI,
  OPINION_REACTION_LABEL,
  buildOpinionCloudStatements,
  opinionCloudComplete,
  opinionCloudCounts,
  opinionCloudShared,
  type OpinionReaction,
  type OpinionCloudStatement,
} from '@/lib/opinion-cloud'

/**
 * Opinion Cloud — EduPlay's own opinion game (type 39,
 * seventh of the 8 remaining types toward 40).
 *
 * NOT a copy of any rival: no rival art, wording, or
 * layout. NOT a duplicate of any knowledge type (audit,
 * 2026-11-04 — see lib/opinion-cloud.ts): no poll,
 * survey, or vote type exists on EduPlay (the only
 * "poll" hits are live-session network polling);
 * Categorize sorts into teacher-set categories scored
 * right/wrong; TrueFalse gives a verdict scored
 * right/wrong; Speed Judge judges claims right/wrong.
 * Opinion Cloud never scores right/wrong at all: every
 * reaction — Agree, Disagree, Not sure — counts exactly
 * the same, as participation.
 *
 * Data: the standard creator item shape — prompt = the
 * statement to react to. The answer field is never
 * required and never displayed: opinions have no right
 * answer, so there is nothing to reveal as "correct".
 * No new save path was needed: the save route already
 * stores prompt/answer for every type, and the adapter
 * passes creator rows through untouched.
 *
 * Rules (exact):
 * - One statement per usable item (prompt present,
 *   non-blank). Statements are shuffled once per item
 *   content (fingerprint + ref guard, the 2026-11-02
 *   quiz lesson).
 * - React Agree, Disagree, or Not sure. A reaction
 *   locks in with a click sound and a short feedback
 *   beat ("Opinion noted"), then the next statement
 *   appears. A reaction is never re-tapped in v1.
 * - NO lives: nothing is ever lost, because no opinion
 *   is wrong. NO timer: opinions are untimed — no
 *   per-statement timer, no timer warning, no time-up.
 *   There is deliberately NO wrong-answer sound in this
 *   game: no opinion is ever punished.
 * - Finish: every statement reacted to. The finish
 *   screen is the player's own cloud — counts per
 *   reaction plus the statements grouped by reaction.
 *   Solo v1 shows ONLY the player's own cloud; a
 *   class-wide cloud needs server storage and is
 *   phase 2 — it is never faked from one player's
 *   answers, and no consensus percentage is invented.
 * - Score, honestly defined: the number of opinions
 *   shared (one per reacted statement, every reaction
 *   counting 1 equally). The player header labels it
 *   "Shared", the finish screen labels it "opinions
 *   shared", and the play shell's Score slot carries
 *   this same count. onComplete fires exactly once
 *   with that count plus the statement total — and
 *   deliberately NO correctCount, because nothing here
 *   is correct or incorrect.
 * - Pause via the shared PlayShell covers the game, so
 *   no reaction can be tapped while paused. Re-reading
 *   How to Play mid-game freezes nothing, because
 *   nothing in this game is timed.
 * - Convert: COMPATIBLE — any prompt/answer game plays
 *   as Opinion Cloud (prompts become statements; their
 *   answers are never shown or scored as right answers;
 *   see convert.ts). Print: printable as a KEYLESS
 *   opinion sheet (statements + Agree/Disagree/Not sure
 *   checkboxes, plainly "no right answers", no answer
 *   key page at all; see print-worksheet.ts and
 *   PrintExport.tsx). Sitemap type list stays at 23 by
 *   decision — see seo/sitemap.ts.
 * - NOTE from the Maze Run / Speed Judge / Spell It /
 *   Picture Answer / Memory Recall / Claim Line live
 *   checks: in draft Preview, the Preview shell shows
 *   its own generic "Preview Complete!" panel instead
 *   of this player's own finish wording. That is
 *   Preview design, not a bug here; the finish screen
 *   below still lives in the player for saved play,
 *   with its real cloud.
 *
 * Stability (the 2026-11-02 quiz lesson): statements
 * are built once per item CONTENT (fingerprint + ref
 * guard), never on render, so play-page timer ticks can
 * never reshuffle a game in progress. onComplete fires
 * exactly once per finished game.
 */

interface OpinionCloudGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean) => void
}

function OpinionCloudGame({ items, locale, onComplete, onProgress }: OpinionCloudGameProps) {
  const [statements, setStatements] = useState<OpinionCloudStatement[]>([])
  const [index, setIndex] = useState(0)
  const [reactions, setReactions] = useState<Array<OpinionReaction | null>>([])
  const [showHowto, setShowHowto] = useState(true)
  const [started, setStarted] = useState(false)
  const [picked, setPicked] = useState<OpinionReaction | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)

  const rtl = isRTL(locale)
  const shellStatus = usePlayShellStatus()

  // Build statements once per content fingerprint
  // (prompts: a changed item rebuilds the game, same as
  // a changed question would).
  const itemsFingerprint = items.map((i) => `${i.prompt}`).join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    const built = buildOpinionCloudStatements(items, { shuffle: shuffleArray })
    setStatements(built)
    setIndex(0)
    setReactions(built.map(() => null))
    setShowHowto(true)
    setStarted(false)
    setPicked(null)
    setFeedback(null)
    setFinished(false)
  }, [itemsFingerprint, items])

  const sharedRef = useRef(0)
  const totalRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const finishedSoundRef = useRef(false)
  const advancingRef = useRef(false)
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { sharedRef.current = opinionCloudShared(reactions) })
  useEffect(() => { totalRef.current = statements.length })
  useEffect(() => { onProgress(opinionCloudShared(reactions), finished) }, [reactions, finished, onProgress])

  const finishGame = useCallback(() => {
    setFinished(true)
    if (!completedRef.current) {
      completedRef.current = true
      onCompleteRef.current(sharedRef.current, {
        totalCount: totalRef.current,
      })
    }
  }, [])

  // Finish sound once: a gentle win sound for completing
  // your cloud. There is no lose sound here — finishing
  // a cloud is never a loss, and no opinion is wrong.
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound('win', readInteractiveSoundOn())
  }, [finished])

  function startPlaying() {
    playEduSound('click', readInteractiveSoundOn())
    completedRef.current = false
    setShowHowto(false)
    setStarted(true)
  }

  function handleReact(reaction: OpinionReaction) {
    if (shellStatus !== 'playing' || showHowto || finished || advancingRef.current || picked !== null) return
    if (index >= statements.length) return
    playEduSound('click', readInteractiveSoundOn())
    setPicked(reaction)
    setFeedback(`Opinion noted ${OPINION_REACTION_EMOJI[reaction]}`)
    const next = [...reactions]
    next[index] = reaction
    setReactions(next)
    sharedRef.current = opinionCloudShared(next)
    advancingRef.current = true
    setTimeout(() => {
      advancingRef.current = false
      setPicked(null)
      setFeedback(null)
      if (opinionCloudComplete(next)) {
        finishGame()
      } else {
        setIndex(index + 1)
      }
    }, 900)
  }

  function playAgain() {
    playEduSound('click', readInteractiveSoundOn())
    const built = buildOpinionCloudStatements(items, { shuffle: shuffleArray })
    setStatements(built)
    setIndex(0)
    setReactions(built.map(() => null))
    setShowHowto(true)
    setStarted(false)
    setPicked(null)
    setFeedback(null)
    setFinished(false)
    completedRef.current = false
    advancingRef.current = false
  }

  if (statements.length === 0) {
    return (
      <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
        This game has no statements to react to yet.
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
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }} aria-hidden="true">☁️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', margin: '0.5rem 0 0.25rem' }}>How to play Opinion Cloud</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            Share your opinion — no right or wrong answers.
          </p>
        </div>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
          <p><strong>How to play:</strong> one statement at a time. Read it, then tap 👍 Agree, 👎 Disagree, or 🤔 Not sure. Your reaction locks in and the statement joins your cloud, then the next statement appears.</p>
          <p><strong>How scores are given:</strong> they are not — no opinion is scored right or wrong. Every reaction counts exactly the same: one shared opinion. The number you see is how many opinions you have shared, not points for being right.</p>
          <p><strong>Objective:</strong> react to every statement and build your own opinion cloud.</p>
          <p><strong>Controls:</strong> tap one of the three reaction buttons under each statement.</p>
          <p><strong>Lives:</strong> none — nothing is ever lost, because no opinion is wrong.</p>
          <p><strong>Timer:</strong> none — opinions are untimed. Take as long as you like on each statement. Pausing the game covers it so no reaction can be tapped while paused.</p>
          <p><strong>Rounds:</strong> one statement per item in the game, in shuffled order. A game with one statement has one round.</p>
          <p><strong>How you win and finish:</strong> there is no winning or losing here — when every statement has your reaction, your cloud is complete. The finish screen shows your cloud: how many you agreed, disagreed, or were not sure about, and which statements went where. Only your own cloud is shown; nobody else&apos;s opinions are mixed in.</p>
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

  // ---- Finish screen: the player's own cloud. ----
  if (finished) {
    const counts = opinionCloudCounts(reactions)
    const grouped = (reaction: OpinionReaction) =>
      statements.filter((_, i) => reactions[i] === reaction)
    return (
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }} aria-hidden="true">☁️</div>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
          Opinion Cloud Complete!
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.05rem' }}>
          You shared your opinion on {opinionCloudShared(reactions)} of {statements.length} statements.
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Every opinion counts — none is right or wrong.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {OPINION_CLOUD_REACTIONS.map((r) => (
            <span key={r} style={{
              padding: '0.5rem 1rem', borderRadius: 'var(--radius)',
              background: 'var(--color-surface)', border: '2px solid var(--color-border)',
              fontSize: '0.95rem',
            }}>
              {OPINION_REACTION_EMOJI[r]} {OPINION_REACTION_LABEL[r]}: {counts[r]}
            </span>
          ))}
        </div>
        <div style={{ textAlign: 'left', maxWidth: '520px', margin: '1.5rem auto 0', display: 'grid', gap: '1rem' }}>
          {OPINION_CLOUD_REACTIONS.map((r) => {
            const list = grouped(r)
            if (list.length === 0) return null
            return (
              <div key={r}>
                <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', marginBottom: '0.35rem' }}>
                  {OPINION_REACTION_EMOJI[r]} {OPINION_REACTION_LABEL[r]} ({list.length})
                </h3>
                <ul style={{ margin: 0, paddingInlineStart: '1.25rem', color: 'var(--color-text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                  {list.map((s, i) => (
                    <li key={i}>{s.prompt}</li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
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

  // ---- Statement view: react, then the next statement. ----
  const statement = statements[index]
  const counts = opinionCloudCounts(reactions)
  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <motion.span key={opinionCloudShared(reactions)} initial={{ scale: 1.35 }} animate={{ scale: 1 }} transition={{ duration: 0.25 }} style={{ display: 'inline-block' }} aria-live="polite">💬 Shared: <strong style={{ color: 'var(--color-primary)' }}>{opinionCloudShared(reactions)} of {statements.length}</strong></motion.span>
        <span aria-live="polite">👍 {counts.agree} · 👎 {counts.disagree} · 🤔 {counts['not-sure']}</span>
        <span aria-live="polite">Statement {index + 1} of {statements.length}</span>
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
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '0.75rem' }}>
        There are no right answers — tick what YOU think.
      </p>

      <motion.div animate={{ scale: picked !== null ? [1, 1.03, 1] : 1 }} transition={{ duration: 0.3 }}>
        <div style={{
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.25rem',
          color: 'var(--color-text-primary)', fontSize: '1.125rem',
          fontFamily: 'var(--font-display)', boxShadow: 'var(--shadow-card)', textAlign: 'center',
        }}>
          {statement.prompt}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {OPINION_CLOUD_REACTIONS.map((r) => {
            const isPicked = picked === r
            return (
              <motion.button key={r} onClick={() => handleReact(r)}
                whileHover={picked === null ? { scale: 1.03 } : {}}
                whileTap={picked === null ? { scale: 0.97 } : {}}
                aria-pressed={isPicked} aria-label={`React: ${OPINION_REACTION_LABEL[r]}`}
                style={{
                  background: isPicked ? 'var(--color-primary)' : 'var(--color-surface)',
                  border: `2px solid ${isPicked ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '0.9rem 0.5rem', color: isPicked ? '#fff' : 'var(--color-text-primary)',
                  fontSize: '0.95rem', cursor: picked !== null ? 'default' : 'pointer',
                  fontFamily: 'var(--font-display)',
                  transition: 'background 0.2s, border-color 0.2s, color 0.2s',
                }}
              >
                <span style={{ display: 'block', fontSize: '1.75rem', lineHeight: 1.2 }} aria-hidden="true">
                  {OPINION_REACTION_EMOJI[r]}
                </span>
                {OPINION_REACTION_LABEL[r]}
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
            role="alert"
            style={{
              marginTop: '1rem', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius)',
              background: 'var(--color-success)',
              color: '#fff', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1rem',
            }}>
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function OpinionCloudActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellFinished, setShellFinished] = useState(false)
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: { totalCount?: number }) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  return (
    <PlayShell title="Opinion Cloud" score={shellScore} finished={shellFinished} onElapsed={handleElapsed} autoStart={autoStart}>
      <OpinionCloudGame
        items={items}
        theme={theme}
        locale={locale}
        onComplete={handleComplete}
        onProgress={(s, f) => { setShellScore(s); setShellFinished(f) }}
      />
    </PlayShell>
  )
}
