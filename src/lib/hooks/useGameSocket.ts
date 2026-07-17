import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../store/game-store'

type SocketEvent =
  | 'connect'
  | 'disconnect'
  | 'game:join'
  | 'game:leave'
  | 'game:start'
  | 'game:question'
  | 'game:answer'
  | 'game:leaderboard'
  | 'game:end'
  | 'player:joined'
  | 'player:left'
  | 'player:answered'
  | 'error'

interface UseGameSocketOptions {
  enabled?: boolean
  roomCode?: string
}

export interface SocketHandler {
  on: (event: SocketEvent, handler: (data: unknown) => void) => void
  emit: (event: SocketEvent, data: unknown) => void
  disconnect: () => void
}

let socketInstance: SocketHandler | null | null = null

const createMockSocket = (): SocketHandler | null => {
  const listeners = new Map<SocketEvent, Array<(data: unknown) => void>>()

  return {
    on: (event: SocketEvent, handler: (data: unknown) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, [])
      }
      listeners.get(event)?.push(handler)
    },
    emit: (event: SocketEvent, data: unknown) => {
      const handlers = listeners.get(event)
      if (handlers) {
        handlers.forEach((handler) => handler(data))
      }
    },
    disconnect: () => {
      listeners.clear()
    },
  }
}

export const useGameSocket = ({
  enabled = true,
  roomCode,
}: UseGameSocketOptions = {}): SocketHandler | null => {
  const socketRef = useRef<SocketHandler | null>(null)
  const { updateSession, updatePlayers, setCurrentQuestion } = useGameStore()

  const getSocket = useCallback((): SocketHandler | null => {
    if (!socketRef.current) {
      if (typeof window !== 'undefined' && (window as any).io) {
        socketRef.current = (window as any).io()
      } else {
        socketRef.current = createMockSocket()
      }
    }
    return socketRef.current
  }, [])

  useEffect(() => {
    if (!enabled || !roomCode) return

    const socket = getSocket()

    // Join game room
    socket?.emit('game:join', { roomCode })

    // Setup listeners
    socket?.on('game:start', (data: any) => {
      updateSession({
        status: 'active',
        startedAt: new Date(),
      })
    })

    socket?.on('game:question', (data: any) => {
      setCurrentQuestion(data.questionIndex)
    })

    socket?.on('player:joined', (data: any) => {
      updateSession({
        playerCount: data.playerCount,
      })
    })

    socket?.on('player:answered', (data: any) => {
      updatePlayers(data.players)
    })

    socket?.on('game:leaderboard', (data: any) => {
      updatePlayers(data.players)
    })

    socket?.on('game:end', (data: any) => {
      updateSession({
        status: 'ended',
        endedAt: new Date(),
      })
    })

    socket?.on('disconnect', () => {
      console.warn('Disconnected from game server')
    })

    socket?.on('error', (data: any) => {
      console.error('Socket error:', data.message)
    })

    return () => {
      socket?.disconnect()
    }
  }, [enabled, roomCode, getSocket, updateSession, updatePlayers, setCurrentQuestion])

  return getSocket()
}

export const emitGameEvent = (event: SocketEvent, data: unknown): void => {
  if (socketInstance) {
    (socketInstance as any).emit(event, data)
  }
}
