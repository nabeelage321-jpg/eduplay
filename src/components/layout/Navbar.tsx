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
import SignInModal from '@/components/auth/SignInModal'
import ThemeIntroHost from '@/components/home/v0/ThemeIntroHost'

interface NavbarProps {
  locale: SupportedLocale
}

export default function Navbar({ locale }: NavbarProps) {
  const t = useTranslations('nav')
  const { data: session } = useSession()
  const { audience, kidsTheme } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [themePanelOpen, setThemePanelOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)

  // UI polish — Navbar privacy: the full account email must NEVER render
  // in the site-wide Navbar. Show a name/avatar instead: the session's
  // first name when present, otherwise just an initial circle. No name
  // is ever invented here — without a session name there is only the
  // initial. The full email lives only on the Dashboard/account page.
  const displayName = session?.user?.name?.trim() ?? ''
  const firstName = displayName ? displayName.split(/\s+/)[0] : ''
  // Initial comes ONLY from the session name. With no name, the circle
  // shows a generic person glyph — never anything derived from the email.
  const accountInitial = firstName ? firstName.charAt(0).toUpperCase() : '👤'

  const navLinks = [
    { href: `/${locale}/browse`, label: 'Browse Games' },
    { href: `/${locale}/join`, label: 'Join a game' },
    { href: `/${locale}/live`, label: 'Live Game' },
    { href: `/${locale}/create`,     label: t('create') },
    { href: `/${locale}/dashboard`,  label: t('dashboard') },
  ]

  return (
    <>
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

          {/* Auth buttons — HOMEPAGE SIGN-IN batch: "Sign in" opens the
              SignInModal on the current page (primary path); the full
              /[locale]/login page stays as fallback/deep link only and is
              linked from inside the modal. When signed in, Navbar shows
              Dashboard + name/avatar + Sign out, and NEVER "Sign in" —
              and NEVER the full account email (privacy fix). */}
          {session?.user?.email ? (
            <>
              <Link
                href={`/${locale}/dashboard`}
                className="btn-primary text-sm py-2 px-4"
                style={{ minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
              >
                {t('dashboard')}
              </Link>
              <Link
                href={`/${locale}/dashboard`}
                className="hidden sm:inline-flex items-center gap-2 no-underline"
                aria-label={firstName ? `${firstName}'s account` : 'Account'}
                title={firstName || 'Account'}
              >
                <span
                  aria-hidden="true"
                  style={{ display: 'inline-flex', width: '40px', height: '40px', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', background: 'var(--color-primary)', color: 'white', fontSize: '1.125rem', fontWeight: 800 }}
                >
                  {accountInitial}
                </span>
                {firstName && (
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {firstName}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: `/${locale}` })}
                className="btn-ghost text-sm hidden sm:flex"
                style={{ minHeight: '48px' }}
              >
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="btn-ghost text-sm"
                style={{ minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
              >
                {t('login')}
              </button>
              <Link
                href={`/${locale}/signup`}
                className="btn-primary text-sm py-2 px-4"
                style={{ minHeight: '48px', display: 'inline-flex', alignItems: 'center' }}
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
                <>
                  <Link
                    href={`/${locale}/dashboard`}
                    className="btn-ghost py-3 text-base"
                    onClick={() => setMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'left' }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ display: 'inline-flex', width: '32px', height: '32px', alignItems: 'center', justifyContent: 'center', borderRadius: '9999px', background: 'var(--color-primary)', color: 'white', fontSize: '1rem', fontWeight: 800, flexShrink: 0 }}
                    >
                      {accountInitial}
                    </span>
                    {firstName || 'Account'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); signOut({ callbackUrl: `/${locale}` }) }}
                    className="btn-ghost py-3 text-base"
                    style={{ textAlign: 'left' }}
                  >
                    {t('logout')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); setSignInOpen(true) }}
                    className="btn-ghost py-3 text-base"
                    style={{ minHeight: '48px', textAlign: 'left', justifyContent: 'flex-start' }}
                  >
                    {t('login')}
                  </button>
                  <Link
                    href={`/${locale}/signup`}
                    className="btn-ghost py-3 text-base"
                    style={{ minHeight: '48px' }}
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('signup')}
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} locale={locale} />
      <ThemeIntroHost />
    </>
  )
}
