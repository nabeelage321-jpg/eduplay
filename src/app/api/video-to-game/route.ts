import { NextRequest, NextResponse } from 'next/server'
import {
  GEMINI_MAX_VIDEO_MINUTES,
  buildVideoQuizDraft,
  canonicalYouTubeUrl,
  fetchVideoMeta,
  fetchVideoTranscript,
  getGeminiConfig,
  parseYouTubeVideoId,
} from '@/lib/gemini'
import type { PromptDraft } from '@/lib/prompt-to-game'

/**
 * POST /api/video-to-game — draft only, never a published game.
 * Body: { videoUrl } — the link of the creator's OWN public
 * YouTube video.
 *
 * Flow: validate the link -> check the Gemini key -> open the video
 * (oEmbed title/author; a private, unlisted, or deleted video fails
 * here, before any Gemini call) -> Gemini reads the video and
 * returns a transcript + duration -> refuse videos longer than
 * ~15 minutes -> Gemini turns the transcript into a paraphrased
 * Quiz draft (same paraphrase rule as the chapter flow: facts in
 * new words, never the transcript word for word — enforced by
 * parseGroqChapterQuestions, which drops any verbatim item).
 *
 * The game links back to the source video and credits it
 * ("Made from your YouTube video" + Source link). No video is
 * downloaded, stored, or re-uploaded — link only.
 *
 * Every failure is a plain message, never a crash and never a fake
 * game: missing key = "not set up yet"; private video = plain
 * refusal; quota hit = "try tomorrow"; too long = plain refusal.
 * The key is never logged and never returned to the browser.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const videoId = parseYouTubeVideoId(body.videoUrl)
    if (!videoId) {
      return NextResponse.json(
        {
          error:
            'That does not look like a YouTube video link. Paste the full link of your own public YouTube video — for example https://www.youtube.com/watch?v=…',
        },
        { status: 400 }
      )
    }
    const videoUrl = canonicalYouTubeUrl(videoId)

    const config = getGeminiConfig()
    if (!config) {
      return NextResponse.json(
        {
          error:
            'Video to Game is not set up yet — the Gemini key is missing. Add GEMINI_API_KEY in Vercel and redeploy, then try again. No game was made.',
        },
        { status: 503 }
      )
    }

    const meta = await fetchVideoMeta(videoId)
    if (!meta) {
      return NextResponse.json(
        {
          error:
            'I could not open this video. It may be private, unlisted, or deleted — only public YouTube videos work. Check the link and try again.',
        },
        { status: 502 }
      )
    }

    const transcript = await fetchVideoTranscript(videoUrl, config)
    if (!transcript.ok) {
      return NextResponse.json({ error: transcript.error }, { status: transcript.status })
    }

    if (
      transcript.data.durationMinutes !== null &&
      transcript.data.durationMinutes > GEMINI_MAX_VIDEO_MINUTES
    ) {
      return NextResponse.json(
        {
          error: `This video is about ${Math.round(transcript.data.durationMinutes)} minutes long — Video to Game works with videos up to ${GEMINI_MAX_VIDEO_MINUTES} minutes. Try a shorter video.`,
        },
        { status: 502 }
      )
    }

    const draft = await buildVideoQuizDraft(transcript.data.transcript, meta.title, config)
    if (!draft.ok) {
      return NextResponse.json({ error: draft.error }, { status: draft.status })
    }

    const gameDraft: PromptDraft = {
      title: meta.title.slice(0, 120),
      type: 'quiz',
      items: draft.items,
      sourceNote:
        'Made from your YouTube video — the questions are written in new words about what the video teaches, never copied from it word for word. Check and edit each question before you approve it, and keep the game private until a teacher or parent has checked it.',
      sourceUrl: videoUrl,
    }
    return NextResponse.json({
      draft: gameDraft,
      video: { title: meta.title, author: meta.author, url: videoUrl },
    })
  } catch (err) {
    console.error('[POST /api/video-to-game]', err)
    return NextResponse.json(
      { error: 'Could not make a draft right now. Try again in a moment.' },
      { status: 500 }
    )
  }
}
