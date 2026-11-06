'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FILTER_SUBJECTS, FILTER_GRADES, FILTER_TYPES } from '@/lib/filters'
import {
  BROWSE_GRADE_ALL,
  BROWSE_SUBJECT_ALL,
  BROWSE_TYPE_ALL,
  browseNormalizeGradeParam,
  browseNormalizeSubjectParam,
  browseNormalizeTypeParam,
  browseBuildQuery,
} from '@/lib/browse'

interface Activity {
  id: string
  title: string
  type: string
  subject: string
  grade: string
  is_public: boolean
  play_count: number
  created_at: string
}

// SEPARATE PLAY LISTING (owner order 2026-11-06 22:14 PKT): a kid-first
// pick-and-play page, not a second catalogue. Three big pickers on top
// (game type, class, subject — from the single-source filters.ts,
// never guessed lists), then the games list. ONE click on Play goes
// straight to the NEW play page /activity/<id>/play — NEVER to the
// legacy /play/<id> route that /en/browse still uses. No search, no
// sort control, no New-games section, no descriptions, no play counts:
// minimal text so a child can pick and play. Filter state is
// URL-synced (same helpers as browse) so any pick is shareable.
// Public-only is enforced server-side by /api/activities
// (is_public = true), so a private or pending (kid-approval) game
// never appears here. A failed fetch shows the honest load note,
// never invented games; a filter combination with zero real games
// shows the honest empty state below.

const LIST_LIMIT = 100
const FETCH_TIMEOUT_MS = 10_000

const pickerClass =
  'w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold bg-white'
const labelClass = 'block text-base font-bold text-gray-700 mb-2'

export function PlayGamesClient({ locale }: { locale: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activities, setActivities] = useState<Activity[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [selectedType, setSelectedType] = useState(() =>
    browseNormalizeTypeParam(searchParams.get('type')),
  )
  const [selectedGrade, setSelectedGrade] = useState(() =>
    browseNormalizeGradeParam(searchParams.get('grade')),
  )
  const [selectedSubject, setSelectedSubject] = useState(() =>
    browseNormalizeSubjectParam(searchParams.get('subject')),
  )

  const pickersActive =
    selectedType !== BROWSE_TYPE_ALL ||
    selectedGrade !== BROWSE_GRADE_ALL ||
    selectedSubject !== BROWSE_SUBJECT_ALL

  function clearPickers() {
    setSelectedType(BROWSE_TYPE_ALL)
    setSelectedGrade(BROWSE_GRADE_ALL)
    setSelectedSubject(BROWSE_SUBJECT_ALL)
  }

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const fetchActivities = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const query = browseBuildQuery({
          grade: selectedGrade,
          subject: selectedSubject,
          type: selectedType,
          sort: 'newest',
          search: '',
        })

        const response = await fetch(`/api/activities?${query}&limit=${LIST_LIMIT}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Activities request failed: ${response.status}`)
        const result = await response.json()

        if (result.activities) {
          setActivities(result.activities)
          setTotal(
            typeof result.pagination?.total === 'number' ? result.pagination.total : result.activities.length,
          )
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
          console.error('Failed to fetch activities: timed out after 10s')
        } else {
          console.error('Failed to fetch activities:', error)
        }
        // Fail to empty — but honestly: a failed load is NOT the same
        // as "zero games for this pick". Keep any list already shown;
        // with no list at all, the load note below says so plainly.
        setLoadError(true)
        setActivities([])
        setTotal(null)
      } finally {
        clearTimeout(timeoutId)
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchActivities, 300)
    return () => {
      clearTimeout(debounceTimer)
      clearTimeout(timeoutId)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType, selectedGrade, selectedSubject])

  return (
    <div>
      {/* Big pickers — game type, class, subject. */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="play-games-type" className={labelClass}>
              🎮 Game type
            </label>
            <select
              id="play-games-type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              autoComplete="off"
              className={pickerClass}
            >
              <option value={BROWSE_TYPE_ALL}>All game types</option>
              {FILTER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

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
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Your pick — copy the page address to share exactly this list.
            </p>
            <button
              onClick={clearPickers}
              className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear picks
            </button>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin">⏳</div>
          <p className="text-gray-600 mt-2">Loading games...</p>
        </div>
      ) : loadError ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-600 text-lg">Games could not be loaded.</p>
          <p className="text-gray-500 mt-2">Check your connection and try again.</p>
        </div>
      ) : activities.length > 0 ? (
        <div>
          <p className="text-lg font-semibold text-gray-700 mb-4">
            {total !== null && total > activities.length
              ? `Showing ${activities.length} newest of ${total.toLocaleString()} games — pick one and play`
              : total !== null
                ? `${total.toLocaleString()} game${total !== 1 ? 's' : ''} — pick one and play`
                : `${activities.length} games — pick one and play`}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <h3 className="text-lg font-bold text-gray-800 mb-3">{activity.title}</h3>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {activity.subject}
                  </span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    {activity.type}
                  </span>
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                    {activity.grade.toUpperCase()}
                  </span>
                </div>

                {/* ONE click straight to the NEW play page — never the
                    legacy /play/<id> route. */}
                <a
                  href={`/${locale}/activity/${activity.id}/play`}
                  className="mt-2 block w-full text-center bg-green-500 hover:bg-green-600 text-white font-bold text-lg py-3 rounded-lg transition-colors"
                >
                  ▶ Play
                </a>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-600 text-lg">No games for this pick yet — try another pick.</p>
          <p className="text-gray-500 mt-2">Or make the game you are looking for.</p>
          <a
            href={`/${locale}/create`}
            className="mt-4 inline-flex items-center justify-center min-h-12 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg"
          >
            Make a game
          </a>
        </div>
      )}
    </div>
  )
}
