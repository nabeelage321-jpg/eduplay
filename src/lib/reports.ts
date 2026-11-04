/**
 * TEACHER REPORTS v1 — summary maths only (2026-11-04, master list part 5).
 *
 * The report is built from EXACTLY the two fields the challenge
 * leaderboard displays for a live session (GET
 * /api/live-sessions?roomCode=, the same source the challenge view
 * uses): each player's nickname and score. The API returns the whole
 * live_players row, but this batch deliberately surfaces ONLY
 * nickname + score — the fields the leaderboard already shows.
 *
 * NOT computed, NOT shown, NOT invented in v1:
 * - accuracy (needs total questions, which the session does not track)
 * - time taken (not tracked)
 * - per-question results (not tracked)
 * - correct-answer totals presented as a result (a count without a
 *   total would be misread as accuracy, so it is left out of v1)
 * - multi-session trends (need stored session history; phase 2)
 *
 * Everything here is computed from the real rows passed in. An empty
 * list gives zero counts and a zero top score — never invented rows.
 * Sorting is highest score first; ties keep their original order.
 */

export interface ReportPlayer {
  nickname?: string
  score?: number
}

export interface NormalizedReportPlayer {
  nickname: string
  score: number
}

export interface ReportSummary {
  /** Rows sorted highest score first, nicknames normalised. */
  players: NormalizedReportPlayer[]
  playerCount: number
  total: number
  /** Mean score across players; 0 when there are no players. */
  average: number
  /** Highest single score; 0 when there are no players. */
  topScore: number
}

function normalizePlayer(player: ReportPlayer): NormalizedReportPlayer {
  return {
    nickname:
      typeof player.nickname === 'string' && player.nickname.trim()
        ? player.nickname
        : 'Player',
    score: typeof player.score === 'number' && Number.isFinite(player.score) ? player.score : 0,
  }
}

export function summarizeReportPlayers(players: ReportPlayer[]): ReportSummary {
  const normalized = players.map(normalizePlayer)
  // Stable highest-first sort: score desc, original order on ties.
  const sorted = normalized
    .map((player, index) => ({ player, index }))
    .sort((a, b) => b.player.score - a.player.score || a.index - b.index)
    .map(({ player }) => player)
  const total = sorted.reduce((sum, player) => sum + player.score, 0)
  return {
    players: sorted,
    playerCount: sorted.length,
    total,
    average: sorted.length > 0 ? total / sorted.length : 0,
    topScore: sorted.length > 0 ? sorted[0].score : 0,
  }
}
