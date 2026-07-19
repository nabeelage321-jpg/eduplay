'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HowToPlayScreen } from './HowToPlayScreen'

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

interface Question {
  question: string
  options: string[]
  correct: number
  fiftyFifty?: boolean
}

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
  content?: {
    questions: Question[]
  }
}

interface GameshowQuizGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

export function GameshowQuizGame({ activity, locale }: GameshowQuizGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [current, setCurrent] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [gameComplete, setGameComplete] = useState(false)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([])
  const [usedLifeline, setUsedLifeline] = useState(false)
  const [lifelineCells, setLifelineCells] = useState<Set<number>>(new Set())
  const [noLifelinesUsed, setNoLifelinesUsed] = useState(true)

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const questions: Question[] = activity.content?.questions || []

  const handleStartGame = (name: string) => {
    if (name.trim() === '') {
      alert('Please enter your name!')
      return
    }
    localStorage.setItem('playerName', name)
    setPlayerName(name)
    setShowHowToPlay(true)
  }

  const handleStartAfterHowToPlay = () => {
    const shuffled = shuffleArray(questions)
    setShuffledQuestions(shuffled)
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const handle50Fifty = () => {
    const currentQuestion = shuffledQuestions[current]
    const wrongIndices = [0, 1, 2, 3].filter((i) => i !== currentQuestion.correct)
    const toRemove = shuffleArray(wrongIndices).slice(0, 2)

    setLifelineCells(new Set(toRemove))
    setUsedLifeline(true)
    setNoLifelinesUsed(false)
  }

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer || showFeedback) return
    if (lifelineCells.has(index)) return

    const currentQuestion = shuffledQuestions[current]
    const isCorrect = index === currentQuestion.correct

    setSelectedAnswer(index)
    setShowFeedback(true)

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1)
      const basePoints = 500
      const bonus = noLifelinesUsed ? 2000 : 0
      setTotalScore((prev) => prev + basePoints + bonus)
    }
  }

  const handleNextQuestion = async () => {
    if (current < shuffledQuestions.length - 1) {
      setCurrent(current + 1)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setUsedLifeline(false)
      setLifelineCells(new Set())
      setNoLifelinesUsed(true)
    } else {
      if (gameStartTimestamp) {
        const timeTaken = Math.floor((Date.now() - gameStartTimestamp) / 1000)
        await saveToLeaderboard(timeTaken)
        setGameComplete(true)
      }
    }
  }

  const saveToLeaderboard = async (timeTaken: number) => {
    try {
      await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activity.id,
          player_name: playerName,
          score: totalScore,
          correct_answers: correctAnswers,
          time_taken: timeTaken,
        }),
      })

      const leaderboardResponse = await fetch(`/api/leaderboard?activity_id=${activity.id}`)
      if (leaderboardResponse.ok) {
        const data = await leaderboardResponse.json()
        setTopScores(data.data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">No Questions</h1>
        </div>
      </div>
    )
  }

  if (!gameStarted) {
    if (showHowToPlay) {
      return (
        <HowToPlayScreen
          gameType="gameshow-quiz"
          gameName={activity.title}
          gameEmoji="🎬"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🎬</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">{activity.title}</h1>

          <div className="mb-6">
            <label className="block text-2xl font-bold text-gray-700 mb-4">What is your name?</label>
            <input
              type="text"
              placeholder="Enter your name..."
              autoFocus
              maxLength={20}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleStartGame((e.target as HTMLInputElement).value)
              }}
              id="playerNameInput"
              className="w-full px-4 py-3 text-xl border-2 border-blue-400 rounded-xl"
            />
          </div>

          <button
            onClick={() => {
              const input = document.getElementById('playerNameInput') as HTMLInputElement
              handleStartGame(input?.value || '')
            }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors mb-4"
          >
            Start Game! 🚀
          </button>
        </div>
      </div>
    )
  }

  if (gameComplete) {
    const percentage = Math.round((correctAnswers / shuffledQuestions.length) * 100)

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl mb-8">
            <div className="text-center mb-8">
              <div className="text-7xl mb-6">🏆</div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Great Job!</h1>
              <p className="text-2xl font-bold text-blue-600">{playerName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 rounded-xl p-6 text-center">
                <p className="text-gray-600 font-semibold mb-2">Final Score</p>
                <p className="text-4xl font-bold text-blue-600">{totalScore}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-6 text-center">
                <p className="text-gray-600 font-semibold mb-2">Correct</p>
                <p className="text-4xl font-bold text-green-600">{correctAnswers}/{shuffledQuestions.length}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-6 text-center col-span-2">
                <p className="text-gray-600 font-semibold mb-2">Percentage</p>
                <p className="text-4xl font-bold text-purple-600">{percentage}%</p>
              </div>
            </div>

            <button
              onClick={() => router.push(`/${locale}/browse`)}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
            >
              Back to Games 🎮
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentQuestion = shuffledQuestions[current]
  const progressPercent = ((current + 1) / shuffledQuestions.length) * 100
  const isCorrect = selectedAnswer === currentQuestion.correct

  const BUTTON_LABELS = ['A', 'B', 'C', 'D']
  const BUTTON_COLORS = [
    'from-red-500 to-red-600',
    'from-blue-500 to-blue-600',
    'from-yellow-500 to-yellow-600',
    'from-green-500 to-green-600',
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-white">
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-xl">{playerName}</p>
            <p className="font-bold text-3xl text-yellow-300">${totalScore}</p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-full h-6 overflow-hidden">
            <div
              className="bg-yellow-300 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-700 via-blue-700 to-purple-800 rounded-3xl p-8 shadow-2xl border-4 border-yellow-300">
          <div className="text-center mb-12">
            <p className="text-sm text-yellow-300 font-bold mb-2">Question {current + 1} of {shuffledQuestions.length}</p>
            <p className="text-3xl font-bold text-white">{currentQuestion.question}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={selectedAnswer !== null || lifelineCells.has(index)}
                className={`
                  bg-gradient-to-br ${BUTTON_COLORS[index]} p-6 rounded-2xl font-bold text-xl
                  text-white transition-all transform hover:scale-105
                  ${lifelineCells.has(index) ? 'opacity-20 cursor-not-allowed' : ''}
                  ${selectedAnswer === index ? (isCorrect ? 'ring-4 ring-green-300' : 'ring-4 ring-red-300') : ''}
                  disabled:opacity-70
                `}
              >
                <span className="text-3xl font-bold">{BUTTON_LABELS[index]}</span>
                <span className="block text-lg mt-2">{option}</span>
              </button>
            ))}
          </div>

          {!showFeedback && (
            <button
              onClick={handle50Fifty}
              disabled={usedLifeline}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-all disabled:opacity-50"
            >
              {usedLifeline ? '50/50 Used ❌' : 'Use 50/50 💡'}
            </button>
          )}

          {showFeedback && (
            <>
              <div className={`text-center mb-8 p-4 rounded-xl text-2xl font-bold ${
                isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                {isCorrect ? `🎉 Correct! +${noLifelinesUsed ? '2500' : '500'} points!` : '❌ Incorrect!'}
              </div>
              <button
                onClick={handleNextQuestion}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
              >
                {current < shuffledQuestions.length - 1 ? 'Next Question ➜' : 'Results 🎉'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
