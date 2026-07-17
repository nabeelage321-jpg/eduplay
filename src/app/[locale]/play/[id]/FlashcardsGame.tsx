'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HowToPlayScreen } from './HowToPlayScreen'

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

interface Card {
  front: string
  back: string
  emoji?: string
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
    cards: Card[]
  }
}

interface FlashcardsGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

const TOTAL_TIME_PER_CARD = 30

export function FlashcardsGame({ activity, locale }: FlashcardsGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [currentCard, setCurrentCard] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [gameComplete, setGameComplete] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [showPoints, setShowPoints] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME_PER_CARD)
  const [cardStartTime, setCardStartTime] = useState<number | null>(null)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [totalGameTime, setTotalGameTime] = useState(0)
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [shuffledCards, setShuffledCards] = useState<Card[]>([])

  // Load player name from localStorage on mount
  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const cards: Card[] = activity.content?.cards || []

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
    const shuffled = shuffleArray(cards)
    setShuffledCards(shuffled)
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
    setCardStartTime(Date.now())
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  // Timer countdown effect
  useEffect(() => {
    if (!gameStarted || gameComplete || !isFlipped) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleTimeoutCard()
          return TOTAL_TIME_PER_CARD
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameComplete, isFlipped])

  const handleTimeoutCard = () => {
    setShowPoints(true)
    setPointsEarned(0)
  }

  const calculatePoints = (timeUsed: number, isCorrect: boolean): number => {
    if (!isCorrect) return 0
    if (timeUsed <= 10) return 1000
    if (timeUsed <= 20) return 500
    return 200
  }

  const handleKnewIt = () => {
    if (!cardStartTime) return
    const timeUsed = Math.floor((Date.now() - cardStartTime) / 1000)
    const points = calculatePoints(timeUsed, true)
    setPointsEarned(points)
    setShowPoints(true)
    setCorrectAnswers(correctAnswers + 1)
    setTotalScore(totalScore + points)
  }

  const handleDidntKnow = () => {
    setPointsEarned(0)
    setShowPoints(true)
  }

  const handleNextCard = async () => {
    if (currentCard < shuffledCards.length - 1) {
      setCurrentCard(currentCard + 1)
      setIsFlipped(false)
      setShowPoints(false)
      setTimeRemaining(TOTAL_TIME_PER_CARD)
      setCardStartTime(Date.now())
    } else {
      // Game complete - save to leaderboard
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
      const response = await fetch('/api/leaderboard', {
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

      if (response.ok) {
        const leaderboardResponse = await fetch(`/api/leaderboard?activity_id=${activity.id}`)
        if (leaderboardResponse.ok) {
          const data = await leaderboardResponse.json()
          setTopScores(data.data || [])
        }
      }
    } catch (error) {
      console.error('Error saving to leaderboard:', error)
    }
  }

  const handlePlayAgain = () => {
    router.push(`/${locale}/browse`)
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">No Cards</h1>
          <p className="text-xl text-blue-100">This game doesn't have any cards yet.</p>
        </div>
      </div>
    )
  }

  // Show name entry screen
  if (!gameStarted) {
    if (showHowToPlay) {
      return (
        <HowToPlayScreen
          gameType="flashcards"
          gameName={activity.title}
          gameEmoji="🎴"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🎴</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">{activity.title}</h1>
          <p className="text-lg text-gray-600 mb-8">{activity.description}</p>

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
              className="w-full px-4 py-3 text-xl border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-2">Letters and spaces only, max 20 characters</p>
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

          <div className="text-center text-gray-500">
            <p className="text-sm">
              {activity.subject} • {activity.grade.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Game complete screen
  if (gameComplete) {
    const percentage = Math.round((correctAnswers / shuffledCards.length) * 100)
    let emoji = '🌟'
    if (percentage === 100) emoji = '🏆'
    else if (percentage >= 80) emoji = '⭐'
    else if (percentage >= 60) emoji = '👏'
    else emoji = '💪'

    const formattedTime = `${Math.floor(totalGameTime / 60)}m ${totalGameTime % 60}s`

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
        <div className="w-full max-w-2xl">
          {/* Final Score Card */}
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl mb-8">
            <div className="text-center mb-8">
              <div className="text-7xl mb-6">{emoji}</div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Great Job!</h1>
              <p className="text-2xl font-bold text-blue-600">{playerName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 rounded-xl p-6 text-center">
                <p className="text-gray-600 font-semibold mb-2">Final Score</p>
                <p className="text-4xl font-bold text-blue-600">{totalScore}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-6 text-center">
                <p className="text-gray-600 font-semibold mb-2">Knew</p>
                <p className="text-4xl font-bold text-green-600">
                  {correctAnswers}/{shuffledCards.length}
                </p>
              </div>
              <div className="bg-purple-50 rounded-xl p-6 text-center">
                <p className="text-gray-600 font-semibold mb-2">Percentage</p>
                <p className="text-4xl font-bold text-purple-600">{percentage}%</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-6 text-center">
                <p className="text-gray-600 font-semibold mb-2">Time</p>
                <p className="text-2xl font-bold text-orange-600">{formattedTime}</p>
              </div>
            </div>

            <button
              onClick={handlePlayAgain}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
            >
              Back to Games 🎮
            </button>
          </div>

          {/* Leaderboard */}
          {topScores.length > 0 && (
            <div className="bg-white rounded-3xl p-8 shadow-2xl">
              <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">🏅 Top 10 Scores</h2>
              <div className="space-y-3">
                {topScores.map((entry, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-xl ${
                      entry.player_name === playerName
                        ? 'bg-yellow-100 border-2 border-yellow-400'
                        : index === 0
                        ? 'bg-yellow-50'
                        : index === 1
                        ? 'bg-gray-100'
                        : index === 2
                        ? 'bg-orange-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl font-bold text-gray-700 w-12">#{index + 1}</div>
                      <div>
                        <p className="font-bold text-lg text-gray-800">{entry.player_name}</p>
                        <p className="text-sm text-gray-600">
                          {entry.correct_answers} knew • {Math.floor(entry.time_taken / 60)}m{' '}
                          {entry.time_taken % 60}s
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-blue-600">{entry.score}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Game screen
  const currentCardData = shuffledCards[currentCard]
  const progressPercent = ((currentCard + 1) / shuffledCards.length) * 100
  const circlePercent = (timeRemaining / TOTAL_TIME_PER_CARD) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-2xl">
        {/* Player Name and Score */}
        <div className="mb-6 text-white">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-sm opacity-80">Player</p>
              <p className="font-bold text-xl">{playerName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">Total Score</p>
              <p className="font-bold text-3xl text-yellow-200">{totalScore}</p>
            </div>
          </div>
          <div className="bg-white bg-opacity-30 rounded-full h-6 overflow-hidden">
            <div
              className="bg-yellow-300 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-center mt-3 text-lg font-bold">
            Card {currentCard + 1} of {shuffledCards.length}
          </p>
        </div>

        {/* Game Card */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl">
          {/* Timer Circle */}
          {isFlipped && (
            <div className="flex justify-center mb-8">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke={timeRemaining > 10 ? '#10b981' : '#ef4444'}
                    strokeWidth="8"
                    strokeDasharray={`${(circlePercent / 100) * 282.7} 282.7`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-gray-800">{timeRemaining}</p>
                    <p className="text-xs text-gray-600">seconds</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card */}
          <div className="flex justify-center mb-8">
            <div
              onClick={() => !isFlipped && setIsFlipped(true)}
              className={`
                w-full max-w-sm h-80 rounded-2xl p-8 flex flex-col items-center justify-center
                cursor-pointer transition-all duration-500 transform
                ${
                  isFlipped
                    ? 'bg-gradient-to-br from-blue-400 to-blue-600'
                    : 'bg-gradient-to-br from-pink-400 to-purple-500'
                }
                ${!isFlipped ? 'hover:scale-105' : ''}
              `}
              style={{
                transform: isFlipped ? 'scaleX(-1) rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {currentCardData.emoji && <div className="text-6xl mb-4">{currentCardData.emoji}</div>}
              <p className="text-center text-white font-bold text-3xl leading-tight">
                {isFlipped ? currentCardData.back : currentCardData.front}
              </p>
              {!isFlipped && (
                <p className="text-white text-sm opacity-75 mt-4">Click to flip 🔄</p>
              )}
            </div>
          </div>

          {/* Points Earned */}
          {showPoints && (
            <div className={`text-center mb-8 p-4 rounded-xl text-2xl font-bold ${
              pointsEarned > 0
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {pointsEarned > 0 ? (
                <>🎉 +{pointsEarned} points!</>
              ) : (
                <>💭 Keep trying!</>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {isFlipped && !showPoints && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={handleKnewIt}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-xl transition-colors transform hover:scale-105 active:scale-95"
              >
                I Knew It ✅
              </button>
              <button
                onClick={handleDidntKnow}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-6 rounded-xl text-xl transition-colors transform hover:scale-105 active:scale-95"
              >
                I Didn't ❌
              </button>
            </div>
          )}

          {/* Next Button */}
          {showPoints && (
            <button
              onClick={handleNextCard}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
            >
              {currentCard < shuffledCards.length - 1 ? 'Next Card ➜' : 'See Results 🎉'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
