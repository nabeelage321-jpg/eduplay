/**
 * Unit tests — Adaptive Difficulty Engine (Phase 4)
 */

import { describe, it, expect } from 'vitest'
import {
  analyzeStudentPerformance,
  type StudentAnswer,
} from '@/lib/ai/adaptive'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAnswer(
  overrides: Partial<StudentAnswer> = {}
): StudentAnswer {
  return {
    questionId: `q-${Math.random()}`,
    correct: true,
    timeMs: 8000,
    topic: 'math',
    difficulty: 'medium',
    subject: 'mathematics',
    ...overrides,
  }
}

function makeAnswers(
  count: number,
  correct: boolean,
  overrides: Partial<StudentAnswer> = {}
): StudentAnswer[] {
  return Array.from({ length: count }, () => makeAnswer({ correct, ...overrides }))
}

// ─── Default (no history) ─────────────────────────────────────────────────────

describe('analyzeStudentPerformance — no history', () => {
  it('returns medium difficulty with empty answers', () => {
    const rec = analyzeStudentPerformance([])
    expect(rec.recommendedDifficulty).toBe('medium')
    expect(rec.weakTopics).toHaveLength(0)
    expect(rec.strongTopics).toHaveLength(0)
    expect(rec.accuracyRate).toBe(0)
  })

  it('returns stable trend with empty answers', () => {
    const rec = analyzeStudentPerformance([])
    expect(rec.performanceTrend).toBe('stable')
  })
})

// ─── Accuracy rate ────────────────────────────────────────────────────────────

describe('accuracyRate', () => {
  it('calculates 100% for all correct', () => {
    const rec = analyzeStudentPerformance(makeAnswers(10, true))
    expect(rec.accuracyRate).toBe(1.0)
  })

  it('calculates 0% for all incorrect', () => {
    const rec = analyzeStudentPerformance(makeAnswers(10, false))
    expect(rec.accuracyRate).toBe(0.0)
  })

  it('calculates 50% for half correct', () => {
    const answers = [
      ...makeAnswers(5, true),
      ...makeAnswers(5, false),
    ]
    const rec = analyzeStudentPerformance(answers)
    expect(rec.accuracyRate).toBe(0.5)
  })

  it('calculates 80% for 8 out of 10', () => {
    const answers = [
      ...makeAnswers(8, true),
      ...makeAnswers(2, false),
    ]
    const rec = analyzeStudentPerformance(answers)
    expect(rec.accuracyRate).toBe(0.8)
  })
})

// ─── Difficulty recommendation ────────────────────────────────────────────────

describe('recommendedDifficulty', () => {
  it('recommends harder when accuracy is high (easy → medium)', () => {
    const answers = makeAnswers(10, true, { difficulty: 'easy', timeMs: 4000 })
    const rec = analyzeStudentPerformance(answers)
    expect(rec.recommendedDifficulty).toBe('medium')
  })

  it('recommends harder when accuracy is high (medium → hard)', () => {
    const answers = makeAnswers(10, true, { difficulty: 'medium', timeMs: 4000 })
    const rec = analyzeStudentPerformance(answers)
    expect(rec.recommendedDifficulty).toBe('hard')
  })

  it('stays hard when accuracy is high and already hard', () => {
    const answers = makeAnswers(10, true, { difficulty: 'hard', timeMs: 4000 })
    const rec = analyzeStudentPerformance(answers)
    expect(rec.recommendedDifficulty).toBe('hard')
  })

  it('recommends easier when accuracy is low (hard → medium)', () => {
    const answers = makeAnswers(10, false, { difficulty: 'hard' })
    const rec = analyzeStudentPerformance(answers)
    expect(rec.recommendedDifficulty).toBe('medium')
  })

  it('recommends easier when accuracy is low (medium → easy)', () => {
    const answers = makeAnswers(10, false, { difficulty: 'medium' })
    const rec = analyzeStudentPerformance(answers)
    expect(rec.recommendedDifficulty).toBe('easy')
  })

  it('stays easy when accuracy is low and already easy', () => {
    const answers = makeAnswers(10, false, { difficulty: 'easy' })
    const rec = analyzeStudentPerformance(answers)
    expect(rec.recommendedDifficulty).toBe('easy')
  })

  it('maintains current difficulty when accuracy is in acceptable range', () => {
    // 70% accuracy = not too easy, not too hard
    const answers = [
      ...makeAnswers(7, true, { difficulty: 'medium' }),
      ...makeAnswers(3, false, { difficulty: 'medium' }),
    ]
    const rec = analyzeStudentPerformance(answers)
    expect(rec.recommendedDifficulty).toBe('medium')
  })
})

// ─── Weak/strong topic detection ──────────────────────────────────────────────

describe('weak/strong topics', () => {
  it('identifies weak topics from low-accuracy answers', () => {
    const answers = [
      // fractions — 0% accuracy
      makeAnswer({ topic: 'fractions', correct: false }),
      makeAnswer({ topic: 'fractions', correct: false }),
      makeAnswer({ topic: 'fractions', correct: false }),
      // multiplication — 100% accuracy
      makeAnswer({ topic: 'multiplication', correct: true }),
      makeAnswer({ topic: 'multiplication', correct: true }),
      makeAnswer({ topic: 'multiplication', correct: true }),
    ]

    const rec = analyzeStudentPerformance(answers)
    expect(rec.weakTopics).toContain('fractions')
    expect(rec.weakTopics).not.toContain('multiplication')
  })

  it('identifies strong topics from high-accuracy answers', () => {
    const answers = [
      makeAnswer({ topic: 'addition', correct: true }),
      makeAnswer({ topic: 'addition', correct: true }),
      makeAnswer({ topic: 'addition', correct: true }),
      makeAnswer({ topic: 'division', correct: false }),
      makeAnswer({ topic: 'division', correct: false }),
    ]

    const rec = analyzeStudentPerformance(answers)
    expect(rec.strongTopics).toContain('addition')
    expect(rec.strongTopics).not.toContain('division')
  })

  it('does not flag topic as weak if only 1 answer (insufficient data)', () => {
    const answers = [
      makeAnswer({ topic: 'rare-topic', correct: false }),
      ...makeAnswers(8, true, { topic: 'common-topic' }),
    ]

    const rec = analyzeStudentPerformance(answers)
    expect(rec.weakTopics).not.toContain('rare-topic')
  })

  it('caps weak topics at 3', () => {
    const answers = [
      makeAnswer({ topic: 'fractions', correct: false }),
      makeAnswer({ topic: 'fractions', correct: false }),
      makeAnswer({ topic: 'decimals', correct: false }),
      makeAnswer({ topic: 'decimals', correct: false }),
      makeAnswer({ topic: 'geometry', correct: false }),
      makeAnswer({ topic: 'geometry', correct: false }),
      makeAnswer({ topic: 'algebra', correct: false }),
      makeAnswer({ topic: 'algebra', correct: false }),
    ]

    const rec = analyzeStudentPerformance(answers)
    expect(rec.weakTopics.length).toBeLessThanOrEqual(3)
  })
})

// ─── Performance trend ────────────────────────────────────────────────────────

describe('performanceTrend', () => {
  it('detects improving trend', () => {
    const answers = [
      // older: mostly wrong
      ...makeAnswers(5, false),
      // recent: mostly right
      ...makeAnswers(5, true),
    ]

    const rec = analyzeStudentPerformance(answers)
    expect(rec.performanceTrend).toBe('improving')
  })

  it('detects declining trend', () => {
    const answers = [
      // older: mostly right
      ...makeAnswers(5, true),
      // recent: mostly wrong
      ...makeAnswers(5, false),
    ]

    const rec = analyzeStudentPerformance(answers)
    expect(rec.performanceTrend).toBe('declining')
  })

  it('detects stable trend', () => {
    // Consistent 70% throughout
    const pattern = [true, true, true, false, false, true, true, true, false, false]
    const answers = pattern.map((c) => makeAnswer({ correct: c }))
    const rec = analyzeStudentPerformance(answers)
    expect(rec.performanceTrend).toBe('stable')
  })

  it('returns stable when fewer than 6 answers', () => {
    const answers = makeAnswers(4, true)
    const rec = analyzeStudentPerformance(answers)
    expect(rec.performanceTrend).toBe('stable')
  })
})

// ─── Average time ─────────────────────────────────────────────────────────────

describe('avgTimeSeconds', () => {
  it('calculates average time correctly', () => {
    const answers = [
      makeAnswer({ timeMs: 5000 }),
      makeAnswer({ timeMs: 15000 }),
    ]
    const rec = analyzeStudentPerformance(answers)
    expect(rec.avgTimeSeconds).toBe(10)
  })

  it('returns 0 for empty answers', () => {
    const rec = analyzeStudentPerformance([])
    expect(rec.avgTimeSeconds).toBe(0)
  })
})

// ─── Suggestions ──────────────────────────────────────────────────────────────

describe('suggestedActivities', () => {
  it('suggests review activities for weak topics', () => {
    const answers = [
      makeAnswer({ topic: 'fractions', correct: false, subject: 'math' }),
      makeAnswer({ topic: 'fractions', correct: false, subject: 'math' }),
    ]

    const rec = analyzeStudentPerformance(answers)
    const fractionSuggestion = rec.suggestedActivities.find(
      (s) => s.topic === 'fractions'
    )
    expect(fractionSuggestion).toBeDefined()
    expect(fractionSuggestion?.reason).toContain('fractions')
  })

  it('suggests challenge activities for strong topics', () => {
    const answers = makeAnswers(5, true, { topic: 'addition', subject: 'math', timeMs: 3000, difficulty: 'easy' })
    const rec = analyzeStudentPerformance(answers)
    const challengeSuggestion = rec.suggestedActivities.find(
      (s) => s.topic === 'addition' && s.difficulty !== 'easy'
    )
    expect(challengeSuggestion).toBeDefined()
  })

  it('returns no suggestions for empty history', () => {
    const rec = analyzeStudentPerformance([])
    expect(rec.suggestedActivities).toHaveLength(0)
  })
})

// ─── Analysis window ──────────────────────────────────────────────────────────

describe('analysis window', () => {
  it('only considers last 10 answers', () => {
    // First 15: all wrong on topic A → should be "old" and ignored
    const oldAnswers = makeAnswers(15, false, { topic: 'topic-a' })
    // Last 10: all right on topic B → should determine recommendation
    const recentAnswers = makeAnswers(10, true, { topic: 'topic-b', difficulty: 'easy', timeMs: 4000 })

    const rec = analyzeStudentPerformance([...oldAnswers, ...recentAnswers])

    // Based on recent 10: high accuracy → increase difficulty
    expect(rec.recommendedDifficulty).toBe('medium')
    expect(rec.weakTopics).not.toContain('topic-b')
  })
})
