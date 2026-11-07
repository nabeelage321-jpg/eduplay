'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Menu, X, Globe, Palette, Check } from 'lucide-react'
import { useThemeStore } from '@/lib/store/theme-store'
import type { Audience, SupportedLocale, KidsTheme } from '@/types'
import { LOCALE_METADATA } from '@/types'
import ThemeSwitcher from './ThemeSwitcher'
import SignInModal from '@/components/auth/SignInModal'
import ThemeIntroHost from '@/components/home/v0/ThemeIntroHost'

// Language switcher — the 11 locales, in the same order as src/lib/i18n.ts
// (the single source for the locale list). Metadata (flag + native name)
// comes from LOCALE_METADATA in src/types.
const LANGUAGE_OPTIONS: SupportedLocale[] = [
  'en', 'ur', 'ar', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'zh',
]

interface NavbarProps {
  locale: SupportedLocale
}

export default function Navbar({ locale }: NavbarProps) {
  const t = useTranslations('nav')
  const { data: session } = useSession()
  const { audience, kidsTheme } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [themePanelOpen, setThemePanelOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // LANGUAGE SWITCHER (owner order 2026-11-07, launch day): the old
  // language control was a dead button — flag + name, no dropdown, no
  // click handler. Picking a language now navigates to the same page
  // under the new locale (next-intl, localePrefix 'always': every
  // route is /{locale}/...), so the choice sticks via the URL itself.
  const switchLocale = (nextLocale: SupportedLocale) => {
    setLangOpen(false)
    if (nextLocale === locale) return
    const segments = (pathname || '/').split('/')
    if (segments[1] && (LANGUAGE_OPTIONS as string[]).includes(segments[1])) {
      segments[1] = nextLocale
      router.push(segments.join('/') || `/${nextLocale}`)
    } else {
      router.push(`/${nextLocale}${pathname === '/' ? '' : pathname}`)
    }
  }

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

  // NAV LOOK FIX (owner order 2026-11-07, launch day): the desktop row
  // does NOT carry Dashboard. It was duplicated — a light-blue
  // "Dashboard" pill in the nav sat beside the dark-blue "Dashboard"
  // account button in the right actions, and the owner called it dumb.
  // The blue account button stays; the nav pill goes. The mobile menu
  // still uses navLinks above (untouched), so its content is unchanged.
  const desktopNavLinks = navLinks.filter(
    (link) => link.href !== `/${locale}/dashboard`,
  )

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

        {/* Desktop nav — kid-friendly nav buttons (owner order
            2026-11-07, launch day): bigger text + bigger padding +
            playful pill shape, same labels, destinations, order.
            2026-11-07 pill fix: the 9999px radius alone was
            INVISIBLE — btn-ghost is transparent, so the live check
            saw plain text links. Each link now carries a VISIBLE
            soft background (var(--color-surface-alt)) + 2px border
            (var(--color-border)), so the pill is plainly a pill.
            2026-11-07 LOOK fix: the pills WRAPPED to two lines and
            the row crowded — each label now has white-space nowrap
            + flexShrink 0, the pills are compacted just enough to
            fit one row (1rem / 44px / 0.5rem 0.875rem), and the row
            only shows at xl (1280px) and up, where logo + 4 pills +
            right actions genuinely fit one row; below xl the
            hamburger menu serves navigation (its content is
            untouched). This row renders in BOTH signed-in and
            signed-out states (the session split is only in the
            right actions below), so one fix covers both. Only the
            desktop row is styled here; the mobile menu, the
            Dashboard blue pill, logo, language, palette and user
            chip are untouched. Every pill — Create included — shares
            this one style object, so Create matches the rest exactly. */}
        <div className="hidden xl:flex items-center gap-2" style={{ flexShrink: 0 }}>
          {desktopNavLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="btn-ghost"
              style={{ display: 'inline-flex', minHeight: '44px', alignItems: 'center', padding: '0.5rem 0.875rem', borderRadius: '9999px', fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0, background: 'var(--color-surface-alt)', border: '2px solid var(--color-border)' }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Theme switcher toggle — BIG + COLOURFUL (owner order
              2026-11-07, launch day): the old button was a tiny ghost
              circle a kid had no curiosity to click, and themes are
              the thing no rival has. Rainbow gradient + white palette
              icon + "Theme" label, 48px tall like the other actions,
              nowrap + flexShrink 0 so the desktop row stays one line.
              Same destination as before — it still opens the
              ThemeSwitcher panel below. */}
          <button
            onClick={() => { setLangOpen(false); setThemePanelOpen(!themePanelOpen) }}
            className="rounded-full font-bold"
            aria-label="Change theme"
            aria-expanded={themePanelOpen}
            title="Change theme"
            style={{
              minHeight: '48px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.875rem',
              fontSize: '1rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              color: '#fff',
              background: 'linear-gradient(90deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7)',
              border: '2px solid rgba(255, 255, 255, 0.65)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
              cursor: 'pointer',
            }}
          >
            <Palette size={22} />
            <span className="hidden sm:inline">Theme</span>
          </button>

          {/* Language switcher — REAL dropdown (owner order 2026-11-07,
              launch day): the old control was a dead button with no
              dropdown and no click handler. Now it lists all 11
              languages, marks the current one with a check, and
              switches locale on pick (same page, new locale prefix).
              The panel is positioned under the button inside a
              relative wrapper, so it never pushes the nav row. */}
          <div className="relative" style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { setThemePanelOpen(false); setLangOpen(!langOpen) }}
              onKeyDown={(e) => { if (e.key === 'Escape') setLangOpen(false) }}
              className="btn-ghost p-2 rounded-full text-sm flex items-center gap-1"
              aria-label="Change language"
              aria-haspopup="true"
              aria-expanded={langOpen}
              style={{ minHeight: '48px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <Globe size={16} />
              <span className="hidden sm:inline">
                {LOCALE_METADATA[locale]?.flag} {LOCALE_METADATA[locale]?.nativeName}
              </span>
            </button>
            {langOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close language menu"
                  tabIndex={-1}
                  onClick={() => setLangOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'transparent', border: 'none', cursor: 'default', padding: 0 }}
                />
                <div
                  role="menu"
                  aria-label="Choose language"
                  className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl shadow-lg overflow-hidden"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  {LANGUAGE_OPTIONS.map((code) => {
                    const meta = LOCALE_METADATA[code]
                    const isCurrent = code === locale
                    return (
                      <button
                        key={code}
                        type="button"
                        role="menuitem"
                        aria-current={isCurrent ? 'true' : undefined}
                        onClick={() => switchLocale(code)}
                        className="w-full flex items-center gap-2 px-4 text-left text-sm"
                        style={{
                          minHeight: '44px',
                          fontWeight: isCurrent ? 800 : 500,
                          color: isCurrent ? 'var(--color-primary)' : 'var(--color-text-primary)',
                          background: isCurrent ? 'var(--color-surface-alt)' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <span aria-hidden="true">{meta?.flag}</span>
                        <span>{meta?.nativeName}</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                          {meta?.name}
                        </span>
                        {isCurrent && <Check size={16} aria-hidden="true" style={{ marginLeft: 'auto' }} />}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

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
