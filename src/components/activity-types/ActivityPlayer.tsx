'use client'

import { Suspense, lazy } from 'react'
import type { Activity, Audience, SupportedLocale } from '@/types'
import { adaptActivityItems, dbTypeOf, playerTypeKey } from '@/lib/activity-content'

type PlayerComponent = React.LazyExoticComponent<React.ComponentType<{
  items: NonNullable<Activity['items']>
  theme: Audience
  locale: SupportedLocale
  onComplete: (score: number) => void
}>>

const ACTIVITY_COMPONENTS: Record<string, PlayerComponent> = {
  'quiz':             lazy(() => import('./QuizActivity')),
  'match-up':         lazy(() => import('./MatchUpActivity')),
  'anagram':          lazy(() => import('./AnagramActivity')),
  'crossword':        lazy(() => import('./CrosswordActivity')),
  'wordsearch':       lazy(() => import('./WordsearchActivity')),
  'spin-wheel':       lazy(() => import('./SpinWheelActivity')),
  'balloon-pop':      lazy(() => import('./BalloonPopActivity')),
  'whack-a-mole':     lazy(() => import('./WhackAMoleActivity')),
  'true-false':       lazy(() => import('./TrueFalseActivity')),
  'categorize':       lazy(() => import('./CategorizeActivity')),
  'order':            lazy(() => import('./OrderActivity')),
  'fill-blank':       lazy(() => import('./FillBlankActivity')),
  'labelled-diagram': lazy(() => import('./LabelledDiagramActivity')),
  'flashcards':       lazy(() => import('./FlashcardsActivity')),
  'missing-word':     lazy(() => import('./MissingWordActivity')),
  'unjumble':         lazy(() => import('./UnjumbleActivity')),
  'gameshow-quiz':    lazy(() => import('./GameshowQuizActivity')),
  'hangman':          lazy(() => import('./HangmanActivity')),
  'random-wheel':     lazy(() => import('./RandomWheelActivity')),
  'open-box':         lazy(() => import('./OpenBoxActivity')),
  'memory-match':     lazy(() => import('./MemoryMatchActivity')),
  'typing-race':      lazy(() => import('./TypingRaceActivity')),
  'bingo':            lazy(() => import('./BingoActivity')),
}

interface ActivityPlayerProps {
  activity: Activity
  theme: Audience
  locale: SupportedLocale
  onComplete: (score: number) => void
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%',
        border: '4px solid var(--color-border)', borderTopColor: 'var(--color-primary)',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>Loading activity…</p>
    </div>
  )
}

export default function ActivityPlayer({ activity, theme, locale, onComplete }: ActivityPlayerProps) {
  // Live DB rows carry `type` + `content`; creator rows carry
  // `type_id` + `items`. dbTypeOf prefers the DB fields, and the
  // adapter translates DB content into player items (see
  // src/lib/activity-content.ts). Without this, every programme
  // game rendered "This activity has no items yet."
  const dbType = dbTypeOf(activity)
  const typeSlug = playerTypeKey(dbType)
  const Component = ACTIVITY_COMPONENTS[typeSlug]

  if (!Component) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
        <p>Unknown activity type: <strong>{dbType}</strong></p>
      </div>
    )
  }

  const items = adaptActivityItems(activity)
  if (items.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>This activity has no items yet.</p>
      </div>
    )
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Component items={items} theme={theme} locale={locale} onComplete={onComplete} />
    </Suspense>
  )
}
