import { describe, it, expect } from 'vitest'
import { generatePageMetadata, ALL_LOCALES } from '../lib/seo/metadata'

// ─── T1 ───────────────────────────────────────────────────────────────────────

describe('generatePageMetadata — T1 (Activity Type Hub)', () => {
  const meta = generatePageMetadata({
    template: 'T1',
    locale: 'en',
    type: 'quiz',
    typeLabel: 'Quiz',
  })

  it('produces a title containing the type label and site name', () => {
    expect(meta.title).toContain('Quiz')
    expect(meta.title).toContain('EduPlay')
  })

  it('produces a description mentioning the type', () => {
    expect(meta.description).toContain('Quiz')
  })

  it('sets a canonical URL with the correct locale and type', () => {
    expect(meta.alternates?.canonical).toContain('/en/activities/quiz')
  })

  it('includes hreflang alternates for all 11 locales', () => {
    const langs = meta.alternates?.languages as Record<string, string>
    expect(Object.keys(langs)).toHaveLength(ALL_LOCALES.length + 1) // +1 for x-default
    expect(langs['ur']).toContain('/ur/activities/quiz')
    expect(langs['ar']).toContain('/ar/activities/quiz')
    expect(langs['x-default']).toContain('/en/activities/quiz')
  })

  it('includes openGraph metadata', () => {
    expect(meta.openGraph?.title).toBeTruthy()
    expect(meta.openGraph?.images).toHaveLength(1)
  })
})

// ─── T2 ───────────────────────────────────────────────────────────────────────

describe('generatePageMetadata — T2 (Subject + Type)', () => {
  const meta = generatePageMetadata({
    template: 'T2',
    locale: 'ur',
    subject: 'mathematics',
    subjectLabel: 'ریاضی',
    type: 'quiz',
    typeLabel: 'کوئز',
  })

  it('includes subject and type in the title', () => {
    expect(meta.title).toContain('ریاضی')
    expect(meta.title).toContain('کوئز')
  })

  it('canonical URL uses the correct locale', () => {
    expect(meta.alternates?.canonical).toContain('/ur/mathematics/quiz')
  })

  it('sets hreflang for RTL locales', () => {
    const langs = meta.alternates?.languages as Record<string, string>
    expect(langs['ur']).toBeDefined()
    expect(langs['ar']).toBeDefined()
  })
})

// ─── T3 ───────────────────────────────────────────────────────────────────────

describe('generatePageMetadata — T3 (Subject + Grade + Type)', () => {
  const meta = generatePageMetadata({
    template: 'T3',
    locale: 'en',
    subject: 'mathematics',
    subjectLabel: 'Mathematics',
    grade: 'grade-5',
    gradeLabel: 'Grade 5',
    type: 'quiz',
    typeLabel: 'Quiz',
  })

  it('includes grade, subject, and type in the title', () => {
    expect(meta.title).toContain('Grade 5')
    expect(meta.title).toContain('Mathematics')
    expect(meta.title).toContain('Quiz')
  })

  it('canonical URL includes all three path segments', () => {
    expect(meta.alternates?.canonical).toContain('/en/mathematics/grade-5/quiz')
  })

  it('produces unique title not identical to T2', () => {
    const t2Meta = generatePageMetadata({
      template: 'T2',
      locale: 'en',
      subject: 'mathematics',
      subjectLabel: 'Mathematics',
      type: 'quiz',
      typeLabel: 'Quiz',
    })
    expect(meta.title).not.toEqual(t2Meta.title)
  })
})

// ─── T4 ───────────────────────────────────────────────────────────────────────

describe('generatePageMetadata — T4 (Individual Activity)', () => {
  const meta = generatePageMetadata({
    template: 'T4',
    locale: 'en',
    activityId: 'grade-5-math-fractions',
    activityTitle: 'Grade 5 Fractions Quiz',
    activityDescription: 'Test your fractions knowledge',
    subjectLabel: 'Mathematics',
    teacherName: 'Miss Ayesha',
    imageUrl: 'https://eduplay.app/og/fractions.png',
  })

  it('uses the activity title as the page title', () => {
    expect(meta.title).toContain('Grade 5 Fractions Quiz')
  })

  it('uses the custom imageUrl in openGraph', () => {
    const images = meta.openGraph?.images as { url: string }[]
    expect(images?.[0]?.url).toBe('https://eduplay.app/og/fractions.png')
  })

  it('canonical URL includes the activity id', () => {
    expect(meta.alternates?.canonical).toContain('/en/activity/grade-5-math-fractions')
  })

  it('falls back to default image when imageUrl is not provided', () => {
    const metaNoImg = generatePageMetadata({
      template: 'T4',
      locale: 'en',
      activityId: 'test-id',
      activityTitle: 'Test Activity',
      activityDescription: 'A test',
      subjectLabel: 'Science',
      teacherName: 'Mr Test',
    })
    const images = metaNoImg.openGraph?.images as { url: string }[]
    expect(images?.[0]?.url).toContain('og-default')
  })
})

// ─── T5 ───────────────────────────────────────────────────────────────────────

describe('generatePageMetadata — T5 (Topic)', () => {
  const meta = generatePageMetadata({
    template: 'T5',
    locale: 'en',
    topic: 'fractions',
    topicLabel: 'Fractions',
    subjectLabel: 'Mathematics',
  })

  it('includes topic label in the title', () => {
    expect(meta.title).toContain('Fractions')
  })

  it('canonical URL includes topic slug', () => {
    expect(meta.alternates?.canonical).toContain('/en/topics/fractions')
  })
})

// ─── T6 ───────────────────────────────────────────────────────────────────────

describe('generatePageMetadata — T6 (Curriculum)', () => {
  const meta = generatePageMetadata({
    template: 'T6',
    locale: 'en',
    board: 'punjab-board',
    boardLabel: 'Punjab Board',
    grade: 'grade-5',
    gradeLabel: 'Grade 5',
    country: 'PK',
  })

  it('includes board name and grade in the title', () => {
    expect(meta.title).toContain('Punjab Board')
    expect(meta.title).toContain('Grade 5')
  })

  it('includes country in keywords', () => {
    expect(meta.keywords).toContain('PK')
  })

  it('canonical URL uses board and grade slugs', () => {
    expect(meta.alternates?.canonical).toContain('/en/curriculum/punjab-board/grade-5')
  })
})

// ─── T7 ───────────────────────────────────────────────────────────────────────

describe('generatePageMetadata — T7 (Teacher Profile)', () => {
  const meta = generatePageMetadata({
    template: 'T7',
    locale: 'en',
    username: 'miss-ayesha',
    teacherName: 'Miss Ayesha',
    activityCount: 47,
  })

  it('uses teacher name in title', () => {
    expect(meta.title).toContain('Miss Ayesha')
  })

  it('includes activity count in title when provided', () => {
    expect(meta.title).toContain('47')
  })

  it('canonical URL uses username', () => {
    expect(meta.alternates?.canonical).toContain('/en/teacher/miss-ayesha')
  })
})

// ─── T8 ───────────────────────────────────────────────────────────────────────

describe('generatePageMetadata — T8 (Competitor Alternative)', () => {
  const meta = generatePageMetadata({
    template: 'T8',
    competitor: 'wordwall',
    competitorLabel: 'Wordwall',
  })

  it('includes competitor name in title', () => {
    expect(meta.title).toContain('Wordwall')
  })

  it('uses /en/ canonical (not locale-based)', () => {
    expect(meta.alternates?.canonical).toContain('/en/alternatives/wordwall')
    // T8 is English only — no hreflang
    expect(meta.alternates?.languages).toBeUndefined()
  })

  it('keywords reference competitor slug', () => {
    expect(meta.keywords).toContain('Wordwall')
  })
})

// ─── No duplicate canonicals ──────────────────────────────────────────────────

describe('No duplicate canonical URLs across templates', () => {
  it('T1 and T2 have different canonical URLs for same type', () => {
    const t1 = generatePageMetadata({
      template: 'T1',
      locale: 'en',
      type: 'quiz',
      typeLabel: 'Quiz',
    })
    const t2 = generatePageMetadata({
      template: 'T2',
      locale: 'en',
      subject: 'mathematics',
      subjectLabel: 'Mathematics',
      type: 'quiz',
      typeLabel: 'Quiz',
    })
    expect(t1.alternates?.canonical).not.toEqual(t2.alternates?.canonical)
  })

  it('T2 and T3 have different canonical URLs for same subject + type', () => {
    const t2 = generatePageMetadata({
      template: 'T2',
      locale: 'en',
      subject: 'mathematics',
      subjectLabel: 'Mathematics',
      type: 'quiz',
      typeLabel: 'Quiz',
    })
    const t3 = generatePageMetadata({
      template: 'T3',
      locale: 'en',
      subject: 'mathematics',
      subjectLabel: 'Mathematics',
      grade: 'grade-5',
      gradeLabel: 'Grade 5',
      type: 'quiz',
      typeLabel: 'Quiz',
    })
    expect(t2.alternates?.canonical).not.toEqual(t3.alternates?.canonical)
  })
})
