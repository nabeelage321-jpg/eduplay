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
