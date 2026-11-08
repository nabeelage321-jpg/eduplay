'use client'

import { countPlayed, isPlayerFinished, isReportExpired } from '@/lib/live-room'

/**
 * Session report — one room's record, on-platform.
 *
 * Shows, for one room code: how many students played, and every
 * student's name + marks. The host sees it in the live room (below
 * the leaderboard) and again from their Dashboard rooms list, so a
 * room can be checked afterwards — not just while it is live.
 *
 * FREE-PLAN EXPIRY: 3 days after the room was created the report is
 * gone — the section shows an expired notice instead of the data.
 * Nothing is deleted (there is no deletion cron); the read path
 * simply stops rendering old reports.
 *
 * Print: the button prints this report only (print CSS hides the
 * rest of the page). A player who joined but never finished shows
 * "–" for marks instead of a 0, so an unfinished player is never
 * confused with a 0-point finish.
 */
export interface SessionReportPlayer {
  id?: string
  nickname: string
  score: number
  correct_answers?: number | null
  finished_at?: string | null
}

interface SessionReportProps {
  roomCode: string
  activityTitle?: string | null
  createdAt?: string | null
  players: SessionReportPlayer[]
}

export default function SessionReport({ roomCode, activityTitle, createdAt, players }: SessionReportProps) {
  const expired = isReportExpired(createdAt)
  const played = countPlayed(players)
  const dateLabel = (() => {
    if (!createdAt) return null
    const d = new Date(createdAt)
    if (!Number.isFinite(d.getTime())) return null
    return d.toLocaleDateString()
  })()

  return (
    <div
      className="session-report"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        marginTop: '1.5rem',
      }}
    >
      <style>{`@media print {
        body * { visibility: hidden !important; }
        .session-report, .session-report * { visibility: visible !important; }
        .session-report { position: absolute; left: 0; top: 0; width: 100%; border: none !important; }
        .session-report-print-btn { display: none !important; }
      }`}</style>
      <h3 style={{ fontFamily: 'var(--font-display)', margin: 0, marginBottom: '0.25rem' }}>
        📋 Session report — Room {roomCode}
      </h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: 0 }}>
        {[activityTitle, dateLabel].filter(Boolean).join(' · ')}
      </p>
      {expired ? (
        <p style={{ color: 'var(--color-text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
          This report has expired — the free plan keeps session reports for 3 days.
        </p>
      ) : (
        <>
          <p style={{ fontWeight: 700, marginTop: '0.75rem', marginBottom: '0.5rem' }}>
            🎓 {played} student{played === 1 ? '' : 's'} played
            {players.length > played ? ` · ${players.length} joined` : ''}
          </p>
          {players.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No students joined this room yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  <th style={{ padding: '0.35rem 0.5rem 0.35rem 0' }}>#</th>
                  <th style={{ padding: '0.35rem 0.5rem 0.35rem 0' }}>Student</th>
                  <th style={{ padding: '0.35rem 0' }}>Marks</th>
                </tr>
              </thead>
              <tbody>
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((player, i) => (
                    <tr key={player.id ?? `${player.nickname}-${i}`} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem 0.5rem 0.5rem 0' }}>{i + 1}</td>
                      <td style={{ padding: '0.5rem 0.5rem 0.5rem 0', fontWeight: 700 }}>{player.nickname}</td>
                      <td style={{ padding: '0.5rem 0' }}>{isPlayerFinished(player) ? `${player.score}` : '–'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
          <button
            type="button"
            className="session-report-print-btn"
            onClick={() => window.print()}
            style={{
              marginTop: '0.75rem',
              padding: '0.6rem 1.1rem',
              borderRadius: 'var(--radius)',
              border: '2px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            🖨️ Print report
          </button>
        </>
      )}
    </div>
  )
}
