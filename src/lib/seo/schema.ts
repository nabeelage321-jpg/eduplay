/**
 * Schema.org JSON-LD generators for EduPlay pages.
 * All generators return plain objects — rendering is handled by <JsonLd />.
 */

import { getBaseUrl } from './base-url'

const BASE_URL = getBaseUrl()

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivitySchemaInput {
  id: string
  title: string
  description: string
  locale: string
  subject: string
  gradeMin?: number
  gradeMax?: number
  teacherName: string
  teacherUsername: string
  activityType: string
  playCount: number
  createdAt: string
  imageUrl?: string
}

export interface TeacherSchemaInput {
  username: string
  name: string
  locale: string
  activityCount: number
  totalPlays: number
  country?: string
  avatarUrl?: string
}

export interface BreadcrumbItem {
  name: string
  url: string
}

// ─── EducationalActivity schema ───────────────────────────────────────────────

export function generateActivitySchema(activity: ActivitySchemaInput): Record<string, unknown> {
  const url = `${BASE_URL}/${activity.locale}/activity/${activity.id}`
  const teacherUrl = `${BASE_URL}/${activity.locale}/teacher/${activity.teacherUsername}`

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'EducationalActivity',
    '@id': url,
    name: activity.title,
    description: activity.description,
    url,
    inLanguage: activity.locale,
    about: {
      '@type': 'Thing',
      name: activity.subject,
    },
    creator: {
      '@type': 'Person',
      name: activity.teacherName,
      url: teacherUrl,
    },
    learningResourceType: activity.activityType,
    interactivityType: 'active',
    isAccessibleForFree: true,
    dateCreated: activity.createdAt,
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
    },
    provider: {
      '@type': 'Organization',
      name: 'EduPlay',
      url: BASE_URL,
    },
    usageInfo: `${BASE_URL}/terms`,
  }

  if (activity.gradeMin !== undefined || activity.gradeMax !== undefined) {
    const min = activity.gradeMin ?? 1
    const max = activity.gradeMax ?? activity.gradeMin ?? 12
    schema['typicalAgeRange'] = `${min + 5}-${max + 6}` // approximate age
    schema['educationalLevel'] = `Grade ${min}${min !== max ? `–${max}` : ''}`
  }

  if (activity.imageUrl) {
    schema['image'] = {
      '@type': 'ImageObject',
      url: activity.imageUrl,
      width: 1200,
      height: 630,
    }
  }

  return schema
}

// ─── Teacher / Person schema ──────────────────────────────────────────────────

export function generateTeacherSchema(teacher: TeacherSchemaInput): Record<string, unknown> {
  const profileUrl = `${BASE_URL}/${teacher.locale}/teacher/${teacher.username}`

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${profileUrl}#person`,
        name: teacher.name,
        url: profileUrl,
        ...(teacher.country ? { addressCountry: teacher.country } : {}),
        ...(teacher.avatarUrl ? { image: teacher.avatarUrl } : {}),
        jobTitle: 'Teacher',
        memberOf: {
          '@type': 'Organization',
          name: 'EduPlay',
          url: BASE_URL,
        },
      },
      {
        '@type': 'ProfilePage',
        '@id': profileUrl,
        url: profileUrl,
        name: `${teacher.name}'s Teaching Activities`,
        about: { '@id': `${profileUrl}#person` },
        mainEntity: { '@id': `${profileUrl}#person` },
        description: `Browse ${teacher.activityCount} free teaching activities by ${teacher.name} with ${teacher.totalPlays.toLocaleString()} total plays.`,
      },
    ],
  }

  return schema
}

// ─── Breadcrumb schema ────────────────────────────────────────────────────────

export function generateBreadcrumbSchema(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// ─── WebPage schema (generic) ─────────────────────────────────────────────────

export function generateWebPageSchema(params: {
  url: string
  name: string
  description: string
  locale: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': params.url,
    url: params.url,
    name: params.name,
    description: params.description,
    inLanguage: params.locale,
    isPartOf: {
      '@type': 'WebSite',
      name: 'EduPlay',
      url: BASE_URL,
    },
  }
}

// ─── Organization schema (site-level) ────────────────────────────────────────

export function generateOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'EduPlay',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    sameAs: [
      'https://twitter.com/eduplayapp',
      'https://www.facebook.com/eduplayapp',
    ],
    description: 'EduPlay is a multilingual interactive learning platform for teachers and students.',
  }
}

// ─── ItemList schema for activity grids ──────────────────────────────────────

export interface ActivityListItem {
  id: string
  title: string
  url: string
  description: string
  locale: string
}

export function generateItemListSchema(
  items: ActivityListItem[],
  listName: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.title,
    })),
  }
}
