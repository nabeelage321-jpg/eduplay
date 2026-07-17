import { test, expect } from '@playwright/test'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getMetaContent(page: import('@playwright/test').Page, name: string) {
  return page
    .locator(`meta[name="${name}"], meta[property="${name}"]`)
    .first()
    .getAttribute('content')
}

async function getJsonLd(page: import('@playwright/test').Page): Promise<Record<string, unknown>[]> {
  const scripts = await page.locator('script[type="application/ld+json"]').all()
  const result: Record<string, unknown>[] = []
  for (const script of scripts) {
    const text = await script.textContent()
    if (text) {
      try {
        result.push(JSON.parse(text) as Record<string, unknown>)
      } catch {
        // ignore malformed JSON-LD
      }
    }
  }
  return result
}

// ─── T1: Activity Type Hub ────────────────────────────────────────────────────

test.describe('T1 — Activity Type Hub', () => {
  test('en quiz hub has correct title and meta tags', async ({ page }) => {
    await page.goto('/en/activities/quiz')
    await expect(page).toHaveTitle(/Quiz.*EduPlay/i)

    const description = await getMetaContent(page, 'description')
    expect(description).toBeTruthy()
    expect(description?.toLowerCase()).toContain('quiz')
  })

  test('hreflang tags present on T1 page', async ({ page }) => {
    await page.goto('/en/activities/quiz')

    const hreflangTags = await page.locator('link[rel="alternate"][hreflang]').all()
    expect(hreflangTags.length).toBeGreaterThanOrEqual(11)

    const urHreflang = await page.locator('link[rel="alternate"][hreflang="ur"]').getAttribute('href')
    expect(urHreflang).toContain('/ur/activities/quiz')
  })
})

// ─── T3: Subject + Grade + Type (Urdu locale) ─────────────────────────────────

test.describe('T3 — Subject + Grade + Type (Urdu)', () => {
  test('Urdu T3 page loads with correct meta tags', async ({ page }) => {
    await page.goto('/ur/mathematics/grade-5/quiz')

    // Title should exist and be non-empty
    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(10)

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toContain('/ur/mathematics/grade-5/quiz')
  })

  test('Urdu T3 page has RTL layout indicators', async ({ page }) => {
    await page.goto('/ur/mathematics/grade-5/quiz')
    const htmlDir = await page.locator('html').getAttribute('dir')
    expect(htmlDir).toBe('rtl')
  })

  test('hreflang tags present on T3 Urdu page', async ({ page }) => {
    await page.goto('/ur/mathematics/grade-5/quiz')

    const hreflangTags = await page.locator('link[rel="alternate"][hreflang]').all()
    expect(hreflangTags.length).toBeGreaterThanOrEqual(11)

    const enHreflang = await page
      .locator('link[rel="alternate"][hreflang="en"]')
      .getAttribute('href')
    expect(enHreflang).toContain('/en/mathematics/grade-5/quiz')
  })

  test('T3 page renders breadcrumb navigation', async ({ page }) => {
    await page.goto('/en/mathematics/grade-5/quiz')
    const breadcrumb = page.locator('nav[aria-label="Breadcrumb"]')
    await expect(breadcrumb).toBeVisible()
  })

  test('T3 page has grade navigation (prev/next grade links)', async ({ page }) => {
    await page.goto('/en/mathematics/grade-5/quiz')
    const gradeNav = page.locator('nav[aria-label="Adjacent grade navigation"]')
    await expect(gradeNav).toBeVisible()
  })
})

// ─── T4: Individual Activity ──────────────────────────────────────────────────

test.describe('T4 — Individual Activity', () => {
  test('activity page has JSON-LD with EducationalActivity type', async ({ page }) => {
    await page.goto('/en/activity/grade-5-math-fractions-quiz')

    const schemas = await getJsonLd(page)
    const activitySchema = schemas.find(
      (s) => s['@type'] === 'EducationalActivity',
    )
    expect(activitySchema).toBeTruthy()
    expect(activitySchema?.['isAccessibleForFree']).toBe(true)
  })

  test('activity page has BreadcrumbList JSON-LD', async ({ page }) => {
    await page.goto('/en/activity/grade-5-math-fractions-quiz')

    const schemas = await getJsonLd(page)
    const breadcrumbSchema = schemas.find((s) => s['@type'] === 'BreadcrumbList')
    expect(breadcrumbSchema).toBeTruthy()
  })

  test('activity page has social share section', async ({ page }) => {
    await page.goto('/en/activity/grade-5-math-fractions-quiz')
    const shareSection = page.locator('section[aria-labelledby="share-heading"]')
    await expect(shareSection).toBeVisible()
  })

  test('activity page has teacher attribution with profile link', async ({ page }) => {
    await page.goto('/en/activity/grade-5-math-fractions-quiz')
    const teacherSection = page.locator('section[aria-label="Activity creator"]')
    await expect(teacherSection).toBeVisible()
    const profileLink = teacherSection.locator('a[href*="/teacher/"]')
    await expect(profileLink).toBeVisible()
  })
})

// ─── T6: Punjab Board Grade 5 ─────────────────────────────────────────────────

test.describe('T6 — Punjab Board Grade 5', () => {
  test('Punjab Board Grade 5 page renders subject grid', async ({ page }) => {
    await page.goto('/en/curriculum/punjab-board/grade-5')

    await expect(page).toHaveTitle(/Punjab Board.*Grade 5.*EduPlay/i)

    const subjectGrid = page.locator('[aria-label*="Subjects for Punjab Board"]')
    await expect(subjectGrid).toBeVisible()
  })

  test('Punjab Board page in Urdu loads correctly', async ({ page }) => {
    await page.goto('/ur/curriculum/punjab-board/grade-5')

    const title = await page.title()
    expect(title).toBeTruthy()

    // Check Urdu board name is displayed
    const localName = page.getByText('پنجاب بورڈ')
    await expect(localName).toBeVisible()
  })
})

// ─── T7: Teacher Profile ──────────────────────────────────────────────────────

test.describe('T7 — Teacher Profile', () => {
  test('teacher profile page renders with correct heading', async ({ page }) => {
    await page.goto('/en/teacher/miss-ayesha')

    await expect(page).toHaveTitle(/Miss Ayesha.*EduPlay/i)

    const heading = page.locator('#teacher-name')
    await expect(heading).toContainText('Miss Ayesha')
  })

  test('teacher profile has Person and ProfilePage JSON-LD', async ({ page }) => {
    await page.goto('/en/teacher/miss-ayesha')

    const schemas = await getJsonLd(page)
    const graphSchema = schemas.find((s) => '@graph' in s)
    const graph = graphSchema?.['@graph'] as Record<string, unknown>[] | undefined

    expect(graph?.some((n) => n['@type'] === 'Person')).toBe(true)
    expect(graph?.some((n) => n['@type'] === 'ProfilePage')).toBe(true)
  })

  test('teacher profile shows stats', async ({ page }) => {
    await page.goto('/en/teacher/miss-ayesha')

    const stats = page.locator('[aria-label="Teacher statistics"]')
    await expect(stats).toBeVisible()
  })
})

// ─── T8: Competitor Alternatives ─────────────────────────────────────────────

test.describe('T8 — Competitor Alternatives', () => {
  test('Wordwall alternative page has correct title and comparison table', async ({ page }) => {
    await page.goto('/en/alternatives/wordwall')

    await expect(page).toHaveTitle(/Wordwall.*alternative.*EduPlay/i)

    const table = page.locator('table[aria-label*="Wordwall"]')
    await expect(table).toBeVisible()
  })

  test('T8 page has no hreflang tags (English only)', async ({ page }) => {
    await page.goto('/en/alternatives/kahoot')

    const hreflangTags = await page.locator('link[rel="alternate"][hreflang]').all()
    // T8 is English-only — no hreflang alternates
    expect(hreflangTags).toHaveLength(0)
  })

  test('canonical URL is English-only path', async ({ page }) => {
    await page.goto('/en/alternatives/quizlet')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toContain('/en/alternatives/quizlet')
    expect(canonical).not.toContain('/ur/')
  })
})

// ─── Mobile viewport tests ────────────────────────────────────────────────────

test.describe('Mobile viewport (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('T3 page renders correctly on mobile', async ({ page }) => {
    await page.goto('/en/mathematics/grade-5/quiz')

    // Page heading visible at mobile width
    const heading = page.locator('#t3-heading')
    await expect(heading).toBeVisible()

    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5) // 5px tolerance
  })

  test('T8 comparison table is horizontally scrollable on mobile', async ({ page }) => {
    await page.goto('/en/alternatives/wordwall')
    const tableWrapper = page.locator('div[style*="overflow-x: auto"]')
    await expect(tableWrapper).toBeVisible()
  })
})

// ─── Hreflang validation across templates ─────────────────────────────────────

test.describe('Hreflang present on all template types', () => {
  const pages = [
    '/en/activities/quiz',           // T1
    '/en/mathematics/quiz',          // T2
    '/en/mathematics/grade-5/quiz',  // T3
    '/en/topics/fractions',          // T5
    '/en/curriculum/punjab-board/grade-5', // T6
  ]

  for (const pagePath of pages) {
    test(`hreflang tags present on ${pagePath}`, async ({ page }) => {
      await page.goto(pagePath)
      const tags = await page.locator('link[rel="alternate"][hreflang]').all()
      expect(tags.length).toBeGreaterThanOrEqual(11)
    })
  }
})
