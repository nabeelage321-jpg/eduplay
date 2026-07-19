'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HowToPlayScreen } from './HowToPlayScreen'

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
    words: string[]
    grid: string[][]
  }
}

interface WordSearchGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

export function WordSearchGame({ activity, locale }: WordSearchGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [words, setWords] = useState<string[]>([])
  const [grid, setGrid] = useState<string[][]>([])
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set())
  const [selectedCells, setSelectedCells] = useState<[number, number] | null>(null)
  const [highlightedPath, setHighlightedPath] = useState<[number, number][]>([])

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  useEffect(() => {
    if (!gameStarted || gameComplete) return

    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [gameStarted, gameComplete])

  const wordsData: string[] = activity.content?.words || []
  const gridData: string[][] = activity.content?.grid || []

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
    setWords(wordsData)
    setGrid(gridData)
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const getPath = (start: [number, number], end: [number, number]): [number, number][] => {
    const [r1, c1] = start
    const [r2, c2] = end
    const path: [number, number][] = []
    
    const dr = r2 === r1 ? 0 : r2 > r1 ? 1 : -1
    const dc = c2 === c1 ? 0 : c2 > c1 ? 1 : -1

    for (let r = r1, c = c1; true; r += dr, c += dc) {
      path.push([r, c])
      if (r === r2 && c === c2) break
    }

    return path
  }

  const getWord = (path: [number, number][]): string => {
    return path.map(([r, c]) => grid[r]?.[c] || '').join('')
  }

  const handleCellClick = (row: number, col: number) => {
    if (!selectedCells) {
      setSelectedCells([row, col])
      setHighlightedPath([[row, col]])
    } else {
      const path = getPath(selectedCells, [row, col])
      const word = getWord(path)

      if (words.includes(word) && !foundWords.has(word)) {
        const nextFound = new Set(foundWords)
        nextFound.add(word)
        setFoundWords(nextFound)
        setTotalScore((prev) => prev + 200)

        if (nextFound.size === words.length) {
          setTimeout(() => finishGame(), 500)
        }
      }

      setSelectedCells(null)
      setHighlightedPath([])
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
          correct_answers: foundWords.size,
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
          gameType="word-search"
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
                <p className="text-gray-600 font-semibold mb-2">Words Found</p>
                <p className="text-4xl font-bold text-green-600">{foundWords.size}</p>
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

  const formattedTime = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-6 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
            <p className="font-bold text-xl">{playerName}</p>
            <div className="text-right">
              <p className="font-bold text-3xl text-yellow-200">{totalScore}</p>
              <p className="text-sm text-white/80">Time: {formattedTime}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="mb-8 flex justify-center">
            <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 10}, minmax(45px, 1fr))` }}>
              {grid.map((row, r) =>
                row.map((letter, c) => {
                  const isHighlighted = highlightedPath.some(([hr, hc]) => hr === r && hc === c)
                  return (
                    <button
                      key={`${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={`
                        w-12 h-12 font-bold text-xl rounded-lg border-2 transition-all
                        ${isHighlighted ? 'bg-blue-400 text-white border-blue-600' : 'bg-gray-100 text-gray-800 border-gray-300'}
                        hover:bg-blue-200
                      `}
                    >
                      {letter.toUpperCase()}
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-6">
            <h3 className="font-bold text-2xl mb-4">📝 Words to Find</h3>
            <div className="grid grid-cols-2 gap-3">
              {words.map((word) => (
                <div
                  key={word}
                  className={`p-3 rounded-lg font-bold text-lg text-center transition-all
                    ${foundWords.has(word) ? 'bg-green-400 text-white line-through' : 'bg-white text-gray-800'}
                  `}
                >
                  {word}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
