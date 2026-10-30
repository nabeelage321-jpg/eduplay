import type { Metadata } from 'next'
import { Suspense } from 'react'
import AuthForm from '@/components/auth/AuthForm'
import { isGoogleConfigured } from '@/lib/auth/auth-options'
import type { SupportedLocale } from '@/types'

export const metadata: Metadata = {
  title: 'Create an account — EduPlay',
  description: 'Create a free EduPlay account for teachers, students and parents.',
  robots: { index: false },
}

// googleConfigured is a boolean computed server-side from env presence
// only — no secret value is ever passed to the client component.
export default function SignupPage({ params }: { params: { locale: SupportedLocale } }) {
  return (
    <Suspense>
      <AuthForm mode="signup" locale={params.locale} googleConfigured={isGoogleConfigured} />
    </Suspense>
  )
}
