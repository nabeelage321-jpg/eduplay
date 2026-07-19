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
  category: string
}

interface Category {
  name: string
  items: string[]
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
    categories: Category[]
    items: Item[]
  }
}

interface CategorizeGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

export function CategorizeGame({ activity, locale }: CategorizeGameProps) {
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
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [categorizedItems, setCategorizedItems] = useState<Map<string, string>>(new Map())
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null)

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const categoriesData: Category[] = activity.content?.categories || []
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

  useEffect(() => {
    if (!gameStarted || gameComplete) return

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [gameStarted, gameComplete])

  const handleStartAfterHowToPlay = () => {
    setCategories(categoriesData)
    setItems(shuffleArray(itemsData))
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
    setElapsedSeconds(0)
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const handleItemTap = (itemText: string) => {
    const item = items.find(i => i.text === itemText)
    if (!item) return

    const currentCategory = categorizedItems.get(itemText)
    if (currentCategory) {
      const newCategorized = new Map(categorizedItems)
      newCategorized.delete(itemText)
      setCategorizedItems(newCategorized)
      if (currentCategory === item.category) {
        setCorrectAnswers((prev) => Math.max(0, prev - 1))
        setTotalScore((prev) => Math.max(0, prev - 150))
      }
      setSelectedCategoryName(null)
      return
    }

    const selectedCategory = selectedCategoryName
    if (selectedCategory) {
      const newCategorized = new Map(categorizedItems)
      newCategorized.set(itemText, selectedCategory)
      setCategorizedItems(newCategorized)

      if (selectedCategory === item.category) {
        setCorrectAnswers((prev) => prev + 1)
        setTotalScore((prev) => prev + 150)
      }
    }
  }

  const handleCategoryClick = (itemText: string, categoryName: string) => {
    const item = items.find(i => i.text === itemText)
    if (!item) return

    const currentCategory = categorizedItems.get(itemText)
    if (currentCategory === categoryName) return

    const newCategorized = new Map(categorizedItems)

    if (currentCategory && currentCategory === item.category) {
      setCorrectAnswers((prev) => Math.max(0, prev - 1))
      setTotalScore((prev) => Math.max(0, prev - 150))
    }

    newCategorized.set(itemText, categoryName)
    setCategorizedItems(newCategorized)
    setSelectedCategoryName(categoryName)

    if (categoryName === item.category) {
      setCorrectAnswers((prev) => prev + 1)
      setTotalScore((prev) => prev + 150)
    }

    if (newCategorized.size === items.length) {
      setTimeout(() => finishGame(), 500)
    }
  }

  const finishGame = async () => {
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
          gameType="categorize"
          gameName={activity.title}
          gameEmoji="🗂️"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🗂️</div>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-6 text-white">
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-xl">{playerName}</p>
            <p className="font-bold text-3xl text-yellow-200">{totalScore}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => {
              const isPlaced = categorizedItems.has(item.text)
              const isCorrect = categorizedItems.get(item.text) === item.category
              return (
                <button
                  key={item.text}
                  onClick={() => handleItemTap(item.text)}
                  className={`
                    p-6 rounded-xl font-bold text-xl transition-all
                    ${isPlaced && isCorrect ? 'bg-green-400 text-white' : isPlaced ? 'bg-red-400 text-white' : 'bg-blue-400 text-white hover:bg-blue-500'}
                  `}
                >
                  {item.text}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div
                key={category.name}
                data-category={category.name}
                className="bg-purple-100 border-4 border-purple-400 rounded-xl p-6 min-h-32"
              >
                <h3 className="font-bold text-2xl text-purple-700 mb-4">{category.name}</h3>
                <div className="space-y-2">
                  {items
                    .filter((item) => categorizedItems.get(item.text) === category.name)
                    .map((item) => (
                      <button
                        key={item.text}
                        onClick={() => handleCategoryClick(item.text, category.name)}
                        className="w-full bg-purple-400 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-500 transition-all"
                      >
                        {item.text}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
