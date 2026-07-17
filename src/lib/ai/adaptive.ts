/**
 * EduPlay Adaptive Difficulty Engine (Phase 4)
 * Analyzes a student's last 10 answers to personalize learning.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StudentAnswer {
  questionId: string
  correct: boolean
  timeMs: number
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  subject: string
}

export interface AdaptiveRecommendation {
  recommendedDifficulty: 'easy' | 'medium' | 'hard'
  weakTopics: string[]
  strongTopics: string[]
  suggestedActivities: SuggestedActivity[]
  accuracyRate: number
  avgTimeSeconds: number
  performanceTrend: 'improving' | 'declining' | 'stable'
  message: string
}

export interface SuggestedActivity {
  type: string
  subject: string
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  reason: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCURACY_THRESHOLDS = {
  tooEasy: 0.85,   // above this → increase difficulty
  tooHard: 0.50,   // below this → decrease difficulty
} as const

const AVG_TIME_THRESHOLDS = {
  tooSlow: 30_000, // ms — above this may indicate struggle
  tooFast: 3_000,  // ms — below this may indicate guessing
} as const

const MAX_WEAK_TOPICS = 3
const ANALYSIS_WINDOW = 10

// ─── Core analysis ────────────────────────────────────────────────────────────

/**
 * Analyze the student's last N answers (up to ANALYSIS_WINDOW)
 * and return personalized recommendations.
 */
export function analyzeStudentPerformance(
  answers: StudentAnswer[]
): AdaptiveRecommendation {
  if (answers.length === 0) {
    return defaultRecommendation()
  }

  const recent = answers.slice(-ANALYSIS_WINDOW)

  const accuracyRate = calcAccuracyRate(recent)
  const avgTimeMs = calcAvgTime(recent)
  const avgTimeSec = avgTimeMs / 1000

  const topicStats = groupByTopic(recent)
  const weakTopics = getWeakTopics(topicStats)
  const strongTopics = getStrongTopics(topicStats)

  const recommendedDifficulty = calcRecommendedDifficulty(recent, accuracyRate, avgTimeMs)
  const performanceTrend = calcTrend(answers)
  const suggestedActivities = buildSuggestions(weakTopics, strongTopics, recommendedDifficulty, recent)

  return {
    recommendedDifficulty,
    weakTopics,
    strongTopics,
    suggestedActivities,
    accuracyRate,
    avgTimeSeconds: Math.round(avgTimeSec),
    performanceTrend,
    message: buildMessage(accuracyRate, performanceTrend, weakTopics),
  }
}

// ─── Accuracy ─────────────────────────────────────────────────────────────────

function calcAccuracyRate(answers: StudentAnswer[]): number {
  if (answers.length === 0) return 0
  const correct = answers.filter((a) => a.correct).length
  return parseFloat((correct / answers.length).toFixed(2))
}

// ─── Time ─────────────────────────────────────────────────────────────────────

function calcAvgTime(answers: StudentAnswer[]): number {
  if (answers.length === 0) return 0
  const total = answers.reduce((sum, a) => sum + a.timeMs, 0)
  return Math.round(total / answers.length)
}

// ─── Topic grouping ───────────────────────────────────────────────────────────

interface TopicStats {
  topic: string
  correct: number
  total: number
  accuracyRate: number
  avgTimeMs: number
}

function groupByTopic(answers: StudentAnswer[]): Map<string, TopicStats> {
  const map = new Map<string, TopicStats>()

  for (const answer of answers) {
    const existing = map.get(answer.topic) ?? {
      topic: answer.topic,
      correct: 0,
      total: 0,
      accuracyRate: 0,
      avgTimeMs: 0,
    }

    existing.correct += answer.correct ? 1 : 0
    existing.total += 1
    existing.avgTimeMs =
      (existing.avgTimeMs * (existing.total - 1) + answer.timeMs) / existing.total

    map.set(answer.topic, existing)
  }

  // Calculate accuracy rates
  for (const [key, stats] of map) {
    stats.accuracyRate = stats.total > 0 ? stats.correct / stats.total : 0
    map.set(key, stats)
  }

  return map
}

function getWeakTopics(topicStats: Map<string, TopicStats>): string[] {
  return [...topicStats.values()]
    .filter((s) => s.accuracyRate < ACCURACY_THRESHOLDS.tooHard && s.total >= 2)
    .sort((a, b) => a.accuracyRate - b.accuracyRate)
    .slice(0, MAX_WEAK_TOPICS)
    .map((s) => s.topic)
}

function getStrongTopics(topicStats: Map<string, TopicStats>): string[] {
  return [...topicStats.values()]
    .filter((s) => s.accuracyRate >= ACCURACY_THRESHOLDS.tooEasy && s.total >= 2)
    .sort((a, b) => b.accuracyRate - a.accuracyRate)
    .slice(0, 3)
    .map((s) => s.topic)
}

// ─── Difficulty calculation ───────────────────────────────────────────────────

function calcRecommendedDifficulty(
  answers: StudentAnswer[],
  accuracyRate: number,
  avgTimeMs: number
): 'easy' | 'medium' | 'hard' {
  // Determine current difficulty distribution
  const diffCounts = { easy: 0, medium: 0, hard: 0 }
  for (const a of answers) diffCounts[a.difficulty]++
  const dominant = (
    Object.entries(diffCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'medium'
  ) as 'easy' | 'medium' | 'hard'

  // Too fast + high accuracy → increase
  if (accuracyRate >= ACCURACY_THRESHOLDS.tooEasy && avgTimeMs < AVG_TIME_THRESHOLDS.tooSlow) {
    if (dominant === 'easy') return 'medium'
    if (dominant === 'medium') return 'hard'
    return 'hard'
  }

  // Low accuracy → decrease
  if (accuracyRate < ACCURACY_THRESHOLDS.tooHard) {
    if (dominant === 'hard') return 'medium'
    if (dominant === 'medium') return 'easy'
    return 'easy'
  }

  // Very slow + medium accuracy → stay same but flag
  return dominant
}

// ─── Trend ────────────────────────────────────────────────────────────────────

function calcTrend(allAnswers: StudentAnswer[]): 'improving' | 'declining' | 'stable' {
  if (allAnswers.length < 6) return 'stable'

  const half = Math.floor(allAnswers.length / 2)
  const olderHalf = allAnswers.slice(0, half)
  const recentHalf = allAnswers.slice(-half)

  const olderAccuracy = calcAccuracyRate(olderHalf)
  const recentAccuracy = calcAccuracyRate(recentHalf)
  const delta = recentAccuracy - olderAccuracy

  if (delta > 0.1) return 'improving'
  if (delta < -0.1) return 'declining'
  return 'stable'
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const REVIEW_ACTIVITY_TYPES = ['flashcards', 'quiz', 'match-up']
const CHALLENGE_ACTIVITY_TYPES = ['wordsearch', 'crossword', 'anagram']

function buildSuggestions(
  weakTopics: string[],
  strongTopics: string[],
  difficulty: 'easy' | 'medium' | 'hard',
  recent: StudentAnswer[]
): SuggestedActivity[] {
  const suggestions: SuggestedActivity[] = []

  // Suggest review activities for weak topics
  for (const topic of weakTopics.slice(0, 2)) {
    const subject = recent.find((a) => a.topic === topic)?.subject ?? 'general'
    const typeIndex = weakTopics.indexOf(topic) % REVIEW_ACTIVITY_TYPES.length
    suggestions.push({
      type: REVIEW_ACTIVITY_TYPES[typeIndex],
      subject,
      topic,
      difficulty: difficulty === 'hard' ? 'medium' : difficulty,
      reason: `Practice needed: low accuracy on "${topic}"`,
    })
  }

  // Suggest challenge activities for strong topics
  for (const topic of strongTopics.slice(0, 1)) {
    const subject = recent.find((a) => a.topic === topic)?.subject ?? 'general'
    suggestions.push({
      type: CHALLENGE_ACTIVITY_TYPES[Math.floor(Math.random() * CHALLENGE_ACTIVITY_TYPES.length)],
      subject,
      topic,
      difficulty: difficulty === 'easy' ? 'medium' : 'hard',
      reason: `Challenge yourself: you're strong at "${topic}"`,
    })
  }

  return suggestions
}

// ─── Human-readable message ───────────────────────────────────────────────────

function buildMessage(
  accuracyRate: number,
  trend: 'improving' | 'declining' | 'stable',
  weakTopics: string[]
): string {
  if (accuracyRate >= 0.9 && trend === 'improving') {
    return "Outstanding! You're on fire — time for a harder challenge!"
  }
  if (accuracyRate >= 0.75 && trend !== 'declining') {
    return weakTopics.length > 0
      ? `Great work! Focus a little more on: ${weakTopics.join(', ')}.`
      : "Great job! Keep up the excellent work!"
  }
  if (trend === 'declining') {
    return "Don't give up! Let's review some basics and build back up."
  }
  if (weakTopics.length > 0) {
    return `Keep practicing! Let's strengthen: ${weakTopics.join(', ')}.`
  }
  return "Keep it up! Every attempt makes you smarter."
}

// ─── Default (no history) ─────────────────────────────────────────────────────

function defaultRecommendation(): AdaptiveRecommendation {
  return {
    recommendedDifficulty: 'medium',
    weakTopics: [],
    strongTopics: [],
    suggestedActivities: [],
    accuracyRate: 0,
    avgTimeSeconds: 0,
    performanceTrend: 'stable',
    message: 'Start your first activity to get personalized recommendations!',
  }
}
