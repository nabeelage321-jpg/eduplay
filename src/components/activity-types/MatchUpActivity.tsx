'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import type { ActivityProps, ActivityCompletion } from './shared'
import { SCORE_PER_CORRECT, shuffleArray, isRTL } from './shared'
import PlayShell from './PlayShell'
import KidActionsBar from '@/components/game/KidActionsBar'
import ScorePill from '@/components/game/ScorePill'
import { RoundPill } from '@/components/game/PlayChrome'
import { playEduSound, readInteractiveSoundOn } from '@/lib/game-sound'
import InteractiveSoundToggle from './InteractiveSoundToggle'

// BATCH 1 (final list item 19): funky + bold letters — Fredoka One,
// already loaded, no new dependency.
const FUNKY_FONT = "'Fredoka One', 'Nunito', system-ui, sans-serif"

interface MatchItem { id: string; prompt: string; answer: string }

/**
 * PLAYSHELL ROLLOUT, FIRST TYPE (2026-11-04): Match Up is the first
 * unwrapped type to get the shared shell. Why Match Up first: it has
 * no timer, no lives, and no pause of its own, so there is no
 * conflicting behaviour to resolve — the shell only adds Start,
 * the 3-2-1 countdown, the elapsed+score header, and a Pause
 * overlay that blocks taps while paused. Nothing about Match Up's
 * own rules changes: 10 points per correct match, a wrong match
 * only flashes red and costs nothing, and matching every pair
 * finishes the game ("All Matched!") with the real score.
 *
 * Deliberately NOT in this batch: a How-to-Play page (Match Up has
 * none today — adding one is a separate item, not bundled here),
 * any sound change (Match Up has no sounds today — SUPERSEDED
 * 2026-11-04 by the sounds batch below), any scoring /
 * lives / timer / win-rule change, and any other type's player.
 * The only other file touched is the saved-game play page, which
 * extends its existing Quiz-only single-timer rule to Match Up
 * (the 2026-11-03 fix's own comment says each type is unified
 * "the same way when its shell lands") — without that, Match Up
 * play would show two elapsed timers, the exact double-timer
 * problem the 2026-11-03 fix removed for Quiz.
 *
 * Pause note: Match Up's only timeout is the 600ms wrong-match
 * red flash clearing. The shell's Pause overlay already blocks
 * all taps while paused, so no new match can start during a
 * pause; the flash clearing mid-pause is cosmetic only and
 * changes no score, match, or progress.
 *
 * SOUNDS BATCH (2026-11-04, owner-ordered pre-launch light work,
 * Match Up ONLY): the shared interactive sound system (Letter
 * Wheel / Jump Path pattern) — correct match plays the correct
 * arpeggio, a wrong match plays the wrong buzz, and matching
 * every pair plays the win fanfare once (Letter Wheel's
 * ref-guarded finish-sound effect). Sounds are an extra layer
 * only: colour + text feedback is unchanged, and a wrong match
 * still costs nothing. The toggle is the shared
 * InteractiveSoundToggle, default ON (no stored choice means
 * ON), rendered in the Letter Wheel placement pattern — a
 * top-right "Sound" row during play and centred on the finish
 * view. Header-toggle finding (audited this batch): the
 * saved-game play page header renders the OLD SoundToggle
 * ('eduplay-sound-on' key, default MUTED, playGameSound),
 * which is a DIFFERENT setting from the interactive key
 * ('eduplay-interactive-sound-on', default ON) — so the header
 * toggle does NOT control Letter Wheel / Jump Path sounds
 * today. For Match Up only, the play page header now renders
 * InteractiveSoundToggle when the EFFECTIVE type is match-up
 * (original Match Up, and ?as=match-up converted views, which
 * share this same player and therefore inherit these sounds
 * automatically) — header toggle and in-player toggle then
 * drive the same setting and stay in sync via the existing
 * storage event. Every other type's header is untouched.
 * No rule change, no How-to-Play, no timer, no lives, no
 * other type's player, no sitemap change.
 */

interface MatchUpGameProps extends ActivityProps {
  onProgress: (score: number, finished: boolean, total?: number) => void
}

function MatchUpGame({ items, locale, onComplete, onProgress }: MatchUpGameProps) {
  const [pairs, setPairs] = useState<MatchItem[]>([])
  const [rightItems, setRightItems] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const [wrongFlash, setWrongFlash] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const finishedSoundRef = useRef(false)
  // KID ACTIONS (batch 1, item 17): Match Up has no wrong answers
  // to remove and no question to skip — the action that maps is
  // HINT: one unmatched pair glows for a few seconds so the kid
  // can spot it. Skip and see-the-answer are hidden (they do not
  // map to matching), never faked.
  const [hintPair, setHintPair] = useState<string | null>(null)
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current) }, [])
  const rtl = isRTL(locale)

  useEffect(() => {
    const p: MatchItem[] = items.map((item, i) => ({ id: `item-${i}`, prompt: item.prompt, answer: item.answer }))
    setPairs(p)
    setRightItems(shuffleArray(p.map((x) => x.answer)))
  }, [items])

  // Lift the real score and finished flag to the shell header, so
  // the header shows the same score the end screen reports.
  useEffect(() => { onProgress(score, finished, pairs.length * SCORE_PER_CORRECT) }, [score, finished, onProgress])

  // Finish sound once: win fanfare on All Matched. Sound only —
  // no rule change. (Letter Wheel pattern: ref guard so a
  // re-render never replays it.)
  useEffect(() => {
    if (!finished) { finishedSoundRef.current = false; return }
    if (finishedSoundRef.current) return
    finishedSoundRef.current = true
    playEduSound('win', readInteractiveSoundOn())
  }, [finished])

  function selectLeft(id: string) {
    if (matched.has(id)) return
    setSelected((prev) => (prev === id ? null : id))
  }

  function useHint() {
    if (finished) return
    const next = pairs.find((p) => !matched.has(p.id))
    if (!next) return
    playEduSound('click', readInteractiveSoundOn())
    setHintPair(next.id)
    if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
    hintTimeoutRef.current = setTimeout(() => setHintPair(null), 2500)
  }

  function selectRight(answer: string) {
    if (!selected) return
    const pair = pairs.find((p) => p.id === selected)
    if (!pair) return
    if (pair.answer === answer) {
      const newMatched = new Set(matched).add(selected)
      setMatched(newMatched)
      setScore((s) => s + SCORE_PER_CORRECT)
      setSelected(null)
      playEduSound('correct', readInteractiveSoundOn())
      if (newMatched.size === pairs.length) { setFinished(true); onComplete(score + SCORE_PER_CORRECT, { correctCount: pairs.length, totalCount: pairs.length }) }
    } else {
      playEduSound('wrong', readInteractiveSoundOn())
      setWrongFlash(answer)
      setTimeout(() => setWrongFlash(null), 600)
    }
  }

  if (finished) return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
      <div style={{ fontSize: '3rem' }}>🎯</div>
      <h2 style={{ fontFamily: FUNKY_FONT, marginTop: '0.5rem' }}>All Matched!</h2>
      <p style={{ marginTop: '0.5rem' }}><ScorePill score={score} total={pairs.length * SCORE_PER_CORRECT} big /></p>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
        <InteractiveSoundToggle />
      </div>
    </motion.div>
  )

  // BATCH 1 (item 23, ONE SCREEN): compact cards so all 12 pairs
  // fit on one screen with no mouse scroll.
  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '0.5rem', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'flex-end', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        Sound <InteractiveSoundToggle />
      </div>
      <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
        Select a prompt, then select its matching answer
      </p>
      {/* KID ACTIONS (batch 1, item 17): Hint only — skip and
          see-the-answer do not map to matching. */}
      <KidActionsBar onHint={useHint} hintUsed={hintPair !== null} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {pairs.map((pair) => {
            const isMatched = matched.has(pair.id)
            const isSel = selected === pair.id
            const isHint = hintPair === pair.id
            return (
              <motion.button key={pair.id} onClick={() => selectLeft(pair.id)}
                whileHover={!isMatched ? { scale: 1.02 } : {}} aria-pressed={isSel}
                aria-label={`Prompt: ${pair.prompt}`}
                animate={isHint ? { scale: [1, 1.04, 1] } : {}}
                transition={isHint ? { duration: 0.6, repeat: Infinity } : {}}
                style={{
                  padding: '0.55rem 0.65rem', borderRadius: 'var(--radius)',
                  border: `2px solid ${isMatched ? 'var(--color-success)' : isHint ? 'var(--color-warning)' : isSel ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  background: isMatched ? 'var(--color-success)' : isHint ? 'color-mix(in srgb, var(--color-warning) 20%, var(--color-surface))' : isSel ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  color: isMatched ? '#fff' : 'var(--color-text-primary)',
                  cursor: isMatched ? 'default' : 'pointer', opacity: isMatched ? 0.7 : 1,
                  textAlign: rtl ? 'right' : 'left', fontSize: '0.85rem',
                  fontFamily: 'var(--font-body)', transition: 'all 0.2s',
                }}>
                {pair.prompt}
              </motion.button>
            )
          })}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {rightItems.map((answer) => {
            const isMatched = pairs.some((p) => p.answer === answer && matched.has(p.id))
            const isWrong = wrongFlash === answer
            const isHint = pairs.some((p) => p.answer === answer && hintPair === p.id)
            return (
              <motion.button key={answer} onClick={() => selectRight(answer)}
                animate={isWrong ? { x: [0, -8, 8, -8, 0] } : isHint ? { scale: [1, 1.04, 1] } : {}} transition={{ duration: 0.3 }}
                aria-label={`Answer: ${answer}`}
                style={{
                  padding: '0.55rem 0.65rem', borderRadius: 'var(--radius)',
                  border: `2px solid ${isMatched ? 'var(--color-success)' : isHint ? 'var(--color-warning)' : isWrong ? 'var(--color-danger)' : 'var(--color-border)'}`,
                  background: isMatched ? 'var(--color-success)' : isHint ? 'color-mix(in srgb, var(--color-warning) 20%, var(--color-surface))' : isWrong ? 'var(--color-danger)' : 'var(--color-surface)',
                  color: isMatched || isWrong ? '#fff' : 'var(--color-text-primary)',
                  cursor: isMatched ? 'default' : 'pointer', opacity: isMatched ? 0.7 : 1,
                  textAlign: rtl ? 'right' : 'left', fontSize: '0.85rem',
                  fontFamily: 'var(--font-body)', transition: 'background 0.2s, border-color 0.2s',
                }}>
                {answer}
              </motion.button>
            )
          })}
        </div>
      </div>
      <div style={{ marginTop: '0.6rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        <RoundPill>{matched.size} / {pairs.length} matched</RoundPill>
      </div>
    </div>
  )
}

export default function MatchUpActivity({ items, theme, locale, onComplete, autoStart }: ActivityProps) {
  const [shellScore, setShellScore] = useState(0)
  const [shellTotal, setShellTotal] = useState<number | undefined>(undefined)
  const [shellFinished, setShellFinished] = useState(false)
  // The shell's elapsed seconds, kept in a ref so the finish-time
  // value is exact even if a state update is still queued when the
  // last pair matches. Attached to the completion details so the
  // play page can use it as its single final Time (Quiz pattern).
  const elapsedRef = useRef(0)
  const handleElapsed = useCallback((seconds: number) => { elapsedRef.current = seconds }, [])
  const handleComplete = useCallback((score: number, details?: ActivityCompletion) => {
    onComplete(score, { ...details, elapsedSeconds: elapsedRef.current })
  }, [onComplete])
  const handleProgress = useCallback((s: number, f: boolean, t?: number) => { setShellScore(s); setShellFinished(f); if (typeof t === 'number') setShellTotal(t) }, [])
  return (
    <PlayShell title="Match Up" score={shellScore} finished={shellFinished} totalScore={shellTotal} onElapsed={handleElapsed} autoStart={autoStart}>
      <MatchUpGame items={items} theme={theme} locale={locale} onComplete={handleComplete} onProgress={handleProgress} />
    </PlayShell>
  )
}
