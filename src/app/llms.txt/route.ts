import { NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/seo/base-url'

// llms.txt — BEST HOMEPAGE batch (new route; no llms.txt existed in this
// repo before). Plain facts only: real counts are the live DB grid
// (5,110 activities, 15 subjects, 23 types, 11 languages), never invented
// teachers, plays, school counts, testimonials, or prices.
export async function GET() {
  const base = getBaseUrl()
  const text = [
    '# EduPlay',
    '',
    '> EduPlay is a place to play and create interactive learning games, quizzes and activities in the browser.',
    '',
    '## Homepage sections',
    '- Animated hero: one promise, one dominant Play button, plus Browse, Create, Join a game, and Join a live game.',
    '- Popular games: 12 real public games, each with Play and Share, ordered by play count then newest.',
    '- Browse by subject: 15 subjects (Math, Science, English, Urdu, Islamiyat, History, Geography, Computer Science, Art, Physical Education, Biology, Chemistry, Physics, Social Studies, General Knowledge).',
    '- Browse by game type: 23 types, including quiz, match-up, unjumble, crossword, word-search, bingo, memory-match and typing-race.',
    '- How it works in 3 steps: prompt or template, edit and preview, play and share.',
    '- Roles: Teachers, Students, Parents, Creators — one benefit each.',
    '- Curriculum and languages: subjects tagged by subject, grade and game type; Pakistan SNC and Islamiyat are first-class subjects; 11 languages including Urdu and Arabic with right-to-left support.',
    '- FAQ: direct first-line answers about accounts, prompt-to-game, sharing, subjects, languages, printing and slow connections.',
    '',
    '## Key pages',
    `- Home: ${base}/en`,
    `- Browse: ${base}/en/browse`,
    `- Activities: ${base}/en/activities`,
    `- Create: ${base}/en/create`,
    `- Join a game: ${base}/en/join`,
    `- Live game: ${base}/en/live`,
    `- Sitemap: ${base}/sitemap.xml`,
    '',
    '## Notes for AI readers',
    '- Students join a live game with a code or a shared play link, without an account. Creating and saving games needs a signed-in account.',
    '- Nothing is published until its creator saves it. New games are shared with friends first for testing; a teacher or parent can remove a game after it is live.',
    '- No invented ratings, testimonials, school counts, or prices are stated anywhere on this site.',
    '',
  ].join('\n')
  return new NextResponse(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
