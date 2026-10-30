'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import ActivityPlayer from '@/components/activity-types/ActivityPlayer'
import ShareGameButton from '@/components/home/ShareGameButton'
import SoundToggle from '@/components/activity-types/SoundToggle'
import { useThemeStore } from '@/lib/store/theme-store'
import type { Activity, SupportedLocale } from '@/types'

export default function PlayPage() {
  const params = useParams()
  const router = useRouter()
  const { audience } = useThemeStore()
  const locale = (params?.locale as SupportedLocale) ?? 'en'
  const id = params?.id as string

  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playRecorded = useRef(false)

  const isRTL = locale === 'ur' || locale === 'ar'

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`/api/activities/${id}`)
        if (!res.ok) throw new Error('Activity not found')
        const { activity } = await res.json()
        setActivity(activity)
        // Record play
        if (!playRecorded.current) {
          playRecorded.current = true
          fetch(`/api/activities/${id}/play`, { method: 'POST' }).catch(() => {})
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity')
      } finally {
        setLoading(false)
      }
    }
    fetchActivity()
  }, [id])

  // Timer
  useEffect(() => {
    if (!activity || finalScore !== null) return
    timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activity, finalScore])

  function handleComplete(score: number) {
    if (timerRef.current) clearInterval(timerRef.current)
    setFinalScore(score)
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-background)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            border: '4px solid var(--color-border)', borderTopColor: 'var(--color-primary)',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>Loading activity…</p>
        </div>
      </div>
    )
  }

  if (error || !activity) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-background)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>😕</div>
          <h1 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>
            Activity Not Found
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>{error}</p>
          <button
            onClick={() => router.push(`/${locale}/activities`)}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)',
              border: 'none', background: 'var(--gradient-btn)',
              color: '#fff', fontFamily: 'var(--font-display)', cursor: 'pointer',
            }}
          >
            ← Browse Activities
          </button>
        </div>
      </div>
    )
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', background: 'var(--color-background)' }}>
      {/* Game header */}
      <div style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0.625rem 1rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: 'var(--shadow)',
      }}>
        <button
          onClick={() => router.push(`/${locale}/activity/${id}`)}
          aria-label="Exit activity"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', fontSize: '1.25rem', lineHeight: 1,
            padding: '0.25rem',
          }}
        >
          ✕
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)',
            fontWeight: 700, fontSize: '1.1rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0,
          }}>
            {activity.title}
          </p>
        </div>
        <ShareGameButton locale={locale} gameId={id} gameTitle={activity.title} />
        <SoundToggle />
        <span style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '1rem', flexShrink: 0 }}>
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Game area */}
      <div style={{ padding: '1rem 0.5rem', maxWidth: '700px', margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          {finalScore !== null ? (
            <motion.div
              key="complete"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{
                textAlign: 'center', padding: '2.5rem 1rem',
                background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--color-success)', boxShadow: 'var(--shadow-card)',
                marginTop: '2rem',
              }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>🏆</div>
              <h2 style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                Activity Complete!
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                Final Score: <strong style={{ color: 'var(--color-primary)' }}>{finalScore}</strong>
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Time: {formatTime(elapsed)}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => { setFinalScore(null); setElapsed(0) }}
                  style={{
                    padding: '1rem 1.75rem', borderRadius: 'var(--radius)', minHeight: '56px',
                    border: 'none', background: 'var(--gradient-btn)',
                    color: '#fff', fontFamily: 'var(--font-display)', fontSize: '0.95rem',
                    cursor: 'pointer', boxShadow: 'var(--shadow)',
                  }}
                >
                  ↺ Play Again
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => router.push(`/${locale}/activities`)}
                  style={{
                    padding: '1rem 1.75rem', borderRadius: 'var(--radius)', minHeight: '56px',
                    border: '2px solid var(--color-border)', background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)', fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  Browse More
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ActivityPlayer
                activity={activity}
                theme={audience}
                locale={locale}
                onComplete={handleComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
