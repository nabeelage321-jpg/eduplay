'use client'

import { Suspense, lazy, useMemo } from 'react'
import type { Activity, Audience, SupportedLocale } from '@/types'
import type { ActivityCompletion } from './shared'
import { adaptActivityItems, dbTypeOf, playerTypeKey } from '@/lib/activity-content'

type PlayerComponent = React.LazyExoticComponent<React.ComponentType<{
  items: NonNullable<Activity['items']>
  theme: Audience
  locale: SupportedLocale
  onComplete: (score: number, details?: ActivityCompletion) => void
  autoStart?: boolean
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
  'jump-path':        lazy(() => import('./JumpPathActivity')),
  'riddle':           lazy(() => import('./RiddleActivity')),
  'aster-quiz':       lazy(() => import('./AsterQuizActivity')),
  'dictation':        lazy(() => import('./DictationActivity')),
  'dialogue':         lazy(() => import('./DialogueActivity')),
  'map-quiz':         lazy(() => import('./MapQuizActivity')),
  'jigsaw-puzzle':    lazy(() => import('./JigsawActivity')),
  'video-quiz':       lazy(() => import('./VideoQuizActivity')),
  'letter-wheel':     lazy(() => import('./LetterWheelActivity')),
  'maze-run':         lazy(() => import('./MazeRunActivity')),
  'speed-judge':      lazy(() => import('./SpeedJudgeActivity')),
  'spell-it':         lazy(() => import('./SpellItActivity')),
  'picture-answer':   lazy(() => import('./PictureAnswerActivity')),
  'memory-recall':    lazy(() => import('./MemoryRecallActivity')),
  'claim-line':       lazy(() => import('./ClaimLineActivity')),
  'opinion-cloud':    lazy(() => import('./OpinionCloudActivity')),
  'number-slider':    lazy(() => import('./NumberSliderActivity')),
  'maze-chase':       lazy(() => import('./MazeChaseActivity')),
  'apple-snake':      lazy(() => import('./AppleSnakeActivity')),
  'flutter-flight':   lazy(() => import('./FlutterFlightActivity')),
  'sweet-match':      lazy(() => import('./SweetMatchActivity')),
  'star-shooter':     lazy(() => import('./StarShooterActivity')),
  'jump-blocks':      lazy(() => import('./JumpBlocksActivity')),
  'fruit-slice':       lazy(() => import('./FruitSliceActivity')),
  'river-hop':         lazy(() => import('./RiverHopActivity')),
  'lane-runner':        lazy(() => import('./LaneRunnerActivity')),
}

interface ActivityPlayerProps {
  activity: Activity
  theme: Audience
  locale: SupportedLocale
  onComplete: (score: number, details?: ActivityCompletion) => void
  // True when the host already showed an instruction/start screen
  // (the play page's PlayIntro) — passed through to shell-wrapped
  // players so they skip their own Start screen. Absent = the shell
  // shows its own Start screen (e.g. the creator's draft Preview).
  autoStart?: boolean
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

export default function ActivityPlayer({ activity, theme, locale, onComplete, autoStart }: ActivityPlayerProps) {
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

  // QUIZ RE-RENDER FIX (2026-11-02): adaptActivityItems maps DB
  // content into a NEW array on every call, so calling it during
  // render gave every player a new `items` identity on every play-page
  // timer tick (1s), and every useEffect([items]) shuffle in the
  // players re-ran. Memoise on the activity object itself, which the
  // play page only replaces when a new game is fetched (or its
  // approval status changes — content is unchanged then, and the
  // players' content guards skip a rebuild).
  const items = useMemo(() => adaptActivityItems(activity), [activity])
  if (items.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <p>This activity has no items yet.</p>
      </div>
    )
  }

  return (
    <div className="eduplay-player">
      <Suspense fallback={<LoadingSkeleton />}>
        <Component items={items} theme={theme} locale={locale} onComplete={onComplete} autoStart={autoStart} />
      </Suspense>
    </div>
  )
}
