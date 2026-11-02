'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ActivityProps } from './shared'
import { isRTL } from './shared'
import { playGameSound, readSoundOn } from '@/lib/game-sound'

/**
 * Dictation — EduPlay's own listen-and-type game.
 *
 * NOT a copy of any rival: no rival art, wording, or audio. A
 * dictation item is a text passage the player must HEAR and then
 * TYPE correctly. The teacher writes the passage; nothing is ever
 * recorded or uploaded in this batch — the passage is read aloud
 * with the browser's free Web Speech TTS (speechSynthesis), so
 * there is no audio file to store, and teacher-recorded / uploaded
 * audio is a later batch, not this one.
 *
 * Player-visible beats (text passages only, no images):
 * - One passage per screen. A big Listen button reads it aloud.
 *   Speed control: Slow (0.7x) / Normal (1.0x). Sound is ON by
 *   default for TTS — the voice IS the game — with a mute toggle
 *   that stops speech; feedback tones still follow the usual
 *   device sound setting, like every other player.
 * - REPLAY_LIMIT = 3 replays per passage, after the first listen
 *   (so at most 4 hearings of one passage). The Replay button
 *   shows how many are left and disables at the limit.
 * - The player types what they hear and submits. Scoring is
 *   per-word, position by position: a word counts only when the
 *   word in the same position matches, ignoring case and
 *   punctuation, so "Cat," and "cat" are the same word for a kid.
 * - After submit, the correct passage is shown word by word —
 *   correct words in green, missed words in red — plus the list
 *   of missed words, so the player learns what was missed.
 * - End screen: total score out of 100, words correct out of
 *   total words, passages done, and "Play again".
 *
 * Stability (the 2026-11-02 quiz lesson): passages are built once
 * per item CONTENT (fingerprint + ref guard), never on render, so
 * play-page timer ticks can never reset a game in progress.
 * Speech is cancelled on unmount and on passage change, and
 * onComplete fires exactly once per finished game.
 *
 * Headless-checker note: in a headless browser TTS may be silent.
 * The game never depends on audio for scoring — typing, word
 * accuracy, replay counting, and the end screen all work with or
 * without a voice being heard, and the player says plainly when
 * audio is unavailable in this browser.
 */

/** Replays allowed per passage, after the first listen. */
export const DICTATION_REPLAY_LIMIT = 3

export interface DictationPassage {
  text: string
  label?: string
}

/** One word, normalised for a kid: lowercased, punctuation dropped,
 *  so "Cat," matches "cat" and "don't" matches "dont". Letters from
 *  any alphabet and digits are kept. */
export function normalizeDictationWord(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

/** Split a passage into its words (whitespace-separated, raw). */
export function splitDictationWords(text: string): string[] {
  return text.split(/\s+/).map((w) => w.trim()).filter(Boolean)
}

/** Score one typed attempt against its passage, word by word, in
 *  position order. Extra typed words past the end do not count;
 *  missing words count as wrong. Returns the per-word marks so the
 *  UI can colour the correct passage word by word. */
export function scoreDictationPassage(
  typed: string,
  correct: string,
): { correct: number; total: number; marks: boolean[] } {
  const correctWords = splitDictationWords(correct)
  const typedWords = splitDictationWords(typed)
  const marks = correctWords.map((word, i) => {
    const t = typedWords[i]
    if (t === undefined) return false
    const a = normalizeDictationWord(t)
    return a.length > 0 && a === normalizeDictationWord(word)
  })
  return { correct: marks.filter(Boolean).length, total: correctWords.length, marks }
}

/** Total score out of 100 from word counts across all passages. */
export function dictationTotalScore(wordsCorrect: number, totalWords: number): number {
  if (totalWords === 0) return 0
  return Math.round((100 * wordsCorrect) / totalWords)
}

/** Build passages from player items. The creator item editor labels
 *  the fields "Passage title (optional)" / "Dictation text", so the
 *  passage normally lives in `answer` with an optional title in
 *  `prompt`. A prompt-only item (passage typed in the first field)
 *  still plays, using the prompt as the passage. */
export function buildDictationPassages(
  items: ActivityProps['items'],
): DictationPassage[] {
  return items
    .map((i) => {
      const answer = (i.answer ?? '').trim()
      const prompt = (i.prompt ?? '').trim()
      const text = answer || prompt
      const label = answer && prompt && prompt !== answer ? prompt : undefined
      return { text, label }
    })
    .filter((p) => p.text.length > 0)
}

const TTS_LANG: Record<string, string> = {
  en: 'en-US',
  ur: 'ur-PK',
  ar: 'ar-SA',
  es: 'es-ES',
  fr: 'fr-FR',
  zh: 'zh-CN',
  de: 'de-DE',
  hi: 'hi-IN',
}

type Speed = 'slow' | 'normal'

export default function DictationActivity({ items, locale, onComplete }: ActivityProps) {
  const [passages, setPassages] = useState<DictationPassage[]>([])
  const [current, setCurrent] = useState(0)
  const [typed, setTyped] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ correct: number; total: number; marks: boolean[] } | null>(null)
  const [wordsCorrect, setWordsCorrect] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [finished, setFinished] = useState(false)
  const [playsUsed, setPlaysUsed] = useState(0)
  const [replaysUsed, setReplaysUsed] = useState(0)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [soundOn, setSoundOn] = useState(true)
  const [audioUnavailable, setAudioUnavailable] = useState(false)

  const rtl = isRTL(locale)

  const passagesRef = useRef<DictationPassage[]>([])
  const currentRef = useRef(0)
  const wordsCorrectRef = useRef(0)
  const totalWordsRef = useRef(0)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const autoPlayedForRef = useRef<number | null>(null)
  const soundOnRef = useRef(true)
  const speedRef = useRef<Speed>('normal')
  useEffect(() => { onCompleteRef.current = onComplete })
  useEffect(() => { passagesRef.current = passages })
  useEffect(() => { currentRef.current = current })
  useEffect(() => { wordsCorrectRef.current = wordsCorrect })
  useEffect(() => { totalWordsRef.current = totalWords })
  useEffect(() => { soundOnRef.current = soundOn })
  useEffect(() => { speedRef.current = speed })

  const itemsFingerprint = items
    .map((i) => `${i.prompt ?? ''}\u0000${i.answer ?? ''}`)
    .join('\u0001')
  const builtForRef = useRef<string | null>(null)
  useEffect(() => {
    if (builtForRef.current === itemsFingerprint) return
    builtForRef.current = itemsFingerprint
    cancelSpeech()
    const built = buildDictationPassages(items)
    setPassages(built)
    resetGame(built)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsFingerprint, items])

  function cancelSpeech() {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    } catch {
      /* speech is best-effort; a failure must never break the game */
    }
  }

  useEffect(() => () => { cancelSpeech() }, [])

  function resetGame(built: DictationPassage[]) {
    setCurrent(0)
    setTyped('')
    setSubmitted(false)
    setResult(null)
    setWordsCorrect(0)
    setTotalWords(0)
    setFinished(false)
    setPlaysUsed(0)
    setReplaysUsed(0)
    autoPlayedForRef.current = null
    completedRef.current = false
    void built
  }

  function playPassage() {
    const passage = passagesRef.current[currentRef.current]
    if (!passage) return
    if (!soundOnRef.current) return
    setPlaysUsed((n) => n + 1)
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        setAudioUnavailable(true)
        return
      }
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(passage.text)
      utterance.lang = TTS_LANG[locale] ?? locale
      utterance.rate = speedRef.current === 'slow' ? 0.7 : 1.0
      window.speechSynthesis.speak(utterance)
    } catch {
      setAudioUnavailable(true)
    }
  }

  // First listen of each passage plays automatically when sound is
  // on; the Listen/Replay button covers every later hearing and
  // any browser where autoplay speech is blocked.
  useEffect(() => {
    if (passages.length === 0) return
    if (autoPlayedForRef.current === current) return
    autoPlayedForRef.current = current
    setPlaysUsed(0)
    setReplaysUsed(0)
    if (soundOn) playPassage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, passages.length, soundOn])

  function handleListen() {
    if (!soundOn) return
    if (playsUsed === 0) {
      playPassage()
    } else if (replaysUsed < DICTATION_REPLAY_LIMIT) {
      setReplaysUsed((n) => n + 1)
      playPassage()
    }
  }

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    if (!next) cancelSpeech()
  }

  function submitDictation(e: React.FormEvent) {
    e.preventDefault()
    const passage = passages[current]
    if (!passage || submitted) return
    cancelSpeech()
    const scored = scoreDictationPassage(typed, passage.text)
    setResult(scored)
    setSubmitted(true)
    const newWordsCorrect = wordsCorrect + scored.correct
    const newTotalWords = totalWords + scored.total
    setWordsCorrect(newWordsCorrect)
    setTotalWords(newTotalWords)
    playGameSound(scored.correct === scored.total && scored.total > 0 ? 'correct' : 'wrong', readSoundOn())
  }

  function nextPassage() {
    const finalWordsCorrect = wordsCorrectRef.current
    const finalTotalWords = totalWordsRef.current
    if (currentRef.current + 1 >= passagesRef.current.length) {
      const finalScore = dictationTotalScore(finalWordsCorrect, finalTotalWords)
      setFinished(true)
      if (!completedRef.current) {
        completedRef.current = true
        onCompleteRef.current(finalScore, {
          wordsCorrect: finalWordsCorrect,
          totalWords: finalTotalWords,
          passagesDone: passagesRef.current.length,
        })
      }
    } else {
      setCurrent((c) => c + 1)
      setTyped('')
      setSubmitted(false)
      setResult(null)
    }
  }

  if (passages.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>This dictation game has no passages yet.</p>
      </div>
    )
  }

  if (finished) {
    const finalScore = dictationTotalScore(wordsCorrect, totalWords)
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-primary)' }}>
        <div style={{ fontSize: '3rem' }}>🎧</div>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Dictation Complete!</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
          Score: {finalScore} / 100
        </p>
        <p style={{ color: 'var(--color-text-muted)' }}>
          {wordsCorrect} of {totalWords} words correct · {passages.length} passages done
        </p>
        <button
          onClick={() => resetGame(passages)}
          style={{
            marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)',
            border: 'none', background: 'var(--color-primary)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
          }}
        >
          Play again
        </button>
      </motion.div>
    )
  }

  const passage = passages[current]
  const correctWords = splitDictationWords(passage.text)
  const missedWords = result
    ? correctWords.filter((_, i) => !result.marks[i])
    : []
  const replaysLeft = DICTATION_REPLAY_LIMIT - replaysUsed
  const listenLabel = playsUsed === 0
    ? '🔊 Listen'
    : replaysLeft > 0
      ? `↻ Replay (${replaysLeft} left)`
      : '↻ No replays left'

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} style={{ padding: '1rem', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
        <span>Passage {current + 1} / {passages.length}</span>
        <span>Words correct: {wordsCorrect}</span>
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundOn ? 'Mute dictation voice' : 'Unmute dictation voice'}
          style={{
            padding: '0.25rem 0.6rem', borderRadius: 'var(--radius-lg)',
            border: '2px solid var(--color-border)', background: 'var(--color-surface)',
            color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          {soundOn ? '🔊 Sound on' : '🔇 Sound off'}
        </button>
      </div>

      {passage.label && (
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
          {passage.label}
        </p>
      )}

      <div style={{
        padding: '1.25rem', borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)', border: '2px solid var(--color-border)',
        marginBottom: '1rem',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎧</div>
        <p style={{ color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
          Listen carefully, then type exactly what you hear.
        </p>
        <button
          type="button"
          onClick={handleListen}
          disabled={!soundOn || (playsUsed > 0 && replaysUsed >= DICTATION_REPLAY_LIMIT)}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)', border: 'none',
            background: 'var(--color-primary)', color: '#fff',
            fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            opacity: !soundOn || (playsUsed > 0 && replaysUsed >= DICTATION_REPLAY_LIMIT) ? 0.5 : 1,
          }}
        >
          {listenLabel}
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
          {(['slow', 'normal'] as Speed[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              aria-pressed={speed === s}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-lg)',
                border: `2px solid ${speed === s ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                cursor: 'pointer', fontSize: '0.85rem',
              }}
            >
              {s === 'slow' ? '🐢 Slow' : '▶ Normal speed'}
            </button>
          ))}
        </div>
        {audioUnavailable && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
            Audio is not available in this browser — you can still type and be scored.
          </p>
        )}
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          {playsUsed} {playsUsed === 1 ? 'listen' : 'listens'} used · {replaysLeft} {replaysLeft === 1 ? 'replay' : 'replays'} left
        </p>
      </div>

      {!submitted ? (
        <form onSubmit={submitDictation} style={{ marginBottom: '0.75rem' }}>
          <label htmlFor="dictation-typed" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}>
            Type what you hear
          </label>
          <textarea
            id="dictation-typed"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type what you hear…"
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '0.75rem', fontSize: '1rem',
              borderRadius: 'var(--radius-lg)', border: '2px solid var(--color-border)',
              background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            }}
          />
          <button
            type="submit"
            style={{
              marginTop: '0.75rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)',
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Check my dictation
          </button>
        </form>
      ) : result && (
        <div>
          <p aria-live="polite" style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {result.correct === result.total
              ? `✓ Perfect! ${result.correct} of ${result.total} words correct`
              : `${result.correct} of ${result.total} words correct`}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            You wrote: {typed.trim() || '(nothing)'}
          </p>
          <div style={{
            padding: '1rem', borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)', border: '2px solid var(--color-border)',
            marginTop: '0.75rem', textAlign: 'start', lineHeight: 1.8,
          }}>
            {correctWords.map((word, i) => (
              <span
                key={i}
                style={{
                  color: result.marks[i] ? 'var(--color-success)' : 'var(--color-danger)',
                  fontWeight: result.marks[i] ? 400 : 700,
                }}
              >
                {word}{i < correctWords.length - 1 ? ' ' : ''}
              </span>
            ))}
          </div>
          {missedWords.length > 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Missed words: {missedWords.join(', ')}
            </p>
          )}
          <button
            type="button"
            onClick={nextPassage}
            style={{
              marginTop: '1rem', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)',
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer',
            }}
          >
            {current + 1 >= passages.length ? 'See my score' : 'Next passage'}
          </button>
        </div>
      )}

      <AnimatePresence>
        {submitted && result && (
          <motion.p
            key="dictation-feedback"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}
          >
            Green words were right, red words were missed.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
