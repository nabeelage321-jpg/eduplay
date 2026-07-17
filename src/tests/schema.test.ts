import { describe, it, expect } from 'vitest'
import {
  generateActivitySchema,
  generateTeacherSchema,
  generateBreadcrumbSchema,
  generateWebPageSchema,
  generateOrganizationSchema,
  generateItemListSchema,
} from '../lib/seo/schema'

// ─── generateActivitySchema ───────────────────────────────────────────────────

describe('generateActivitySchema', () => {
  const input = {
    id: 'grade-5-fractions',
    title: 'Grade 5 Fractions Quiz',
    description: 'Test your fractions knowledge.',
    locale: 'en',
    subject: 'Mathematics',
    gradeMin: 5,
    gradeMax: 5,
    teacherName: 'Miss Ayesha',
    teacherUsername: 'miss-ayesha',
    activityType: 'quiz',
    playCount: 1200,
    createdAt: '2024-09-01T00:00:00Z',
  }

  const schema = generateActivitySchema(input)

  it('has correct @type', () => {
    expect(schema['@type']).toBe('EducationalActivity')
  })

  it('has @context of schema.org', () => {
    expect(schema['@context']).toBe('https://schema.org')
  })

  it('name matches activity title', () => {
    expect(schema['name']).toBe('Grade 5 Fractions Quiz')
  })

  it('isAccessibleForFree is true', () => {
    expect(schema['isAccessibleForFree']).toBe(true)
  })

  it('creator is a Person with correct name', () => {
    const creator = schema['creator'] as Record<string, unknown>
    expect(creator['@type']).toBe('Person')
    expect(creator['name']).toBe('Miss Ayesha')
  })

  it('creator URL links to teacher profile', () => {
    const creator = schema['creator'] as Record<string, unknown>
    expect(creator['url']).toContain('/teacher/miss-ayesha')
  })

  it('includes educationalLevel when grades provided', () => {
    expect(schema['educationalLevel']).toContain('Grade 5')
  })

  it('does not include image field when imageUrl is absent', () => {
    expect(schema['image']).toBeUndefined()
  })

  it('includes image object when imageUrl is provided', () => {
    const withImage = generateActivitySchema({
      ...input,
      imageUrl: 'https://eduplay.app/og/test.png',
    })
    const image = withImage['image'] as Record<string, unknown>
    expect(image['@type']).toBe('ImageObject')
    expect(image['url']).toBe('https://eduplay.app/og/test.png')
  })

  it('@id URL includes the activity id', () => {
    expect(schema['@id']).toContain('grade-5-fractions')
  })

  it('inLanguage matches locale', () => {
    expect(schema['inLanguage']).toBe('en')
  })
})

// ─── generateTeacherSchema ────────────────────────────────────────────────────

describe('generateTeacherSchema', () => {
  const schema = generateTeacherSchema({
    username: 'miss-ayesha',
    name: 'Miss Ayesha',
    locale: 'en',
    activityCount: 47,
    totalPlays: 12430,
    country: 'PK',
  })

  it('is a @graph with Person and ProfilePage', () => {
    const graph = schema['@graph'] as Record<string, unknown>[]
    expect(graph).toHaveLength(2)
    const types = graph.map((n) => n['@type'])
    expect(types).toContain('Person')
    expect(types).toContain('ProfilePage')
  })

  it('Person has correct name and jobTitle', () => {
    const graph = schema['@graph'] as Record<string, unknown>[]
    const person = graph.find((n) => n['@type'] === 'Person') as Record<string, unknown>
    expect(person['name']).toBe('Miss Ayesha')
    expect(person['jobTitle']).toBe('Teacher')
    expect(person['addressCountry']).toBe('PK')
  })

  it('ProfilePage description mentions activity count and plays', () => {
    const graph = schema['@graph'] as Record<string, unknown>[]
    const profile = graph.find((n) => n['@type'] === 'ProfilePage') as Record<string, unknown>
    expect(profile['description']).toContain('47')
    expect(profile['description']).toContain('12,430')
  })
})

// ─── generateBreadcrumbSchema ─────────────────────────────────────────────────

describe('generateBreadcrumbSchema', () => {
  const schema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://eduplay.app/en' },
    { name: 'Mathematics', url: 'https://eduplay.app/en/mathematics/quiz' },
    { name: 'Grade 5 Quiz', url: 'https://eduplay.app/en/mathematics/grade-5/quiz' },
  ])

  it('@type is BreadcrumbList', () => {
    expect(schema['@type']).toBe('BreadcrumbList')
  })

  it('has 3 list items', () => {
    const items = schema['itemListElement'] as unknown[]
    expect(items).toHaveLength(3)
  })

  it('positions are 1-indexed', () => {
    const items = schema['itemListElement'] as Record<string, unknown>[]
    expect(items[0]['position']).toBe(1)
    expect(items[2]['position']).toBe(3)
  })

  it('names match the input', () => {
    const items = schema['itemListElement'] as Record<string, unknown>[]
    expect(items[1]['name']).toBe('Mathematics')
  })
})

// ─── generateWebPageSchema ────────────────────────────────────────────────────

describe('generateWebPageSchema', () => {
  const schema = generateWebPageSchema({
    url: 'https://eduplay.app/en/topics/fractions',
    name: 'Fractions Activities',
    description: 'Free fractions activities for teachers.',
    locale: 'en',
  })

  it('@type is WebPage', () => {
    expect(schema['@type']).toBe('WebPage')
  })

  it('isPartOf references EduPlay site', () => {
    const parent = schema['isPartOf'] as Record<string, unknown>
    expect(parent['name']).toBe('EduPlay')
  })

  it('inLanguage matches locale', () => {
    expect(schema['inLanguage']).toBe('en')
  })
})

// ─── generateOrganizationSchema ───────────────────────────────────────────────

describe('generateOrganizationSchema', () => {
  const schema = generateOrganizationSchema()

  it('@type is Organization', () => {
    expect(schema['@type']).toBe('Organization')
  })

  it('name is EduPlay', () => {
    expect(schema['name']).toBe('EduPlay')
  })
})

// ─── generateItemListSchema ───────────────────────────────────────────────────

describe('generateItemListSchema', () => {
  const items = [
    { id: 'a', title: 'Activity A', url: 'https://eduplay.app/en/activity/a', description: '', locale: 'en' },
    { id: 'b', title: 'Activity B', url: 'https://eduplay.app/en/activity/b', description: '', locale: 'en' },
  ]
  const schema = generateItemListSchema(items, 'Featured Activities')

  it('@type is ItemList', () => {
    expect(schema['@type']).toBe('ItemList')
  })

  it('numberOfItems matches input length', () => {
    expect(schema['numberOfItems']).toBe(2)
  })

  it('name matches the provided list name', () => {
    expect(schema['name']).toBe('Featured Activities')
  })
})
