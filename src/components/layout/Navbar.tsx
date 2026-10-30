'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Menu, X, Globe, Palette } from 'lucide-react'
import { useThemeStore } from '@/lib/store/theme-store'
import type { Audience, SupportedLocale, KidsTheme } from '@/types'
import { LOCALE_METADATA } from '@/types'
import ThemeSwitcher from './ThemeSwitcher'

interface NavbarProps {
  locale: SupportedLocale
}

export default function Navbar({ locale }: NavbarProps) {
  const t = useTranslations('nav')
  const { data: session } = useSession()
  const { audience, kidsTheme } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [themePanelOpen, setThemePanelOpen] = useState(false)

  const navLinks = [
    { href: `/${locale}/browse`, label: 'Browse Games' },
    { href: `/${locale}/join`, label: 'Join a game' },
    { href: `/${locale}/live`, label: 'Live Game' },
    { href: `/${locale}/create`,     label: t('create') },
    { href: `/${locale}/dashboard`,  label: t('dashboard') },
  ]

  return (
    <header
      className="sticky top-0 z-50 w-full theme-transition"
      style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <nav className="container-page flex items-center justify-between h-16" aria-label="Main navigation">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="flex items-center gap-2 font-bold text-xl no-underline heading-display"
          style={{ color: 'var(--color-primary)' }}
        >
          <span className="text-2xl">📚</span>
          <span>EduPlay</span>
          {audience === 'kids' && (
            <span className="text-sm">
              {kidsTheme === 'space' ? '🚀' :
               kidsTheme === 'ocean' ? '🌊' :
               kidsTheme === 'princess' ? '👑' :
               kidsTheme === 'magic' ? '✨' : '🎮'}
            </span>
          )}
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="btn-ghost text-sm font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Theme switcher toggle */}
          <button
            onClick={() => setThemePanelOpen(!themePanelOpen)}
            className="btn-ghost p-2 rounded-full"
            aria-label="Change theme"
            title="Change theme"
          >
            <Palette size={18} />
          </button>

          {/* Language */}
          <button
            className="btn-ghost p-2 rounded-full text-sm flex items-center gap-1"
            aria-label="Change language"
          >
            <Globe size={16} />
            <span className="hidden sm:inline">
              {LOCALE_METADATA[locale]?.flag} {LOCALE_METADATA[locale]?.nativeName}
            </span>
          </button>

          {/* Auth buttons — AUTH batch: show session state, not dead links.
              When signed in, Navbar shows the account email + Sign out;
              otherwise the login/signup pages (which now exist). */}
          {session?.user?.email ? (
            <>
              <span className="text-sm hidden sm:inline" style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user.email}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: `/${locale}` })}
                className="btn-ghost text-sm hidden sm:flex"
              >
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/${locale}/login`}
                className="btn-ghost text-sm hidden sm:flex"
              >
                {t('login')}
              </Link>
              <Link
                href={`/${locale}/signup`}
                className="btn-primary text-sm py-2 px-4"
              >
                {t('signup')}
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden btn-ghost p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Theme switcher panel */}
      <AnimatePresence>
        {themePanelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-16 right-4 z-50"
          >
            <ThemeSwitcher onClose={() => setThemePanelOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
            style={{
              background: 'var(--color-surface)',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            <div className="container-page py-3 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="btn-ghost py-3 text-base"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {session?.user?.email ? (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: `/${locale}` }) }}
                  className="btn-ghost py-3 text-base"
                  style={{ textAlign: 'left' }}
                >
                  {t('logout')} ({session.user.email})
                </button>
              ) : (
                <Link
                  href={`/${locale}/login`}
                  className="btn-ghost py-3 text-base"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('login')}
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
