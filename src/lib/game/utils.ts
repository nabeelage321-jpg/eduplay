// Game utility functions
import type { PlayerScore } from './modes/types'
export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function validateRoomCode(code: string): boolean {
  return /^[A-Z0-9]{4,8}$/.test(code)
}

export function isValidRoomCode(code: string): boolean {
  return validateRoomCode(code)
}

export function calculateScore(answersCorrect: number, totalQuestions: number, timeSpent: number): number {
  const baseScore = (answersCorrect / totalQuestions) * 100
  const timeBonus = Math.max(0, 10 - Math.ceil(timeSpent / 60)) // max 10 second bonus
  return Math.round(baseScore + timeBonus)
}

export interface GameStats {
  playerCount: number
  correctAnswers: number
  averageTime: number
  highScore: number
}

export function aggregateGameStats(
  playerScores: Array<{ correct: number; time: number }>,
  totalQuestions: number
): GameStats {
  const playerCount = playerScores.length
  const correctAnswers = playerScores.reduce((sum, p) => sum + p.correct, 0) / playerCount
  const averageTime = playerScores.reduce((sum, p) => sum + p.time, 0) / playerCount
  const highScore = Math.max(
    ...playerScores.map((p) => calculateScore(p.correct, totalQuestions, p.time))
  )

  return { playerCount, correctAnswers, averageTime, highScore }
}

// Placeholder functions for Phase 3+ features
export function canStartGame(): boolean {
  return true
}

export function createPlayerScore() {
  return { score: 0 }
}

export function splitIntoTeams() {
  return { team1: [], team2: [] }
}

export function calculateAccuracy() {
  return 0
}

export function calculateLeaderboardStats() {
  return {}
}

export function isValidAnswer() {
  return true
}

export function formatSessionResultsForExport(players: PlayerScore[], sessionId?: string, activityTitle?: string) {
  return {}
}

export function getCurrentRelayPlayer() {
  return null
}

export function countActivePlayers() {
  return 0
}

export function getTimePerQuestion() {
  return 30
}

export const GAME_MODE_CONFIGS = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Standard game mode',
    minPlayers: 1,
    maxPlayers: 100,
  },
  tournament: {
    id: 'tournament',
    name: 'Tournament',
    description: 'Competitive mode',
    minPlayers: 2,
    maxPlayers: 32,
  },
}
