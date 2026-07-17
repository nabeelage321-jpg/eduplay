'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import ActivityGrid from '@/components/activities/ActivityGrid'
import ActivityFilters, { type FilterState } from '@/components/activities/ActivityFilters'
import PrintExport from '@/components/activities/PrintExport'
import type { Activity, SupportedLocale } from '@/types'

export default function ActivitiesPage() {
  const params = useParams()
  const locale = (params?.locale as SupportedLocale) ?? 'en'

  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [printActivity, setPrintActivity] = useState<Activity | null>(null)

  const [filters, setFilters] = useState<FilterState>({
    subject: '', grade: '', type: '', locale: '', search: '', sort: 'newest',
  })

  const fetchActivities = useCallback(async (f: FilterState, p: number) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({
        ...(f.subject && { subject: f.subject }),
        ...(f.grade && { grade: f.grade }),
        ...(f.type && { type: f.type }),
        ...(f.locale && { locale: f.locale }),
        ...(f.search && { search: f.search }),
        sort: f.sort,
        page: String(p),
        limit: '24',
      })
      const res = await fetch(`/api/activities?${qs}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setActivities(p === 1 ? data.activities : (prev) => [...prev, ...data.activities])
      setTotal(data.pagination.total)
    } catch {
      // Silent error — show empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setPage(1)
    fetchActivities(filters, 1)
  }, [filters, fetchActivities])

  function loadMore() {
    const next = page + 1
    setPage(next)
    fetchActivities(filters, next)
  }

  const hasMore = activities.length < total
  const isRTL = locale === 'ur' || locale === 'ar'

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            marginBottom: '0.25rem',
          }}>
            🎮 Browse Activities
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            {total > 0 ? `${total.toLocaleString()} activities from teachers worldwide` : 'Discover interactive learning activities'}
          </p>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: '1.25rem' }}>
          <ActivityFilters
            filters={filters}
            onChange={(f) => { setFilters(f); setPage(1) }}
            resultCount={loading ? undefined : total}
          />
        </div>

        {/* Grid */}
        <ActivityGrid
          activities={activities}
          locale={locale}
          loading={loading && page === 1}
          emptyMessage="No activities match your filters"
          onPrint={(a) => setPrintActivity(a)}
        />

        {/* Load more */}
        {hasMore && !loading && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={loadMore}
              style={{
                padding: '0.75rem 2rem', borderRadius: 'var(--radius)',
                border: '2px solid var(--color-primary)', background: 'var(--color-surface)',
                color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Load More ({total - activities.length} remaining)
            </motion.button>
          </div>
        )}

        {loading && page > 1 && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-muted)' }}>
            Loading more…
          </div>
        )}
      </div>

      {/* Print modal */}
      {printActivity && (
        <PrintExport activity={printActivity} onClose={() => setPrintActivity(null)} />
      )}
    </div>
  )
}
