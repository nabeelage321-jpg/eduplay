// src/tests/tiers.test.ts
import { describe, it, expect } from 'vitest'
import {
  getTier,
  canGenerateAI,
  canAddStudent,
  canPublishActivity,
  getAIModel,
  hasFeature,
  TIERS,
} from '@/lib/stripe/tiers'

describe('getTier', () => {
  it('returns free tier for null', () => {
    expect(getTier(null)).toEqual(TIERS.free)
  })

  it('returns free tier for undefined', () => {
    expect(getTier(undefined)).toEqual(TIERS.free)
  })

  it('returns free tier for unknown string', () => {
    expect(getTier('unknown')).toEqual(TIERS.free)
  })

  it('returns pro tier for "pro"', () => {
    expect(getTier('pro')).toEqual(TIERS.pro)
  })

  it('returns school tier for "school"', () => {
    expect(getTier('school')).toEqual(TIERS.school)
  })
})

describe('canGenerateAI', () => {
  it('free tier: allows generation below daily limit', () => {
    expect(canGenerateAI('free', 9)).toBe(true)
  })

  it('free tier: blocks at daily limit', () => {
    expect(canGenerateAI('free', 10)).toBe(false)
  })

  it('free tier: blocks above daily limit', () => {
    expect(canGenerateAI('free', 15)).toBe(false)
  })

  it('pro tier: always allows generation (unlimited)', () => {
    expect(canGenerateAI('pro', 9999)).toBe(true)
  })

  it('school tier: always allows generation (unlimited)', () => {
    expect(canGenerateAI('school', 9999)).toBe(true)
  })
})

describe('canAddStudent', () => {
  it('free tier: allows up to 30 students', () => {
    expect(canAddStudent('free', 29)).toBe(true)
  })

  it('free tier: blocks at 30 students', () => {
    expect(canAddStudent('free', 30)).toBe(false)
  })

  it('free tier: blocks above 30 students', () => {
    expect(canAddStudent('free', 50)).toBe(false)
  })

  it('pro tier: allows unlimited students', () => {
    expect(canAddStudent('pro', 10000)).toBe(true)
  })

  it('school tier: allows unlimited students', () => {
    expect(canAddStudent('school', 10000)).toBe(true)
  })
})

describe('canPublishActivity', () => {
  it('free tier: allows up to 5 public activities', () => {
    expect(canPublishActivity('free', 4)).toBe(true)
  })

  it('free tier: blocks at 5 public activities', () => {
    expect(canPublishActivity('free', 5)).toBe(false)
  })

  it('pro tier: allows unlimited public activities', () => {
    expect(canPublishActivity('pro', 1000)).toBe(true)
  })

  it('school tier: allows unlimited public activities', () => {
    expect(canPublishActivity('school', 1000)).toBe(true)
  })
})

describe('getAIModel', () => {
  it('free tier uses Haiku model', () => {
    expect(getAIModel('free')).toBe('claude-haiku-4-5')
  })

  it('pro tier uses Sonnet model', () => {
    expect(getAIModel('pro')).toBe('claude-sonnet-4-6')
  })

  it('school tier uses Sonnet model', () => {
    expect(getAIModel('school')).toBe('claude-sonnet-4-6')
  })
})

describe('hasFeature', () => {
  it('free tier: no Google Classroom sync', () => {
    expect(hasFeature('free', 'googleClassroomSync')).toBe(false)
  })

  it('pro tier: has Google Classroom sync', () => {
    expect(hasFeature('pro', 'googleClassroomSync')).toBe(true)
  })

  it('school tier: has Google Classroom sync', () => {
    expect(hasFeature('school', 'googleClassroomSync')).toBe(true)
  })

  it('free tier: no marketplace selling', () => {
    expect(hasFeature('free', 'marketplaceSell')).toBe(false)
  })

  it('pro tier: can sell on marketplace', () => {
    expect(hasFeature('pro', 'marketplaceSell')).toBe(true)
  })

  it('free tier: no admin dashboard', () => {
    expect(hasFeature('free', 'adminDashboard')).toBe(false)
  })

  it('school tier: has admin dashboard', () => {
    expect(hasFeature('school', 'adminDashboard')).toBe(true)
  })

  it('free tier: no school branding', () => {
    expect(hasFeature('free', 'schoolBranding')).toBe(false)
  })

  it('school tier: has school branding', () => {
    expect(hasFeature('school', 'schoolBranding')).toBe(true)
  })

  it('free tier: no LMS export', () => {
    expect(hasFeature('free', 'lmsExport')).toBe(false)
  })

  it('pro tier: has LMS export', () => {
    expect(hasFeature('pro', 'lmsExport')).toBe(true)
  })
})

describe('Tier watermark settings', () => {
  it('free tier has watermark', () => {
    expect(TIERS.free.limits.watermark).toBe(true)
  })

  it('pro tier has no watermark', () => {
    expect(TIERS.pro.limits.watermark).toBe(false)
  })

  it('school tier has no watermark', () => {
    expect(TIERS.school.limits.watermark).toBe(false)
  })
})

describe('Tier analytics retention', () => {
  it('free tier has 7-day analytics', () => {
    expect(TIERS.free.limits.analyticsRetentionDays).toBe(7)
  })

  it('pro tier has 365-day analytics', () => {
    expect(TIERS.pro.limits.analyticsRetentionDays).toBe(365)
  })
})

describe('Tier pricing', () => {
  it('free tier costs $0', () => {
    expect(TIERS.free.priceUSD).toBe(0)
  })

  it('pro tier costs $5/mo', () => {
    expect(TIERS.pro.priceUSD).toBe(5)
  })

  it('school tier costs $29/mo', () => {
    expect(TIERS.school.priceUSD).toBe(29)
  })
})
