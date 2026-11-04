/**
 * Game sound — Web Audio only, no audio assets, no copyrighted music.
 *
 * Sounds are short oscillator tones generated in the browser:
 * - tap: one short click (reserved for future wiring; not auto-played)
 * - correct: two rising tones
 * - wrong: one low tone
 * Feedback is always colour + icon + text in the game itself; sound is
 * an extra layer only, never the only signal.
 *
 * Default is MUTED (sound off until the player taps the sound button),
 * because classrooms should not start with sound. The choice is saved
 * on this device only (localStorage 'eduplay-sound-on').
 *
 * Interactive sound system (added 2026-11-04, part 1):
 * Letter Wheel and Jump Path ONLY use a second, shared system with
 * distinct synthesized sounds — correct, wrong, click/select, jump,
 * win, lose/end, and timer-warning — plus a shared toggle that is
 * always visible inside those two players. Its default is ON (no
 * stored choice yet means ON), because the owner wants engaging
 * games to be heard; one tap on the toggle mutes them immediately.
 * The old muted default above is UNCHANGED for every other game,
 * and Dictation/video sound behaviour is untouched. No downloaded
 * sound file is used anywhere, so there are no unclear rights.
 */
export const SOUND_STORAGE_KEY = 'eduplay-sound-on'

export function readSoundOn(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function storeSoundOn(on: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* storage unavailable — sound just stays off for this session */
  }
}

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!ctx) ctx = new AC()
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return ctx
}

function tone(freq: number, start: number, duration: number, volume = 0.12) {
  const audio = getCtx()
  if (!audio) return
  try {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, audio.currentTime + start)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + start + duration)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(audio.currentTime + start)
    osc.stop(audio.currentTime + start + duration)
  } catch {
    /* sound is best-effort; a failure must never break the game */
  }
}

/** A tone whose pitch slides from freqStart to freqEnd (for jump/wrong). */
function swoop(freqStart: number, freqEnd: number, start: number, duration: number, volume = 0.12, type: OscillatorType = 'sine') {
  const audio = getCtx()
  if (!audio) return
  try {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freqStart, audio.currentTime + start)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), audio.currentTime + start + duration)
    gain.gain.setValueAtTime(volume, audio.currentTime + start)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + start + duration)
    osc.connect(gain)
    gain.connect(audio.destination)
    osc.start(audio.currentTime + start)
    osc.stop(audio.currentTime + start + duration)
  } catch {
    /* sound is best-effort; a failure must never break the game */
  }
}

export function playGameSound(kind: 'correct' | 'wrong' | 'tap', soundOn: boolean) {
  if (!soundOn) return
  if (kind === 'correct') {
    tone(523.25, 0, 0.15)
    tone(783.99, 0.12, 0.2)
  } else if (kind === 'wrong') {
    tone(196.0, 0, 0.25, 0.1)
  } else {
    tone(440, 0, 0.06, 0.06)
  }
}

/* ---- Interactive sound system: Letter Wheel + Jump Path only ---- */

export const INTERACTIVE_SOUND_STORAGE_KEY = 'eduplay-interactive-sound-on'
export const INTERACTIVE_SOUND_EVENT = 'eduplay-interactive-sound'

export type EduSoundKind = 'correct' | 'wrong' | 'click' | 'jump' | 'win' | 'lose' | 'timerWarning'

export const EDU_SOUND_KINDS: EduSoundKind[] = ['correct', 'wrong', 'click', 'jump', 'win', 'lose', 'timerWarning']

/**
 * Interactive sound is ON unless the player explicitly turned it off.
 * No stored value means ON; only a stored '0' means off. Server-side
 * rendering also defaults to ON so the toggle's first paint matches.
 */
export function readInteractiveSoundOn(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(INTERACTIVE_SOUND_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function storeInteractiveSoundOn(on: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(INTERACTIVE_SOUND_STORAGE_KEY, on ? '1' : '0')
    window.dispatchEvent(new CustomEvent(INTERACTIVE_SOUND_EVENT, { detail: { on } }))
  } catch {
    /* storage unavailable — sound just stays on for this session */
  }
}

/** Distinct synthesized pattern per kind; all Web Audio, no assets. */
export function playEduSound(kind: EduSoundKind, soundOn: boolean) {
  if (!soundOn) return
  if (kind === 'correct') {
    tone(523.25, 0, 0.14)
    tone(659.25, 0.1, 0.14)
    tone(783.99, 0.2, 0.22)
  } else if (kind === 'wrong') {
    swoop(220, 110, 0, 0.3, 0.1, 'triangle')
  } else if (kind === 'click') {
    tone(660, 0, 0.05, 0.07)
  } else if (kind === 'jump') {
    swoop(400, 950, 0, 0.35, 0.12)
    tone(1046.5, 0.3, 0.12, 0.08)
  } else if (kind === 'win') {
    tone(523.25, 0, 0.15)
    tone(659.25, 0.13, 0.15)
    tone(783.99, 0.26, 0.15)
    tone(1046.5, 0.39, 0.3)
  } else if (kind === 'lose') {
    tone(392, 0, 0.18, 0.1)
    tone(329.63, 0.16, 0.18, 0.1)
    tone(261.63, 0.32, 0.22, 0.1)
    tone(196, 0.48, 0.3, 0.1)
  } else if (kind === 'timerWarning') {
    tone(880, 0, 0.08, 0.09)
    tone(880, 0.14, 0.08, 0.09)
  }
}
