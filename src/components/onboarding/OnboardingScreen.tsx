'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import type { Audience, KidsTheme, ThemeConfig, SupportedLocale } from '@/types'
import { useThemeStore } from '@/lib/store/theme-store'

// ============================================================
// KIDS THEME DATA
// ============================================================
const KIDS_THEMES: { id: KidsTheme; emoji: string; bg: string; text: string }[] = [
  { id: 'space',     emoji: '🚀', bg: '#0A0E2A', text: '#a78bfa' },
  { id: 'ocean',     emoji: '🌊', bg: '#0277BD', text: '#E0F7FA' },
  { id: 'jungle',    emoji: '🌿', bg: '#2E7D32', text: '#F1F8E9' },
  { id: 'princess',  emoji: '👑', bg: '#F8BBD0', text: '#880E4F' },
  { id: 'superhero', emoji: '⚡', bg: '#D32F2F', text: '#FFC107' },
  { id: 'dinosaur',  emoji: '🦕', bg: '#558B2F', text: '#F9A825' },
  { id: 'candy',     emoji: '🍭', bg: '#E91E8C', text: '#FFFFFF' },
  { id: 'farm',      emoji: '🐄', bg: '#5D4037', text: '#FDD835' },
  { id: 'robot',     emoji: '🤖', bg: '#00897B', text: '#ECEFF1' },
  { id: 'magic',     emoji: '✨', bg: '#6A1B9A', text: '#FFD600' },
]

// ============================================================
// AUDIENCE CARD
// ============================================================
function AudienceCard({
  id,
  emoji,
  title,
  description,
  gradient,
  selected,
  onClick,
}: {
  id: Audience
  emoji: string
  title: string
  description: string
  gradient: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      className="relative w-full text-left rounded-2xl p-1 outline-none focus-visible:ring-4 focus-visible:ring-offset-2"
      style={{
        background: selected
          ? `linear-gradient(135deg, var(--color-primary), var(--color-secondary))`
          : 'transparent',
      }}
      aria-pressed={selected}
    >
      <div
        className="w-full rounded-xl p-6 transition-all duration-200"
        style={{
          background: gradient,
          border: selected
            ? '2px solid transparent'
            : '2px solid rgba(0,0,0,0.08)',
        }}
      >
        {/* Selected indicator */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'var(--color-primary)' }}
          >
            ✓
          </motion.div>
        )}

        <div className="text-5xl mb-4">{emoji}</div>
        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      </div>
    </motion.button>
  )
}

// ============================================================
// KIDS THEME PICKER
// ============================================================
function KidsThemePicker({
  selected,
  onSelect,
}: {
  selected: KidsTheme
  onSelect: (t: KidsTheme) => void
}) {
  const t = useTranslations('kidsThemes')

  return (
    <div className="grid grid-cols-5 gap-3">
      {KIDS_THEMES.map((theme) => (
        <motion.button
          key={theme.id}
          onClick={() => onSelect(theme.id)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="flex flex-col items-center gap-2 p-3 rounded-2xl outline-none"
          style={{
            background: theme.bg,
            border: selected === theme.id
              ? `3px solid ${theme.text}`
              : '3px solid transparent',
            boxShadow: selected === theme.id
              ? `0 0 0 2px ${theme.bg}, 0 0 0 5px ${theme.text}`
              : 'none',
          }}
          aria-pressed={selected === theme.id}
          title={t(theme.id)}
        >
          <span className="text-2xl">{theme.emoji}</span>
          <span
            className="text-xs font-semibold leading-tight text-center"
            style={{ color: theme.text }}
          >
            {t(theme.id)}
          </span>
        </motion.button>
      ))}
    </div>
  )
}

// ============================================================
// STEP 1 — AUDIENCE SELECTOR
// ============================================================
function StepAudience({
  selected,
  onSelect,
  onContinue,
}: {
  selected: Audience | null
  onSelect: (a: Audience) => void
  onContinue: () => void
}) {
  const t = useTranslations('onboarding')

  const cards = [
    {
      id: 'ladies' as Audience,
      emoji: '🌸',
      title: t('ladies'),
      description: t('ladiesDesc'),
      gradient: 'linear-gradient(135deg, #FFF0F5 0%, #FCE4EC 100%)',
    },
    {
      id: 'gents' as Audience,
      emoji: '🎓',
      title: t('gents'),
      description: t('gentsDesc'),
      gradient: 'linear-gradient(135deg, #F0F4FF 0%, #E3F2FD 100%)',
    },
    {
      id: 'kids' as Audience,
      emoji: '🎮',
      title: t('kids'),
      description: t('kidsDesc'),
      gradient: 'linear-gradient(135deg, #FFFDE7 0%, #FFF9C4 100%)',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl"
    >
      <div className="text-center mb-8">
        <motion.h2
          className="text-3xl font-bold mb-3 heading-display"
          style={{ color: 'var(--color-text-primary)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {t('chooseExperience')}
        </motion.h2>
        <motion.p
          className="text-base"
          style={{ color: 'var(--color-text-secondary)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {t('chooseExperienceDesc')}
        </motion.p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
          >
            <AudienceCard
              {...card}
              selected={selected === card.id}
              onClick={() => onSelect(card.id)}
            />
          </motion.div>
        ))}
      </div>

      <div className="flex justify-center">
        <motion.button
          onClick={onContinue}
          disabled={!selected}
          className="btn-primary px-10 py-4 text-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          whileHover={selected ? { scale: 1.03 } : {}}
          whileTap={selected ? { scale: 0.97 } : {}}
        >
          {t('continue')} →
        </motion.button>
      </div>
    </motion.div>
  )
}

// ============================================================
// STEP 2 — KIDS THEME SELECTOR (only for kids audience)
// ============================================================
function StepKidsTheme({
  selected,
  onSelect,
  onContinue,
  onBack,
}: {
  selected: KidsTheme
  onSelect: (t: KidsTheme) => void
  onContinue: () => void
  onBack: () => void
}) {
  const t = useTranslations('onboarding')

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="w-full max-w-lg"
    >
      <div className="text-center mb-8">
        <motion.div
          className="text-6xl mb-4"
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          🎨
        </motion.div>
        <h2
          className="text-3xl font-bold mb-3 heading-display"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {t('chooseTheme')}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('chooseThemeDesc')}</p>
      </div>

      <div className="mb-8">
        <KidsThemePicker selected={selected} onSelect={onSelect} />
      </div>

      {/* Preview of selected theme */}
      <motion.div
        key={selected}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-4 mb-8 text-center"
        style={{
          background: KIDS_THEMES.find((t) => t.id === selected)?.bg,
          color: KIDS_THEMES.find((t) => t.id === selected)?.text,
        }}
      >
        <span className="text-3xl mr-2">
          {KIDS_THEMES.find((th) => th.id === selected)?.emoji}
        </span>
        <span className="text-lg font-bold capitalize">{selected} theme selected!</span>
      </motion.div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={onBack}
          className="btn-secondary px-6 py-3"
        >
          ← {t('back')}
        </button>
        <motion.button
          onClick={onContinue}
          className="btn-primary px-10 py-3 text-lg"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {t('continue')} 🚀
        </motion.button>
      </div>
    </motion.div>
  )
}

// ============================================================
// MAIN ONBOARDING COMPONENT
// ============================================================
export default function OnboardingScreen({ locale }: { locale: SupportedLocale }) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const { completeOnboarding, setAudience } = useThemeStore()

  const [step, setStep] = useState<1 | 2>(1)
  const [selectedAudience, setSelectedAudience] = useState<Audience | null>(null)
  const [selectedKidsTheme, setSelectedKidsTheme] = useState<KidsTheme>('space')

  // Preview theme as user hovers/selects audience
  const handleAudienceSelect = (audience: Audience) => {
    setSelectedAudience(audience)
    // Live preview
    document.documentElement.setAttribute('data-theme', audience)
    if (audience !== 'kids') {
      document.documentElement.removeAttribute('data-kids-theme')
    }
  }

  const handleKidsThemeSelect = (theme: KidsTheme) => {
    setSelectedKidsTheme(theme)
    document.documentElement.setAttribute('data-kids-theme', theme)
  }

  const handleStep1Continue = () => {
    if (!selectedAudience) return
    if (selectedAudience === 'kids') {
      setStep(2)
    } else {
      handleFinish()
    }
  }

  const handleFinish = () => {
    const config: ThemeConfig = {
      audience: selectedAudience!,
      kidsTheme: selectedAudience === 'kids' ? selectedKidsTheme : undefined,
      language: locale,
      direction: ['ur', 'ar'].includes(locale) ? 'rtl' : 'ltr',
    }
    completeOnboarding(config)
    router.push(`/${locale}`)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12 hero-bg"
      role="main"
    >
      {/* Logo / Brand */}
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-5xl mb-3">📚</div>
        <h1
          className="text-4xl font-bold heading-display"
          style={{ color: 'var(--color-primary)' }}
        >
          {t('welcome')}
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--color-text-secondary)' }}>
          {t('subtitle')}
        </p>

        {/* Step indicator */}
        {selectedAudience === 'kids' && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <div
              className="w-8 h-2 rounded-full transition-all"
              style={{ background: step >= 1 ? 'var(--color-primary)' : 'var(--color-border)' }}
            />
            <div
              className="w-8 h-2 rounded-full transition-all"
              style={{ background: step >= 2 ? 'var(--color-primary)' : 'var(--color-border)' }}
            />
          </div>
        )}
      </motion.div>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <StepAudience
            key="step1"
            selected={selectedAudience}
            onSelect={handleAudienceSelect}
            onContinue={handleStep1Continue}
          />
        ) : (
          <StepKidsTheme
            key="step2"
            selected={selectedKidsTheme}
            onSelect={handleKidsThemeSelect}
            onContinue={handleFinish}
            onBack={() => setStep(1)}
          />
        )}
      </AnimatePresence>

      {/* Skip */}
      <motion.button
        className="mt-8 text-sm btn-ghost"
        onClick={() => {
          setSelectedAudience('ladies')
          completeOnboarding({
            audience: 'ladies',
            language: locale,
            direction: 'ltr',
          })
          router.push(`/${locale}`)
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {t('skip')}
      </motion.button>
    </div>
  )
}
