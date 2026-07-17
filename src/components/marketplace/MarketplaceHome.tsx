// src/components/marketplace/MarketplaceHome.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface MarketplaceActivity {
  id: string
  title: string
  description: string
  type: string
  typeEmoji: string
  subject: string
  grade: string
  locale: string
  priceUSD: number
  teacherName: string
  teacherUsername: string
  playCount: number
  rating: number       // 0-5
  ratingCount: number
  previewImageUrl?: string
  isPurchased?: boolean
}

interface MarketplaceHomeProps {
  activities: MarketplaceActivity[]
  loading?: boolean
  locale?: string
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
      aria-label={`Rating: ${rating.toFixed(1)} out of 5 (${count} reviews)`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          aria-hidden="true"
          style={{
            fontSize: '12px',
            color: star <= Math.round(rating) ? '#f59e0b' : '#d1d5db',
          }}
        >
          ★
        </span>
      ))}
      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
        ({count})
      </span>
    </div>
  )
}

function ActivityCard({ activity, locale }: { activity: MarketplaceActivity; locale: string }) {
  return (
    <article
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Thumbnail */}
      <div
        style={{
          height: '120px',
          background: 'var(--gradient-hero)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          position: 'relative',
        }}
        aria-hidden="true"
      >
        {activity.typeEmoji}
        {activity.isPurchased && (
          <span
            style={{
              position: 'absolute',
              insetBlockStart: '8px',
              insetInlineEnd: '8px',
              background: '#22c55e',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            ✅ Owned
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--color-primary)',
              background: 'var(--color-surface-alt)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              textTransform: 'uppercase',
            }}
          >
            {activity.subject}
          </span>
          <span
            style={{
              fontSize: '10px',
              color: 'var(--color-text-muted)',
              background: 'var(--color-surface-alt)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            {activity.grade}
          </span>
        </div>

        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            lineHeight: 1.3,
          }}
        >
          {activity.title}
        </h3>

        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            lineHeight: 1.4,
            flex: 1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {activity.description}
        </p>

        <StarRating rating={activity.rating} count={activity.ratingCount} />

        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
          }}
        >
          by{' '}
          <Link
            href={`/${locale}/teacher/${activity.teacherUsername}`}
            style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}
          >
            {activity.teacherName}
          </Link>
          {' · '}{activity.playCount.toLocaleString()} plays
        </div>
      </div>

      {/* Footer CTA */}
      <div
        style={{
          padding: '10px 12px',
          borderBlockStart: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          ${activity.priceUSD}
        </span>

        {activity.isPurchased ? (
          <Link
            href={`/${locale}/activity/${activity.id}`}
            style={{
              padding: '7px 14px',
              background: 'var(--color-surface-alt)',
              color: 'var(--color-text-primary)',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            View ▶
          </Link>
        ) : (
          <Link
            href={`/marketplace/activity/${activity.id}`}
            style={{
              padding: '7px 14px',
              background: 'var(--gradient-btn)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Buy Now
          </Link>
        )}
      </div>
    </article>
  )
}

export default function MarketplaceHome({
  activities,
  loading = false,
  locale = 'en',
}: MarketplaceHomeProps) {
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'price'>('popular')

  const subjects = ['all', ...Array.from(new Set(activities.map((a) => a.subject)))]

  const filtered = activities
    .filter((a) => {
      const matchSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.description.toLowerCase().includes(search.toLowerCase())
      const matchSubject = subjectFilter === 'all' || a.subject === subjectFilter
      return matchSearch && matchSubject
    })
    .sort((a, b) => {
      if (sortBy === 'popular') return b.playCount - a.playCount
      if (sortBy === 'price') return a.priceUSD - b.priceUSD
      return 0
    })

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          background: 'var(--gradient-hero)',
          borderRadius: 'var(--radius-lg)',
          padding: '32px 24px',
          marginBlockEnd: '24px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: '28px',
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'var(--font-display)',
          }}
        >
          🛍️ Activity Marketplace
        </h1>
        <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.85)', fontSize: '15px' }}>
          Premium activities created by top educators — ready to use in minutes
        </p>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities…"
          aria-label="Search marketplace activities"
          style={{
            width: '100%',
            maxWidth: '480px',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            border: 'none',
            fontSize: '15px',
            background: '#fff',
            color: 'var(--color-text-primary)',
            boxShadow: 'var(--shadow)',
            outline: 'none',
          }}
        />
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          marginBlockEnd: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }} role="group" aria-label="Filter by subject">
          {subjects.slice(0, 8).map((s) => (
            <button
              key={s}
              onClick={() => setSubjectFilter(s)}
              aria-pressed={subjectFilter === s}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: subjectFilter === s ? 'var(--color-primary)' : 'var(--color-surface)',
                color: subjectFilter === s ? '#fff' : 'var(--color-text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <label htmlFor="sort-select" style={{ fontSize: '13px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
          Sort:
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          style={{
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <option value="popular">Most Popular</option>
          <option value="newest">Newest</option>
          <option value="price">Lowest Price</option>
        </select>
      </div>

      {/* Results count */}
      <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
        {loading ? 'Loading…' : `${filtered.length} activities found`}
      </p>

      {/* Grid */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                height: '320px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '48px', margin: 0 }}>🔍</p>
          <p style={{ color: 'var(--color-text-muted)', marginBlockStart: '8px' }}>
            No activities found for &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {filtered.map((a) => (
            <ActivityCard key={a.id} activity={a} locale={locale} />
          ))}
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
    </div>
  )
}
