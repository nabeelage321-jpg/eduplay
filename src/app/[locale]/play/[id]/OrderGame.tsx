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
  text: string
  order: number
}

interface Round {
  items: Item[]
  instruction: string
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
    rounds: Round[]
  }
}

interface OrderGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

export function OrderGame({ activity, locale }: OrderGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [current, setCurrent] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [totalGameTime, setTotalGameTime] = useState(0)
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [shuffledRounds, setShuffledRounds] = useState<Round[]>([])
  const [shuffledItems, setShuffledItems] = useState<(Item & { id: number })[]>([])
  const [selectedOrder, setSelectedOrder] = useState<number[]>([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const rounds: Round[] = activity.content?.rounds || []

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
    const shuffled = shuffleArray(rounds)
    setShuffledRounds(shuffled)
    const itemsWithId = shuffled[0].items.map((item, i) => ({
      ...item,
      id: i,
    }))
    setShuffledItems(shuffleArray(itemsWithId))
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const handleItemClick = (id: number) => {
    if (selectedOrder.includes(id)) {
      setSelectedOrder(selectedOrder.filter((item) => item !== id))
    } else {
      setSelectedOrder([...selectedOrder, id])
    }
  }

  const handleSubmitOrder = () => {
    const correctOrder = shuffledItems.sort((a, b) => a.order - b.order).map((i) => i.id)
    const isCorrect =
      selectedOrder.length === shuffledItems.length &&
      selectedOrder.every((id, i) => id === correctOrder[i])

    const points = isCorrect ? 300 : 0
    setPointsEarned(points)
    setShowFeedback(true)

    if (isCorrect) {
      setCorrectAnswers(correctAnswers + 1)
      setTotalScore(totalScore + points)
    }
  }

  const handleNextRound = async () => {
    if (current < shuffledRounds.length - 1) {
      setCurrent(current + 1)
      setSelectedOrder([])
      setShowFeedback(false)
      const itemsWithId = shuffledRounds[current + 1].items.map((item, i) => ({
        ...item,
        id: i,
      }))
      setShuffledItems(shuffleArray(itemsWithId))
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

  if (rounds.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">No Rounds</h1>
        </div>
      </div>
    )
  }

  if (!gameStarted) {
    if (showHowToPlay) {
      return (
        <HowToPlayScreen
          gameType="order"
          gameName={activity.title}
          gameEmoji="🔢"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🔢</div>
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
                <p className="text-4xl font-bold text-green-600">{correctAnswers}</p>
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

  const currentRound = shuffledRounds[current]
  const progressPercent = ((current + 1) / shuffledRounds.length) * 100

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
            <p className="text-2xl text-gray-700 font-semibold">{currentRound.instruction}</p>
          </div>

          {selectedOrder.length > 0 && (
            <div className="mb-8 p-4 bg-blue-100 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Your order:</p>
              <div className="flex flex-wrap gap-2">
                {selectedOrder.map((id, index) => (
                  <span
                    key={id}
                    className="bg-blue-500 text-white px-3 py-2 rounded-lg font-bold"
                  >
                    {index + 1}. {shuffledItems.find((i) => i.id === id)?.text}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 mb-8">
            {shuffledItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                disabled={showFeedback}
                className={`
                  w-full p-4 rounded-xl font-bold text-lg transition-all
                  ${
                    selectedOrder.includes(item.id)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }
                  disabled:opacity-50
                `}
              >
                {selectedOrder.includes(item.id)
                  ? `${selectedOrder.indexOf(item.id) + 1}. ${item.text}`
                  : item.text}
              </button>
            ))}
          </div>

          {!showFeedback && (
            <button
              onClick={handleSubmitOrder}
              disabled={selectedOrder.length !== shuffledItems.length}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors disabled:opacity-50"
            >
              Submit Order ✓
            </button>
          )}

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
                onClick={handleNextRound}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
              >
                {current < shuffledRounds.length - 1 ? 'Next Round ➜' : 'Results 🎉'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
