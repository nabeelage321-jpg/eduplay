'use client'

import { useState, useEffect, useMemo } from 'react'
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
 * Batch 1 — Bingo play game. Card built from the activity's own answers:
 * 5×5 with 24+ items, otherwise 3×3 (8 answers + FREE centre) with 8+
 * items. Prompts are called in random order; tap the matching answer.
 * Correct mark = 100 points, Bingo (full row/column/diagonal) = +500.
 */
export function BingoGame({ activity, locale }: { activity: Activity; locale: string }) {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [gameStarted, setGameStarted] = useState(false)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [card, setCard] = useState<string[]>([])
  const [promptOrder, setPromptOrder] = useState<number[]>([])
  const [callIndex, setCallIndex] = useState(0)
  const [marked, setMarked] = useState<Set<number>>(new Set())
  const [totalScore, setTotalScore] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)
  const [gameComplete, setGameComplete] = useState(false)
  const [winMessage, setWinMessage] = useState('')
  const [flash, setFlash] = useState<string | null>(null)
  const [totalGameTime, setTotalGameTime] = useState(0)
  const [gameStartTimestamp, setGameStartTimestamp] = useState<number | null>(null)
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('playerName')
    if (saved) setPlayerName(saved)
  }, [])

  const pairs = extractPairs(activity)
  const size = pairs.length >= 24 ? 5 : 3
  const needed = size * size - 1

  const lines = useMemo(() => {
    const out: number[][] = []
    for (let r = 0; r < size; r++) out.push(Array.from({ length: size }, (_, c) => r * size + c))
    for (let c = 0; c < size; c++) out.push(Array.from({ length: size }, (_, r) => r * size + c))
    out.push(Array.from({ length: size }, (_, i) => i * size + i))
    out.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)))
    return out
  }, [size])

  function handleStartGame(name: string) {
    if (!name.trim()) { alert('Please enter your name!'); return }
    localStorage.setItem('playerName', name)
    setPlayerName(name)
    setShowHowToPlay(true)
  }

  function handleStartAfterHowToPlay() {
    const answers = shuffleArray(pairs.map((p) => p.answer)).slice(0, needed)
    const cells: string[] = []
    let ai = 0
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (size % 2 === 1 && r === Math.floor(size / 2) && c === Math.floor(size / 2)) cells.push('FREE')
        else cells.push(answers[ai++] ?? '')
      }
    }
    setCard(cells)
    setPromptOrder(shuffleArray(pairs.map((_, i) => i)))
    setCallIndex(0)
    const centre = Math.floor(size / 2) * size + Math.floor(size / 2)
    setMarked(size % 2 === 1 ? new Set([centre]) : new Set())
    setShowHowToPlay(false)
    setGameStarted(true)
    setGameStartTimestamp(Date.now())
  }

  async function finish(score: number, correct: number, message: string) {
    const timeTaken = gameStartTimestamp ? Math.floor((Date.now() - gameStartTimestamp) / 1000) : 0
    setTotalGameTime(timeTaken)
    setWinMessage(message)
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

  function tap(cellIndex: number) {
    if (gameComplete || marked.has(cellIndex)) return
    const itemIndex = promptOrder[callIndex]
    if (itemIndex === undefined) return
    const want = pairs[itemIndex].answer
    if (card[cellIndex] === want) {
      const newMarked = new Set(marked).add(cellIndex)
      const newScore = totalScore + 100
      const newCorrect = correctAnswers + 1
      setMarked(newMarked)
      setTotalScore(newScore)
      setCorrectAnswers(newCorrect)
      const isBingo = lines.some((line) => line.every((cell) => newMarked.has(cell)))
      if (isBingo) {
        setTotalScore(newScore + 500)
        finish(newScore + 500, newCorrect, 'BINGO!')
      } else if (callIndex + 1 < promptOrder.length) {
        setCallIndex((i) => i + 1)
      } else {
        finish(newScore, newCorrect, 'All prompts called!')
      }
    } else {
      setFlash(card[cellIndex])
      setTimeout(() => setFlash(null), 600)
    }
  }

  function skip() {
    if (callIndex + 1 < promptOrder.length) setCallIndex((i) => i + 1)
    else finish(totalScore, correctAnswers, 'All prompts called!')
  }

  if (pairs.length < 8) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600">
        <div className="text-center"><h1 className="text-4xl font-bold text-white mb-4">Not Enough Items</h1>
        <p className="text-xl text-blue-100">Bingo needs at least 8 prompt/answer pairs (3×3 card).</p></div>
      </div>
    )
  }

  if (!gameStarted) {
    if (showHowToPlay) {
      return <HowToPlayScreen gameType="bingo" gameName={activity.title} gameEmoji="🎱" onStart={handleStartAfterHowToPlay} onBack={() => { setShowHowToPlay(false); setPlayerName('') }} />
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl text-center">
          <div className="text-7xl mb-6">🎱</div>
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
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">{winMessage}</h1>
            <p className="text-2xl font-bold text-blue-600">{playerName}</p>
            <p className="text-xl text-gray-600 mt-4">Score: <strong>{totalScore}</strong> · Correct marks: {correctAnswers} · Time: {Math.floor(totalGameTime / 60)}m {totalGameTime % 60}s</p>
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

  const current = promptOrder[callIndex] !== undefined ? pairs[promptOrder[callIndex]] : null
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="flex justify-between items-center mb-4 text-lg font-bold text-gray-700">
          <span>🎱 {activity.title}</span>
          <span>Score: {totalScore}</span>
        </div>
        <p className="text-gray-600 mb-1">Called prompt:</p>
        <p className="text-2xl font-bold text-gray-800 mb-6">{current ? current.prompt : 'All prompts called'}</p>
        <div className={`grid gap-3 ${size === 5 ? 'grid-cols-5' : 'grid-cols-3'}`}>
          {card.map((cell, i) => {
            const isMarked = marked.has(i)
            const isFlash = flash === cell
            return (
              <button key={i} onClick={() => tap(i)} aria-label={cell}
                className={`rounded-xl font-bold transition-colors min-h-[64px] px-2 py-4 ${size === 5 ? 'text-base' : 'text-lg'} ${isMarked ? 'bg-green-500 text-white' : isFlash ? 'bg-red-400 text-white' : 'bg-white hover:bg-blue-100 text-gray-800 border-2 border-blue-200'}`}>
                {cell}
              </button>
            )
          })}
        </div>
        <button onClick={skip} className="mt-6 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-6 rounded-xl text-lg min-h-[56px]">Skip prompt →</button>
        <p className="mt-4 text-sm text-gray-500">Correct mark = 100 points. Complete a row, column or diagonal for +500 Bingo bonus.</p>
      </div>
    </div>
  )
}
