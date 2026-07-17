'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { useThemeStore } from '@/lib/store/theme-store'

interface UpgradePageProps {
  locale: string
}

interface Plan {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  features: string[]
  highlighted?: boolean
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'unlimitedActivities',
      'fillBlank',
      'categorize',
      'order',
    ],
  },
  {
    id: 'starter',
    name: 'starter',
    monthlyPrice: 9,
    yearlyPrice: 90,
    features: [
      'unlimitedActivities',
      'liveGames',
      'unlimitedGenerations',
    ],
    highlighted: true,
  },
  {
    id: 'pro',
    name: 'pro',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      'unlimitedActivities',
      'liveGames',
      'unlimitedGenerations',
      'advancedAnalytics',
      'prioritySupport',
    ],
  },
  {
    id: 'enterprise',
    name: 'enterprise',
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      'unlimitedActivities',
      'liveGames',
      'unlimitedGenerations',
      'advancedAnalytics',
      'customBranding',
      'prioritySupport',
    ],
  },
]

export default function UpgradePage({ locale }: UpgradePageProps) {
  const t = useTranslations('upgrade')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  return (
    <div style={{ backgroundColor: 'var(--color-background)' }} className="min-h-screen">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            {t('title')}
          </h1>
          <p className="text-xl md:text-2xl mb-8" style={{ color: 'var(--color-text-secondary)' }}>
            {t('subtitle')}
          </p>

          {/* Billing Toggle */}
          <div className="flex justify-center gap-4 mb-12">
            <button
              onClick={() => setBillingCycle('monthly')}
              className="px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: billingCycle === 'monthly' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: billingCycle === 'monthly' ? 'white' : 'var(--color-text-primary)',
              }}
            >
              {t('monthlyBilling')}
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className="relative px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: billingCycle === 'yearly' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: billingCycle === 'yearly' ? 'white' : 'var(--color-text-primary)',
              }}
            >
              {t('yearlyBilling')}
              <span
                className="absolute -top-3 right-2 text-xs font-bold px-2 py-1 rounded"
                style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
              >
                {t('savePercentage')}
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative rounded-lg p-8 transition-transform"
              style={{
                backgroundColor: plan.highlighted ? 'var(--color-primary)' : 'var(--color-surface)',
                boxShadow: plan.highlighted ? '0 10px 30px rgba(0, 0, 0, 0.2)' : 'none',
                transform: plan.highlighted ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {plan.highlighted && (
                <div
                  className="absolute -top-4 inset-x-0 text-center"
                  style={{ color: 'var(--color-primary)' }}
                >
                  <span className="text-sm font-bold px-4 py-1 rounded-full" style={{ backgroundColor: 'var(--color-background)' }}>
                    Most Popular
                  </span>
                </div>
              )}

              <h3
                className="text-2xl font-bold mb-4"
                style={{ color: plan.highlighted ? 'white' : 'var(--color-text-primary)' }}
              >
                {t(plan.name)}
              </h3>

              <div className="mb-6">
                <span
                  className="text-4xl font-bold"
                  style={{ color: plan.highlighted ? 'white' : 'var(--color-primary)' }}
                >
                  ${billingCycle === 'monthly' ? plan.monthlyPrice : Math.floor(plan.yearlyPrice / 12)}
                </span>
                <span style={{ color: plan.highlighted ? 'rgba(255, 255, 255, 0.8)' : 'var(--color-text-secondary)' }}>
                  /{t('monthlyBilling').toLowerCase()}
                </span>
              </div>

              <button
                className="w-full py-3 rounded-lg font-semibold mb-6 transition-opacity"
                style={{
                  backgroundColor: plan.highlighted ? 'white' : 'var(--color-primary)',
                  color: plan.highlighted ? 'var(--color-primary)' : 'white',
                }}
              >
                {plan.id === 'free' ? 'Current Plan' : t('choosePlan')}
              </button>

              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <span style={{ color: plan.highlighted ? 'white' : 'var(--color-success)' }}>✓</span>
                    <span style={{ color: plan.highlighted ? 'rgba(255, 255, 255, 0.9)' : 'var(--color-text-secondary)' }}>
                      {t(feature as any)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8" style={{ color: 'var(--color-text-primary)' }}>
            {t('FAQ')}
          </h2>

          <div className="space-y-4">
            {[
              {
                q: 'Can I cancel my subscription anytime?',
                a: t('cancelAnytime'),
              },
              {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards through Stripe. Subscriptions renew automatically each billing cycle.',
              },
              {
                q: 'Do you offer team plans?',
                a: 'Yes! Contact our sales team for custom team and school district pricing.',
              },
              {
                q: 'Is there a free trial?',
                a: 'Our Free plan gives you unlimited access to create activities. Upgrade to Premium anytime to unlock live games and AI generation.',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-lg"
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {item.q}
                </h3>
                <p style={{ color: 'var(--color-text-secondary)' }}>{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center p-8 rounded-lg"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Need a custom solution?
          </h3>
          <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Our enterprise plans include dedicated support, custom integrations, and white-label options.
          </p>
          <button
            className="px-8 py-3 rounded-lg font-semibold"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
          >
            {t('contactSales')}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
