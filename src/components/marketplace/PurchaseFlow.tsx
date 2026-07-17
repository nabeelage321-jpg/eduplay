// src/components/marketplace/PurchaseFlow.tsx
'use client'

import { useState } from 'react'
import type { MarketplaceActivity } from './MarketplaceHome'

interface PurchaseFlowProps {
  activity: MarketplaceActivity
  onPurchase: (activityId: string) => Promise<{ checkoutUrl: string }>
  isLoggedIn: boolean
  locale?: string
}

export default function PurchaseFlow({
  activity,
  onPurchase,
  isLoggedIn,
  locale = 'en',
}: PurchaseFlowProps) {
  const [step, setStep] = useState<'preview' | 'confirm' | 'loading' | 'success' | 'error'>(
    'preview',
  )
  const [errorMsg, setErrorMsg] = useState('')

  if (activity.isPurchased) {
    return (
      <div
        style={{
          background: '#f0fdf4',
          border: '2px solid #22c55e',
          borderRadius: 'var(--radius)',
          padding: '20px',
          textAlign: 'center',
        }}
        role="status"
      >
        <p style={{ fontSize: '32px', margin: 0 }}>✅</p>
        <p style={{ fontWeight: 700, color: '#15803d', marginBlockStart: '8px' }}>
          You own this activity!
        </p>
        <a
          href={`/${locale}/activity/${activity.id}`}
          style={{
            display: 'inline-block',
            marginBlockStart: '12px',
            padding: '10px 24px',
            background: '#22c55e',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '15px',
          }}
        >
          Use Activity ▶
        </a>
      </div>
    )
  }

  const handleBuy = async () => {
    if (!isLoggedIn) {
      window.location.href = `/auth/signin?callbackUrl=/marketplace/activity/${activity.id}`
      return
    }

    setStep('loading')
    try {
      const { checkoutUrl } = await onPurchase(activity.id)
      window.location.href = checkoutUrl
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Purchase failed. Please try again.')
      setStep('error')
    }
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}
    >
      {/* Activity summary */}
      <div
        style={{
          background: 'var(--gradient-hero)',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '56px', display: 'block' }}>
          {activity.typeEmoji}
        </span>
        <h2
          style={{
            margin: '8px 0 4px',
            fontSize: '20px',
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {activity.title}
        </h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
          by {activity.teacherName}
        </p>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBlockEnd: '20px',
          }}
        >
          {[
            { label: 'Subject', value: activity.subject },
            { label: 'Grade', value: activity.grade },
            { label: 'Type', value: activity.type },
            { label: 'Language', value: activity.locale.toUpperCase() },
            { label: 'Plays', value: activity.playCount.toLocaleString() },
            { label: 'Rating', value: `${activity.rating.toFixed(1)}/5 (${activity.ratingCount})` },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                {label}
              </dt>
              <dd style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                {value}
              </dd>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '0 0 20px' }}>
          {activity.description}
        </p>

        {/* What you get */}
        <div
          style={{
            background: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            marginBlockEnd: '20px',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <strong style={{ color: 'var(--color-text-primary)', display: 'block', marginBlockEnd: '8px' }}>
            What you get:
          </strong>
          {['Lifetime access to this activity', 'Use with unlimited students', 'All future updates included', 'Download & print version'].map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBlockEnd: '4px' }}>
              <span aria-hidden="true" style={{ color: '#22c55e' }}>✓</span>
              {item}
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        {step === 'error' && (
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
            {errorMsg}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)',
              }}
            >
              ${activity.priceUSD}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'block' }}>
              one-time payment
            </span>
          </div>

          <button
            onClick={handleBuy}
            disabled={step === 'loading'}
            aria-busy={step === 'loading'}
            style={{
              flex: 1,
              padding: '14px',
              background: step === 'loading' ? 'var(--color-surface-alt)' : 'var(--gradient-btn)',
              color: step === 'loading' ? 'var(--color-text-muted)' : '#fff',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: '16px',
              fontWeight: 700,
              cursor: step === 'loading' ? 'not-allowed' : 'pointer',
            }}
          >
            {step === 'loading'
              ? '⏳ Redirecting…'
              : isLoggedIn
              ? `Buy for $${activity.priceUSD}`
              : 'Sign in to Buy'}
          </button>
        </div>

        <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
          🔒 Secure checkout via Stripe · 30-day refund guarantee
        </p>
      </div>
    </div>
  )
}
