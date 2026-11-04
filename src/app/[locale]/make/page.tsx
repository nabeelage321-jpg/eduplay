import { Metadata } from 'next'
import MakeGameFunnel from '@/components/funnel/MakeGameFunnel'
import type { SupportedLocale } from '@/types'

interface Props {
  params: { locale: SupportedLocale }
}

export const metadata: Metadata = {
  title: 'Make a game with a prompt — EduPlay',
  description: 'Pick who you are, pick one game, then make it with a prompt or by hand.',
  robots: { index: false },
}

/**
 * PROMPT GAME-MAKING FUNNEL ENTRY (2026-11-04).
 * Homepage "Make a game with a prompt" links here. Step 1 asks who you
 * are, step 2 asks what game to make, and a type click lands on
 * /create?type=<slug> with that type preselected — reusing the existing
 * single-game maker entry, not a new maker.
 */
export default function MakePage({ params }: Props) {
  const isRTL = params.locale === 'ur' || params.locale === 'ar'
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <div style={{ padding: '1.5rem 0.5rem' }}>
        <MakeGameFunnel locale={params.locale} />
      </div>
    </div>
  )
}
