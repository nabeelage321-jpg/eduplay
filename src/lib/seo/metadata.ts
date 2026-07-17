import type { Metadata } from 'next'

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_NAME = 'EduPlay'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay.app'
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.png`

export const ALL_LOCALES = ['en', 'ur', 'ar', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'zh'] as const
export type SupportedLocale = (typeof ALL_LOCALES)[number]

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  ur: 'اردو',
  ar: 'العربية',
  hi: 'हिन्दी',
  es: 'Español',
  fr: 'Français',
  bn: 'বাংলা',
  pt: 'Português',
  ru: 'Русский',
  id: 'Bahasa Indonesia',
  zh: '中文',
}

// ─── Hreflang builder ─────────────────────────────────────────────────────────

export function buildHreflangAlternates(path: string): Record<string, string> {
  const alternates: Record<string, string> = {}

  for (const locale of ALL_LOCALES) {
    alternates[locale] = `${BASE_URL}/${locale}${path}`
  }
  alternates['x-default'] = `${BASE_URL}/en${path}`

  return alternates
}

// ─── Template parameter types ─────────────────────────────────────────────────

export interface T1Params {
  template: 'T1'
  locale: string
  type: string
  typeLabel: string
}

export interface T2Params {
  template: 'T2'
  locale: string
  subject: string
  subjectLabel: string
  type: string
  typeLabel: string
}

export interface T3Params {
  template: 'T3'
  locale: string
  subject: string
  subjectLabel: string
  grade: string
  gradeLabel: string
  type: string
  typeLabel: string
}

export interface T4Params {
  template: 'T4'
  locale: string
  activityId: string
  activityTitle: string
  activityDescription: string
  subjectLabel: string
  teacherName: string
  imageUrl?: string
}

export interface T5Params {
  template: 'T5'
  locale: string
  topic: string
  topicLabel: string
  subjectLabel?: string
}

export interface T6Params {
  template: 'T6'
  locale: string
  board: string
  boardLabel: string
  grade: string
  gradeLabel: string
  country?: string
}

export interface T7Params {
  template: 'T7'
  locale: string
  username: string
  teacherName: string
  activityCount?: number
}

export interface T8Params {
  template: 'T8'
  competitor: string
  competitorLabel: string
}

export type PageMetadataParams =
  | T1Params
  | T2Params
  | T3Params
  | T4Params
  | T5Params
  | T6Params
  | T7Params
  | T8Params

// ─── Main metadata generator ──────────────────────────────────────────────────

export function generatePageMetadata(params: PageMetadataParams): Metadata {
  switch (params.template) {
    case 'T1':
      return buildT1Metadata(params)
    case 'T2':
      return buildT2Metadata(params)
    case 'T3':
      return buildT3Metadata(params)
    case 'T4':
      return buildT4Metadata(params)
    case 'T5':
      return buildT5Metadata(params)
    case 'T6':
      return buildT6Metadata(params)
    case 'T7':
      return buildT7Metadata(params)
    case 'T8':
      return buildT8Metadata(params)
  }
}

// ─── T1: Activity Type Hub ─────────────────────────────────────────────────

function buildT1Metadata(p: T1Params): Metadata {
  const path = `/activities/${p.type}`
  const title = `Free ${p.typeLabel} maker for teachers | ${SITE_NAME}`
  const description = `Create and play free ${p.typeLabel} activities for any subject or grade. Thousands of ready-made ${p.typeLabel}s on EduPlay — the free teaching platform.`

  return {
    title,
    description,
    keywords: `${p.typeLabel}, free ${p.typeLabel} maker, ${p.typeLabel} for teachers, classroom ${p.typeLabel}, interactive ${p.typeLabel}`,
    alternates: {
      canonical: `${BASE_URL}/${p.locale}${path}`,
      languages: buildHreflangAlternates(path),
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${p.locale}${path}`,
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ─── T2: Subject + Type ────────────────────────────────────────────────────

function buildT2Metadata(p: T2Params): Metadata {
  const path = `/${p.subject}/${p.type}`
  const title = `${capitalize(p.subjectLabel)} ${p.typeLabel} activities for teachers — ${SITE_NAME}`
  const description = `Free ${p.subjectLabel} ${p.typeLabel} activities for every grade level. Browse thousands of ready-made resources or create your own with EduPlay.`

  return {
    title,
    description,
    keywords: `${p.subjectLabel} ${p.typeLabel}, free ${p.subjectLabel} activities, ${p.subjectLabel} ${p.typeLabel} for teachers, classroom ${p.subjectLabel} games`,
    alternates: {
      canonical: `${BASE_URL}/${p.locale}${path}`,
      languages: buildHreflangAlternates(path),
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${p.locale}${path}`,
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ─── T3: Subject + Grade + Type ────────────────────────────────────────────

function buildT3Metadata(p: T3Params): Metadata {
  const path = `/${p.subject}/${p.grade}/${p.type}`
  const title = `Grade ${p.gradeLabel} ${capitalize(p.subjectLabel)} ${p.typeLabel} — free for teachers | ${SITE_NAME}`
  const description = `Free Grade ${p.gradeLabel} ${p.subjectLabel} ${p.typeLabel} activities. Curriculum-aligned, ready to play, and easy to customise for your class.`

  return {
    title,
    description,
    keywords: `grade ${p.gradeLabel} ${p.subjectLabel} ${p.typeLabel}, ${p.subjectLabel} grade ${p.gradeLabel}, ${p.typeLabel} grade ${p.gradeLabel}, free grade ${p.gradeLabel} activities`,
    alternates: {
      canonical: `${BASE_URL}/${p.locale}${path}`,
      languages: buildHreflangAlternates(path),
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${p.locale}${path}`,
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ─── T4: Individual Activity ────────────────────────────────────────────────

function buildT4Metadata(p: T4Params): Metadata {
  const path = `/activity/${p.activityId}`
  const title = `${p.activityTitle} | ${SITE_NAME}`
  const description =
    p.activityDescription ||
    `Play "${p.activityTitle}" — a free ${p.subjectLabel} activity created by ${p.teacherName} on EduPlay.`

  return {
    title,
    description,
    keywords: `${p.activityTitle}, ${p.subjectLabel} activity, free classroom activity, ${p.teacherName} activities`,
    alternates: {
      canonical: `${BASE_URL}/${p.locale}${path}`,
      languages: buildHreflangAlternates(path),
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${p.locale}${path}`,
      siteName: SITE_NAME,
      images: [{ url: p.imageUrl ?? DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      type: 'article',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ─── T5: Topic Pages ────────────────────────────────────────────────────────

function buildT5Metadata(p: T5Params): Metadata {
  const path = `/topics/${p.topic}`
  const subjectSuffix = p.subjectLabel ? ` ${p.subjectLabel}` : ''
  const title = `${capitalize(p.topicLabel)}${subjectSuffix} activities and games for teachers — ${SITE_NAME}`
  const description = `Interactive activities, quizzes and games on ${p.topicLabel}. All free for teachers — play in class or assign for homework on EduPlay.`

  return {
    title,
    description,
    keywords: `${p.topicLabel} activities, ${p.topicLabel} quiz, ${p.topicLabel} games for teachers, free ${p.topicLabel} worksheets`,
    alternates: {
      canonical: `${BASE_URL}/${p.locale}${path}`,
      languages: buildHreflangAlternates(path),
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${p.locale}${path}`,
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ─── T6: Curriculum Pages ───────────────────────────────────────────────────

function buildT6Metadata(p: T6Params): Metadata {
  const path = `/curriculum/${p.board}/${p.grade}`
  const title = `${p.boardLabel} Grade ${p.gradeLabel} interactive activities — ${SITE_NAME}`
  const description = `Curriculum-aligned interactive activities, quizzes, and games for ${p.boardLabel} Grade ${p.gradeLabel}. Mapped to your syllabus — free for teachers.`

  return {
    title,
    description,
    keywords: `${p.boardLabel} grade ${p.gradeLabel}, ${p.boardLabel} activities, curriculum aligned grade ${p.gradeLabel}, ${p.country ?? ''} curriculum activities`.trim(),
    alternates: {
      canonical: `${BASE_URL}/${p.locale}${path}`,
      languages: buildHreflangAlternates(path),
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${p.locale}${path}`,
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ─── T7: Teacher Profile ────────────────────────────────────────────────────

function buildT7Metadata(p: T7Params): Metadata {
  const path = `/teacher/${p.username}`
  const countLabel = p.activityCount ? ` (${p.activityCount} activities)` : ''
  const title = `${p.teacherName}'s free teaching activities${countLabel} — ${SITE_NAME}`
  const description = `Browse free teaching activities created by ${p.teacherName} on EduPlay. Quizzes, games, and interactive worksheets for every subject.`

  return {
    title,
    description,
    keywords: `${p.teacherName} activities, free teaching resources, classroom activities by ${p.teacherName}`,
    alternates: {
      canonical: `${BASE_URL}/${p.locale}${path}`,
      languages: buildHreflangAlternates(path),
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/${p.locale}${path}`,
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      type: 'profile',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ─── T8: Competitor Alternatives ────────────────────────────────────────────

function buildT8Metadata(p: T8Params): Metadata {
  const path = `/alternatives/${p.competitor}`
  const title = `Best free ${capitalize(p.competitorLabel)} alternative for teachers — ${SITE_NAME}`
  const description = `Looking for a ${p.competitorLabel} alternative? EduPlay offers free quizzes, games and interactive activities — multilingual, no ads, no paywalls. See the full comparison.`

  return {
    title,
    description,
    keywords: `${p.competitorLabel} alternative, free ${p.competitorLabel} alternative, alternative to ${p.competitorLabel}, ${p.competitorLabel} vs EduPlay`,
    alternates: {
      canonical: `${BASE_URL}/en${path}`,
      // T8 is English only — no hreflang needed
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/en${path}`,
      siteName: SITE_NAME,
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ─── Helper ────────────────────────────────────────────────────────────────

function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
