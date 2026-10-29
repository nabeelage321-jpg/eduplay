'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Batch 3 — INTERIM live polling hook.
 *
 * Polls GET /api/live-sessions/[id] every 3 seconds (configurable)
 * and returns the session plus its leaderboard-ordered players.
 * This replaces the old mock socket for the live lobby: it is real
 * cross-device state (via Supabase) at polling latency, NOT instant
 * realtime. A Supabase Realtime channel upgrade is a future batch
 * once the live tables and RLS are live and verified.
 */
export interface LiveSession {
  id: string
  activity_id: string
  teacher_name: string
  mode: string
  room_code: string
  status: 'waiting' | 'active' | 'ended'
  current_question: number
}

export interface LivePlayer {
  id: string
  nickname: string
  score: number
  correct_answers: number
}

export function useLiveSessionPolling(
  sessionId: string | null,
  intervalMs = 3000,
) {
  const [session, setSession] = useState<LiveSession | null>(null)
  const [players, setPlayers] = useState<LivePlayer[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await fetch(`/api/live-sessions/${sessionId}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Could not load live session')
        return
      }
      setSession(data.session)
      setPlayers(data.players ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    refresh().finally(() => setLoading(false))
    const timer = setInterval(refresh, intervalMs)
    return () => clearInterval(timer)
  }, [sessionId, intervalMs, refresh])

  return { session, players, error, loading, refresh }
}
