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

interface Box {
  id: number
  hiddenItem: string
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
    boxes: Box[]
  }
}

interface OpenBoxGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

export function OpenBoxGame({ activity, locale }: OpenBoxGameProps) {
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
  const [boxes, setBoxes] = useState<Box[]>([])
  const [openedBoxes, setOpenedBoxes] = useState<Set<number>>(new Set())
  const [currentBox, setCurrentBox] = useState<Box | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

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

  useEffect(() => {
    if (openedBoxes.size === boxes.length && currentBox && selectedAnswer !== null && !gameComplete) {
      finishGame()
    }
  }, [openedBoxes, currentBox, selectedAnswer, boxes.length, gameComplete])

  const boxesData: Box[] = activity.content?.boxes || []

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
    setBoxes(shuffleArray(boxesData))
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
    setElapsedSeconds(0)
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const handleOpenBox = (box: Box) => {
    setCurrentBox(box)
    const newOpened = new Set(openedBoxes)
    newOpened.add(box.id)
    setOpenedBoxes(newOpened)
  }

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null || !currentBox) return

    const isCorrect = index === currentBox.answer
    setSelectedAnswer(index)
    setShowFeedback(true)

    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1)
      setTotalScore((prev) => prev + 200)
    }
  }

  const handleNextBox = () => {
    setCurrentBox(null)
    setSelectedAnswer(null)
    setShowFeedback(false)
  }

  const finishGame = async () => {
    const timeTaken = elapsedSeconds
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
          gameType="open-box"
          gameName={activity.title}
          gameEmoji="🎁"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🎁</div>
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
                <p className="text-4xl font-bold text-green-600">{correctAnswers}/{boxes.length}</p>
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

  if (currentBox) {
    const isCorrect = selectedAnswer === currentBox.answer

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="text-center mb-8">
              <p className="text-6xl mb-4">{currentBox.hiddenItem}</p>
              <p className="text-2xl font-bold text-gray-700 mb-4">{currentBox.question}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {currentBox.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={selectedAnswer !== null}
                  className={`
                    p-6 rounded-xl font-bold text-lg transition-all
                    ${
                      selectedAnswer === index
                        ? isCorrect
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

            {showFeedback && (
              <>
                <div className={`text-center mb-6 p-4 rounded-xl text-2xl font-bold ${
                  isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isCorrect ? '🎉 Correct! +200 points!' : '❌ Not quite!'}
                </div>
                <button
                  onClick={handleNextBox}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors"
                >
                  {openedBoxes.size === boxes.length ? 'View Results 🎉' : 'Open Another Box 🎁'}
                </button>
              </>
            )}
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
          <p className="text-2xl font-bold text-gray-700 mb-8 text-center">🎁 Click a box to open:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {boxes.map((box) => (
              <button
                key={box.id}
                onClick={() => handleOpenBox(box)}
                disabled={openedBoxes.has(box.id)}
                className={`
                  text-6xl p-8 rounded-2xl transition-all transform
                  ${
                    openedBoxes.has(box.id)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 hover:scale-110'
                  }
                `}
              >
                🎁
              </button>
            ))}
          </div>

          <p className="text-center mt-8 font-bold text-lg text-gray-600">
            Opened: {openedBoxes.size}/{boxes.length}
          </p>
        </div>
      </div>
    </div>
  )
}
