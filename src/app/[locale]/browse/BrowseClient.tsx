'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

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

const GRADES = [
  { value: 'pre-k', label: 'Pre-K (3-5)' },
  { value: 'kg', label: 'Kindergarten' },
  { value: 'grade-1', label: 'Grade 1' },
  { value: 'grade-2', label: 'Grade 2' },
  { value: 'grade-3', label: 'Grade 3' },
  { value: 'grade-4', label: 'Grade 4' },
  { value: 'grade-5', label: 'Grade 5' },
  { value: 'grade-6', label: 'Grade 6' },
  { value: 'grade-7', label: 'Grade 7' },
  { value: 'grade-8', label: 'Grade 8' },
  { value: 'grade-9', label: 'Grade 9' },
  { value: 'grade-10', label: 'Grade 10' },
  { value: 'grade-11', label: 'Grade 11' },
  { value: 'grade-12', label: 'Grade 12' },
]

const SUBJECTS = [
  'All Subjects', 'Math', 'English', 'Urdu', 'Science', 'Islamiyat',
  'Social Studies', 'Computer Science', 'Art', 'Physical Education',
  'Geography', 'History', 'General Knowledge', 'Biology', 'Chemistry', 'Physics'
]

export function BrowseClient({ locale }: { locale: string }) {
  const t = useTranslations()
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const [selectedGrade, setSelectedGrade] = useState(searchParams.get('grade') ?? 'pre-k')
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') ?? 'All Subjects')
  const [search, setSearch] = useState(searchParams.get('search') ?? '')

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (selectedGrade) params.append('grade', selectedGrade)
        if (selectedSubject && selectedSubject !== 'All Subjects') {
          params.append('subject', selectedSubject)
        }
        if (search) params.append('search', search)

        const response = await fetch(`/api/activities?${params.toString()}`)
        const result = await response.json()

        if (result.activities) {
          setActivities(result.activities)
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(fetchActivities, 300)
    return () => clearTimeout(debounceTimer)
  }, [selectedGrade, selectedSubject, search])

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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Grade Level</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {GRADES.map((grade) => (
                  <option key={grade.value} value={grade.value}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search games..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

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
                {activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                          {activity.title}
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
                    </div>

                    <button
                      onClick={() => router.push(`/${locale}/play/${activity.id}`)}
                      className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-colors"
                    >
                      Play Now 🎮
                    </button>
                  </div>
                ))}
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
