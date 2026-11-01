import Link from 'next/link'
import { Hash, LayoutGrid, Play, Radio, WandSparkles } from 'lucide-react'
import V0FloatingShapes from './V0FloatingShapes'
import V0PromptPreview from './V0PromptPreview'

interface V0HeroProps {
  locale: string
  heroTitle: string
  heroSubtitle: string
  playGames: string
  browseActivities: string
  startCreating: string
  joinLive: string
  changeThemeNote: string
}

// V0 hero port. Link mapping (V0 locale-less paths do not exist in
// EduPlay, so every href is mapped to a real locale route):
//   /play      -> /{locale}/activities  (Play Games, dominant action)
//   /join      -> /{locale}/join
//   /activities-> /{locale}/browse      (Browse Activities)
//   /create    -> /{locale}/create
//   /live      -> /{locale}/live
export default function V0Hero({
  locale,
  heroTitle,
  heroSubtitle,
  playGames,
  browseActivities,
  startCreating,
  joinLive,
  changeThemeNote,
}: V0HeroProps) {
  const secondaryActions = [
    { label: 'Join a game', href: `/${locale}/join`, Icon: Hash },
    { label: browseActivities, href: `/${locale}/browse`, Icon: LayoutGrid },
    { label: startCreating, href: `/${locale}/create`, Icon: WandSparkles },
    { label: joinLive, href: `/${locale}/live`, Icon: Radio },
  ] as const

  return (
    <section aria-labelledby="hero-title" style={{ position: 'relative', overflow: 'hidden' }}>
      <V0FloatingShapes />
      <div style={{ position: 'relative', margin: '0 auto', maxWidth: '80rem', padding: '3rem 1rem 4rem', display: 'grid', gap: '3rem', alignItems: 'center' }} className="lg:grid-cols-[1.15fr_1fr]">
        <div style={{ textAlign: 'center' }}>
          <p style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderRadius: '9999px', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            <span aria-hidden="true" style={{ width: '0.625rem', height: '0.625rem', borderRadius: '9999px', background: 'var(--color-primary)' }} />
            No download · No student account to play
          </p>

          <h1
            id="hero-title"
            style={{ marginTop: '1.5rem', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}
          >
            {heroTitle}
          </h1>

          <p style={{ margin: '1.5rem auto 0', maxWidth: '36rem', fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
            {heroSubtitle}
          </p>

          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <Link
              href={`/${locale}/activities`}
              style={{ display: 'inline-flex', minHeight: '56px', alignItems: 'center', gap: '0.75rem', borderRadius: '9999px', background: 'var(--color-primary)', padding: '0 2rem', fontSize: '1.25rem', fontWeight: 800, color: 'white', boxShadow: '0 6px 0 0 var(--color-primary-dark)' }}
            >
              <Play style={{ width: '1.5rem', height: '1.5rem', fill: 'currentColor' }} aria-hidden="true" />
              {playGames}
            </Link>

            <ul style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', listStyle: 'none', margin: 0, padding: 0 }}>
              {secondaryActions.map(({ label, href, Icon }) => (
                <li key={label}>
                  <Link
                    href={href}
                    style={{ display: 'inline-flex', minHeight: '48px', alignItems: 'center', gap: '0.5rem', borderRadius: '9999px', border: '2px solid var(--color-border)', background: 'var(--color-surface)', padding: '0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}
                  >
                    <Icon style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{changeThemeNote}</p>
          </div>
        </div>

        <V0PromptPreview locale={locale} />
      </div>
    </section>
  )
}
