// EduPlay Platform — All TypeScript types
// Phase 1 already defined these; this file is the canonical source

export type Audience = 'ladies' | 'gents' | 'kids'

export type KidsTheme =
  | 'space' | 'ocean' | 'jungle' | 'princess' | 'superhero'
  | 'dinosaur' | 'candy' | 'farm' | 'robot' | 'magic'

export type SupportedLocale =
  | 'en' | 'ur' | 'ar' | 'hi' | 'es' | 'fr' | 'bn' | 'pt' | 'ru' | 'id' | 'zh'

export const RTL_LOCALES: SupportedLocale[] = ['ur', 'ar']

export type UserRole = 'teacher' | 'student' | 'parent' | 'admin'

export type ActivityTypeSlug =
  | 'quiz' | 'match-up' | 'anagram' | 'crossword' | 'wordsearch'
  | 'spin-wheel' | 'balloon-pop' | 'whack-a-mole' | 'true-false'
  | 'categorize' | 'order' | 'fill-blank' | 'labelled-diagram'
  | 'flashcards' | 'missing-word' | 'unjumble' | 'gameshow-quiz'
  | 'hangman' | 'random-wheel' | 'open-box'
  | 'memory-match' | 'typing-race' | 'bingo'

export interface ActivityItem {
  prompt: string
  answer: string
  answers?: string[]
  imageUrl?: string
  hint?: string
}

export interface Activity {
  id: string
  title: string
  description?: string
  type_id: string
  locale: string
  teacher_id: string
  subject_id?: string
  grade_id?: string
  curriculum_id?: string
  topic_id?: string
  items?: ActivityItem[]
  is_public: boolean
  tags?: string[]
  play_count?: number
  like_count?: number
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  locale: SupportedLocale
  country?: string
  is_premium: boolean
  theme_preference?: Audience
  created_at: string
}

export interface GameSession {
  id: string
  activity_id: string
  teacher_id: string
  room_code: string
  status: 'waiting' | 'active' | 'ended'
  game_mode: string
  player_count: number
  created_at: string
}

export interface GamePlayer {
  id: string
  session_id: string
  nickname: string
  score: number
  rank?: number
  joined_at: string
}

export interface Subject {
  id: string
  slug: string
  name_en: string
  name_ur: string
  name_ar?: string
  name_hi?: string
  name_es?: string
  emoji: string
  order: number
}

export interface Grade {
  id: string
  number: number
  label_en: string
  label_ur: string
  label_ar?: string
}

export interface Topic {
  id: string
  subject_id: string
  slug: string
  name_en: string
  name_ur: string
  name_ar?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Missing Phase 3-4 types
export interface ThemeConfig {
  primary?: string
  secondary?: string
  audience?: Audience
  kidsTheme?: KidsTheme
  language?: string
  direction?: string
}

export interface LOCALE_META {
  name: string
  dir: string
}

export const LOCALE_METADATA: Record<string, { flag: string; nativeName: string; name: string; dir: string }> = {
  en: { flag: '🇺🇸', nativeName: 'English', name: 'English', dir: 'ltr' },
  ur: { flag: '🇵🇰', nativeName: 'اردو', name: 'Urdu', dir: 'rtl' },
  ar: { flag: '🇸🇦', nativeName: 'العربية', name: 'Arabic', dir: 'rtl' },
  hi: { flag: '🇮🇳', nativeName: 'हिन्दी', name: 'Hindi', dir: 'ltr' },
  bn: { flag: '🇧🇩', nativeName: 'বাংলা', name: 'Bengali', dir: 'ltr' },
  es: { flag: '🇪🇸', nativeName: 'Español', name: 'Spanish', dir: 'ltr' },
  fr: { flag: '🇫🇷', nativeName: 'Français', name: 'French', dir: 'ltr' },
  pt: { flag: '🇧🇷', nativeName: 'Português', name: 'Portuguese', dir: 'ltr' },
  ru: { flag: '🇷🇺', nativeName: 'Русский', name: 'Russian', dir: 'ltr' },
  id: { flag: '🇮🇩', nativeName: 'Bahasa Indonesia', name: 'Indonesian', dir: 'ltr' },
  zh: { flag: '🇨🇳', nativeName: '中文', name: 'Chinese', dir: 'ltr' },
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

export interface ScoringResult {
  playerId: string
  isCorrect: boolean
  score: number
}
