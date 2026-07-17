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

interface Label {
  id: number
  text: string
  x: number
  y: number
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
    image: string
    labels: Label[]
  }
}

interface LabelledDiagramGameProps {
  activity: Activity
  locale: string
}

interface LeaderboardEntry {
  player_name: string
  score: number
  correct_answers: number
  time_taken: number
}

export function LabelledDiagramGame({ activity, locale }: LabelledDiagramGameProps) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [labels, setLabels] = useState<Label[]>([])
  const [image, setImage] = useState('')
  const [currentLabelIndex, setCurrentLabelIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [correctLabels, setCorrectLabels] = useState<Set<number>>(new Set())

  useEffect(() => {
    const savedName = localStorage.getItem('playerName')
    if (savedName) {
      setPlayerName(savedName)
    }
  }, [])

  const labelsData: Label[] = activity.content?.labels || []
  const imageData: string = activity.content?.image || ''

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
    setLabels(shuffleArray(labelsData))
    setImage(imageData)
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
  }

  const handleBackFromHowToPlay = () => {
    setShowHowToPlay(false)
    setPlayerName('')
  }

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null || showFeedback) return

    const currentLabel = labels[currentLabelIndex]
    const isCorrect = index === currentLabel.answer

    setSelectedAnswer(index)
    setShowFeedback(true)

    if (isCorrect) {
      setCorrectAnswers(correctAnswers + 1)
      setTotalScore(totalScore + 150)
      setCorrectLabels(new Set([...correctLabels, currentLabelIndex]))
    }
  }

  const handleNextLabel = async () => {
    if (currentLabelIndex < labels.length - 1) {
      setCurrentLabelIndex(currentLabelIndex + 1)
      setSelectedAnswer(null)
      setShowFeedback(false)
    } else {
      const timeTaken = gameStartTimestamp ? Math.floor((Date.now() - gameStartTimestamp) / 1000) : 0
      await saveToLeaderboard(timeTaken)
      setGameComplete(true)
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

  if (!gameStarted) {
    if (showHowToPlay) {
      return (
        <HowToPlayScreen
          gameType="labelled-diagram"
          gameName={activity.title}
          gameEmoji="📋"
          onStart={handleStartAfterHowToPlay}
          onBack={handleBackFromHowToPlay}
        />
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">📋</div>
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
                <p className="text-gray-600 font-semibold mb-2">Correct</p>
                <p className="text-4xl font-bold text-green-600">{correctAnswers}/{labels.length}</p>
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

  const currentLabel = labels[currentLabelIndex]
  const isCorrect = selectedAnswer === currentLabel.answer
  const progressPercent = ((currentLabelIndex + 1) / labels.length) * 100

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
      <div className="w-full max-w-4xl">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-2xl relative min-h-96 flex items-center justify-center">
            {image ? (
              <img src={image} alt="Diagram" className="max-w-full max-h-96 rounded-lg" />
            ) : (
              <div className="text-6xl font-bold text-gray-300">📊</div>
            )}

            {labels.map((label, index) => (
              <div
                key={index}
                className={`
                  absolute w-10 h-10 rounded-full border-4 cursor-pointer transition-all
                  ${
                    correctLabels.has(index)
                      ? 'bg-green-400 border-green-600'
                      : index === currentLabelIndex
                      ? 'bg-yellow-300 border-yellow-600 ring-4 ring-yellow-400'
                      : 'bg-blue-400 border-blue-600'
                  }
                `}
                style={{
                  left: `${label.x}%`,
                  top: `${label.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={label.text}
              >
                <span className="flex items-center justify-center w-full h-full font-bold text-white text-sm">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-2xl">
            <p className="font-bold text-lg text-gray-700 mb-4">
              Label {currentLabelIndex + 1}: What is this?
            </p>

            <div className="space-y-3 mb-6">
              {currentLabel.text && (
                <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                  <p className="font-bold text-center text-lg">{currentLabel.text}</p>
                </div>
              )}
            </div>

            {currentLabel && (
              <>
                {showFeedback && (
                  <div className={`text-center mb-4 p-3 rounded-lg text-sm font-bold ${
                    isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {isCorrect ? '✅ Correct! +150 pts' : '❌ Not quite!'}
                  </div>
                )}

                {!showFeedback && (
                  <p className="text-gray-600 text-sm mb-4">Select the correct label below</p>
                )}

                <button
                  onClick={handleNextLabel}
                  disabled={!showFeedback}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors disabled:opacity-50"
                >
                  {currentLabelIndex < labels.length - 1 ? 'Next ➜' : 'Results 🎉'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
