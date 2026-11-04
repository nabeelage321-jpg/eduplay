/**
 * VERTICAL VIDEO MODE v1 (2026-11-04, master-list section C) —
 * the creator/TikTok set, built honestly.
 *
 * What this is: a vertical (9:16-style) presentation of an existing
 * Quiz game — big question, big options, timer, no sign-in — plus a
 * simple in-platform editor (title card + end card text, vertical /
 * square shape) and a real downloadable video file made in the
 * browser from the platform itself, never a screen recording.
 *
 * What this is NOT, stated plainly:
 * - NOT the Video Quiz type (video-quiz): that type plays a
 *   teacher-pasted video and pauses it with questions. This mode
 *   presents a Quiz game's own questions vertically. No code is
 *   shared with VideoQuizActivity beyond the question shape.
 * - NOT a server render, NOT an upload to TikTok/Facebook/Instagram:
 *   those platforms' APIs/auth do not allow EduPlay to post to a
 *   creator's account directly. The feasible version is download +
 *   share sheet / caption copy, 2 taps, posted from the creator's
 *   OWN account. The UI says exactly that; it never promises
 *   auto-upload.
 * - NOT a watermark: no watermark, no burned-in URL inside the
 *   video frames. A URL shown inside video frames is NOT a Google
 *   backlink — only a clickable link in a caption/description or on
 *   the hosted page counts. The hosted page here is the vertical
 *   mode page itself (a real clickable link); a visible URL gives
 *   brand + direct traffic only, and this video carries no URL at
 *   all.
 * - NO ads in v1: ad placement on the hosted page is a phase 2
 *   owner decision, and no fullscreen ad ever goes before a kid's
 *   game.
 * - Legal scope: the creator's OWN game content only. Nothing here
 *   downloads, scrapes, or converts arbitrary YouTube/TikTok videos
 *   (captions blocked, TikTok has no commercial public-video API,
 *   no downloading copyrighted video).
 *
 * How the download is real: the video is drawn frame by frame onto
 * a <canvas> (title card → each question → correct-answer reveal →
 * end card) and recorded with the browser's MediaRecorder from
 * canvas.captureStream(). The downloaded file is a genuine .webm
 * video (browser-native codec), not a text file renamed .mp4 and
 * not a placeholder. MP4 conversion is phase 2 (server transcode).
 * If MediaRecorder / captureStream is unavailable, the maker shows
 * a plain error and NO download button pretends otherwise.
 * Crop/trim of video clips is phase 2 (needs a video pipeline);
 * v1's editor is title card + end card + shape only. A full
 * professional editor in-browser is heavy and NOT promised.
 */

import type { ActivityItem } from '@/types'
import { shuffleArray } from '@/components/activity-types/shared'

/** v1 scope: Quiz games only. Gameshow-quiz shares the Q&A shape
 *  but is a one-line follow-up, not silently included. */
export const VIDEO_MODE_TYPES = ['quiz'] as const

/** Vertical 9:16-ish and square 1:1 render sizes. */
export type VideoShape = 'vertical' | 'square'

export const VIDEO_SHAPE_DIMS: Record<VideoShape, { width: number; height: number }> = {
  vertical: { width: 720, height: 1280 },
  square: { width: 720, height: 720 },
}

/** Fixed timings for the recorded slideshow (seconds). The
 *  interactive vertical player uses the normal 30s question timer;
 *  the recorded video is a watchable summary, not a timed test. */
export const VIDEO_TIMINGS = {
  titleSec: 3,
  questionSec: 4,
  revealSec: 2,
  endSec: 3,
} as const

export interface VerticalQuestion {
  prompt: string
  answer: string
  options: string[]
  correctIndex: number
}

/** Build the vertical questions from a game's items, the same way
 *  Quiz builds them: the correct answer plus up to 3 other
 *  questions' answers as distractors, shuffled. Items without a
 *  prompt or an answer cannot be asked and are dropped — never
 *  invented. */
export function buildVerticalQuestions(items: ActivityItem[]): VerticalQuestion[] {
  const allAnswers = items.map((i) => i.answer).filter(Boolean)
  return items
    .filter((i) => i.prompt && i.answer)
    .map((item) => {
      const wrong = shuffleArray(allAnswers.filter((a) => a !== item.answer)).slice(0, 3)
      const options = shuffleArray([item.answer, ...wrong])
      return { prompt: item.prompt, answer: item.answer, options, correctIndex: options.indexOf(item.answer) }
    })
}

/** One frame of the recorded slideshow. Durations are seconds. */
export type VideoFrame =
  | { kind: 'title'; durationSec: number }
  | { kind: 'question'; questionIndex: number; durationSec: number }
  | { kind: 'reveal'; questionIndex: number; durationSec: number }
  | { kind: 'end'; durationSec: number }

/** The full frame sequence for a recording: title card, then per
 *  question a question frame + a reveal frame, then the end card. */
export function buildVideoFrames(questionCount: number): VideoFrame[] {
  const frames: VideoFrame[] = [{ kind: 'title', durationSec: VIDEO_TIMINGS.titleSec }]
  for (let i = 0; i < questionCount; i++) {
    frames.push({ kind: 'question', questionIndex: i, durationSec: VIDEO_TIMINGS.questionSec })
    frames.push({ kind: 'reveal', questionIndex: i, durationSec: VIDEO_TIMINGS.revealSec })
  }
  frames.push({ kind: 'end', durationSec: VIDEO_TIMINGS.endSec })
  return frames
}

/** Total recording length in seconds (real time — the canvas must
 *  play through it while MediaRecorder runs). */
export function videoDurationSeconds(questionCount: number): number {
  return buildVideoFrames(questionCount).reduce((sum, f) => sum + f.durationSec, 0)
}

/** Which frame is on screen at `elapsedSec` into the recording, or
 *  null when the recording is over. */
export function frameAt(frames: VideoFrame[], elapsedSec: number): VideoFrame | null {
  let t = 0
  for (const f of frames) {
    if (elapsedSec < t + f.durationSec) return f
    t += f.durationSec
  }
  return null
}

/** Pick the first MediaRecorder mime type the browser supports, or
 *  null when none is supported (caller then shows a plain error —
 *  never a fake download). Pure: the support check is injected so
 *  this is unit-testable without a browser. */
export function pickVideoMimeType(isSupported: (mime: string) => boolean): string | null {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  for (const c of candidates) {
    try {
      if (isSupported(c)) return c
    } catch {
      // A throwing support check means "not supported here".
    }
  }
  return null
}

/** File extension for a recorded mime type. WebM stays .webm; only
 *  a genuinely mp4 mime type gets .mp4 — never a renamed file. */
export function videoFileExtension(mimeType: string): string {
  return mimeType.includes('mp4') ? 'mp4' : 'webm'
}

/** A safe download filename from a game title: letters, digits,
 *  dashes and underscores only, everything else becomes a dash. */
export function videoFileName(gameTitle: string, extension: string): string {
  const slug = (gameTitle || 'eduplay-game')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'eduplay-game'
  return `${slug}-vertical.${extension}`
}

/** The hosted video page URL — the real clickable link that travels
 *  with the share caption. Never shortened, never tracked. */
export function videoPageUrl(locale: string, gameId: string, origin = 'https://eduplay-self.vercel.app'): string {
  return `${origin}/${locale}/activity/${gameId}/video`
}

/** Ready caption for the creator to post from their own account. */
export function videoShareText(gameTitle: string, pageUrl: string): string {
  return `Play ${gameTitle} on EduPlay: ${pageUrl}`
}

/** Wrap canvas text into lines that fit maxWidth. Long single words
 *  are split rather than overflowing the frame. Pure and tested. */
export function wrapCanvasText(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word
    if (measure(trial) <= maxWidth) {
      line = trial
      continue
    }
    if (line) lines.push(line)
    // A single word wider than the frame is split character by
    // character so nothing ever overflows.
    let rest = word
    while (measure(rest) > maxWidth && rest.length > 1) {
      let cut = rest.length - 1
      while (cut > 1 && measure(rest.slice(0, cut)) > maxWidth) cut--
      lines.push(rest.slice(0, cut))
      rest = rest.slice(cut)
    }
    line = rest
  }
  if (line) lines.push(line)
  return lines
}
