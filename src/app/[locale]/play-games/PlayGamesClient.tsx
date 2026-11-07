'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FILTER_SUBJECTS, FILTER_GRADES, normalizeTypeFilter } from '@/lib/filters'
import { ACTIVITY_TYPE_META } from '@/components/creator/TypeSelector'
import {
  BROWSE_GRADE_ALL,
  BROWSE_SUBJECT_ALL,
  BROWSE_TYPE_ALL,
  browseNormalizeGradeParam,
  browseNormalizeSubjectParam,
  browseBuildQuery,
} from '@/lib/browse'

interface ByTypeGame {
  id: string
  title: string
  type: string
  subject: string
  grade: string
  created_at: string
}

// 40-TYPE PLAY GRID (owner order 2026-11-07 07:27 PKT, launch day):
// when a kid clicks Play Games he must reach ALL the game types as
// tiles — exactly like the Create page "Choose Activity Type" grid —
// and ONE click on a tile opens a game of that type IMMEDIATELY on
// the NEW play page /activity/<id>/play. No detail page in between,
// no "click this and that then the game will open".
//
// Per-tile game rule (recorded): the NEWEST public game of that type
// matching the sidebar pick (subject + class). One batched request
// (GET /api/activities/by-type) answers the whole grid — 40 separate
// /api/activities calls would burn that route's 60-requests-per-minute
// rate limit in a single page load. A type with zero public games for
// the pick shows the honest "No game yet" state (never a dead click,
// never a wrong game, never invented). Public-only is enforced
// server-side, so a private or pending (kid-approval) game never
// appears here. LIVE (verified 2026-11-07 against /api/activities):
// 23 types have public games, 17 have none yet (jump-path, riddle,
// aster-quiz, dictation, dialogue, map-quiz, jigsaw-puzzle,
// video-quiz, letter-wheel, maze-run, speed-judge, spell-it,
// picture-answer, memory-recall, claim-line, opinion-cloud,
// number-slider) — those 17 tiles show the honest empty state until
// a teacher saves a game of that type.
//
// Tile presentation REUSES the Create grid: same icon + name +
// one-line description from ACTIVITY_TYPE_META (the single source),
// same tile styling. The right-side selection panel holds class +
// subject — the only other filter dimensions filters.ts offers that
// change which game a tile opens (type is the grid itself, so it is
// excluded from the panel; verified by reading filters.ts — it
// offers subjects, types and grades only).

const FETCH_TIMEOUT_MS = 10_000

// Tile styling — copied from the Create page TypeSelector so the play
// grid looks exactly like the grid the owner screenshotted.
const tileStyle: React.CSSProperties = {
  display: 'block',
  padding: '0.875rem 0.75rem',
  borderRadius: 'var(--radius-lg)',
  border: '2px solid var(--color-border)',
  background: 'var(--color-surface)',
  cursor: 'pointer',
  textAlign: 'center',
  textDecoration: 'none',
  transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
}
const tileIconStyle: React.CSSProperties = { fontSize: '1.75rem', marginBottom: '0.4rem', lineHeight: 1 }
const tileNameStyle: React.CSSProperties = {
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-display)',
  fontSize: '1.05rem',
  fontWeight: 800,
  lineHeight: 1.2,
  overflowWrap: 'break-word',
  marginBottom: '0.25rem',
}
const tileDescStyle: React.CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: '0.62rem',
  fontFamily: 'var(--font-body)',
  lineHeight: 1.3,
}

const pickerClass =
  'w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-semibold bg-white'
const labelClass = 'block text-base font-bold text-gray-700 mb-2'

export function PlayGamesClient({ locale }: { locale: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [byType, setByType] = useState<Record<string, ByTypeGame | null> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [retryTick, setRetryTick] = useState(0)
  const [selectedGrade, setSelectedGrade] = useState(() =>
    browseNormalizeGradeParam(searchParams.get('grade')),
  )
  const [selectedSubject, setSelectedSubject] = useState(() =>
    browseNormalizeSubjectParam(searchParams.get('subject')),
  )

  const pickersActive =
    selectedGrade !== BROWSE_GRADE_ALL || selectedSubject !== BROWSE_SUBJECT_ALL

  function clearPickers() {
    setSelectedGrade(BROWSE_GRADE_ALL)
    setSelectedSubject(BROWSE_SUBJECT_ALL)
  }

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const fetchByType = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const query = browseBuildQuery({
          grade: selectedGrade,
          subject: selectedSubject,
          type: BROWSE_TYPE_ALL,
          sort: 'newest',
          search: '',
        })

        const response = await fetch(`/api/activities/by-type?${query}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`by-type request failed: ${response.status}`)
        const result = await response.json()

        if (result.byType && typeof result.byType === 'object') {
          setByType(result.byType)
        } else {
          throw new Error('by-type response has no byType map')
        }

        // Keep the address bar in step with the pickers so any pick
        // is shareable by URL. The effect depends on picker state
        // only (not on searchParams), so replacing the URL cannot
        // loop back into itself.
        if (query !== searchParams.toString()) {
          router.replace(`/${locale}/play-games${query ? `?${query}` : ''}`, { scroll: false })
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          console.error('Failed to fetch by-type games: timed out after 10s')
        } else {
          console.error('Failed to fetch by-type games:', error)
        }
        // Fail honestly: a failed load is NOT the same as "zero games".
        // Keep any grid already shown; with no grid at all, the load
        // note below says so plainly.
        setLoadError(true)
        setByType(null)
      } finally {
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchByType, 300)
    return () => {
      clearTimeout(debounceTimer)
      clearTimeout(timeoutId)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, selectedSubject, retryTick])

  // Honest count from real data only — never invented.
  const playableCount = byType
    ? ACTIVITY_TYPE_META.filter((t) => byType[normalizeTypeFilter(t.slug)]).length
    : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
      {/* Grid — 40 tiles, one per type. */}
      <div>
        {loadError ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">Games could not be loaded.</p>
            <p className="text-gray-500 mt-2">Check your connection and try again.</p>
            <button
              onClick={() => setRetryTick((t) => t + 1)}
              className="mt-4 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <p className="text-lg font-semibold text-gray-700 mb-4">
              {loading
                ? 'Loading games…'
                : playableCount !== null
                  ? `${playableCount} of 40 game types have a game for this pick — tap one and play`
                  : 'Tap a game type and play'}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '0.6rem',
              }}
            >
              {ACTIVITY_TYPE_META.map((type) => {
                const dbType = normalizeTypeFilter(type.slug)
                const game = byType ? byType[dbType] ?? null : null
                const tileInner = (
                  <>
                    <div style={tileIconStyle} aria-hidden="true">
                      {type.icon}
                    </div>
                    <p style={tileNameStyle}>{type.name}</p>
                    <p style={tileDescStyle}>{type.desc}</p>
                  </>
                )
                // ONE click straight to the NEW play page — never the
                // legacy /play/<id> route, never the detail page.
                if (game) {
                  return (
                    <motion.a
                      key={type.slug}
                      href={`/${locale}/activity/${game.id}/play`}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      aria-label={`${type.name}: ${type.desc}. Play ${game.title}`}
                      style={tileStyle}
                    >
                      {tileInner}
                      <p
                        style={{
                          color: 'var(--color-primary)',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          marginTop: '0.5rem',
                          lineHeight: 1.3,
                        }}
                      >
                        ▶ Play: {game.title}
                      </p>
                    </motion.a>
                  )
                }
                // Honest empty state — never a dead click, never a
                // wrong game. The only click offered is to make the
                // first game of this type.
                return (
                  <div
                    key={type.slug}
                    aria-label={`${type.name}: ${type.desc}. No game of this type yet.`}
                    style={{ ...tileStyle, cursor: 'default', opacity: 0.75 }}
                  >
                    {tileInner}
                    <p
                      style={{
                        color: 'var(--color-text-muted)',
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        marginTop: '0.5rem',
                        lineHeight: 1.3,
                      }}
                    >
                      {loading ? 'Loading…' : 'No game yet'}
                    </p>
                    {!loading && (
                      <a
                        href={`/${locale}/create?type=${type.slug}`}
                        style={{
                          display: 'inline-block',
                          marginTop: '0.4rem',
                          color: 'var(--color-primary)',
                          fontSize: '0.65rem',
                          fontWeight: 600,
                        }}
                      >
                        Make the first one →
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Right-side selection panel — class + subject. These are the
          only filters (besides type, which IS the grid) that
          filters.ts offers and that change which game a tile opens. */}
      <aside className="bg-white rounded-xl shadow-md p-6 lg:sticky lg:top-20">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Your pick</h2>
        <p className="text-sm text-gray-500 mb-4">
          Pick a class and a subject — every game tile opens a game for that pick.
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="play-games-grade" className={labelClass}>
              🏫 Class
            </label>
            <select
              id="play-games-grade"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              autoComplete="off"
              className={pickerClass}
            >
              <option value={BROWSE_GRADE_ALL}>All classes</option>
              {FILTER_GRADES.map((grade) => (
                <option key={grade.value} value={grade.value}>
                  {grade.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="play-games-subject" className={labelClass}>
              📚 Subject
            </label>
            <select
              id="play-games-subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              autoComplete="off"
              className={pickerClass}
            >
              <option value={BROWSE_SUBJECT_ALL}>All subjects</option>
              {FILTER_SUBJECTS.map((subject) => (
                <option key={subject.value} value={subject.value}>
                  {subject.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {pickersActive && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Your pick — copy the page address to share exactly this pick.
            </p>
            <button
              onClick={clearPickers}
              className="mt-2 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear picks
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
