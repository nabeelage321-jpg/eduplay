/**
 * Game sound — Web Audio only, no audio assets, no copyrighted music.
 *
 * Sounds are short oscillator tones generated in the browser:
 * - tap: one short click (reserved for future wiring; not auto-played)
 * - correct: CLAPPING (owner, 2026-11-07 batch 1 — synthesized
 *   applause: short bursts of filtered noise, no recording, no asset)
 * - wrong: BLAST (owner, 2026-11-07 batch 1 — a loud low boom, so
 *   it can never be mistaken for applause)
 * Feedback is always colour + icon + text in the game itself; sound is
 * an extra layer only, never the only signal.
 *
 * Default is ON (sound plays unless the player taps the sound
 * button to mute), because the owner wants engaging games to be
 * heard — music on, loud enough to hear. The choice is saved on
 * this device only (localStorage 'eduplay-sound-on'); one tap on
 * the visible toggle mutes, another unmutes.
 *
 * Interactive sound system (added 2026-11-04, part 1):
 * Letter Wheel and Jump Path ONLY use a second, shared system with
 * distinct synthesized sounds — correct, wrong, click/select, jump,
 * win, lose/end, and timer-warning — plus a shared toggle that is
 * always visible inside those two players. Its default is ON (no
 * stored choice yet means ON), because the owner wants engaging
 * games to be heard; one tap on the toggle mutes them immediately.
 * The default above is now ON for every game too (owner,
 * 2026-11-07 — music on, high volume), and Dictation/video sound
 * behaviour is untouched. No downloaded sound file is used
 * anywhere, so there are no unclear rights.
 */
export const SOUND_STORAGE_KEY = 'eduplay-sound-on'

export function readSoundOn(): boolean {
  if (typeof window === 'undefined') return true
  try {
    // ON unless the player explicitly turned it off: no stored
    // value means ON; only a stored '0' means off. Server-side
    // rendering also defaults to ON so the toggle's first paint
    // matches, like the interactive system below.
    return window.localStorage.getItem(SOUND_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function storeSoundOn(on: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* storage unavailable — sound just stays on for this session */
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
  // The old muted-default system renders the same specs as the
  // interactive system now (clapping for correct, blast for wrong),
  // so every game sounds the same whichever toggle drives it.
  if (!soundOn) return
  playEduSound(kind === 'tap' ? 'click' : kind, true)
}

/** A burst of filtered white noise (clapping, blasts). Built from a
 *  fresh noise buffer each time — no audio asset, no recording. */
function noiseBurst(start: number, duration: number, volume: number, filterFreq: number) {
  const audio = getCtx()
  if (!audio) return
  try {
    const len = Math.max(1, Math.floor(audio.sampleRate * duration))
    const buffer = audio.createBuffer(1, len, audio.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = audio.createBufferSource()
    src.buffer = buffer
    const filter = audio.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    filter.Q.value = 0.8
    const gain = audio.createGain()
    const t0 = audio.currentTime + start
    gain.gain.setValueAtTime(volume, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(audio.destination)
    src.start(t0)
    src.stop(t0 + duration)
  } catch {
    /* sound is best-effort; a failure must never break the game */
  }
}

/* ---- Game-feel batch (2026-11-07, build-list item 4) ----
 * The shared shell's play feel: soft background music while a game
 * runs, a tick with the visible shell timer, and distinct
 * correct/wrong sounds. All Web Audio, no assets.
 *
 * BATCH 1 (2026-11-07, final list item 10): correct is CLAPPING,
 * wrong is a BLAST, the tick is audible (0.12, was 0.03), the music
 * is louder (0.08/0.05, was 0.035/0.02), and the whole set is
 * louder overall. Specs are pure data (getEduSoundSpec) so tests
 * can prove the correct/wrong distinction, the tick's audibility,
 * and the music's volumes without a browser. playEduSound only
 * renders a spec.
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

export interface SoundNoiseSpec {
  start: number
  duration: number
  volume: number
  /** Bandpass centre for the burst (claps ~1200Hz, blasts ~300Hz). */
  filterFreq: number
}

export interface EduSoundSpec {
  tones: SoundToneSpec[]
  swoops: SoundSwoopSpec[]
  noises: SoundNoiseSpec[]
}

/** Synthesized applause: short filtered-noise bursts, like hands
 *  clapping — no recording, no asset. Louder bursts land first,
 *  then a quick tail. */
function clapNoises(count: number, startAt = 0, baseVolume = 0.2): SoundNoiseSpec[] {
  const out: SoundNoiseSpec[] = []
  for (let i = 0; i < count; i++) {
    out.push({
      start: startAt + i * 0.09 + (i % 3 === 0 ? 0 : 0.02),
      duration: 0.06,
      volume: baseVolume * (i < 3 ? 1 : 0.7),
      filterFreq: 1200,
    })
  }
  return out
}

/** Distinct synthesized pattern per kind; all Web Audio, no assets. */
export function getEduSoundSpec(kind: EduSoundKind): EduSoundSpec {
  if (kind === 'correct') {
    // CLAPPING (owner, 2026-11-07 batch 1): applause, not the old
    // rising arpeggio — a kid hears cheering when they get it right.
    return { tones: [], swoops: [], noises: clapNoises(9) }
  }
  if (kind === 'wrong') {
    // BLAST (owner, 2026-11-07 batch 1): a loud low boom — clearly
    // distinct from applause. Louder than the old harsh buzz was.
    return {
      tones: [{ freq: 90, start: 0, duration: 0.35, volume: 0.22, type: 'sawtooth' }],
      swoops: [{ freqStart: 160, freqEnd: 40, start: 0, duration: 0.4, volume: 0.22, type: 'sawtooth' }],
      noises: [{ start: 0, duration: 0.35, volume: 0.2, filterFreq: 300 }],
    }
  }
  if (kind === 'click') {
    return { tones: [{ freq: 660, start: 0, duration: 0.05, volume: 0.1 }], swoops: [], noises: [] }
  }
  if (kind === 'jump') {
    return {
      tones: [{ freq: 1046.5, start: 0.3, duration: 0.12, volume: 0.12 }],
      swoops: [{ freqStart: 400, freqEnd: 950, start: 0, duration: 0.35, volume: 0.14 }],
      noises: [],
    }
  }
  if (kind === 'win') {
    return {
      tones: [
        { freq: 523.25, start: 0, duration: 0.15, volume: 0.16 },
        { freq: 659.25, start: 0.13, duration: 0.15, volume: 0.16 },
        { freq: 783.99, start: 0.26, duration: 0.15, volume: 0.16 },
        { freq: 1046.5, start: 0.39, duration: 0.3, volume: 0.16 },
      ],
      swoops: [],
      noises: clapNoises(6, 0.45, 0.16),
    }
  }
  if (kind === 'lose') {
    return {
      tones: [
        { freq: 392, start: 0, duration: 0.18, volume: 0.12 },
        { freq: 329.63, start: 0.16, duration: 0.18, volume: 0.12 },
        { freq: 261.63, start: 0.32, duration: 0.22, volume: 0.12 },
        { freq: 196, start: 0.48, duration: 0.3, volume: 0.12 },
      ],
      swoops: [],
      noises: [],
    }
  }
  if (kind === 'timerWarning') {
    return {
      tones: [
        { freq: 880, start: 0, duration: 0.08, volume: 0.12 },
        { freq: 880, start: 0.14, duration: 0.08, volume: 0.12 },
      ],
      swoops: [],
      noises: [],
    }
  }
  // 'tick': the shell timer's tick — LOUDER now (owner, 2026-11-07
  // batch 1: the old 0.03 was too quiet to hear). Still short, so a
  // whole game of ticks never gets annoying.
  return { tones: [{ freq: 1200, start: 0, duration: 0.03, volume: 0.12 }], swoops: [], noises: [] }
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
  for (const n of spec.noises) noiseBurst(n.start, n.duration, n.volume, n.filterFreq)
}

/* ---- Soft background music (game-feel batch, 2026-11-07) ----
 * One gentle loop while a game runs: a slow C-major pentatonic
 * arpeggio of soft sine notes (one note per step) with a quiet bass
 * note every fourth step. No melody is copied from anywhere — the
 * notes are a plain scale. MUSIC UP, HIGH VOLUME (owner,
 * 2026-11-07 18:24 PKT — "music on kar do plz", "HIGH VOLUME
 * PLZ"): the notes play at 0.12 and the bass at 0.08, the same
 * clearly-audible level as the tick (0.12) — loud enough to hear
 * across the room, still under the correct/wrong sounds (claps
 * 0.2, blast 0.22), never harsh. It follows the sound setting:
 * muting stops it, unmuting while playing restarts it. The PlayShell
 * starts it when play begins and stops it on pause/finish/unmount.
 */

export const MUSIC_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33]
export const MUSIC_STEP_MS = 450
// MUSIC UP, HIGH VOLUME (owner, 2026-11-07): the old 0.08/0.05 was
// still too low to hear. Audible now, at the tick's level.
export const MUSIC_NOTE_VOLUME = 0.12
export const MUSIC_BASS_VOLUME = 0.08

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
