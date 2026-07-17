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

interface Sentence {
  text: string
  missing: string
  options: string[]
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
    sentences: Sentence[]
  }
}

interface MissingWordGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

export function MissingWordGame({ activity, locale }: MissingWordGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [current, setCurrent] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [gameComplete, setGameComplete] = useState(false)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [totalGameTime, setTotalGameTime] = useState(0)
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [shuffledSentences, setShuffledSentences] = useState<Sentence[]>([])
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([])
  const [pointsEarned, setPointsEarned] = useState(0)

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const sentences: Sentence[] = activity.content?.sentences || []

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
    const shuffled = shuffleArray(sentences)
    setShuffledSentences(shuffled)
    setShuffledOptions(shuffleArray(shuffled[0].options))
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const calculatePoints = (isCorrect: boolean): number => {
    return isCorrect ? 500 : 0
  }

  const handleAnswerSelect = (option: string) => {
    if (selectedAnswer || showFeedback) return
    
    const isCorrect = option === shuffledSentences[current].missing
    const points = calculatePoints(isCorrect)

    setSelectedAnswer(option)
    setShowFeedback(true)
    setPointsEarned(points)

    if (isCorrect) {
      setCorrectAnswers(correctAnswers + 1)
      setTotalScore(totalScore + points)
    }
  }

  const handleNextSentence = async () => {
    if (current < shuffledSentences.length - 1) {
      setCurrent(current + 1)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setShuffledOptions(shuffleArray(shuffledSentences[current + 1].options))
    } else {
      if (gameStartTimestamp) {
        const timeTaken = Math.floor((Date.now() - gameStartTimestamp) / 1000)
        setTotalGameTime(timeTaken)
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

  if (sentences.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">No Sentences</h1>
        </div>
      </div>
    )
  }

  if (!gameStarted) {
    if (showHowToPlay) {
      return (
        <HowToPlayScreen
          gameType="missing-word"
          gameName={activity.title}
          gameEmoji="🔍"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🔍</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">{activity.title}</h1>

          <div className="mb-6">
            <label className="block text-2xl font-bold text-gray-700 mb-4">
              What is your name?
            </label>
            <input
              type="text"
              placeholder="Enter your name..."
              autoFocus
              maxLength={20}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleStartGame((e.target as HTMLInputElement).value)
                }
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
                <p className="text-4xl font-bold text-green-600">
                  {correctAnswers}/{shuffledSentences.length}
                </p>
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

  const currentData = shuffledSentences[current]
  const progressPercent = ((current + 1) / shuffledSentences.length) * 100
  const isCorrect = selectedAnswer === currentData.missing

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-white">
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-xl">{playerName}</p>
            <p className="font-bold text-3xl text-yellow-200">{totalScore}</p>
          </div>
          <div className="bg-white bg-opacity-30 rounded-full h-6 overflow-hidden">
            <div
              className="bg-yellow-300 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="text-center mb-12">
            <p className="text-2xl text-gray-700 font-semibold">
              {currentData.text.split('????').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className="bg-yellow-300 rounded-lg px-3 py-1 mx-1 font-bold">
                      ????
                    </span>
                  )}
                </span>
              ))}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {shuffledOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleAnswerSelect(option)}
                disabled={selectedAnswer !== null}
                className={`
                  p-6 rounded-xl font-bold text-lg transition-all
                  ${
                    selectedAnswer === option
                      ? isCorrect
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                      : 'bg-blue-400 hover:bg-blue-500 text-white'
                  }
                  disabled:opacity-70
                `}
              >
                {option}
              </button>
            ))}
          </div>

          {showFeedback && (
            <>
              <div className={`text-center mb-8 p-4 rounded-xl text-2xl font-bold ${
                pointsEarned > 0
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {pointsEarned > 0 ? `🎉 +${pointsEarned} points!` : '💭 Try again!'}
              </div>
              <button
                onClick={handleNextSentence}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
              >
                {current < shuffledSentences.length - 1 ? 'Next ➜' : 'Results 🎉'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
