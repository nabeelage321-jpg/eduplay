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

interface Balloon {
  value: string | number
  correct: boolean
}

interface Round {
  question: string
  balloons: Balloon[]
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

interface BalloonPopGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

const TOTAL_TIME_PER_ROUND = 30

export function BalloonPopGame({ activity, locale }: BalloonPopGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [totalGameTime, setTotalGameTime] = useState(0)
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [shuffledRounds, setShuffledRounds] = useState<Round[]>([])
  const [shuffledBalloons, setShuffledBalloons] = useState<(Balloon & { id: number })[]>([])
  const [popped, setPopped] = useState<Set<number>>(new Set())
  const [roundStartTime, setRoundStartTime] = useState<number | null>(null)
  const [roundComplete, setRoundComplete] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const [showPoints, setShowPoints] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME_PER_ROUND)

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
    const balloonsWithId = shuffled[0].balloons.map((b, i) => ({ ...b, id: i }))
    setShuffledBalloons(shuffleArray(balloonsWithId))
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
    setRoundStartTime(Date.now())
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  useEffect(() => {
    if (!gameStarted || gameComplete || roundComplete) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          endRound()
          return TOTAL_TIME_PER_ROUND
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameComplete, roundComplete])

  const calculatePoints = (timeUsed: number): number => {
    if (timeUsed <= 10) return 1000
    if (timeUsed <= 20) return 500
    return 200
  }

  const handleBalloonClick = (balloonId: number, isCorrect: boolean) => {
    if (popped.has(balloonId)) return

    const newPopped = new Set([...popped, balloonId])
    setPopped(newPopped)

    if (isCorrect) {
      const timeUsed = Math.floor((Date.now() - (roundStartTime || 0)) / 1000)
      const points = calculatePoints(timeUsed)
      setPointsEarned(points)
      setShowPoints(true)
      setRoundComplete(true)
      setCorrectAnswers(correctAnswers + 1)
      setTotalScore(totalScore + points)
    }
  }

  const endRound = () => {
    setRoundComplete(true)
    setPointsEarned(0)
    setShowPoints(true)
  }

  const handleNextRound = async () => {
    if (currentRound < shuffledRounds.length - 1) {
      const nextIndex = currentRound + 1
      setCurrentRound(nextIndex)
      setPopped(new Set())
      setRoundComplete(false)
      setShowPoints(false)
      setTimeRemaining(TOTAL_TIME_PER_ROUND)
      setRoundStartTime(Date.now())
      const balloonsWithId = shuffledRounds[nextIndex].balloons.map((b, i) => ({
        ...b,
        id: i,
      }))
      setShuffledBalloons(shuffleArray(balloonsWithId))
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

  if (rounds.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">No Rounds</h1>
          <p className="text-xl text-blue-100">This game doesn't have any rounds yet.</p>
        </div>
      </div>
    )
  }

  if (!gameStarted) {
    if (showHowToPlay) {
      return (
        <HowToPlayScreen
          gameType="balloon-pop"
          gameName={activity.title}
          gameEmoji="🎈"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🎈</div>
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
    const percentage = Math.round((correctAnswers / shuffledRounds.length) * 100)
    let emoji = '🌟'
    if (percentage === 100) emoji = '🏆'
    else if (percentage >= 80) emoji = '⭐'
    else if (percentage >= 60) emoji = '👏'
    else emoji = '💪'

    const formattedTime = `${Math.floor(totalGameTime / 60)}m ${totalGameTime % 60}s`

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
        <div className="w-full max-w-2xl">
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
                <p className="text-gray-600 font-semibold mb-2">Popped</p>
                <p className="text-4xl font-bold text-green-600">
                  {correctAnswers}/{shuffledRounds.length}
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
                          {entry.correct_answers} popped • {Math.floor(entry.time_taken / 60)}m{' '}
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

  const currentRoundData = shuffledRounds[currentRound]
  const progressPercent = ((currentRound + 1) / shuffledRounds.length) * 100
  const circlePercent = (timeRemaining / TOTAL_TIME_PER_ROUND) * 100

  const BALLOON_COLORS = [
    'bg-red-400',
    'bg-blue-400',
    'bg-green-400',
    'bg-yellow-400',
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-2xl">
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
            Round {currentRound + 1} of {shuffledRounds.length}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl">
          {/* Timer Circle */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
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

          {/* Question */}
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 leading-tight">
              {currentRoundData.question}
            </h2>
          </div>

          {/* Balloons */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {shuffledBalloons.map((balloon, index) => (
              <button
                key={balloon.id}
                onClick={() => handleBalloonClick(balloon.id, balloon.correct)}
                disabled={popped.has(balloon.id) || roundComplete}
                className={`
                  h-32 rounded-full font-bold text-2xl transition-all transform
                  ${BALLOON_COLORS[index]}
                  ${popped.has(balloon.id) ? 'opacity-30 line-through' : 'hover:scale-110'}
                  text-white flex items-center justify-center
                `}
              >
                {!popped.has(balloon.id) ? balloon.value : '💨'}
              </button>
            ))}
          </div>

          {showPoints && (
            <div className={`text-center mb-8 p-4 rounded-xl text-2xl font-bold ${
              pointsEarned > 0
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {pointsEarned > 0 ? (
                <>🎉 +{pointsEarned} points!</>
              ) : (
                <>⏱️ Time's up! 0 points</>
              )}
            </div>
          )}

          {roundComplete && (
            <button
              onClick={handleNextRound}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
            >
              {currentRound < shuffledRounds.length - 1 ? 'Next Round ➜' : 'See Results 🎉'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
