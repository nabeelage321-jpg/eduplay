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

interface Clue {
  number: number
  clue: string
  answer: string
  direction: 'across' | 'down'
  row: number
  col: number
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
    clues: Clue[]
  }
}

interface CrosswordGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

export function CrosswordGame({ activity, locale }: CrosswordGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [clues, setClues] = useState<Clue[]>([])
  const [grid, setGrid] = useState<(string | null)[][]>([])
  const [userAnswers, setUserAnswers] = useState<(string | null)[][]>([])
  const [cellClueMap, setCellClueMap] = useState<Map<string, number[]>>(new Map())

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const cluesData: Clue[] = activity.content?.clues || []

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
    setClues(cluesData)
    initializeGrid()
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const initializeGrid = () => {
    const newGrid: (string | null)[][] = Array(10).fill(null).map(() => Array(10).fill(null))
    const newUserAnswers: (string | null)[][] = Array(10).fill(null).map(() => Array(10).fill(null))
    const newCellClueMap = new Map<string, number[]>()

    cluesData.forEach((clue) => {
      if (clue.direction === 'across') {
        for (let i = 0; i < clue.answer.length; i++) {
          newGrid[clue.row][clue.col + i] = clue.answer[i]
          newUserAnswers[clue.row][clue.col + i] = ''
          const key = `${clue.row}-${clue.col + i}`
          if (!newCellClueMap.has(key)) newCellClueMap.set(key, [])
          newCellClueMap.get(key)?.push(clue.number)
        }
      } else {
        for (let i = 0; i < clue.answer.length; i++) {
          newGrid[clue.row + i][clue.col] = clue.answer[i]
          newUserAnswers[clue.row + i][clue.col] = ''
          const key = `${clue.row + i}-${clue.col}`
          if (!newCellClueMap.has(key)) newCellClueMap.set(key, [])
          newCellClueMap.get(key)?.push(clue.number)
        }
      }
    })

    setGrid(newGrid)
    setUserAnswers(newUserAnswers)
    setCellClueMap(newCellClueMap)
  }

  const handleCellChange = (row: number, col: number, value: string) => {
    const upper = value.toUpperCase().slice(0, 1)
    const newUserAnswers = userAnswers.map(r => [...r])
    newUserAnswers[row][col] = upper
    setUserAnswers(newUserAnswers)

    if (upper && grid[row][col]) {
      const isCorrect = upper === grid[row][col]
      if (isCorrect) {
        const newScore = totalScore + 100
        setTotalScore(newScore)
        setCorrectAnswers(correctAnswers + 1)
      }
    }
  }

  const handleSubmit = async () => {
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
          gameType="crossword"
          gameName={activity.title}
          gameEmoji="🔤"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🔤</div>
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
                <p className="text-gray-600 font-semibold mb-2">Correct Letters</p>
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

  const acrossClues = clues.filter(c => c.direction === 'across')
  const downClues = clues.filter(c => c.direction === 'down')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-6 text-white">
          <div className="flex justify-between items-center mb-3">
            <p className="font-bold text-xl">{playerName}</p>
            <p className="font-bold text-3xl text-yellow-200">{totalScore}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-2xl">
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(10, minmax(40px, 1fr))' }}>
              {userAnswers.map((row, r) =>
                row.map((cell, c) => (
                  grid[r]?.[c] !== undefined && (
                    <div
                      key={`${r}-${c}`}
                      className={`w-10 h-10 border-2 flex items-center justify-center font-bold text-lg relative
                        ${userAnswers[r][c] === grid[r][c] && grid[r][c] ? 'bg-green-300' : userAnswers[r][c] ? 'bg-red-300' : 'bg-white'}
                        border-gray-800`}
                    >
                      {acrossClues.find(cl => cl.row === r && cl.col === c) && (
                        <span className="absolute top-0 left-0 text-xs font-bold">{acrossClues.find(cl => cl.row === r && cl.col === c)?.number}</span>
                      )}
                      <input
                        type="text"
                        maxLength={1}
                        value={userAnswers[r][c] || ''}
                        onChange={(e) => handleCellChange(r, c, e.target.value)}
                        className="w-full h-full text-center font-bold bg-transparent border-none focus:outline-none uppercase"
                      />
                    </div>
                  )
                ))
              )}
            </div>

            <button
              onClick={handleSubmit}
              className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
            >
              Check Answers ✅
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-96">
            <div className="mb-6">
              <h3 className="font-bold text-xl text-blue-600 mb-3">📍 ACROSS</h3>
              <div className="space-y-3">
                {acrossClues.map((clue) => (
                  <div key={`across-${clue.number}`} className="text-sm">
                    <span className="font-bold text-blue-600">{clue.number}.</span> {clue.clue}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-xl text-purple-600 mb-3">⬇️ DOWN</h3>
              <div className="space-y-3">
                {downClues.map((clue) => (
                  <div key={`down-${clue.number}`} className="text-sm">
                    <span className="font-bold text-purple-600">{clue.number}.</span> {clue.clue}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
