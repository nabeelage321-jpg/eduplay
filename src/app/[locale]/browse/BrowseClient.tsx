'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { FILTER_SUBJECTS, FILTER_GRADES, FILTER_TYPES } from '@/lib/filters'
import {
  BROWSE_GRADE_ALL,
  BROWSE_SUBJECT_ALL,
  BROWSE_TYPE_ALL,
  BROWSE_SORTS,
  browseIsNew,
  browseFormatAdded,
  browseNormalizeGradeParam,
  browseNormalizeSubjectParam,
  browseNormalizeTypeParam,
  browseNormalizeSortParam,
  browseBuildQuery,
} from '@/lib/browse'

interface Activity {
  id: string
  title: string
  description?: string
  type: string
  subject: string
  grade: string
  language: string
  curriculum: string
  is_public: boolean
  play_count: number
  created_at: string
}

// STRUCTURED BROWSE v1 (2026-11-04): the browse page already had
// grade/subject/search filters, but three things were missing —
// (1) no type filter, (2) no way to see all grades at once (grade
// always defaulted to pre-k), and (3) filter state never reached the
// address bar, so a filtered view could not be shared by URL. This
// batch adds all three plus a New-games section and a sort control,
// on the SAME page and the SAME /api/activities query. It changes
// nothing about save/publish: the API still returns is_public rows
// only, so a private or pending (kid-approval) game never appears
// here, and browsing never changes any game's public/private state.
// NOT in this batch (phase 2): country/syllabus/language filters,
// popular ordering by real plays (play_count sort below only reuses
// the API's existing stored counter — it is not new play tracking),
// and any homepage popular change.

const GRADE_ALL = BROWSE_GRADE_ALL
const SUBJECT_ALL = BROWSE_SUBJECT_ALL
const TYPE_ALL = BROWSE_TYPE_ALL
const SORTS = BROWSE_SORTS
const isNew = browseIsNew
const formatAdded = browseFormatAdded
const normalizeGradeParam = browseNormalizeGradeParam
const normalizeSubjectParam = browseNormalizeSubjectParam
const normalizeTypeParam = browseNormalizeTypeParam
const normalizeSortParam = browseNormalizeSortParam

const selectClass =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
const labelClass = 'block text-sm font-semibold text-gray-700 mb-2'

export function BrowseClient({ locale }: { locale: string }) {
  const t = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activities, setActivities] = useState<Activity[]>([])
  const [newGames, setNewGames] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGrade, setSelectedGrade] = useState(() => normalizeGradeParam(searchParams.get('grade')))
  const [selectedSubject, setSelectedSubject] = useState(() => normalizeSubjectParam(searchParams.get('subject')))
  const [selectedType, setSelectedType] = useState(() => normalizeTypeParam(searchParams.get('type')))
  const [selectedSort, setSelectedSort] = useState(() => normalizeSortParam(searchParams.get('sort')))
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  const filtersActive =
    selectedGrade !== GRADE_ALL ||
    selectedSubject !== SUBJECT_ALL ||
    selectedType !== TYPE_ALL ||
    selectedSort !== 'newest' ||
    search !== ''

  function clearFilters() {
    setSelectedGrade(GRADE_ALL)
    setSelectedSubject(SUBJECT_ALL)
    setSelectedType(TYPE_ALL)
    setSelectedSort('newest')
    setSearch('')
  }

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)
      try {
        const query = browseBuildQuery({
          grade: selectedGrade,
          subject: selectedSubject,
          type: selectedType,
          sort: selectedSort,
          search,
        })

        const response = await fetch(`/api/activities?${query}`)
        const result = await response.json()

        if (result.activities) {
          setActivities(result.activities)
        }

        // Keep the address bar in step with the filters so any
        // filtered view is shareable by URL. The effect depends on
        // filter state only (not on searchParams), so replacing the
        // URL cannot loop back into itself.
        if (query !== searchParams.toString()) {
          router.replace(`/${locale}/browse${query ? `?${query}` : ''}`, { scroll: false })
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchActivities, 300)
    return () => clearTimeout(debounceTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGrade, selectedSubject, selectedType, selectedSort, search])

  // New games: the newest PUBLIC games, unfiltered, by real
  // created_at descending (the API's sort=newest). Public-only is
  // enforced server-side (is_public = true); this fetch asks for
  // nothing else, so no private or pending game can slip in here.
  useEffect(() => {
    let cancelled = false
    fetch('/api/activities?sort=newest&limit=9')
      .then((r) => r.json())
      .then((result) => {
        if (!cancelled && result.activities) setNewGames(result.activities)
      })
      .catch((error) => console.error('Failed to fetch new games:', error))
    return () => {
      cancelled = true
    }
  }, [])

  function renderCard(activity: Activity, showAdded: boolean) {
    return (
      <div
        key={activity.id}
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer group"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
              {activity.title}
              {isNew(activity.created_at) && (
                <span className="ml-2 align-middle bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                  🆕 New
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
          </div>
        </div>

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

        <div className="text-sm text-gray-500">
          👤 {activity.play_count} plays
          {showAdded && formatAdded(activity.created_at) && (
            <span> · Added {formatAdded(activity.created_at)}</span>
          )}
        </div>

        <button
          onClick={() => router.push(`/${locale}/play/${activity.id}`)}
          className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          Play Now 🎮
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📚 Browse Games</h1>
          <p className="text-gray-600">Find the perfect educational games for children</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Grade Filter */}
            <div>
              <label className={labelClass}>Grade Level</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                autoComplete="off"
                className={selectClass}
              >
                <option value={GRADE_ALL}>All Grades</option>
                {FILTER_GRADES.map((grade) => (
                  <option key={grade.value} value={grade.value}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label className={labelClass}>Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                autoComplete="off"
                className={selectClass}
              >
                <option value={SUBJECT_ALL}>All Subjects</option>
                {FILTER_SUBJECTS.map((subject) => (
                  <option key={subject.value} value={subject.value}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className={labelClass}>Game Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                autoComplete="off"
                className={selectClass}
              >
                <option value={TYPE_ALL}>All Types</option>
                {FILTER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Search */}
            <div>
              <label className={labelClass}>Search</label>
              <input
                type="text"
                placeholder="Search games..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
                className={selectClass}
              />
            </div>

            {/* Sort */}
            <div>
              <label className={labelClass}>Sort</label>
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                autoComplete="off"
                className={selectClass}
              >
                {SORTS.map((sort) => (
                  <option key={sort.value} value={sort.value}>
                    {sort.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                disabled={!filtersActive}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-default"
              >
                Clear filters
              </button>
            </div>
          </div>

          {filtersActive && (
            <p className="text-sm text-gray-500 mt-4">
              Filtered view — copy the page address to share exactly this list.
            </p>
          )}
        </div>

        {/* New games */}
        {newGames.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">🆕 New games</h2>
            <p className="text-gray-600 mb-4">
              Newest public games first, by the date they were added.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newGames.map((activity) => renderCard(activity, true))}
            </div>
          </div>
        )}

        {/* Results */}
        <div>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin">⏳</div>
              <p className="text-gray-600 mt-2">Loading games...</p>
            </div>
          ) : activities.length > 0 ? (
            <div>
              <p className="text-lg font-semibold text-gray-700 mb-4">
                Found {activities.length} game{activities.length !== 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activities.map((activity) => renderCard(activity, false))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-600 text-lg">No games found matching your criteria.</p>
              <p className="text-gray-500 mt-2">Try adjusting your filters!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
