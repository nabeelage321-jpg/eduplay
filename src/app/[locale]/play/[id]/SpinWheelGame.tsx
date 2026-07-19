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

interface Item {
  label: string
  question: string
  options: string[]
  answer: number
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
    items: Item[]
  }
}

interface SpinWheelGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

const TOTAL_TIME = 30

export function SpinWheelGame({ activity, locale }: SpinWheelGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [rotation, setRotation] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [spinCount, setSpinCount] = useState(0)

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const itemsData: Item[] = activity.content?.items || []

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
    setItems(shuffleArray(itemsData))
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
    setElapsedSeconds(0)
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  useEffect(() => {
    if (!selectedItem || gameComplete || showFeedback) return

    const timer = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setShowFeedback(true)
          setPointsEarned(0)
          return TOTAL_TIME
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [selectedItem, gameComplete, showFeedback])

  useEffect(() => {
    if (!gameStarted || gameComplete) return

    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [gameStarted, gameComplete])

  const calculatePoints = (timeUsed: number, isCorrect: boolean): number => {
    if (!isCorrect) return 0
    if (timeUsed <= 10) return 1000
    if (timeUsed <= 20) return 500
    return 200
  }

  const handleSpin = () => {
    if (isSpinning) return

    setIsSpinning(true)
    setSelectedItem(null)
    setSelectedAnswer(null)
    setShowFeedback(false)
    setTimeRemaining(TOTAL_TIME)

    const randomRotation = Math.random() * 360 + 1080
    setRotation((prev) => prev + randomRotation)

    setTimeout(() => {
      const selectedIndex = Math.floor((randomRotation % 360) / (360 / items.length))
      const selected = items[selectedIndex]
      setSelectedItem(selected)
      setSpinCount((prev) => prev + 1)
      setStartTime(Date.now())
      setIsSpinning(false)
    }, 3000)
  }

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null || showFeedback || !selectedItem) return

    const isCorrect = index === selectedItem.answer
    const timeUsed = Math.floor((Date.now() - (startTime || 0)) / 1000)
    const points = calculatePoints(timeUsed, isCorrect)

    setSelectedAnswer(index)
    setShowFeedback(true)
    setPointsEarned(points)

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1)
      setTotalScore((prev) => prev + points)
    }
  }

  const handleNextSpin = async () => {
    if (items.length === 0) {
      return
    }

    if (spinCount >= items.length) {
      const timeTaken = elapsedSeconds
      await saveToLeaderboard(timeTaken)
      setGameComplete(true)
    } else {
      setSelectedItem(null)
      setSelectedAnswer(null)
      setShowFeedback(false)
      handleSpin()
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

  if (!gameStarted) {
    if (showHowToPlay) {
      return (
        <HowToPlayScreen
          gameType="spin-wheel"
          gameName={activity.title}
          gameEmoji="🌀"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🌀</div>
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
    const formattedTime = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`

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
                <p className="text-4xl font-bold text-green-600">{correctAnswers}/{items.length}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-6 text-center col-span-2">
                <p className="text-gray-600 font-semibold mb-2">Time</p>
                <p className="text-3xl font-bold text-purple-600">{formattedTime}</p>
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

  const COLORS = [
    'from-red-400 to-red-600',
    'from-blue-400 to-blue-600',
    'from-yellow-400 to-yellow-600',
    'from-green-400 to-green-600',
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-white mb-2">{activity.title}</h1>
        <p className="text-2xl font-bold text-yellow-300">{playerName} • {totalScore} pts</p>
        <p className="text-lg text-white/80 mt-2">Time: {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}</p>
      </div>

      {!selectedItem ? (
        <>
          <div className="relative w-64 h-64 mb-8">
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center transition-transform duration-3000 ease-out"
              style={{
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {items.map((item, index) => {
                const angle = (index / items.length) * 360
                return (
                  <div
                    key={index}
                    className={`absolute w-24 h-24 bg-gradient-to-br ${COLORS[index % COLORS.length]} rounded-full flex items-center justify-center font-bold text-sm text-white text-center p-2 shadow-lg`}
                    style={{
                      transform: `rotate(${angle}deg) translateY(-130px) rotate(-${angle}deg)`,
                    }}
                  >
                    {item.label}
                  </div>
                )
              })}
            </div>

            <div className="absolute inset-0 rounded-full border-8 border-white shadow-2xl"></div>

            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-6 border-r-6 border-t-8 border-l-transparent border-r-transparent border-t-yellow-300 z-10"></div>
          </div>

          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="mb-8 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-6 px-12 rounded-2xl text-3xl transition-all disabled:opacity-50"
          >
            {isSpinning ? '🌀 Spinning...' : '🎯 SPIN!'}
          </button>
        </>
      ) : (
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl p-8 shadow-2xl mb-6">
            <p className="text-2xl font-bold text-gray-700 mb-6">{selectedItem.question}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {selectedItem.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={selectedAnswer !== null}
                  className={`
                    p-6 rounded-xl font-bold text-lg transition-all
                    ${
                      selectedAnswer === index
                        ? index === selectedItem.answer
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

            <p className="text-center text-xl font-bold text-blue-600">Time: {timeRemaining}s</p>

            {showFeedback && (
              <>
                <div className={`text-center my-6 p-4 rounded-xl text-2xl font-bold ${
                  pointsEarned > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {pointsEarned > 0 ? `🎉 +${pointsEarned} points!` : '💭 Try again!'}
                </div>
                <button
                  onClick={handleNextSpin}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
                >
                  {spinCount < items.length ? 'Next Spin ➜' : 'Results 🎉'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
