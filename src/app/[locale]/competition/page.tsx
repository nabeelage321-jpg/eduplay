import type { Metadata } from 'next'
import { generateWebPageSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import ChallengeView from '@/components/game/ChallengeView'
import CompetitionWinner from '@/components/game/CompetitionWinner'
import { parseChallengeParams } from '@/lib/challenges'

// ─── FREE COMPETITION SHELL for launch (owner order 2026-11-06) ──────────
// One public page + one small winner component. No new DB tables, no new
// API routes, no migration, no design change to any other page.
//
// WHAT IT REUSES (do not rebuild): Challenges v1 (commit 9da89e25) — the
// maker on a saved-game detail page, owning teacher only; a challenge is
// a game + a 6-char PIN + an optional group + a deadline, carried in a
// shareable link. Live sessions (polling leaderboard every 3s — NOT
// realtime). Teacher Reports v1 (GET /api/live-sessions?roomCode=).
//
// HOW THE WEEK'S COMPETITION IS SET (the whole mechanism, stated on
// screen too): a teacher opens one of their saved games, makes a
// challenge with the existing Challenges maker (it gives a PIN and a
// deadline), then shares THIS page's link with the same parameters:
//   /{locale}/competition?game=<id>&pin=<PIN>&deadline=<ISO>&group=<name>
// That link IS the week's featured competition. There is no hidden
// admin, no hardcoded game, no stored competition — the link carries
// everything, exactly like the /challenge page. Without parameters the
// page shows an honest empty state, never a fake competition.
//
// FREE ONLY: no entry fee, no payment, and this page NEVER promises
// prizes. Prizes are a post-launch owner decision. The reward stated
// here is topping the leaderboard. Past winners are real top scorers
// from finished competitions only — never invented; while a
// competition is still running, no winner is declared (the leaderboard
// is still moving).
//
// INDEXING GATE (same rule as the hubs — real content, or noindex):
// indexable only when the link carries a real featured competition
// (a game id AND a valid 6-char PIN); the bare page (empty state) is
// noindex. NOT added to sitemap.xml (sitemap inclusion is a separate
// decision); sitemap type list untouched (stays 23).

const PAGE_TITLE = 'Free Competition — Play Free, Top the Leaderboard'
const PAGE_TITLE_TAG = `${PAGE_TITLE} | EduPlay`
const PAGE_DESCRIPTION =
  'A free weekly competition on EduPlay. No entry fee, no account needed to play — join with the room code and your nickname, and top the leaderboard.'
const EMPTY_STATE = 'No competition running this week — check back soon'

function hasFeaturedCompetition(
  challenge: ReturnType<typeof parseChallengeParams>,
): boolean {
  return challenge.gameId !== '' && challenge.pin !== ''
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { locale: string }
  searchParams: Record<string, string | string[] | undefined>
}): Promise<Metadata> {
  const challenge = parseChallengeParams(searchParams)
  const openGraph = { title: PAGE_TITLE_TAG, description: PAGE_DESCRIPTION }
  const twitter = { card: 'summary', title: PAGE_TITLE_TAG, description: PAGE_DESCRIPTION }
  if (!hasFeaturedCompetition(challenge)) {
    return {
      title: PAGE_TITLE_TAG,
      description: PAGE_DESCRIPTION,
      openGraph,
      twitter,
      robots: { index: false, follow: true },
    }
  }
  return {
    title: PAGE_TITLE_TAG,
    description: PAGE_DESCRIPTION,
    openGraph,
    twitter,
    robots: { index: true, follow: true },
  }
}

interface CompetitionPageProps {
  params: { locale: string }
  searchParams: Record<string, string | string[] | undefined>
}

export default function CompetitionPage({ params, searchParams }: CompetitionPageProps) {
  const challenge = parseChallengeParams(searchParams)
  const featured = hasFeaturedCompetition(challenge)
  const partialLink = !featured && (challenge.gameId !== '' || challenge.pin !== '')
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'}/${params.locale}/competition`

  const jsonLd = generateWebPageSchema({
    url: pageUrl,
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    locale: params.locale,
  })

  return (
    <>
      <JsonLd data={jsonLd} />

      <main
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          color: 'var(--color-text-primary)',
        }}
      >
        <Breadcrumb
          items={[
            { label: 'Home', href: `/${params.locale}` },
            { label: 'Competition' },
          ]}
        />

        {/* Hero */}
        <section
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: 'var(--gradient-hero)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
          }}
          aria-labelledby="hero-heading"
        >
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }} aria-hidden="true">
            🏆
          </div>
          <h1
            id="hero-heading"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              marginBottom: '1rem',
            }}
          >
            Free Competition — Play Free, Top the Leaderboard
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 1rem',
            }}
          >
            A free weekly competition on EduPlay. No entry fee, no account
            needed to play — join with the room code and your nickname, and
            top the leaderboard.
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            Free means free: no entry fee, and no prizes are promised —
            topping the leaderboard is the reward.
          </p>
        </section>

        {/* Featured competition, or the honest empty state. */}
        {featured ? (
          <section aria-labelledby="featured-heading" style={{ marginBottom: '2rem' }}>
            <h2
              id="featured-heading"
              style={{
                fontSize: '1.5rem',
                fontFamily: 'var(--font-display)',
                marginBottom: '1rem',
                color: 'var(--color-text-primary)',
              }}
            >
              This week&apos;s free competition
            </h2>
            <div
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                padding: '0.5rem 1rem 1.5rem',
              }}
            >
              <ChallengeView
                locale={params.locale}
                gameId={challenge.gameId}
                pin={challenge.pin}
                group={challenge.group}
                deadline={challenge.deadline}
              />
            </div>
          </section>
        ) : (
          <section
            aria-labelledby="empty-heading"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              padding: '1.5rem',
              textAlign: 'center',
              marginBottom: '2rem',
            }}
          >
            <h2
              id="empty-heading"
              style={{
                fontSize: '1.5rem',
                fontFamily: 'var(--font-display)',
                marginBottom: '0.75rem',
                color: 'var(--color-text-primary)',
              }}
            >
              {partialLink
                ? 'This competition link is incomplete'
                : 'No competition running this week'}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
              {partialLink
                ? 'This link has no valid game or PIN, so there is no competition to show here. Ask the teacher who shared it for the full link — or start one yourself.'
                : `${EMPTY_STATE} — a new free competition starts soon. Until then, play any game or make your own.`}
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                justifyContent: 'center',
              }}
            >
              <a
                href={`/${params.locale}/browse`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '48px',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--gradient-btn)',
                  color: '#fff',
                  borderRadius: 'var(--radius)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Play games
              </a>
              <a
                href={`/${params.locale}/create`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '48px',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--color-surface)',
                  color: 'var(--color-primary)',
                  borderRadius: 'var(--radius)',
                  border: '2px solid var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Create a game
              </a>
              <a
                href={`/${params.locale}/dashboard`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '48px',
                  padding: '0.75rem 1.5rem',
                  background: 'var(--color-surface)',
                  color: 'var(--color-primary)',
                  borderRadius: 'var(--radius)',
                  border: '2px solid var(--color-primary)',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Host a challenge
              </a>
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                marginTop: '1rem',
                marginBottom: 0,
              }}
            >
              Teachers host a challenge from one of their saved games — the
              challenge link, with its PIN and deadline, is what runs here.
            </p>
          </section>
        )}

        {/* How it works — the existing join flow, nothing new. */}
        <section aria-labelledby="how-heading" style={{ marginBottom: '2rem' }}>
          <h2
            id="how-heading"
            style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            How it works
          </h2>
          <ol
            style={{
              display: 'grid',
              gap: '1rem',
              margin: 0,
              padding: 0,
              listStyle: 'none',
            }}
          >
            {[
              {
                step: '1. Join free',
                text: 'No account needed to play. Open the competition, tap Join, enter the room code and a nickname.',
              },
              {
                step: '2. Play before the deadline',
                text: 'Answer, match, or solve the game before the countdown ends. The leaderboard updates live while you play.',
              },
              {
                step: '3. Top the leaderboard',
                text: 'The top scorer when the deadline passes is the winner. Scores come only from the live session — nothing is invented.',
              },
            ].map((item) => (
              <li
                key={item.step}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem 1.25rem',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{item.step}</strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>{item.text}</span>
              </li>
            ))}
          </ol>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
            How a competition is set: a teacher makes a challenge from a
            saved game — the challenge link, with its game, PIN, and
            deadline, is the competition. This page stores nothing; the link
            carries everything.
          </p>
        </section>

        {/* Past winners — real top scorers from finished competitions only. */}
        {featured ? (
          <section aria-labelledby="winners-heading" style={{ marginBottom: '2rem' }}>
            <h2
              id="winners-heading"
              style={{
                fontSize: '1.5rem',
                fontFamily: 'var(--font-display)',
                marginBottom: '1rem',
                color: 'var(--color-text-primary)',
              }}
            >
              Past winners
            </h2>
            <CompetitionWinner pin={challenge.pin} deadline={challenge.deadline} />
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
              Winners are real top scorers from finished competitions — never
              invented. No prizes are promised.
            </p>
          </section>
        ) : null}

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          Competitions are free. No prizes are promised, and no entry fee is
          ever charged.
        </p>
      </main>
    </>
  )
}
