import type { Metadata } from 'next'
import { generateWebPageSchema } from '@/lib/seo/schema'
import JsonLd from '@/components/seo/JsonLd'
import Breadcrumb from '@/components/seo/Breadcrumb'
import { fetchFreeEducationalGamesActivities } from '@/lib/seo/programmatic'
import { ACTIVITY_TYPES_SEED } from '@/lib/supabase/seed/activity-types'

// ─── Beat-plan build #10 — comparison page "Educaplay alternative" ────────
// LAST of the beat-plan draft's First 10 pages. Builds #2 (SNC), #5
// (Class-wise) and #7 (Quiz maker) were documented NO-BUILDs; builds
// #8 (Match Up maker) and #9 (Memory maker) collapse into the existing
// T1 type hubs — verified again in this batch (see below).
// Locked method first (2026-11-05, fresh web search):
//   "Educaplay alternative"
//   1. softwareworld.co — "Top Educaplay Alternatives & Competitors
//      2026" — a directory list (Loquiz, QuizHub, Quizizz for Work,
//      Genially, Kahoot!, Goosechase...). A list, not a comparison.
//   2. alternativeto.net — "Educaplay Alternatives: Quiz Makers &
//      Similar Websites" — a directory list (Fuiz, Giga Quizzes,
//      Faabul, Quizizz...). A list, not a comparison.
//   3. sourceforge.net — "Best Educaplay Alternatives & Competitors"
//      — a directory list (Coursebox, Kahoot!, Ludiz, Teddy AI,
//      Gamebrain, SchoolAI...). A list, not a comparison.
//   Also seen: slashdot.org alternatives list, semrush.com
//   competitors (educaplay.com 3.42M visits; closest rivals
//   wordwall.net, liveworksheets.com), capterra.co.il list.
//   "Educaplay alternative free" — same three leaders
//   (SoftwareWorld, G2 pricing, AlternativeTo).
//   None of them is a single-product, honest EduPlay-vs-Educaplay
//   comparison landing page. Best of the three: lead with the
//   keyword + free + ad-free, and answer the real question behind
//   the search — what you give up and what you gain by switching.
//   Headline = keyword + customer-problem solution: "Educaplay
//   Alternative — Free, Ad-Free Learning Games".
// Overlap check (read, not asserted):
//   (1) No alternatives/comparison route exists in the repo —
//       `find src/app -path "*alternative*"` returns nothing,
//       "educaplay" appears nowhere in src/ or the sitemap files.
//   (2) #8/#9 collapse CONFIRMED: the generic T1 type hub
//       src/app/[locale]/activities/[type]/page.tsx exists with
//       the maker CTA "+ Make a {typeLabel} game" ->
//       /create?type=<type>, and match-up + memory-match are both
//       in FILTER_TYPES — so /en/activities/match-up and
//       /en/activities/memory-match already serve the maker intent.
// HONESTY RULES for this page (every claim traces to a source):
//   Educaplay side — research file
//   ~/workspace/eduplay-rebuild/research/competitors/
//   educaplay-sitemap-analysis-2026-11-02.md (owner screenshots,
//   2026-11-02): 21 types (image-62 grid); browse displayed total
//   12,639,042 (image-99; their own displayed total, NOT a Google
//   index count); plans Basic free / Advanced 48 EUR/year /
//   Academic 96 / Commercial 480 (image-63); Advanced checkout
//   total 58.08 EUR incl. 21% VAT (image-95; 48 x 1.21 = 58.08);
//   ad-free from Advanced up, free Basic shows ads incl. a
//   fullscreen editor interstitial "Your game is one ad away!"
//   (image-83); Ray AI metered by plan; Challenges with a game
//   PIN; persistent Guests with groups; Reports retention by plan
//   (Basic last month only, image-70); LTI/Classroom/Teams/SCORM,
//   SCORM only Academic/Commercial (image-76); Messages — open
//   user-to-user inbox (image-75); printable PDFs 5 games on
//   Basic/Advanced, unlimited above; live sessions promoted for
//   Froggy Jumps games; Pakistan gap in writing on its own browse
//   page: "We do not have the education system of Pakistan."
//   EduPlay side — live facts only: 40 types (seed, rendered
//   dynamically); 5,112 public games (live API pagination.total,
//   verified 2026-11-05 — fetched live on this page, dated
//   fallback below); free + ad-free for kids (live homepage
//   headline); prompt-to-game + chapter photo -> paraphrased game
//   (live); one-click host + room code, leaderboard polls every
//   3s — NOT realtime (live); teacher report v1 from a live
//   session PIN (live); print worksheet v1, browser Save as PDF
//   (live). NEVER claimed: realtime, LTI/SCORM, homework/async,
//   exam/flashcard/homework formats, server PDF, MP4 video, open
//   user-to-user messaging (teacher announcements only, phase 2).
//   No invented counts, ratings, testimonials or prices. No
//   Educaplay wording, art or character copied — "Ray" and
//   "Froggy Jumps" appear only as factual product/type names.
//   The page carries a fair "where Educaplay is ahead" section.

export const revalidate = 604800

const PAGE_TITLE = 'Educaplay Alternative — Free, Ad-Free Learning Games'
const PAGE_TITLE_TAG = `${PAGE_TITLE} | EduPlay`
const PAGE_DESCRIPTION =
  'Looking for a free Educaplay alternative? EduPlay is free and ad-free for kids — 40 game types, prompt-to-game, and Pakistan curriculum games. Read the honest comparison before you switch.'
// EduPlay game count, verified live 2026-11-05 (GET /api/activities?
// sort=newest — pagination.total = 5,112). The page fetches the live
// count; this dated figure is only the fallback if that fetch fails.
const VERIFIED_GAME_COUNT = '5,112'
const VERIFIED_GAME_COUNT_DATE = '2026-11-05'

type CompareRow = { feature: string; eduplay: string; educaplay: string }

const COMPARE_ROWS: CompareRow[] = [
  {
    feature: 'Game types',
    eduplay: '40 game types, live on the site.',
    educaplay: '21 game types on its homepage grid.',
  },
  {
    feature: 'Games available',
    eduplay: 'GAME_COUNT_PLACEHOLDER public games, read from the live database.',
    educaplay: '12,639,042 activities shown on its own browse page (its displayed total, not a Google index count).',
  },
  {
    feature: 'Free to play',
    eduplay: 'Free. No paywall before a game, no subscription needed to play.',
    educaplay: 'Basic plan is free — unlimited games and players.',
  },
  {
    feature: 'Ads',
    eduplay: 'No fullscreen ad before a kid’s game, ever. That is a rule of the site, not a setting.',
    educaplay: 'Ad-free from the Advanced plan up. The free Basic plan shows ads — including a fullscreen ad in the editor.',
  },
  {
    feature: 'Price for ad-free play',
    eduplay: 'Free — ad-free is a rule, not a paid tier.',
    educaplay: 'Advanced plan: 48 EUR/year. Checkout total 58.08 EUR including 21% VAT.',
  },
  {
    feature: 'AI game creation',
    eduplay: 'Prompt-to-game: type what to teach, review the draft, play it. A chapter photo becomes a paraphrased game — the source text is never published.',
    educaplay: 'Ray AI assistant and chat editor — usage is metered by plan.',
  },
  {
    feature: 'Live play with a class',
    eduplay: 'One-click host, room code, leaderboard. The leaderboard polls every 3 seconds — honest note: that is polling, not realtime.',
    educaplay: 'Challenges with a game PIN. Live sessions are promoted for Froggy Jumps games.',
  },
  {
    feature: 'Reports for teachers',
    eduplay: 'A report page from a live session PIN — nickname and score only. First version, live now.',
    educaplay: 'Reports with history by plan — the free Basic plan keeps the last month only.',
  },
  {
    feature: 'Pakistan curriculum',
    eduplay: 'Yes — National Curriculum of Pakistan (2022), Urdu and Islamiyat games, across 15 subjects and 14 grade levels.',
    educaplay: 'Its own browse page says: "We do not have the education system of Pakistan."',
  },
  {
    feature: 'LMS and classroom',
    eduplay: 'Not yet — no LTI or SCORM. Honest gap, listed below.',
    educaplay: 'LTI, Google Classroom, Canvas, Moodle and Microsoft Teams. SCORM export on Academic and Commercial plans.',
  },
  {
    feature: 'Messaging',
    eduplay: 'No open messaging between children. Teacher announcements only is the planned model — never child-to-stranger chat.',
    educaplay: 'Messages: you can write to any user on the platform from their profile.',
  },
  {
    feature: 'Print and PDF',
    eduplay: 'Print worksheet is free. The student sheet never contains an answer; the answer key prints on its own page.',
    educaplay: 'Printable PDFs: 5 games on Basic and Advanced plans, unlimited above.',
  },
]

const AHEAD_EDUPLAY: string[] = [
  'More game types — 40 live, against 21.',
  'Free and ad-free as a rule, not a paid tier. On Educaplay, ad-free starts at the Advanced plan.',
  'The Pakistan curriculum wedge — SNC, Urdu and Islamiyat — which Educaplay itself says it does not have.',
  'Chapter photo to paraphrased game: the book text is a source only and is never published.',
  'Print worksheets are free, with the answer key kept off the student sheet.',
]

const AHEAD_EDUCAPLAY: string[] = [
  'A much larger library — 12,639,042 activities displayed, against 5,112 public games on EduPlay.',
  'LMS and classroom integrations — LTI, Google Classroom, Canvas, Moodle, Microsoft Teams, and SCORM on paid plans. EduPlay has none of these yet.',
  'Persistent Guests with groups and assignments, and Challenges as stored assignments. EduPlay guests are device-local nicknames for now, and a challenge link is not stored server-side yet.',
  'Longer report history on paid plans, plus export to Excel and Google Sheets.',
  'Per-question explanations in the editor. EduPlay quiz items do not have them yet.',
  'Star ratings on browse cards. EduPlay shows no ratings yet — stars come only from real plays, never invented.',
]

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Is EduPlay really a free Educaplay alternative?',
    a: 'Yes — playing games on EduPlay is free. There is no paywall before a game and no subscription needed to play, and ad-free is a rule of the site, not a paid tier.',
  },
  {
    q: 'What does Educaplay do that EduPlay does not yet?',
    a: 'LMS and SCORM integrations, longer report history, persistent guests and groups, and a much larger library — 12,639,042 activities displayed on its browse page. Those are listed honestly in the comparison above.',
  },
  {
    q: 'Can I move my Educaplay games to EduPlay?',
    a: 'There is no import tool yet. You can remake a game from a prompt in minutes — type what you want to teach, review the draft, then play it.',
  },
  {
    q: 'Is EduPlay safe for children?',
    a: 'No fullscreen ad before a kid’s game, ever. There is no open messaging between children, and no account is needed to play.',
  },
  {
    q: 'Does EduPlay have Pakistan curriculum games?',
    a: 'Yes — National Curriculum of Pakistan (2022), Urdu and Islamiyat games, across 15 subjects and 14 grade levels. Educaplay’s own browse page says it does not have Pakistan’s education system.',
  },
]

// ─── Metadata ─────────────────────────────────────────────────────────────────
// Content page, not a game list: it is indexable because it carries real,
// substantive comparison content (12-row table + two honest sections +
// FAQ) — not a thin page. NOT added to sitemap.xml (sitemap inclusion
// is a separate decision); sitemap type list untouched (stays 23).
export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  return {
    title: PAGE_TITLE_TAG,
    description: PAGE_DESCRIPTION,
    openGraph: { title: PAGE_TITLE_TAG, description: PAGE_DESCRIPTION },
    twitter: { card: 'summary', title: PAGE_TITLE_TAG, description: PAGE_DESCRIPTION },
    robots: { index: true, follow: true },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EducaplayAlternativePage({
  params,
}: {
  params: { locale: string }
}) {
  const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'}/${params.locale}/educaplay-alternative`
  const { count } = await fetchFreeEducationalGamesActivities()
  const eduplayGameCount = count > 0 ? count.toLocaleString() : VERIFIED_GAME_COUNT
  const typeCount = ACTIVITY_TYPES_SEED.length

  const jsonLd = generateWebPageSchema({
    url: pageUrl,
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    locale: params.locale,
  })

  const rows = COMPARE_ROWS.map((row) => ({
    ...row,
    eduplay: row.eduplay.replace('GAME_COUNT_PLACEHOLDER', eduplayGameCount),
  }))

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
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: 'Home', href: `/${params.locale}` },
            { label: 'Educaplay Alternative' },
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
          <h1
            id="hero-heading"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontFamily: 'var(--font-display)',
              color: 'var(--color-text-primary)',
              marginBottom: '1rem',
            }}
          >
            Educaplay Alternative — Free, Ad-Free Learning Games
          </h1>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 1rem',
            }}
          >
            Looking for a free Educaplay alternative? EduPlay is free and
            ad-free for kids — {typeCount} game types, prompt-to-game, and
            Pakistan curriculum games. This page compares the two honestly:
            what you gain, and what you give up.
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              maxWidth: '640px',
              margin: '0 auto 1.5rem',
            }}
          >
            Figures checked {VERIFIED_GAME_COUNT_DATE}. Educaplay figures
            are Educaplay’s own displayed figures. EduPlay figures are
            from the live site.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`/${params.locale}/create`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: 'var(--gradient-btn)',
                color: '#fff',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
              aria-label="Make your first game free"
            >
              Make your first game — free
            </a>
            <a
              href={`/${params.locale}/browse`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                background: 'var(--color-surface)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontWeight: 600,
                border: '2px solid var(--color-primary)',
              }}
            >
              Browse {eduplayGameCount} games
            </a>
          </div>
        </section>

        {/* Comparison table — every row traces to a source (see the
            header comment). No invented counts, ratings or prices. */}
        <section style={{ marginBottom: '2rem' }} aria-labelledby="compare-heading">
          <h2
            id="compare-heading"
            style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            EduPlay vs Educaplay — the honest comparison
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                fontSize: '0.9375rem',
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem', borderBottom: '2px solid var(--color-border)' }}>
                    What you compare
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem', borderBottom: '2px solid var(--color-border)' }}>
                    EduPlay
                  </th>
                  <th style={{ textAlign: 'left', padding: '0.875rem 1rem', borderBottom: '2px solid var(--color-border)' }}>
                    Educaplay
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.feature}>
                    <th
                      scope="row"
                      style={{
                        textAlign: 'left',
                        verticalAlign: 'top',
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid var(--color-border)',
                        fontWeight: 600,
                      }}
                    >
                      {row.feature}
                    </th>
                    <td
                      style={{
                        verticalAlign: 'top',
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {row.eduplay}
                    </td>
                    <td
                      style={{
                        verticalAlign: 'top',
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {row.educaplay}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Where EduPlay is ahead — only claims the table already makes. */}
        <section style={{ marginBottom: '2rem' }} aria-labelledby="ahead-eduplay-heading">
          <h2
            id="ahead-eduplay-heading"
            style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Where EduPlay is ahead
          </h2>
          <ul
            style={{
              display: 'grid',
              gap: '0.75rem',
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}
          >
            {AHEAD_EDUPLAY.map((item) => (
              <li
                key={item}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem 1.25rem',
                  boxShadow: 'var(--shadow-card)',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                ✅ {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Where Educaplay is ahead — the fair half. An honest
            comparison page must carry this section. */}
        <section style={{ marginBottom: '2rem' }} aria-labelledby="ahead-educaplay-heading">
          <h2
            id="ahead-educaplay-heading"
            style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Where Educaplay is ahead — honestly
          </h2>
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--color-text-secondary)',
              marginBottom: '1rem',
            }}
          >
            Educaplay is the bigger, older platform. If any of these matter
            more to you than free and ad-free play, it may still be the
            right choice for you.
          </p>
          <ul
            style={{
              display: 'grid',
              gap: '0.75rem',
              listStyle: 'none',
              padding: 0,
              margin: 0,
            }}
          >
            {AHEAD_EDUCAPLAY.map((item) => (
              <li
                key={item}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem 1.25rem',
                  boxShadow: 'var(--shadow-card)',
                  fontSize: '0.9375rem',
                  color: 'var(--color-text-secondary)',
                }}
              >
                ➡️ {item}
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ — answers only what is live and verified (see header). */}
        <section style={{ marginBottom: '2rem' }} aria-labelledby="faq-heading">
          <h2
            id="faq-heading"
            style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Questions before you switch
          </h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {FAQ.map((item) => (
              <div
                key={item.q}
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius)',
                  padding: '1.25rem',
                }}
              >
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{item.q}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Try EduPlay — existing routes only. */}
        <section
          style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            background: 'var(--gradient-hero)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '2rem',
          }}
          aria-labelledby="try-heading"
        >
          <h2
            id="try-heading"
            style={{
              fontSize: '1.5rem',
              fontFamily: 'var(--font-display)',
              marginBottom: '1rem',
              color: 'var(--color-text-primary)',
            }}
          >
            Try the difference in two minutes
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: 'var(--color-text-secondary)',
              maxWidth: '560px',
              margin: '0 auto 1.5rem',
            }}
          >
            Type what you want to teach, review the draft, play it — free,
            with no fullscreen ad before the game and no account needed
            to play.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={`/${params.locale}/create`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                background: 'var(--gradient-btn)',
                color: '#fff',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Make a game — free
            </a>
            <a
              href={`/${params.locale}/free-educational-games-for-kids`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                background: 'var(--color-surface)',
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius)',
                textDecoration: 'none',
                fontWeight: 600,
                border: '2px solid var(--color-primary)',
              }}
            >
              See free games for kids
            </a>
          </div>
        </section>

        {/* Sources — where every number on this page comes from. */}
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            maxWidth: '720px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          Sources: Educaplay figures are Educaplay’s own displayed
          figures — its browse page total, homepage game-type grid and
          pricing page, checked 2026-11-02. EduPlay’s game count is read
          from the live database when this page loads (5,112 when checked
          on {VERIFIED_GAME_COUNT_DATE}); its game-type count comes from
          the live type list. Educaplay prices are yearly; the 58.08 EUR
          Advanced checkout total includes 21% VAT.
        </p>
      </main>
    </>
  )
}
