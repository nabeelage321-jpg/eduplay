'use client'

import { useState } from 'react'
import SessionReport from '@/components/game/SessionReport'
import { countPlayed, isPlayerFinished, isReportExpired } from '@/lib/live-room'

/**
 * My live rooms — the teacher's past hosted rooms, on the Dashboard.
 *
 * Each room shows its code, game, date, how many students played,
 * and each student's marks — and expands to the room's printable
 * report. On-platform only: nothing is downloaded, nothing leaves
 * EduPlay.
 *
 * SEARCH BY CODE: type a room code (e.g. RQBXVD) and the list narrows
 * to that room, so a room can be found again and re-tested simply by
 * its code. The search filters this teacher's own rooms only.
 *
 * FREE-PLAN EXPIRY: a room older than 3 days still lists (code,
 * game, date), but its report data — played count and marks — is
 * gone, and opening the report shows the expired notice instead.
 * Nothing is deleted; the read path simply stops showing old data.
 * The list shows the 50 most recent rooms.
 */
export interface LiveRoomListPlayer {
  nickname: string
  score: number
  correct_answers: number | null
  finished_at: string | null
}

export interface LiveRoomListItem {
  id: string
  room_code: string
  activity_id: string
  activity_title: string | null
  status: string
  created_at: string | null
  players: LiveRoomListPlayer[]
}

interface MyLiveRoomsProps {
  locale: string
  rooms: LiveRoomListItem[]
  unavailable: boolean
}

export default function MyLiveRooms({ locale, rooms, unavailable }: MyLiveRoomsProps) {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const code = query.trim().toUpperCase()
  const filtered = code
    ? rooms.filter((room) => room.room_code.toUpperCase().includes(code))
    : rooms

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
        My live rooms{rooms.length > 0 ? ` (${rooms.length})` : ''}
      </h2>

      {unavailable ? (
        <p style={{ color: 'var(--color-text-muted)' }}>
          Your live rooms list is not available yet. It needs the owner-run
          database setup (migration 013) before your hosted rooms can be
          listed here.
        </p>
      ) : rooms.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>
          You have not hosted a live room yet. Host a game from the Live page
          and it will appear here with its report.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a room by code (e.g. RQBXVD)"
              aria-label="Find a room by code"
              maxLength={6}
              style={{
                flex: 1,
                minHeight: '48px',
                padding: '0.6rem 0.9rem',
                fontSize: '1rem',
                borderRadius: 'var(--radius)',
                border: '2px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
              }}
            />
          </div>

          {filtered.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>
              No room with that code in your list.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '0.75rem' }}>
              {filtered.map((room) => {
                const expired = isReportExpired(room.created_at)
                const played = countPlayed(room.players)
                const dateLabel = (() => {
                  if (!room.created_at) return null
                  const d = new Date(room.created_at)
                  return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : null
                })()
                const open = openId === room.id
                return (
                  <li
                    key={room.id}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1rem',
                    }}
                  >
                    <p style={{ fontWeight: 700, margin: 0 }}>
                      Room {room.room_code}
                      {room.activity_title ? ` — ${room.activity_title}` : ''}
                    </p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                      {[dateLabel, room.status === 'ended' ? 'Ended' : room.status === 'active' ? 'Live' : 'Waiting']
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: '0.5rem 0 0' }}>
                      {expired
                        ? 'Report expired — free plan keeps session reports for 3 days.'
                        : room.players.length === 0
                          ? 'No students joined yet.'
                          : `🎓 ${played} student${played === 1 ? '' : 's'} played — ` +
                            room.players
                              .map((p) => `${p.nickname} ${isPlayerFinished(p) ? p.score : '–'}`)
                              .join(', ')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : room.id)}
                      aria-expanded={open}
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius)',
                        border: '2px solid var(--color-border)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-primary)',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {open ? 'Hide report ↑' : 'View report →'}
                    </button>
                    {open ? (
                      <SessionReport
                        roomCode={room.room_code}
                        activityTitle={room.activity_title}
                        createdAt={room.created_at}
                        players={room.players}
                      />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
