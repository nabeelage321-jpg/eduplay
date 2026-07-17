// src/lib/stripe/tiers.ts
// EduPlay Freemium Tier Definitions
// Never import from this file in client components — use the re-export in @/lib/tiers-client.ts

export type TierId = 'free' | 'pro' | 'school'

export interface TierLimits {
  maxStudentsPerSession: number | null       // null = unlimited
  aiGenerationsPerDay: number | null         // null = unlimited
  aiModel: 'claude-haiku-4-5' | 'claude-sonnet-4-6'
  maxPublicActivities: number | null
  analyticsRetentionDays: number            // days of history
  watermark: boolean
  printExportBranded: boolean
  prioritySupport: boolean
  maxTeacherAccounts: number | null         // school tier only
  schoolBranding: boolean
  googleClassroomSync: boolean
  lmsExport: boolean
  adminDashboard: boolean
  marketplaceSell: boolean
}

export interface Tier {
  id: TierId
  name: string
  tagline: string
  priceUSD: number                          // monthly, 0 = free
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  limits: TierLimits
  highlightFeatures: string[]               // bullet points shown in pricing card
}

export const TIERS: Record<TierId, Tier> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Perfect for getting started',
    priceUSD: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    limits: {
      maxStudentsPerSession: 30,
      aiGenerationsPerDay: 10,
      aiModel: 'claude-haiku-4-5',
      maxPublicActivities: 5,
      analyticsRetentionDays: 7,
      watermark: true,
      printExportBranded: true,
      prioritySupport: false,
      maxTeacherAccounts: null,
      schoolBranding: false,
      googleClassroomSync: false,
      lmsExport: false,
      adminDashboard: false,
      marketplaceSell: false,
    },
    highlightFeatures: [
      'Unlimited activity creation',
      'Up to 30 students per live session',
      '10 AI generations per day',
      '5 public activities',
      '7-day analytics history',
      'EduPlay watermark on exports',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'For serious educators',
    priceUSD: 5,
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? '',
    limits: {
      maxStudentsPerSession: null,
      aiGenerationsPerDay: null,
      aiModel: 'claude-sonnet-4-6',
      maxPublicActivities: null,
      analyticsRetentionDays: 365,
      watermark: false,
      printExportBranded: false,
      prioritySupport: true,
      maxTeacherAccounts: null,
      schoolBranding: false,
      googleClassroomSync: true,
      lmsExport: true,
      adminDashboard: false,
      marketplaceSell: true,
    },
    highlightFeatures: [
      'Unlimited students per session',
      'Unlimited AI generations (Claude Sonnet)',
      'Unlimited public activities',
      '1-year analytics history',
      'No watermark on exports',
      'Google Classroom & LMS integration',
      'Sell activities on marketplace',
      'Priority support',
    ],
  },

  school: {
    id: 'school',
    name: 'School',
    tagline: 'For entire institutions',
    priceUSD: 29,
    stripePriceIdMonthly: process.env.STRIPE_SCHOOL_MONTHLY_PRICE_ID ?? '',
    stripePriceIdYearly: process.env.STRIPE_SCHOOL_YEARLY_PRICE_ID ?? '',
    limits: {
      maxStudentsPerSession: null,
      aiGenerationsPerDay: null,
      aiModel: 'claude-sonnet-4-6',
      maxPublicActivities: null,
      analyticsRetentionDays: 365,
      watermark: false,
      printExportBranded: false,
      prioritySupport: true,
      maxTeacherAccounts: 50,
      schoolBranding: true,
      googleClassroomSync: true,
      lmsExport: true,
      adminDashboard: true,
      marketplaceSell: true,
    },
    highlightFeatures: [
      'Everything in Pro',
      'Up to 50 teacher accounts',
      'Custom school branding & colours',
      'Admin dashboard',
      'Google Classroom + LMS integration',
      'Dedicated support',
    ],
  },
}

// ─── Permission helpers ────────────────────────────────────────────────────

/** Returns the tier object for a given tier ID, defaulting to free */
export function getTier(tierId: TierId | string | null | undefined): Tier {
  const id = tierId as TierId
  return TIERS[id] ?? TIERS.free
}

/** Check if a teacher can run more AI generations today */
export function canGenerateAI(
  tierId: TierId,
  generationsToday: number,
): boolean {
  const { aiGenerationsPerDay } = TIERS[tierId].limits
  if (aiGenerationsPerDay === null) return true
  return generationsToday < aiGenerationsPerDay
}

/** Check if a session can accept more students */
export function canAddStudent(tierId: TierId, currentCount: number): boolean {
  const { maxStudentsPerSession } = TIERS[tierId].limits
  if (maxStudentsPerSession === null) return true
  return currentCount < maxStudentsPerSession
}

/** Check if teacher can publish more public activities */
export function canPublishActivity(
  tierId: TierId,
  currentPublicCount: number,
): boolean {
  const { maxPublicActivities } = TIERS[tierId].limits
  if (maxPublicActivities === null) return true
  return currentPublicCount < maxPublicActivities
}

/** Get the AI model string for a tier */
export function getAIModel(tierId: TierId): string {
  return TIERS[tierId].limits.aiModel
}

/** Check a named feature flag */
export function hasFeature(
  tierId: TierId,
  feature: keyof Pick<
    TierLimits,
    | 'googleClassroomSync'
    | 'lmsExport'
    | 'adminDashboard'
    | 'schoolBranding'
    | 'marketplaceSell'
    | 'prioritySupport'
  >,
): boolean {
  return TIERS[tierId].limits[feature]
}

/** Marketplace revenue split constants */
export const MARKETPLACE_TEACHER_SHARE = 0.7  // 70% to teacher
export const MARKETPLACE_PLATFORM_SHARE = 0.3 // 30% to EduPlay
export const MARKETPLACE_MIN_PRICE_USD = 1
export const MARKETPLACE_MAX_PRICE_USD = 10
