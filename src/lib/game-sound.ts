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

function tone(freq: number, start: number, duration: number, volume = 0.12, type: OscillatorType = 'sine') {
  const audio = getCtx()
  if (!audio) return
  try {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = type
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

/* ---- Game-feel batch (2026-11-07, build-list item 4) ----
 * The shared shell's play feel: soft background music while a game
 * runs, a soft tick with the visible shell timer, and a wrong sound
 * that is HARD/HARSH (the owner's word) so it can never be mistaken
 * for the pleasant rising correct sound. All Web Audio, no assets.
 *
 * Specs are pure data (getEduSoundSpec) so tests can prove the
 * wrong/correct distinction, the tick's quietness, and the music's
 * gentle volumes without a browser. playEduSound only renders a spec.
 */

export interface SoundToneSpec {
  freq: number
  start: number
  duration: number
  volume: number
  type?: OscillatorType
}

export interface SoundSwoopSpec {
  freqStart: number
  freqEnd: number
  start: number
  duration: number
  volume: number
  type?: OscillatorType
}

export interface EduSoundSpec {
  tones: SoundToneSpec[]
  swoops: SoundSwoopSpec[]
}

/** Distinct synthesized pattern per kind; all Web Audio, no assets. */
export function getEduSoundSpec(kind: EduSoundKind): EduSoundSpec {
  if (kind === 'correct') {
    return {
      tones: [
        { freq: 523.25, start: 0, duration: 0.14, volume: 0.12 },
        { freq: 659.25, start: 0.1, duration: 0.14, volume: 0.12 },
        { freq: 783.99, start: 0.2, duration: 0.22, volume: 0.12 },
      ],
      swoops: [],
    }
  }
  if (kind === 'wrong') {
    // HARD/HARSH (owner, 2026-11-07): low sawtooth buzz, descending,
    // clearly distinct from the pleasant sine arpeggio of 'correct'.
    return {
      tones: [
        { freq: 110, start: 0, duration: 0.18, volume: 0.12, type: 'sawtooth' },
        { freq: 82.5, start: 0.12, duration: 0.25, volume: 0.12, type: 'sawtooth' },
      ],
      swoops: [{ freqStart: 180, freqEnd: 70, start: 0, duration: 0.3, volume: 0.1, type: 'sawtooth' }],
    }
  }
  if (kind === 'click') {
    return { tones: [{ freq: 660, start: 0, duration: 0.05, volume: 0.07 }], swoops: [] }
  }
  if (kind === 'jump') {
    return {
      tones: [{ freq: 1046.5, start: 0.3, duration: 0.12, volume: 0.08 }],
      swoops: [{ freqStart: 400, freqEnd: 950, start: 0, duration: 0.35, volume: 0.12 }],
    }
  }
  if (kind === 'win') {
    return {
      tones: [
        { freq: 523.25, start: 0, duration: 0.15, volume: 0.12 },
        { freq: 659.25, start: 0.13, duration: 0.15, volume: 0.12 },
        { freq: 783.99, start: 0.26, duration: 0.15, volume: 0.12 },
        { freq: 1046.5, start: 0.39, duration: 0.3, volume: 0.12 },
      ],
      swoops: [],
    }
  }
  if (kind === 'lose') {
    return {
      tones: [
        { freq: 392, start: 0, duration: 0.18, volume: 0.1 },
        { freq: 329.63, start: 0.16, duration: 0.18, volume: 0.1 },
        { freq: 261.63, start: 0.32, duration: 0.22, volume: 0.1 },
        { freq: 196, start: 0.48, duration: 0.3, volume: 0.1 },
      ],
      swoops: [],
    }
  }
  if (kind === 'timerWarning') {
    return {
      tones: [
        { freq: 880, start: 0, duration: 0.08, volume: 0.09 },
        { freq: 880, start: 0.14, duration: 0.08, volume: 0.09 },
      ],
      swoops: [],
    }
  }
  // 'tick': the shell timer's soft tick — very quiet, very short,
  // so a whole game of ticks never gets annoying.
  return { tones: [{ freq: 1200, start: 0, duration: 0.03, volume: 0.03 }], swoops: [] }
}

/* ---- Interactive sound system: Letter Wheel + Jump Path only ---- */

export const INTERACTIVE_SOUND_STORAGE_KEY = 'eduplay-interactive-sound-on'
export const INTERACTIVE_SOUND_EVENT = 'eduplay-interactive-sound'

export type EduSoundKind = 'correct' | 'wrong' | 'click' | 'jump' | 'win' | 'lose' | 'timerWarning' | 'tick'

export const EDU_SOUND_KINDS: EduSoundKind[] = ['correct', 'wrong', 'click', 'jump', 'win', 'lose', 'timerWarning', 'tick']

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

/** Renders a sound spec (see getEduSoundSpec above). */
export function playEduSound(kind: EduSoundKind, soundOn: boolean) {
  if (!soundOn) return
  const spec = getEduSoundSpec(kind)
  for (const t of spec.tones) tone(t.freq, t.start, t.duration, t.volume, t.type ?? 'sine')
  for (const s of spec.swoops) swoop(s.freqStart, s.freqEnd, s.start, s.duration, s.volume, s.type ?? 'sine')
}

/* ---- Soft background music (game-feel batch, 2026-11-07) ----
 * One gentle loop while a game runs: a slow C-major pentatonic
 * arpeggio of soft sine notes (one note per step) with a quiet bass
 * note every fourth step. No melody is copied from anywhere — the
 * notes are a plain scale, the volumes stay <= 0.035 so the music
 * sits under the game, and it follows the interactive sound setting:
 * muting stops it, unmuting while playing restarts it. The PlayShell
 * starts it when play begins and stops it on pause/finish/unmount.
 */

export const MUSIC_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33]
export const MUSIC_STEP_MS = 450
export const MUSIC_NOTE_VOLUME = 0.035
export const MUSIC_BASS_VOLUME = 0.02

/** Pure schedule for one music step — the note and whether a soft bass joins it. */
export function musicNoteAt(step: number): { freq: number; bass: boolean } {
  const i = ((step % MUSIC_NOTES.length) + MUSIC_NOTES.length) % MUSIC_NOTES.length
  return { freq: MUSIC_NOTES[i], bass: step % 4 === 0 }
}

let musicTimer: ReturnType<typeof setInterval> | null = null
let musicStep = 0

export function startGameMusic() {
  if (typeof window === 'undefined' || musicTimer) return
  musicStep = 0
  musicTimer = setInterval(() => {
    const { freq, bass } = musicNoteAt(musicStep)
    tone(freq, 0, 0.4, MUSIC_NOTE_VOLUME)
    if (bass) tone(130.81, 0, 0.8, MUSIC_BASS_VOLUME)
    musicStep += 1
  }, MUSIC_STEP_MS)
}

export function stopGameMusic() {
  if (musicTimer) {
    clearInterval(musicTimer)
    musicTimer = null
  }
}

export function isGameMusicPlaying(): boolean {
  return musicTimer !== null
}
