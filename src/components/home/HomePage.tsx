'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import type { SupportedLocale } from '@/types'
import { useThemeStore } from '@/lib/store/theme-store'

const STATS = [
  { value: '1M+',  key: 'teachers' },
  { value: '25M+', key: 'activities' },
  { value: '150+', key: 'countries' },
  { value: '11',   key: 'languages' },
]

const SUBJECTS = [
  { emoji: '➕', name: 'Mathematics',  slug: 'mathematics' },
  { emoji: '🔬', name: 'Science',      slug: 'science' },
  { emoji: '📖', name: 'English',      slug: 'english' },
  { emoji: '🌍', name: 'Social Studies', slug: 'social-studies' },
  { emoji: '🕌', name: 'Islamiyat',    slug: 'islamiyat' },
  { emoji: '🇵🇰', name: 'Urdu',         slug: 'urdu' },
  { emoji: '🎨', name: 'Art',          slug: 'art' },
  { emoji: '💻', name: 'Computer',     slug: 'computer' },
]

const ACTIVITY_PREVIEWS = [
  { title: 'Times Tables Quiz — Grade 3', type: 'quiz',     plays: 4200, subject: 'Maths',   author: 'Mrs. Ahmed' },
  { title: 'Urdu Vocabulary Match',       type: 'match-up', plays: 2800, subject: 'Urdu',    author: 'Miss Fatima' },
  { title: 'Science Anagram Challenge',   type: 'anagram',  plays: 1900, subject: 'Science', author: 'Mr. Khan' },
  { title: 'Pakistan Map Labels',         type: 'labelled-diagram', plays: 3100, subject: 'SST', author: 'Mrs. Noor' },
]

export default function HomePage({ locale }: { locale: SupportedLocale }) {
  const t = useTranslations('home')
  const nt = useTranslations('nav')
  const { audience } = useThemeStore()

  const isKids = audience === 'kids'

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <Navbar locale={locale} />

      {/* ── HERO ── */}
      <section className="hero-bg py-20 px-4 text-center overflow-hidden relative">
        {/* Floating decorative elements for kids */}
        {isKids && (
          <>
            {['🌟', '🎯', '🎪', '🏆', '🎉'].map((emoji, i) => (
              <motion.div
                key={i}
                className="absolute text-4xl pointer-events-none select-none"
                style={{
                  top: `${15 + i * 15}%`,
                  left: i % 2 === 0 ? `${5 + i * 3}%` : undefined,
                  right: i % 2 !== 0 ? `${5 + i * 3}%` : undefined,
                }}
                animate={{ y: [0, -15, 0], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                {emoji}
              </motion.div>
            ))}
          </>
        )}

        <div className="container-page relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Ladies-specific greeting */}
            {audience === 'ladies' && (
              <motion.p
                className="text-sm font-semibold mb-3 tracking-wider uppercase"
                style={{ color: 'var(--color-primary)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                🌸 Designed for Educators, Built with Love
              </motion.p>
            )}

            <h1
              className="text-4xl md:text-6xl font-bold mb-6 heading-display max-w-3xl mx-auto"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {t('heroTitle')}
            </h1>
            <p
              className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('heroSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href={`/${locale}/create`} className="btn-primary text-lg px-8 py-4">
                {t('heroCta')}
              </Link>
              <Link
                href={`/${locale}/activities`}
                className="btn-secondary text-base px-6 py-3"
              >
                Browse activities
              </Link>
            </div>

            <p className="mt-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {t('heroSecondary')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section
        className="py-12 px-4"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="container-page grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div
                className="text-3xl md:text-4xl font-bold heading-display"
                style={{ color: 'var(--color-primary)' }}
              >
                {stat.value}
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {t(`stats.${stat.key}`)}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FEATURED ACTIVITIES ── */}
      <section className="py-16 px-4">
        <div className="container-page">
          <h2
            className="text-2xl md:text-3xl font-bold mb-8 heading-display"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('featuredTitle')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ACTIVITY_PREVIEWS.map((activity, i) => (
              <motion.div
                key={i}
                className="card-hover p-5"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div
                  className="w-12 h-12 rounded-theme-sm flex items-center justify-center text-2xl mb-4"
                  style={{ background: 'var(--color-surface-alt)' }}
                >
                  {activity.type === 'quiz' ? '❓' :
                   activity.type === 'match-up' ? '🔗' :
                   activity.type === 'anagram' ? '🔤' : '🗺️'}
                </div>
                <h3
                  className="font-semibold text-sm mb-1 line-clamp-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {activity.title}
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                  by {activity.author}
                </p>
                <div className="flex items-center justify-between">
                  <span className="badge text-xs">{activity.subject}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    ▶ {activity.plays.toLocaleString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECTS GRID ── */}
      <section className="py-16 px-4" style={{ background: 'var(--color-surface-alt)' }}>
        <div className="container-page">
          <h2
            className="text-2xl md:text-3xl font-bold mb-8 heading-display"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {t('categoriesTitle')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {SUBJECTS.map((subject, i) => (
              <motion.div
                key={subject.slug}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/${locale}/activities/${subject.slug}`}
                  className="card-hover p-4 text-center flex flex-col items-center gap-2 no-underline"
                >
                  <span className="text-3xl">{subject.emoji}</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {subject.name}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-8 px-4 text-center text-sm"
        style={{
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
        }}
      >
        <p>© 2025 EduPlay · Free for teachers · 11 languages · 150+ countries</p>
      </footer>
    </div>
  )
}
