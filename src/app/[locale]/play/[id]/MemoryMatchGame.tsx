'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HowToPlayScreen } from './HowToPlayScreen'

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

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

interface Tile { id: number; pairId: number; text: string }

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
 * Batch 1 — Memory Match play game. Reuses the prompt/answer content
 * model (no new DB tables). Match = 100 points, following the QuizGame
 * pattern of a named player, a timed run and a leaderboard save.
 */
export function MemoryMatchGame({ activity, locale }: { activity: Activity; locale: string }) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [moves, setMoves] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [totalGameTime, setTotalGameTime] = useState(0)
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('playerName')
    if (saved) setPlayerName(saved)
  }, [])

  useEffect(() => {
    if (!gameStarted || gameComplete) return
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [gameStarted, gameComplete])

  const pairs = extractPairs(activity)

  function handleStartGame(name: string) {
    if (!name.trim()) { alert('Please enter your name!'); return }
    localStorage.setItem('playerName', name)
    setPlayerName(name)
    setShowHowToPlay(true)
  }

  function handleStartAfterHowToPlay() {
    const all: Tile[] = []
    pairs.forEach((p, i) => {
      all.push({ id: i * 2, pairId: i, text: p.prompt })
      all.push({ id: i * 2 + 1, pairId: i, text: p.answer })
    })
    setTiles(shuffleArray(all))
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
  }

  async function saveToLeaderboard(timeTaken: number, score: number, correct: number) {
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

  function flip(tile: Tile) {
    if (gameComplete || flipped.length >= 2 || flipped.includes(tile.id) || matched.has(tile.pairId)) return
    const next = [...flipped, tile.id]
    setFlipped(next)
    if (next.length === 2) {
      setMoves((m) => m + 1)
      const [a, b] = next.map((id) => tiles.find((t) => t.id === id)!)
      if (a && b && a.pairId === b.pairId) {
        const newMatched = new Set(matched).add(a.pairId)
        const newScore = totalScore + 100
        setMatched(newMatched)
        setTotalScore(newScore)
        setFlipped([])
        if (newMatched.size === pairs.length) {
          const timeTaken = gameStartTimestamp ? Math.floor((Date.now() - gameStartTimestamp) / 1000) : elapsed
          setTotalGameTime(timeTaken)
          setGameComplete(true)
          saveToLeaderboard(timeTaken, newScore, newMatched.size)
        }
      } else {
        setTimeout(() => setFlipped([]), 800)
      }
    }
  }

  if (pairs.length < 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
        <div className="text-center"><h1 className="text-4xl font-bold text-white mb-4">Not Enough Items</h1>
        <p className="text-xl text-blue-100">This game needs at least 2 prompt/answer pairs.</p></div>
      </div>
    )
  }

  if (!gameStarted) {
    if (showHowToPlay) {
      return <HowToPlayScreen gameType="memory-match" gameName={activity.title} gameEmoji="🧠" onStart={handleStartAfterHowToPlay} onBack={() => { setShowHowToPlay(false); setPlayerName('') }} />
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🧠</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">{activity.title}</h1>
          <p className="text-lg text-gray-600 mb-8">{activity.description}</p>
          <label className="block text-2xl font-bold text-gray-700 mb-4">What is your name?</label>
          <input id="playerNameInput" type="text" placeholder="Enter your name..." autoFocus maxLength={20}
            onKeyDown={(e) => { if (e.key === 'Enter') handleStartGame((e.target as HTMLInputElement).value) }}
            className="w-full px-4 py-3 text-xl border-2 border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600" />
          <button onClick={() => { const input = document.getElementById('playerNameInput') as HTMLInputElement; handleStartGame(input?.value || '') }}
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
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">All Matched!</h1>
            <p className="text-2xl font-bold text-blue-600">{playerName}</p>
            <p className="text-xl text-gray-600 mt-4">Score: <strong>{totalScore}</strong> · Moves: {moves} · Time: {Math.floor(totalGameTime / 60)}m {totalGameTime % 60}s</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6 text-lg font-bold text-gray-700">
          <span>🧠 {activity.title}</span>
          <span>⏱ {elapsed}s</span>
          <span>Score: {totalScore}</span>
        </div>
        <p className="text-center text-gray-600 mb-4">{matched.size} / {pairs.length} matched · {moves} moves</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tiles.map((tile) => {
            const isUp = flipped.includes(tile.id) || matched.has(tile.pairId)
            return (
              <button key={tile.id} onClick={() => flip(tile)} aria-label={isUp ? tile.text : 'Hidden tile'}
                className={`rounded-xl font-bold text-lg transition-colors min-h-[64px] px-3 py-4 ${isUp ? 'bg-white text-gray-800 border-2 border-blue-400' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                {isUp ? tile.text : '❓'}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
