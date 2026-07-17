import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GamePlayer {
  id: string
  nickname: string
  score: number
  rank: number
  joinedAt: Date
  answered: boolean
  lastAnswerTime: number
}

export interface GameSession {
  id: string
  activityId: string
  teacherId: string
  roomCode: string
  status: 'waiting' | 'active' | 'ended'
  gameMode: 'classic' | 'tournament' | 'competition'
  playerCount: number
  currentQuestion: number
  totalQuestions: number
  players: GamePlayer[]
  createdAt: Date
  startedAt?: Date
  endedAt?: Date
}

export interface GameState {
  // Session management
  currentSession: GameSession | null
  setCurrentSession: (session: GameSession | null) => void
  
  // Player management
  currentPlayer: GamePlayer | null
  setCurrentPlayer: (player: GamePlayer | null) => void
  joinGame: (roomCode: string, nickname: string) => void
  leaveGame: () => void
  
  // Game updates
  updateSession: (session: Partial<GameSession>) => void
  updatePlayers: (players: GamePlayer[]) => void
  updateScore: (playerId: string, score: number) => void
  
  // Question progress
  setCurrentQuestion: (questionIndex: number) => void
  
  // Reset
  resetGame: () => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      currentPlayer: null,

      setCurrentSession: (session) => set({ currentSession: session }),

      setCurrentPlayer: (player) => set({ currentPlayer: player }),

      joinGame: (roomCode, nickname) => {
        set((state) => ({
          currentPlayer: {
            id: `player_${Date.now()}`,
            nickname,
            score: 0,
            rank: 0,
            joinedAt: new Date(),
            answered: false,
            lastAnswerTime: 0,
          },
        }))
      },

      leaveGame: () => {
        set({ currentSession: null, currentPlayer: null })
      },

      updateSession: (updates) => {
        set((state) => ({
          currentSession: state.currentSession ? { ...state.currentSession, ...updates } : null,
        }))
      },

      updatePlayers: (players) => {
        set((state) => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, players, playerCount: players.length }
            : null,
        }))
      },

      updateScore: (playerId, score) => {
        set((state) => ({
          currentSession: state.currentSession
            ? {
                ...state.currentSession,
                players: state.currentSession.players.map((p) =>
                  p.id === playerId ? { ...p, score } : p
                ),
              }
            : null,
        }))
      },

      setCurrentQuestion: (questionIndex) => {
        set((state) => ({
          currentSession: state.currentSession
            ? { ...state.currentSession, currentQuestion: questionIndex }
            : null,
        }))
      },

      resetGame: () => {
        set({ currentSession: null, currentPlayer: null })
      },
    }),
    {
      name: 'game-store',
      version: 1,
    }
  )
)
