import Link from 'next/link'
import { Hash, Play } from 'lucide-react'

// V0 mobile-play-bar port. Links mapped to real locale routes:
// /play -> /{locale}/activities, /join -> /{locale}/join.
// Hidden on lg+ screens, as in V0. The homepage adds bottom padding on
// mobile so this bar never covers the footer.
export default function V0MobilePlayBar({ locale }: { locale: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        borderTop: '2px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: '0.75rem 1rem max(env(safe-area-inset-bottom), 0.75rem)',
      }}
      className="lg:hidden"
    >
      <div style={{ margin: '0 auto', display: 'flex', maxWidth: '28rem', gap: '0.5rem' }}>
        <Link
          href={`/${locale}/activities`}
          style={{ display: 'inline-flex', minHeight: '56px', flex: 2, alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', background: 'var(--color-primary)', fontSize: '1.125rem', fontWeight: 800, color: 'white', boxShadow: '0 4px 0 0 var(--color-primary-dark)' }}
        >
          <Play style={{ width: '1.25rem', height: '1.25rem', fill: 'currentColor' }} aria-hidden="true" />
          Play Games
        </Link>
        <Link
          href={`/${locale}/join`}
          style={{ display: 'inline-flex', minHeight: '56px', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '0.5rem', borderRadius: '9999px', border: '2px solid var(--color-border)', background: 'var(--color-surface)', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}
        >
          <Hash style={{ width: '1.25rem', height: '1.25rem', color: 'var(--color-primary)' }} aria-hidden="true" />
          Join
        </Link>
      </div>
    </div>
  )
}
