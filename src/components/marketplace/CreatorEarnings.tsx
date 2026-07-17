// src/components/marketplace/CreatorEarnings.tsx
'use client'

import { useState } from 'react'

export interface EarningEntry {
  id: string
  activityTitle: string
  buyerLocale: string
  grossUSD: number
  teacherShareUSD: number
  purchasedAt: string
  status: 'pending' | 'paid'
}

interface PayoutSettings {
  paypalEmail?: string
  bankLinked?: boolean
  minimumPayoutUSD: number
}

interface CreatorEarningsProps {
  earnings: EarningEntry[]
  pendingPayoutUSD: number
  totalEarnedUSD: number
  payoutSettings: PayoutSettings
  onUpdatePayout: (email: string) => Promise<void>
  loading?: boolean
}

export default function CreatorEarnings({
  earnings,
  pendingPayoutUSD,
  totalEarnedUSD,
  payoutSettings,
  onUpdatePayout,
  loading = false,
}: CreatorEarningsProps) {
  const [paypalInput, setPaypalInput] = useState(payoutSettings.paypalEmail ?? '')
  const [savingPayout, setSavingPayout] = useState(false)
  const [payoutSaved, setPayoutSaved] = useState(false)

  const handleSavePayout = async () => {
    setSavingPayout(true)
    try {
      await onUpdatePayout(paypalInput)
      setPayoutSaved(true)
      setTimeout(() => setPayoutSaved(false), 3000)
    } finally {
      setSavingPayout(false)
    }
  }

  const canPayout = pendingPayoutUSD >= payoutSettings.minimumPayoutUSD

  if (loading) {
    return (
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          padding: '24px',
          minHeight: '300px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
        aria-busy="true"
        aria-label="Loading earnings"
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '12px',
        }}
      >
        {[
          {
            label: 'Total Earned',
            value: `$${totalEarnedUSD.toFixed(2)}`,
            icon: '💰',
            highlight: false,
          },
          {
            label: 'Pending Payout',
            value: `$${pendingPayoutUSD.toFixed(2)}`,
            icon: '⏳',
            highlight: canPayout,
          },
          {
            label: 'Activities Sold',
            value: earnings.filter((e) => e.status === 'paid').length.toLocaleString(),
            icon: '🛍️',
            highlight: false,
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: card.highlight ? 'var(--gradient-hero)' : 'var(--color-surface)',
              border: card.highlight ? 'none' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius)',
              padding: '16px 20px',
            }}
          >
            <div style={{ fontSize: '28px' }} aria-hidden="true">
              {card.icon}
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: card.highlight ? '#fff' : 'var(--color-text-primary)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {card.value}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: card.highlight ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)',
              }}
            >
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Payout settings */}
      <section
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--color-border)',
          padding: '20px',
        }}
        aria-label="Payout settings"
      >
        <h3
          style={{
            margin: '0 0 16px',
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
          }}
        >
          💳 Payout Settings
        </h3>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <label
              htmlFor="paypal-email"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBlockEnd: '6px',
              }}
            >
              PayPal Email
            </label>
            <input
              id="paypal-email"
              type="email"
              value={paypalInput}
              onChange={(e) => setPaypalInput(e.target.value)}
              placeholder="your@paypal.com"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleSavePayout}
            disabled={savingPayout || !paypalInput}
            aria-busy={savingPayout}
            style={{
              padding: '9px 18px',
              background: 'var(--gradient-btn)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: savingPayout || !paypalInput ? 'not-allowed' : 'pointer',
              opacity: savingPayout || !paypalInput ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {savingPayout ? 'Saving…' : payoutSaved ? '✅ Saved!' : 'Save'}
          </button>
        </div>

        <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Payouts are processed monthly when balance reaches ${payoutSettings.minimumPayoutUSD}.
          {!canPayout && ` You need $${(payoutSettings.minimumPayoutUSD - pendingPayoutUSD).toFixed(2)} more to trigger payout.`}
        </p>
      </section>

      {/* Transaction history */}
      <section
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
        aria-label="Transaction history"
      >
        <div style={{ padding: '16px 20px', borderBlockEnd: '1px solid var(--color-border)' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            📋 Transaction History
          </h3>
        </div>

        {earnings.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '40px', margin: 0 }}>💸</p>
            <p style={{ color: 'var(--color-text-muted)', marginBlockStart: '8px' }}>
              No earnings yet. List activities on the marketplace to start earning!
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-alt)' }}>
                  {['Activity', 'Date', 'Gross', 'Your Share', 'Status'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        padding: '10px 16px',
                        textAlign: 'start',
                        fontWeight: 600,
                        color: 'var(--color-text-muted)',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBlockEnd: '1px solid var(--color-border)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {earnings.map((e) => (
                  <tr key={e.id} style={{ borderBlockEnd: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {e.activityTitle}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(e.purchasedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--color-text-secondary)' }}>
                      ${e.grossUSD.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 700, color: '#16a34a' }}>
                      ${e.teacherShareUSD.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: e.status === 'paid' ? '#dcfce7' : '#fef9c3',
                          color: e.status === 'paid' ? '#15803d' : '#854d0e',
                        }}
                      >
                        {e.status === 'paid' ? '✅ Paid' : '⏳ Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
    </div>
  )
}
