'use client'

/**
 * VERTICAL VIDEO MAKER — simple in-platform editor + real download
 * (2026-11-04, master-list section C, items 2–6).
 *
 * Editor (v1): title card text, end card text, shape (vertical 9:16
 * / square 1:1). Crop/trim of video clips is phase 2 (needs a video
 * pipeline) and a full professional editor is NOT promised.
 *
 * Download (item 2): the platform itself produces the file. The
 * game is drawn frame by frame onto a <canvas> (title card → each
 * question → correct-answer reveal → end card) and recorded with
 * MediaRecorder from canvas.captureStream(). The result is a real
 * .webm video (browser-native codec). It is never a text file
 * renamed .mp4, never a placeholder. MP4 conversion is phase 2
 * (server transcode). If MediaRecorder / captureStream is missing,
 * the maker shows a plain error and no download button pretends
 * otherwise. Recording runs in real time (a 10-question video takes
 * about 66 seconds); progress and a Cancel button are shown.
 *
 * Watermark (item 3): none. No watermark, no burned-in URL inside
 * the frames. The end card carries the creator's end text and the
 * EduPlay name only — no URL text at all.
 *
 * SOCIAL EDITOR BRANDING (2026-11-07, final 6, item 13): videos
 * made in the gated social editor carry OUR NAME — every frame gets
 * a small "EduPlay" mark (branded=true). That is the enforcement
 * half of the verification deal: the video is identifiable as ours,
 * so the team can ask a platform to remove it if the creator drops
 * the link. The plain video page (branded unset) stays exactly as
 * before — no watermark, no link inside the video. Kids'/teachers'
 * downloads are never branded.
 *
 * TRIM + THUMBNAIL (social editor only): the editor can record only
 * questions X–Y (trim) and download the title card as a PNG
 * thumbnail. Crop is the shape selector (9:16 / 1:1) that already
 * exists here. Full clip crop/trim of uploaded video is phase 2
 * (needs a video pipeline) and is NOT promised.
 *
 * Share (item 5): a ready caption + the real hosted-page link
 * (the vertical mode page itself). EduPlay CANNOT upload directly
 * to a creator's TikTok/Facebook/Instagram account — those APIs and
 * auth do not allow it — so the flow is download + copy/share, 2
 * taps, posted from the creator's OWN account. The UI says exactly
 * that. Instagram has no link-sharer page, so it is copy-only,
 * honestly labelled (same rule as the homepage share row).
 *
 * Earning (item 6): via the hosted page's clickable link, NOT via
 * watermark. A URL shown inside video frames is NOT a Google
 * backlink — only a clickable link in a caption/description or on
 * the hosted page counts; a visible URL gives brand + direct
 * traffic only. NO ads in v1: ad placement is a phase 2 owner
 * decision, and no fullscreen ad ever goes before a kid's game.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import type { VerticalQuestion } from '@/lib/video-mode'
import {
  VIDEO_SHAPE_DIMS, VIDEO_TIMINGS, buildVideoFrames, frameAt, pickVideoMimeType,
  videoDurationSeconds, videoFileExtension, videoFileName, videoShareText,
  wrapCanvasText, type VideoFrame, type VideoShape,
} from '@/lib/video-mode'
import { facebookShareUrl, whatsappShareUrl } from '@/lib/game-share'

interface VerticalVideoMakerProps {
  questions: VerticalQuestion[]
  gameTitle: string
  /** The hosted vertical page URL (real clickable link). */
  pageUrl: string
  /**
   * SOCIAL EDITOR ONLY: when true, every frame carries a small
   * "EduPlay" mark — the video is identifiable as ours (see the
   * header comment). The plain video page never passes this, so its
   * downloads stay unbranded.
   */
  branded?: boolean
  /**
   * SOCIAL EDITOR ONLY: when true, the editor shows trim controls
   * (record only questions X–Y) and a thumbnail download button.
   */
  showTrimControls?: boolean
}

type MakerStatus = 'idle' | 'recording' | 'done' | 'error'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Draw one frame of the slideshow onto the canvas. Own colours and
 *  layout only — no rival art, wording, or audio is copied. When
 *  branded is true (social editor only), every frame carries a small
 *  "EduPlay" mark so the video is identifiable as ours. */
function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: VideoFrame,
  questions: VerticalQuestion[],
  titleText: string,
  endText: string,
  branded = false,
) {
  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, '#1e1b4b')
  bg.addColorStop(1, '#7c3aed')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const pad = 48
  const inner = width - pad * 2

  // Social-editor branding: a small EduPlay mark on EVERY frame, so
  // the video is identifiable as ours (see the header comment).
  if (branded) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = '28px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('EduPlay', width - 24, height - 24)
    ctx.textAlign = 'center'
  }

  if (frame.kind === 'title') {
    ctx.font = '120px sans-serif'
    ctx.fillText('⭐', width / 2, height * 0.3)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 64px sans-serif'
    const lines = wrapCanvasText((t) => ctx.measureText(t).width, titleText || 'My game', inner)
    let y = height * 0.48
    for (const line of lines.slice(0, 4)) {
      ctx.fillText(line, width / 2, y)
      y += 78
    }
    ctx.fillStyle = '#ddd6fe'
    ctx.font = '32px sans-serif'
    ctx.fillText('A game on EduPlay', width / 2, height * 0.78)
    return
  }

  if (frame.kind === 'end') {
    ctx.font = '120px sans-serif'
    ctx.fillText('🎉', width / 2, height * 0.3)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 60px sans-serif'
    const lines = wrapCanvasText((t) => ctx.measureText(t).width, endText || 'Thanks for playing!', inner)
    let y = height * 0.48
    for (const line of lines.slice(0, 4)) {
      ctx.fillText(line, width / 2, y)
      y += 74
    }
    ctx.fillStyle = '#ddd6fe'
    ctx.font = '32px sans-serif'
    ctx.fillText('EduPlay', width / 2, height * 0.78)
    return
  }

  const q = questions[frame.questionIndex]
  if (!q) return
  const isReveal = frame.kind === 'reveal'
  ctx.fillStyle = '#ddd6fe'
  ctx.font = '28px sans-serif'
  ctx.fillText(`Question ${frame.questionIndex + 1} of ${questions.length}`, width / 2, 72)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 52px sans-serif'
  const promptLines = wrapCanvasText((t) => ctx.measureText(t).width, q.prompt, inner)
  let y = 150
  for (const line of promptLines.slice(0, 4)) {
    ctx.fillText(line, width / 2, y)
    y += 66
  }
  const letters = ['A', 'B', 'C', 'D']
  const boxH = 104
  const gap = 20
  let boxY = y + 30
  q.options.forEach((opt, idx) => {
    const correct = idx === q.correctIndex
    if (isReveal) ctx.fillStyle = correct ? '#16a34a' : 'rgba(255,255,255,0.25)'
    else ctx.fillStyle = '#ffffff'
    roundRect(ctx, pad, boxY, inner, boxH, 20)
    ctx.fill()
    ctx.fillStyle = isReveal && !correct ? 'rgba(255,255,255,0.75)' : '#1e1b4b'
    if (isReveal && correct) ctx.fillStyle = '#ffffff'
    ctx.font = '38px sans-serif'
    ctx.textAlign = 'left'
    const label = `${letters[idx] ?? ''}. ${opt}`
    const optLines = wrapCanvasText((t) => ctx.measureText(t).width, label, inner - 40)
    ctx.fillText(optLines[0] ?? '', pad + 20, boxY + boxH / 2)
    ctx.textAlign = 'center'
    boxY += boxH + gap
  })
  if (isReveal) {
    ctx.fillStyle = '#bbf7d0'
    ctx.font = 'bold 34px sans-serif'
    ctx.fillText('✓ Correct answer', width / 2, boxY + 20)
  }
}

export default function VerticalVideoMaker({ questions, gameTitle, pageUrl, branded = false, showTrimControls = false }: VerticalVideoMakerProps) {
  const [titleText, setTitleText] = useState(gameTitle)
  const [endText, setEndText] = useState('Thanks for playing!')
  const [shape, setShape] = useState<VideoShape>('vertical')
  const [status, setStatus] = useState<MakerStatus>('idle')
  const [progressSec, setProgressSec] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [caption, setCaption] = useState(videoShareText(gameTitle, pageUrl))
  const [copied, setCopied] = useState<string | null>(null)
  // Social-editor trim: record only questions trimFrom–trimTo
  // (1-based, inclusive). Plain video page never shows these controls.
  const [trimFrom, setTrimFrom] = useState(1)
  const [trimTo, setTrimTo] = useState(questions.length)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const rafRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)
  const lastSecRef = useRef(-1)
  const dims = VIDEO_SHAPE_DIMS[shape]
  // Trimmed question list: the social editor records only the chosen
  // range; the plain video page always uses the full list.
  const shownQuestions = useMemo(() => {
    if (!showTrimControls) return questions
    const from = Math.max(1, Math.min(trimFrom, trimTo, questions.length))
    const to = Math.max(from, Math.min(trimTo, questions.length))
    return questions.slice(from - 1, to)
  }, [questions, showTrimControls, trimFrom, trimTo])
  const totalSec = videoDurationSeconds(shownQuestions.length)

  // Idle preview: the canvas always shows the title card so the
  // creator sees what the video starts with before recording.
  useEffect(() => {
    if (status !== 'idle') return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    drawFrame(ctx, dims.width, dims.height, { kind: 'title', durationSec: VIDEO_TIMINGS.titleSec }, shownQuestions, titleText, endText, branded)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, shape, titleText, endText, shownQuestions.length, branded])

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    try { recorderRef.current?.stop() } catch { /* already stopped */ }
    if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopLoop() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }

  function cancelRecording() {
    cancelledRef.current = true
    stopLoop()
    try { recorderRef.current?.stop() } catch { /* already stopped */ }
    recorderRef.current = null
    setStatus('idle')
    setProgressSec(0)
  }

  // Social-editor thumbnail: the title card as a PNG, for the reel /
  // post cover. Draws the current title frame onto the canvas and
  // downloads it — no server, no upload.
  function downloadThumbnail() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    drawFrame(ctx, dims.width, dims.height, { kind: 'title', durationSec: VIDEO_TIMINGS.titleSec }, shownQuestions, titleText, endText, branded)
    canvas.toBlob((blob) => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${gameTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'game'}-thumbnail.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, 'image/png')
  }

  function startRecording() {
    const canvas = canvasRef.current
    if (!canvas) { setErrorMsg('The video canvas is not ready yet. Reload the page and try again.'); setStatus('error'); return }
    if (typeof MediaRecorder === 'undefined' || typeof canvas.captureStream !== 'function') {
      setErrorMsg('Video recording is not supported in this browser, so no video file can be made here. Try a current Chrome, Edge, or Firefox. Nothing was downloaded.')
      setStatus('error')
      return
    }
    const mime = pickVideoMimeType((t) => {
      try { return MediaRecorder.isTypeSupported(t) } catch { return false }
    })
    if (!mime) {
      setErrorMsg('This browser cannot record video in a supported format, so no video file can be made here. Nothing was downloaded.')
      setStatus('error')
      return
    }
    if (downloadUrl) { URL.revokeObjectURL(downloadUrl); setDownloadUrl(null) }
    const frames = buildVideoFrames(shownQuestions.length)
    const chunks: BlobPart[] = []
    let recorder: MediaRecorder
    try {
      const stream = canvas.captureStream(30)
      recorder = new MediaRecorder(stream, { mimeType: mime })
    } catch {
      setErrorMsg('Video recording could not start in this browser. Nothing was downloaded.')
      setStatus('error')
      return
    }
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }
    recorder.onstop = () => {
      stopLoop()
      if (cancelledRef.current) { cancelledRef.current = false; return }
      const blob = new Blob(chunks, { type: mime })
      if (blob.size === 0) {
        setErrorMsg('The recording came out empty, so no file is offered. Try again.')
        setStatus('error')
        return
      }
      setDownloadUrl(URL.createObjectURL(blob))
      setDownloadName(videoFileName(gameTitle, videoFileExtension(mime)))
      setProgressSec(totalSec)
      setStatus('done')
    }
    cancelledRef.current = false
    lastSecRef.current = -1
    recorderRef.current = recorder
    setErrorMsg(null)
    setStatus('recording')
    setProgressSec(0)
    const startedAt = performance.now()
    const ctx = canvas.getContext('2d')
    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000
      const whole = Math.floor(elapsed)
      if (whole !== lastSecRef.current) { lastSecRef.current = whole; setProgressSec(Math.min(whole, totalSec)) }
      if (ctx) {
        const frame = frameAt(frames, elapsed)
        if (frame) drawFrame(ctx, dims.width, dims.height, frame, shownQuestions, titleText, endText, branded)
      }
      if (elapsed >= totalSec) {
        try { recorder.stop() } catch { /* already stopped */ }
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    try { recorder.start() } catch {
      setErrorMsg('Video recording could not start in this browser. Nothing was downloaded.')
      setStatus('error')
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  const recording = status === 'recording'
  const progressPct = totalSec > 0 ? Math.min(100, Math.round((progressSec / totalSec) * 100)) : 0

  return (
    <div data-testid="vertical-video-maker" style={{ maxWidth: '430px', margin: '2rem auto 0' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', fontSize: '1.25rem', textAlign: 'center' }}>
        🎬 Make a vertical video
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
        {branded
          ? 'Simple editor: title card, end card, and shape. This video carries the EduPlay name — it is a social-creator video.'
          : 'Simple editor: title card, end card, and shape. No watermark, no link inside the video.'}
      </p>

      <label style={{ display: 'block', marginTop: '1rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
        Title card text
        <input
          type="text"
          value={titleText}
          maxLength={80}
          onChange={(e) => setTitleText(e.target.value)}
          disabled={recording}
          style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.6rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
      </label>
      <label style={{ display: 'block', marginTop: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
        End card text
        <input
          type="text"
          value={endText}
          maxLength={80}
          onChange={(e) => setEndText(e.target.value)}
          disabled={recording}
          style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.6rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
        />
      </label>
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }} role="group" aria-label="Video shape">
        <button
          type="button"
          onClick={() => setShape('vertical')}
          disabled={recording}
          aria-pressed={shape === 'vertical'}
          style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius)', border: shape === 'vertical' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: shape === 'vertical' ? 700 : 400 }}
        >
          📱 Vertical (9:16)
        </button>
        <button
          type="button"
          onClick={() => setShape('square')}
          disabled={recording}
          aria-pressed={shape === 'square'}
          style={{ flex: 1, padding: '0.6rem', borderRadius: 'var(--radius)', border: shape === 'square' ? '2px solid var(--color-primary)' : '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer', fontWeight: shape === 'square' ? 700 : 400 }}
        >
          ⬛ Square (1:1)
        </button>
      </div>

      {/* Social-editor trim: record only questions X–Y. Crop is the
          shape selector above (9:16 / 1:1). */}
      {showTrimControls ? (
        <div style={{ marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <label style={{ flex: 1, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Trim: from question
              <input
                type="number"
                min={1}
                max={questions.length}
                value={trimFrom}
                disabled={recording}
                onChange={(e) => setTrimFrom(Math.max(1, Math.min(questions.length, Number(e.target.value) || 1)))}
                aria-label="Trim from question"
                style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.6rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              />
            </label>
            <label style={{ flex: 1, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              to question
              <input
                type="number"
                min={1}
                max={questions.length}
                value={trimTo}
                disabled={recording}
                onChange={(e) => setTrimTo(Math.max(1, Math.min(questions.length, Number(e.target.value) || 1)))}
                aria-label="Trim to question"
                style={{ display: 'block', width: '100%', marginTop: '0.25rem', padding: '0.6rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
              />
            </label>
          </div>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Recording only questions {Math.min(trimFrom, trimTo)}–{Math.max(trimFrom, trimTo)} of {questions.length}.
          </p>
        </div>
      ) : null}

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <canvas
          ref={canvasRef}
          width={dims.width}
          height={dims.height}
          data-testid="vertical-video-canvas"
          style={{ width: '100%', maxWidth: '320px', height: 'auto', borderRadius: '16px', border: '2px solid var(--color-border)', background: '#1e1b4b' }}
        />
      </div>

      {recording ? (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
            Recording… {progressSec}s / {totalSec}s ({progressPct}%)
          </p>
          <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: 'var(--radius)', margin: '0.5rem 0 1rem' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--color-primary)', borderRadius: 'var(--radius)' }} />
          </div>
          <button
            type="button"
            onClick={cancelRecording}
            style={{ padding: '0.6rem 1.25rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
          >
            Cancel recording
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            type="button"
            onClick={startRecording}
            style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)', border: 'none', background: 'var(--gradient-btn)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: '1rem', cursor: 'pointer' }}
          >
            🎬 Make video ({totalSec}s)
          </button>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Recording runs in real time. The file is a .webm video — it plays in browsers and uploads to TikTok. MP4 conversion is a later step, not in this version.
          </p>
          {showTrimControls ? (
            <button
              type="button"
              onClick={downloadThumbnail}
              style={{ marginTop: '0.75rem', padding: '0.6rem 1.25rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
            >
              🖼️ Download thumbnail (PNG)
            </button>
          ) : null}
        </div>
      )}

      {status === 'error' && errorMsg ? (
        <p role="alert" style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', background: 'var(--color-surface)', border: '2px solid var(--color-danger)', color: 'var(--color-text-primary)', textAlign: 'center' }}>
          {errorMsg}
        </p>
      ) : null}

      {status === 'done' && downloadUrl ? (
        <div style={{ marginTop: '1rem', textAlign: 'center', padding: '1rem', background: 'var(--color-surface)', border: '2px solid var(--color-success)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ color: 'var(--color-text-primary)', fontWeight: 700, margin: '0 0 0.75rem' }}>✅ Your video is ready!</p>
          <a
            href={downloadUrl}
            download={downloadName}
            style={{ display: 'inline-block', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-lg)', background: 'var(--color-primary)', color: '#fff', textDecoration: 'none', fontWeight: 700 }}
          >
            ⬇ Download {downloadName}
          </a>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {branded
              ? 'This file was made here on EduPlay — not a screen recording. It carries the EduPlay name, so it is identifiable as ours.'
              : 'This file was made here on EduPlay — not a screen recording. No watermark, no link inside the video.'}
          </p>
        </div>
      ) : null}

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)', fontSize: '1.05rem', margin: '0 0 0.5rem' }}>
          Share it from your own account
        </h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 0.75rem' }}>
          EduPlay cannot upload directly to your TikTok, Facebook, or Instagram account — download the video above, then post it from your own account in 2 taps.
        </p>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          aria-label="Share caption"
          style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)' }}
        />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <button type="button" onClick={() => copyText(caption, 'caption')} style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
            {copied === 'caption' ? 'Copied!' : '📋 Copy caption'}
          </button>
          <button type="button" onClick={() => copyText(pageUrl, 'link')} style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
            {copied === 'link' ? 'Copied!' : '🔗 Copy link'}
          </button>
          <a href={whatsappShareUrl(caption)} target="_blank" rel="noopener noreferrer" style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', textDecoration: 'none' }}>
            WhatsApp
          </a>
          <a href={facebookShareUrl(pageUrl, caption)} target="_blank" rel="noopener noreferrer" style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', textDecoration: 'none' }}>
            Facebook
          </a>
          <button type="button" onClick={() => copyText(`${caption}`, 'instagram')} style={{ padding: '0.6rem 1rem', borderRadius: 'var(--radius)', border: '2px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
            {copied === 'instagram' ? 'Copied!' : '📋 Copy for Instagram'}
          </button>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          Instagram has no link-sharer page — copy the caption and link, then paste them on Instagram. Nothing is posted from here.
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          {branded
            ? 'Earning note: a URL shown inside video frames is not a Google backlink — only this clickable link counts. This video carries the EduPlay name (no URL, no watermark beyond the name). No ads are placed in this version.'
            : 'Earning note: a URL shown inside video frames is not a Google backlink — only this clickable link counts. This video carries no URL and no watermark. No ads are placed in this version.'}
        </p>
      </div>
    </div>
  )
}
