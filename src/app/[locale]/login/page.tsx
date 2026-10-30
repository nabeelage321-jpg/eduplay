import type { Metadata } from 'next'
import { Suspense } from 'react'
import AuthForm from '@/components/auth/AuthForm'
import { isGoogleConfigured } from '@/lib/auth/auth-options'
import type { SupportedLocale } from '@/types'

export const metadata: Metadata = {
  title: 'Sign in — EduPlay',
  description: 'Sign in to EduPlay to create and play interactive learning games.',
  robots: { index: false },
}

// googleConfigured is a boolean computed server-side from env presence
// only — no secret value is ever passed to the client component.
export default function LoginPage({ params }: { params: { locale: SupportedLocale } }) {
  return (
    <Suspense>
      <AuthForm mode="login" locale={params.locale} googleConfigured={isGoogleConfigured} />
    </Suspense>
  )
}
