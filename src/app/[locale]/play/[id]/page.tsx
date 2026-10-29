import { createClient } from '@supabase/supabase-js'
import { QuizGame } from './QuizGame'
import { FlashcardsGame } from './FlashcardsGame'
import { TrueFalseGame } from './TrueFalseGame'
import { HangmanGame } from './HangmanGame'
import { MatchUpGame } from './MatchUpGame'
import { AnagramGame } from './AnagramGame'
import { BalloonPopGame } from './BalloonPopGame'
import { WhackAMoleGame } from './WhackAMoleGame'
import { FillBlankGame } from './FillBlankGame'
import { MissingWordGame } from './MissingWordGame'
import { OrderGame } from './OrderGame'
import { CrosswordGame } from './CrosswordGame'
import { WordSearchGame } from './WordSearchGame'
import { CategorizeGame } from './CategorizeGame'
import { UnjumbleGame } from './UnjumbleGame'
import { GameshowQuizGame } from './GameshowQuizGame'
import { RandomWheelGame } from './RandomWheelGame'
import { SpinWheelGame } from './SpinWheelGame'
import { OpenBoxGame } from './OpenBoxGame'
import { LabelledDiagramGame } from './LabelledDiagramGame'
import { MemoryMatchGame } from './MemoryMatchGame'
import { TypingRaceGame } from './TypingRaceGame'
import { BingoGame } from './BingoGame'

interface Activity {
  id: string
  title: string
  description?: string
  type: string
  subject: string
  grade: string
  language: string
  curriculum: string
  is_public: boolean
  play_count: number
  created_at: string
  content?: any
}

interface PageProps {
  params: {
    locale: string
    id: string
  }
}

async function getActivity(id: string): Promise<Activity | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('id', id)
      .eq('is_public', true)
      .single()

    if (error) {
      console.error('Error fetching activity:', error)
      return null
    }

    return data as Activity
  } catch (error) {
    console.error('Error in getActivity:', error)
    return null
  }
}

export default async function PlayPage({ params }: PageProps) {
  const activity = await getActivity(params.id)

  if (!activity) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Game Not Found</h1>
          <p className="text-xl text-blue-100">Sorry, we couldn't find this game.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {activity.type === 'quiz' && <QuizGame activity={activity} locale={params.locale} />}
      {activity.type === 'flashcards' && <FlashcardsGame activity={activity} locale={params.locale} />}
      {activity.type === 'true-false' && <TrueFalseGame activity={activity} locale={params.locale} />}
      {activity.type === 'hangman' && <HangmanGame activity={activity} locale={params.locale} />}
      {activity.type === 'match-up' && <MatchUpGame activity={activity} locale={params.locale} />}
      {activity.type === 'anagram' && <AnagramGame activity={activity} locale={params.locale} />}
      {activity.type === 'balloon-pop' && <BalloonPopGame activity={activity} locale={params.locale} />}
      {activity.type === 'whack-a-mole' && <WhackAMoleGame activity={activity} locale={params.locale} />}
      {activity.type === 'fill-blank' && <FillBlankGame activity={activity} locale={params.locale} />}
      {activity.type === 'missing-word' && <MissingWordGame activity={activity} locale={params.locale} />}
      {activity.type === 'order' && <OrderGame activity={activity} locale={params.locale} />}
      {activity.type === 'crossword' && <CrosswordGame activity={activity} locale={params.locale} />}
      {activity.type === 'word-search' && <WordSearchGame activity={activity} locale={params.locale} />}
      {activity.type === 'categorize' && <CategorizeGame activity={activity} locale={params.locale} />}
      {activity.type === 'unjumble' && <UnjumbleGame activity={activity} locale={params.locale} />}
      {activity.type === 'gameshow-quiz' && <GameshowQuizGame activity={activity} locale={params.locale} />}
      {activity.type === 'random-wheel' && <RandomWheelGame activity={activity} locale={params.locale} />}
      {activity.type === 'spin-wheel' && <SpinWheelGame activity={activity} locale={params.locale} />}
      {activity.type === 'open-box' && <OpenBoxGame activity={activity} locale={params.locale} />}
      {activity.type === 'labelled-diagram' && <LabelledDiagramGame activity={activity} locale={params.locale} />}
      {activity.type === 'memory-match' && <MemoryMatchGame activity={activity} locale={params.locale} />}
      {activity.type === 'typing-race' && <TypingRaceGame activity={activity} locale={params.locale} />}
      {activity.type === 'bingo' && <BingoGame activity={activity} locale={params.locale} />}
      {!['quiz', 'flashcards', 'true-false', 'hangman', 'match-up', 'anagram', 'balloon-pop', 'whack-a-mole', 'fill-blank', 'missing-word', 'order', 'crossword', 'word-search', 'categorize', 'unjumble', 'gameshow-quiz', 'random-wheel', 'spin-wheel', 'open-box', 'labelled-diagram', 'memory-match', 'typing-race', 'bingo'].includes(activity.type) && (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">Game Type Not Found</h1>
            <p className="text-xl text-blue-100">This game type is not yet supported.</p>
          </div>
        </div>
      )}
    </>
  )
}
