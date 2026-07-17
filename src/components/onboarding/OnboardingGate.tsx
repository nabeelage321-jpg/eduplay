'use client'
import { useThemeStore } from '@/lib/store/theme-store'
import OnboardingScreen from './OnboardingScreen'

interface OnboardingGateProps {
  locale: string
  children: React.ReactNode
}

export default function OnboardingGate({ locale, children }: OnboardingGateProps) {
  const { hasOnboarded } = useThemeStore()
  if (!hasOnboarded) return <OnboardingScreen locale={locale as any} />
  return <>{children}</>
}
