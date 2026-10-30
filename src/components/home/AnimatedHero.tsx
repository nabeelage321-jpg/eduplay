'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'

interface AnimatedHeroProps {
  locale: string
  heroTitle: string
  heroSubtitle: string
  playGames: string
  browseActivities: string
  startCreating: string
  joinLive: string
  changeThemeNote: string
}

// BEST HOMEPAGE batch — light floating elements only (emoji + CSS, no
// images, no video, no heavy assets on first paint). When the user
// prefers reduced motion, everything renders static.
const FLOATERS = [
  { char: '⭐', left: '8%', top: '18%', size: '2rem', delay: 0 },
  { char: '☁️', left: '84%', top: '14%', size: '2.4rem', delay: 0.6 },
  { char: '🎲', left: '14%', top: '68%', size: '2rem', delay: 1.1 },
  { char: '🌈', left: '88%', top: '62%', size: '2rem', delay: 0.3 },
  { char: '🧩', left: '46%', top: '10%', size: '1.8rem', delay: 1.5 },
]

export default function AnimatedHero({
  locale,
  heroTitle,
  heroSubtitle,
  playGames,
  browseActivities,
  startCreating,
  joinLive,
  changeThemeNote,
}: AnimatedHeroProps) {
  const reduceMotion = useReducedMotion()

  return (
    <section
      className="px-6 py-12 md:py-20 text-center"
      style={{ backgroundColor: 'var(--color-surface)', position: 'relative', overflow: 'hidden' }}
    >
      {FLOATERS.map((f) =>
        reduceMotion ? (
          <span key={f.char + f.left} aria-hidden="true" style={{ position: 'absolute', left: f.left, top: f.top, fontSize: f.size, opacity: 0.7 }}>
            {f.char}
          </span>
        ) : (
          <motion.span
            key={f.char + f.left}
            aria-hidden="true"
            style={{ position: 'absolute', left: f.left, top: f.top, fontSize: f.size, opacity: 0.7 }}
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, delay: f.delay, ease: 'easeInOut' }}
          >
            {f.char}
          </motion.span>
        ),
      )}
      <div style={{ position: 'relative' }}>
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          {heroTitle}
        </h1>
        <p className="text-lg mb-8 max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
          {heroSubtitle}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href={`/${locale}/activities`}
            className="px-8 py-4 rounded-lg font-bold"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white', minHeight: '56px', display: 'inline-flex', alignItems: 'center', fontSize: '1.1rem' }}
          >
            {playGames}
          </Link>
          <Link
            href={`/${locale}/join`}
            className="px-6 py-3 rounded-lg font-semibold border"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
          >
            🎮 Join a game
          </Link>
          <Link
            href={`/${locale}/browse`}
            className="px-6 py-3 rounded-lg font-semibold border"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
          >
            {browseActivities}
          </Link>
          <Link
            href={`/${locale}/create`}
            className="px-6 py-3 rounded-lg font-semibold border"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
          >
            {startCreating}
          </Link>
          <Link
            href={`/${locale}/live`}
            className="px-6 py-3 rounded-lg font-semibold border"
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
          >
            {joinLive}
          </Link>
        </div>
        <p className="mt-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {changeThemeNote}
        </p>
      </div>
    </section>
  )
}
