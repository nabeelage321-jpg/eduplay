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

interface Pair {
  left: string
  right: string
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
    pairs: Pair[]
  }
}

interface MatchUpGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

export function MatchUpGame({ activity, locale }: MatchUpGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [totalGameTime, setTotalGameTime] = useState(0)
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [pairs, setPairs] = useState<Array<Pair & { id: number; shuffledId: number }>>([])
  const [shuffledRight, setShuffledRight] = useState<Array<{ id: number; value: string }>>([])
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [selectedRight, setSelectedRight] = useState<number | null>(null)
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set())

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const pairsData: Pair[] = activity.content?.pairs || []

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
    const pairsWithId = pairsData.map((p, i) => ({ ...p, id: i, shuffledId: i }))
    setPairs(pairsWithId)

    const rightShuffled = shuffleArray(
      pairsData.map((p, i) => ({ id: i, value: p.right }))
    )
    setShuffledRight(rightShuffled)

    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const handleSelectItem = (side: 'left' | 'right', id: number) => {
    if (side === 'left') {
      setSelectedLeft(id)
    } else {
      setSelectedRight(id)
    }
  }

  useEffect(() => {
    if (selectedLeft !== null && selectedRight !== null) {
      const rightPairId = shuffledRight[selectedRight].id
      if (selectedLeft === rightPairId) {
        // Correct match
        setMatchedPairs(new Set([...matchedPairs, selectedLeft]))
        setCorrectAnswers(correctAnswers + 1)
        setTotalScore(totalScore + 200)
        setSelectedLeft(null)
        setSelectedRight(null)

        // Check if all pairs matched
        if (matchedPairs.size + 1 === pairsData.length) {
          setTimeout(() => completeGame(), 500)
        }
      } else {
        // Wrong match - shake animation
        setTimeout(() => {
          setSelectedLeft(null)
          setSelectedRight(null)
        }, 500)
      }
    }
  }, [selectedLeft, selectedRight])

  const completeGame = async () => {
    if (gameStartTimestamp) {
      const timeTaken = Math.floor((Date.now() - gameStartTimestamp) / 1000)
      setTotalGameTime(timeTaken)
      await saveToLeaderboard(timeTaken)
      setGameComplete(true)
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

  if (pairsData.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">No Pairs</h1>
          <p className="text-xl text-blue-100">This game doesn't have any pairs yet.</p>
        </div>
      </div>
    )
  }

  if (!gameStarted) {
    if (showHowToPlay) {
      return (
        <HowToPlayScreen
          gameType="match-up"
          gameName={activity.title}
          gameEmoji="🔗"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🔗</div>
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

  if (gameComplete) {
    const formattedTime = `${Math.floor(totalGameTime / 60)}m ${totalGameTime % 60}s`

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl mb-8">
            <div className="text-center mb-8">
              <div className="text-7xl mb-6">🏆</div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">All Matched!</h1>
              <p className="text-2xl font-bold text-blue-600">{playerName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 rounded-xl p-6 text-center">
                <p className="text-gray-600 font-semibold mb-2">Final Score</p>
                <p className="text-4xl font-bold text-blue-600">{totalScore}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-6 text-center">
                <p className="text-gray-600 font-semibold mb-2">Pairs</p>
                <p className="text-4xl font-bold text-green-600">{correctAnswers}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-6 text-center col-span-2">
                <p className="text-gray-600 font-semibold mb-2">Time</p>
                <p className="text-2xl font-bold text-purple-600">{formattedTime}</p>
              </div>
            </div>

            <button
              onClick={handlePlayAgain}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
            >
              Back to Games 🎮
            </button>
          </div>

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
                          {entry.correct_answers} pairs • {Math.floor(entry.time_taken / 60)}m{' '}
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

  const progressPercent = (matchedPairs.size / pairsData.length) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-4xl">
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
            Matched {matchedPairs.size} of {pairsData.length} pairs
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="grid grid-cols-2 gap-8">
            {/* Left column */}
            <div className="space-y-4">
              {pairs.map((pair) => (
                <button
                  key={pair.id}
                  onClick={() => !matchedPairs.has(pair.id) && handleSelectItem('left', pair.id)}
                  disabled={matchedPairs.has(pair.id)}
                  className={`
                    w-full p-6 rounded-2xl font-bold text-xl transition-all transform
                    ${
                      matchedPairs.has(pair.id)
                        ? 'bg-green-400 text-white'
                        : selectedLeft === pair.id
                        ? 'bg-blue-600 text-white scale-105'
                        : 'bg-blue-400 hover:bg-blue-500 text-white hover:scale-105'
                    }
                    disabled:opacity-50
                  `}
                >
                  {pair.left}
                </button>
              ))}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {shuffledRight.map((item, index) => (
                <button
                  key={index}
                  onClick={() =>
                    !matchedPairs.has(item.id) && handleSelectItem('right', index)
                  }
                  disabled={matchedPairs.has(item.id)}
                  className={`
                    w-full p-6 rounded-2xl font-bold text-xl transition-all transform
                    ${
                      matchedPairs.has(item.id)
                        ? 'bg-green-400 text-white'
                        : selectedRight === index
                        ? 'bg-pink-600 text-white scale-105'
                        : 'bg-pink-400 hover:bg-pink-500 text-white hover:scale-105'
                    }
                    disabled:opacity-50
                  `}
                >
                  {item.value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
