'use client'

import { useState, useEffect, useRef } from 'react'
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

interface Mole {
  value: string | number
  correct: boolean
}

interface Round {
  question: string
  moles: Mole[]
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

interface WhackAMoleGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

export function WhackAMoleGame({ activity, locale }: WhackAMoleGameProps) {
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [shuffledRounds, setShuffledRounds] = useState<Round[]>([])
  const [popupMole, setPopupMole] = useState<number | null>(null)
  const [roundComplete, setRoundComplete] = useState(false)
  const [pointsEarned, setPointsEarned] = useState(0)
  const popupTimerRef = useRef<number | null>(null)
  const roundCompleteRef = useRef(roundComplete)

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  useEffect(() => {
    roundCompleteRef.current = roundComplete
  }, [roundComplete])

  useEffect(() => {
    if (!gameStarted || gameComplete) return

    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [gameStarted, gameComplete])

  useEffect(() => {
    return () => {
      if (popupTimerRef.current !== null) {
        window.clearTimeout(popupTimerRef.current)
      }
      setPopupMole(null)
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
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
    setElapsedSeconds(0)
    startMolePopup()
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const startMolePopup = () => {
    if (popupTimerRef.current !== null) {
      window.clearTimeout(popupTimerRef.current)
    }

    const randomMole = Math.floor(Math.random() * 6)
    setPopupMole(randomMole)
    const popupTimer = window.setTimeout(() => {
      setPopupMole(null)
      if (!roundCompleteRef.current) {
        const nextPopupTimer = window.setTimeout(startMolePopup, 1000)
        popupTimerRef.current = nextPopupTimer
      }
    }, 2000)
    popupTimerRef.current = popupTimer
  }

  const calculatePoints = (): number => {
    return 500
  }

  const handleMoleClick = (moleIndex: number, isCorrect: boolean) => {
    if (popupMole !== moleIndex) return

    if (isCorrect) {
      const points = calculatePoints()
      setPointsEarned(points)
      setCorrectAnswers(correctAnswers + 1)
      setTotalScore(totalScore + points)
      setRoundComplete(true)
      setPopupMole(null)
    }
  }

  const handleNextRound = async () => {
    if (currentRound < shuffledRounds.length - 1) {
      setCurrentRound((prev) => prev + 1)
      setRoundComplete(false)
      setPointsEarned(0)
      startMolePopup()
    } else {
      const timeTaken = elapsedSeconds
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
          gameType="whack-a-mole"
          gameName={activity.title}
          gameEmoji="🐭"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🐭</div>
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
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Great Job!</h1>
              <p className="text-2xl font-bold text-blue-600">{playerName}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 rounded-xl p-6 text-center">
                <p className="text-gray-600 font-semibold mb-2">Final Score</p>
                <p className="text-4xl font-bold text-blue-600">{totalScore}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-6 text-center">
                <p className="text-gray-600 font-semibold mb-2">Whacked</p>
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
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl font-bold text-gray-700 w-12">#{index + 1}</div>
                      <div>
                        <p className="font-bold text-lg text-gray-800">{entry.player_name}</p>
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
  const formattedElapsed = `${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}`

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-white">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="font-bold text-xl">{playerName}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-3xl text-yellow-200">{totalScore}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 mb-3">
          <div className="w-full bg-white bg-opacity-30 rounded-full h-6 overflow-hidden">
            <div
              className="bg-yellow-300 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="min-w-[80px] text-right text-white/90 text-sm font-semibold">
            Time: {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
          </div>
        </div>
        </div>

        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{currentRoundData.question}</h2>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <button
                key={index}
                onClick={() => {
                  const moleData = currentRoundData.moles[index]
                  if (moleData) handleMoleClick(index, moleData.correct)
                }}
                disabled={roundComplete}
                className={`
                  aspect-square rounded-full text-3xl font-bold transition-all transform
                  ${
                    popupMole === index
                      ? 'bg-amber-500 hover:bg-amber-600 scale-110'
                      : 'bg-amber-700'
                  }
                `}
              >
                {popupMole === index ? '🐭' : '🕳️'}
              </button>
            ))}
          </div>

          {roundComplete && (
            <>
              <div className="text-center mb-8 p-4 rounded-xl text-2xl font-bold bg-green-100 text-green-800">
                🎉 +{pointsEarned} points!
              </div>
              <button
                onClick={handleNextRound}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
              >
                {currentRound < shuffledRounds.length - 1 ? 'Next Round ➜' : 'See Results 🎉'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
