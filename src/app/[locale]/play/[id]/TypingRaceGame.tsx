'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { HowToPlayScreen } from './HowToPlayScreen'

interface PairItem { prompt: string; answer: string }

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
    questions?: Array<{ prompt?: string; question?: string; answer?: string; options?: string[]; correct?: number }>
    pairs?: Array<{ left: string; right: string }>
    items?: Array<{ prompt: string; answer: string }>
  }
}

interface LeaderboardEntry { player_name: string; score: number; correct_answers: number; time_taken: number }

const SECONDS_PER_ITEM = 30

/** QuizGame speed bands, reused verbatim: 0–10s = 1000, 11–20s = 500, 21–30s = 200. */
function bandPoints(secondsUsed: number): number {
  if (secondsUsed <= 10) return 1000
  if (secondsUsed <= 20) return 500
  return 200
}

function extractPairs(activity: Activity): PairItem[] {
  const c = activity.content
  if (!c) return []
  if (c.pairs && c.pairs.length) return c.pairs.map((p) => ({ prompt: p.left, answer: p.right }))
  if (c.questions && c.questions.length) {
    return c.questions
      .map((q) => ({
        prompt: q.prompt ?? q.question ?? '',
        answer: q.answer ?? (q.options && q.correct !== undefined ? q.options[q.correct] : ''),
      }))
      .filter((p) => p.prompt && p.answer)
  }
  if (c.items && c.items.length) return c.items.filter((i) => i.prompt && i.answer)
  return []
}

/**
 * Batch 1 — Typing Race play game. One prompt at a time, 30 seconds each,
 * QuizGame scoring bands, plus a streak bonus: once the streak reaches 3,
 * every further correct answer in the streak earns +50 bonus points.
 */
export function TypingRaceGame({ activity, locale }: { activity: Activity; locale: string }) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(SECONDS_PER_ITEM)
  const [feedback, setFeedback] = useState('')
  const [pointsEarned, setPointsEarned] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [totalGameTime, setTotalGameTime] = useState(0)
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('playerName')
    if (saved) setPlayerName(saved)
  }, [])

  const pairs = extractPairs(activity)

  function handleStartGame(name: string) {
    if (!name.trim()) { alert('Please enter your name!'); return }
    localStorage.setItem('playerName', name)
    setPlayerName(name)
    setShowHowToPlay(true)
  }

  function handleStartAfterHowToPlay() {
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
    setTimeRemaining(SECONDS_PER_ITEM)
  }

  async function finish(score: number, correct: number) {
    const timeTaken = gameStartTimestamp ? Math.floor((Date.now() - gameStartTimestamp) / 1000) : 0
    setTotalGameTime(timeTaken)
    setGameComplete(true)
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: activity.id, player_name: playerName, score, correct_answers: correct, time_taken: timeTaken }),
      })
      if (res.ok) {
        const lb = await fetch(`/api/leaderboard?activity_id=${activity.id}`)
        if (lb.ok) { const data = await lb.json(); setTopScores(data.data || []) }
      }
    } catch (e) { console.error('Error saving to leaderboard:', e) }
  }

  function advanceAfter(correct: boolean, gained: number) {
    const newStreak = correct ? streak + 1 : 0
    const newScore = totalScore + gained
    const newCorrect = correctAnswers + (correct ? 1 : 0)
    setStreak(newStreak)
    setBestStreak((b) => Math.max(b, newStreak))
    setTotalScore(newScore)
    setCorrectAnswers(newCorrect)
    setInput('')
    setFeedback('')
    if (index + 1 >= pairs.length) {
      finish(newScore, newCorrect)
    } else {
      setIndex((i) => i + 1)
      setTimeRemaining(SECONDS_PER_ITEM)
    }
    inputRef.current?.focus()
  }

  // Timer countdown (QuizGame pattern: timeout = 0 points, streak resets).
  useEffect(() => {
    if (!gameStarted || gameComplete) return
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setFeedback('Time up! 0 points.')
          // Defer state updates out of the setState updater.
          setTimeout(() => advanceAfter(false, 0), 0)
          return SECONDS_PER_ITEM
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, gameComplete, index])

  function submit() {
    if (!input.trim()) return
    const want = pairs[index].answer.trim().toLowerCase()
    const got = input.trim().toLowerCase()
    if (got === want) {
      const secondsUsed = SECONDS_PER_ITEM - timeRemaining
      const newStreak = streak + 1
      const streakBonus = newStreak >= 3 ? 50 : 0
      const gained = bandPoints(secondsUsed) + streakBonus
      setPointsEarned(gained)
      setFeedback(streakBonus > 0 ? `Correct! +${gained} (includes +${streakBonus} streak bonus)` : `Correct! +${gained}`)
      setTimeout(() => advanceAfter(true, gained), 900)
    } else {
      setFeedback('Not quite — try again! (streak reset)')
      setStreak(0)
    }
    inputRef.current?.focus()
  }

  if (pairs.length < 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
        <div className="text-center"><h1 className="text-4xl font-bold text-white mb-4">Not Enough Items</h1>
        <p className="text-xl text-blue-100">This game needs at least 1 prompt/answer pair.</p></div>
      </div>
    )
  }

  if (!gameStarted) {
    if (showHowToPlay) {
      return <HowToPlayScreen gameType="typing-race" gameName={activity.title} gameEmoji="⌨️" onStart={handleStartAfterHowToPlay} onBack={() => { setShowHowToPlay(false); setPlayerName('') }} />
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">⌨️</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">{activity.title}</h1>
          <p className="text-lg text-gray-600 mb-8">{activity.description}</p>
          <label className="block text-2xl font-bold text-gray-700 mb-4">What is your name?</label>
          <input id="playerNameInput" type="text" placeholder="Enter your name..." autoFocus maxLength={20}
            onKeyDown={(e) => { if (e.key === 'Enter') handleStartGame((e.target as HTMLInputElement).value) }}
            className="w-full px-4 py-3 text-xl border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600" />
          <button onClick={() => { const inputEl = document.getElementById('playerNameInput') as HTMLInputElement; handleStartGame(inputEl?.value || '') }}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl transition-colors mt-6 mb-4 min-h-[56px]">Start Game! 🚀</button>
          <p className="text-sm text-gray-500">{activity.subject} • {activity.grade.toUpperCase()}</p>
        </div>
      </div>
    )
  }

  if (gameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-2xl mb-8 text-center">
            <div className="text-7xl mb-6">🏆</div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Race Finished!</h1>
            <p className="text-2xl font-bold text-blue-600">{playerName}</p>
            <p className="text-xl text-gray-600 mt-4">Score: <strong>{totalScore}</strong> · Correct: {correctAnswers}/{pairs.length} · Best streak: {bestStreak} · Time: {Math.floor(totalGameTime / 60)}m {totalGameTime % 60}s</p>
            {topScores.length > 0 && (
              <div className="mt-8 text-left">
                <h2 className="text-2xl font-bold mb-4">🏅 Top Scores</h2>
                {topScores.slice(0, 10).map((s, i) => (
                  <div key={i} className="flex justify-between py-2 border-b"><span>#{i + 1} {s.player_name}</span><span className="font-bold">{s.score}</span></div>
                ))}
              </div>
            )}
            <button onClick={() => router.push(`/${locale}/browse`)} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-xl mt-8 min-h-[56px]">Back to Games</button>
          </div>
        </div>
      </div>
    )
  }

  const item = pairs[index]
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="flex justify-between items-center mb-6 text-lg font-bold text-gray-700">
          <span>Item {index + 1} / {pairs.length}</span>
          <span className={timeRemaining <= 10 ? 'text-red-600' : ''}>⏱ {timeRemaining}s</span>
          <span>🔥 {streak}</span>
          <span>Score: {totalScore}</span>
        </div>
        <p className="text-3xl font-bold text-gray-800 mb-6">{item.prompt}</p>
        <input ref={inputRef} value={input} autoFocus
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
          placeholder="Type the answer…"
          aria-label="Type the answer"
          className="w-full px-4 py-4 text-xl border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[56px]" />
        <button onClick={submit} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-xl text-2xl mt-4 min-h-[56px]">Check Answer →</button>
        {feedback && <p className="mt-4 text-lg text-gray-700">{feedback}{pointsEarned > 0 && feedback.startsWith('Correct') ? '' : ''}</p>}
        <p className="mt-4 text-sm text-gray-500">Fast answers score more: 0–10s = 1000, 11–20s = 500, 21–30s = 200. Streak of 3+ adds +50.</p>
      </div>
    </div>
  )
}
