/**
 * Batch 3 — DEPRECATED mock socket, deliberately disabled.
 *
 * The previous implementation fell back to a local in-browser mock
 * socket that only echoed events inside one browser tab. It looked
 * live but could never sync a teacher with students on other devices.
 * Keeping it would be faking live multiplayer, so it was removed:
 * this hook now always returns null (callers already use `socket?.emit`,
 * so existing screens do not crash), and warns once in development.
 *
 * Live flow is now the interim polling flow:
 * - API: /api/live-sessions (create / lookup / join / action)
 * - Hook: useLiveSessionPolling (3-second polling)
 * - UI: /[locale]/live (LiveSessionRoom)
 * A Supabase Realtime channel upgrade is a future batch, once the
 * live tables and RLS are live and verified against a real database.
 */
export type SocketEvent =
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

export interface SocketHandler {
  on: (event: SocketEvent, handler: (data: unknown) => void) => void
  emit: (event: SocketEvent, data: unknown) => void
  disconnect: () => void
}

interface UseGameSocketOptions {
  enabled?: boolean
  roomCode?: string
}

let warned = false

export const useGameSocket = (
  _options: UseGameSocketOptions = {},
): SocketHandler | null => {
  if (!warned && typeof window !== 'undefined') {
    warned = true
    console.warn(
      '[EduPlay] useGameSocket is deprecated and returns null: the old mock socket was removed in Batch 3. Use useLiveSessionPolling + /api/live-sessions instead.',
    )
  }
  return null
}

export const emitGameEvent = (_event: SocketEvent, _data: unknown): void => {
  // No-op: there is no live socket to emit to. See useGameSocket above.
}
