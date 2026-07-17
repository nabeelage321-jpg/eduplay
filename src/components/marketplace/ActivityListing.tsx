// src/components/marketplace/ActivityListing.tsx
'use client'

import { useState } from 'react'
import { MARKETPLACE_MIN_PRICE_USD, MARKETPLACE_MAX_PRICE_USD, MARKETPLACE_TEACHER_SHARE } from '@/lib/stripe/tiers'

interface ActivityOption {
  id: string
  title: string
  type: string
}

interface ActivityListingProps {
  teacherActivities: ActivityOption[]
  onSubmit: (data: { activityId: string; priceUSD: number; description: string }) => Promise<void>
}

export default function ActivityListing({ teacherActivities, onSubmit }: ActivityListingProps) {
  const [activityId, setActivityId] = useState(teacherActivities[0]?.id ?? '')
  const [price, setPrice] = useState(3)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const teacherEarnings = Math.round(price * MARKETPLACE_TEACHER_SHARE * 100) / 100
  const platformFee = Math.round(price * (1 - MARKETPLACE_TEACHER_SHARE) * 100) / 100

  const handleSubmit = async () => {
    if (!activityId) {
      setError('Please select an activity.')
      return
    }
    if (price < MARKETPLACE_MIN_PRICE_USD || price > MARKETPLACE_MAX_PRICE_USD) {
      setError(`Price must be between $${MARKETPLACE_MIN_PRICE_USD} and $${MARKETPLACE_MAX_PRICE_USD}.`)
      return
    }
    if (description.trim().length < 20) {
      setError('Please write a description of at least 20 characters.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await onSubmit({ activityId, priceUSD: price, description: description.trim() })
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '40px 24px',
          textAlign: 'center',
          border: '1px solid var(--color-border)',
        }}
        role="alert"
        aria-live="polite"
      >
        <p style={{ fontSize: '48px', margin: 0 }}>🎉</p>
        <h2 style={{ margin: '12px 0 8px', color: 'var(--color-text-primary)' }}>
          Activity Listed!
        </h2>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
          Your activity is now live on the marketplace. Earnings will appear in your dashboard
          within 24 hours of each purchase.
        </p>
      </div>
    )
  }

  return (
    <section
      aria-label="List activity on marketplace"
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        padding: '24px',
        maxWidth: '540px',
      }}
    >
      <h2
        style={{
          margin: '0 0 4px',
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
        }}
      >
        🏷️ List Activity for Sale
      </h2>
      <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
        Earn money from activities you create — you keep 70% of every sale.
      </p>

      {/* Activity selector */}
      <div style={{ marginBlockEnd: '20px' }}>
        <label
          htmlFor="activity-select"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBlockEnd: '6px',
          }}
        >
          Select Activity
        </label>
        <select
          id="activity-select"
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
          }}
        >
          {teacherActivities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} ({a.type})
            </option>
          ))}
        </select>
      </div>

      {/* Price slider */}
      <div style={{ marginBlockEnd: '20px' }}>
        <label
          htmlFor="price-input"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBlockEnd: '6px',
          }}
        >
          <span>Price</span>
          <span
            style={{
              color: 'var(--color-primary)',
              fontSize: '18px',
              fontFamily: 'var(--font-display)',
            }}
          >
            ${price}
          </span>
        </label>
        <input
          id="price-input"
          type="range"
          min={MARKETPLACE_MIN_PRICE_USD}
          max={MARKETPLACE_MAX_PRICE_USD}
          step={1}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
          aria-valuemin={MARKETPLACE_MIN_PRICE_USD}
          aria-valuemax={MARKETPLACE_MAX_PRICE_USD}
          aria-valuenow={price}
          aria-label={`Price: $${price}`}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: 'var(--color-text-muted)',
          }}
        >
          <span>${MARKETPLACE_MIN_PRICE_USD}</span>
          <span>${MARKETPLACE_MAX_PRICE_USD}</span>
        </div>

        {/* Revenue breakdown */}
        <div
          style={{
            marginBlockStart: '12px',
            padding: '10px 14px',
            background: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBlockEnd: '4px' }}>
            <span>You earn (70%)</span>
            <strong style={{ color: 'var(--color-success)' }}>${teacherEarnings}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>EduPlay fee (30%)</span>
            <span>${platformFee}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBlockEnd: '24px' }}>
        <label
          htmlFor="description-input"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBlockEnd: '6px',
          }}
        >
          Marketplace Description
        </label>
        <textarea
          id="description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what students will learn, grade level, how to use it…"
          rows={4}
          maxLength={500}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-background)',
            color: 'var(--color-text-primary)',
            fontSize: '14px',
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
          aria-describedby="description-count"
        />
        <div
          id="description-count"
          style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'end' }}
        >
          {description.length}/500
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 'var(--radius-sm)',
            fontSize: '14px',
            marginBlockEnd: '16px',
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        aria-busy={loading}
        style={{
          width: '100%',
          padding: '12px',
          background: loading ? 'var(--color-surface-alt)' : 'var(--gradient-btn)',
          color: loading ? 'var(--color-text-muted)' : '#fff',
          border: 'none',
          borderRadius: 'var(--radius)',
          fontSize: '16px',
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.15s',
        }}
      >
        {loading ? '⏳ Listing…' : '🚀 List for Sale'}
      </button>
    </section>
  )
}
