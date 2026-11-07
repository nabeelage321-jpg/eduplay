import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import type { SupportedLocale } from '@/types'

// Lazy-loaded like /prompt-to-game does: the editor only loads when
// this page opens, so the first paint stays light.
const SocialEditorClient = dynamic(() => import('@/components/creator/SocialEditorClient'), { ssr: false })

interface Props {
  params: { locale: SupportedLocale }
}

export const metadata: Metadata = {
  title: 'Social Editor for Creators — EduPlay',
  description: 'For social media creators: verify your link to EduPlay on your social media, then edit your game into a reel or post. Kids make games for their friends — the social editor is not for kids.',
  robots: { index: false },
}

/**
 * SOCIAL EDITOR (owner order 2026-11-07, build-list final 6, item 13).
 * Two creator types, handled separately: kids make games for their
 * friends only and NEVER get this editor; social media creators get
 * it only after the team verifies their link by hand (see
 * src/lib/creator-verification.ts and migration 010). Tool page:
 * noindex, NOT in sitemap.xml. No draft is created or saved by
 * merely opening the page.
 */
export default function SocialEditorPage({ params }: Props) {
  const isRTL = params.locale === 'ur' || params.locale === 'ar'
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <div style={{ padding: '1.5rem 0.5rem' }}>
        <SocialEditorClient locale={params.locale} />
      </div>
    </div>
  )
}
