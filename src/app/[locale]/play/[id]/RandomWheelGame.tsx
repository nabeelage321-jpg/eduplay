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
  challenge: string
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

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

interface RandomWheelGameProps {
  activity: Activity
  locale: string
}

export function RandomWheelGame({ activity, locale }: RandomWheelGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [rotation, setRotation] = useState(0)
  const [completedChallenges, setCompletedChallenges] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [selectedItems, setSelectedItems] = useState<Item[]>([])

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
    setTotalScore(0)
    setCompletedChallenges(0)
    setSelectedItems([])
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const handleSpin = () => {
    if (isSpinning || items.length === 0) return

    setIsSpinning(true)
    setSelectedItem(null)

    const randomRotation = Math.random() * 360 + 1080
    setRotation((prev) => prev + randomRotation)

    setTimeout(() => {
      const selectedIndex = Math.floor((randomRotation % 360) / (360 / items.length))
      const item = items[selectedIndex]
      setSelectedItem(item)
      setSelectedItems((prev) => {
        const alreadyDone = prev.some((existing) => existing.label === item.label)
        if (alreadyDone) return prev
        const next = [...prev, item]
        setCompletedChallenges(next.length)
        setTotalScore(next.length * 100)
        return next
      })
      setIsSpinning(false)
    }, 3000)
  }

  useEffect(() => {
    if (!gameStarted || gameComplete) return

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [gameStarted, gameComplete])

  const handleFinish = async () => {
    if (!gameStarted) return
    const timeTaken = gameStartTimestamp ? Math.floor((Date.now() - gameStartTimestamp) / 1000) : 0
    await saveToLeaderboard(timeTaken)
    setGameComplete(true)
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
          correct_answers: completedChallenges,
          time_taken: timeTaken,
        }),
      })

      const leaderboardResponse = await fetch(`/api/leaderboard?activity_id=${activity.id}`)
      if (leaderboardResponse.ok) {
        const data = await leaderboardResponse.json()
        setTopScores(data.data || [])
      }
    } catch (error) {
      console.error('Error saving to leaderboard:', error)
    }
  }

  if (!gameStarted) {
    if (showHowToPlay) {
      return (
        <HowToPlayScreen
          gameType="random-wheel"
          gameName={activity.title}
          gameEmoji="🎡"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🎡</div>
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

  const COLORS = [
    'from-red-400 to-red-600',
    'from-blue-400 to-blue-600',
    'from-yellow-400 to-yellow-600',
    'from-green-400 to-green-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
  ]

  if (gameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Well done!</h1>
          <p className="text-2xl text-blue-600 mb-6">{playerName}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-50 rounded-3xl p-6">
              <p className="text-sm text-gray-600">Final Score</p>
              <p className="text-4xl font-bold text-blue-600">{totalScore}</p>
            </div>
            <div className="bg-green-50 rounded-3xl p-6">
              <p className="text-sm text-gray-600">Challenges Completed</p>
              <p className="text-4xl font-bold text-green-600">{completedChallenges}</p>
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
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-2">{activity.title}</h1>
        <p className="text-3xl font-bold text-yellow-300">{playerName}</p>
        <p className="text-lg text-blue-100">Time: {elapsedSeconds}s</p>
        <p className="text-lg text-blue-100">Completed: {completedChallenges}/{items.length}</p>
      </div>

      <div className="relative w-80 h-80 mb-12">
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
                className={`absolute w-32 h-32 bg-gradient-to-br ${COLORS[index % COLORS.length]} rounded-full flex items-center justify-center font-bold text-lg text-white text-center p-2 shadow-lg`}
                style={{
                  transform: `rotate(${angle}deg) translateY(-160px) rotate(-${angle}deg)`,
                }}
              >
                {item.label}
              </div>
            )
          })}
        </div>

        <div className="absolute inset-0 rounded-full border-8 border-white shadow-2xl"></div>

        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 w-0 h-0 border-l-8 border-r-8 border-t-12 border-l-transparent border-r-transparent border-t-yellow-300 z-10"></div>
      </div>

      <button
        onClick={handleSpin}
        disabled={isSpinning}
        className="mb-8 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-6 px-12 rounded-2xl text-3xl transition-all disabled:opacity-50"
      >
        {isSpinning ? '🌀 Spinning...' : '🎯 SPIN!'}
      </button>

      {selectedItem && (
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
          <p className="text-4xl mb-4">🎉</p>
          <p className="text-2xl font-bold text-gray-800 mb-4">Challenge:</p>
          <p className="text-xl font-bold text-purple-600 mb-6">{selectedItem.challenge}</p>
          <div className="grid gap-4">
            <button
              onClick={handleSpin}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
            >
              Spin Again! 🎡
            </button>
            <button
              onClick={handleFinish}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
            >
              Finish Game ✅
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => router.push(`/${locale}/browse`)}
        className="mt-8 bg-white hover:bg-gray-100 text-gray-800 font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
      >
        Back to Games 🎮
      </button>
    </div>
  )
}
