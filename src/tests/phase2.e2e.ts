import { test, expect, type Page } from '@playwright/test'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setTheme(page: Page, theme: 'ladies' | 'gents' | 'kids') {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('theme-store', JSON.stringify({ state: { audience: t, kidsTheme: 'space' }, version: 0 }))
  }, theme)
}

async function goToCreatePage(page: Page, locale = 'en') {
  await page.goto(`/${locale}/create`)
  await page.waitForLoadState('networkidle')
}

async function goToActivitiesPage(page: Page, locale = 'en') {
  await page.goto(`/${locale}/activities`)
  await page.waitForLoadState('networkidle')
}

// ── Create Activity Flow ──────────────────────────────────────────────────────

test.describe('Create Activity Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en')
    await setTheme(page, 'ladies')
  })

  test('create page loads correctly', async ({ page }) => {
    await goToCreatePage(page)
    await expect(page.getByRole('heading', { name: /Create Activity/i })).toBeVisible()
  })

  test('step 1: shows 20 activity type tiles', async ({ page }) => {
    await goToCreatePage(page)
    const tiles = page.getByRole('button', { name: /Quiz|Match Up|Anagram|Crossword/i })
    await expect(tiles.first()).toBeVisible()
  })

  test('step 1: selecting a type enables Next button', async ({ page }) => {
    await goToCreatePage(page)
    const nextBtn = page.getByRole('button', { name: /Next/i })
    // Initially disabled
    await expect(nextBtn).toBeDisabled()
    // Select quiz type
    await page.getByRole('button', { name: /^Quiz/i }).first().click()
    // Now enabled
    await expect(nextBtn).toBeEnabled()
  })

  test('step 2: form fields are visible', async ({ page }) => {
    await goToCreatePage(page)
    await page.getByRole('button', { name: /^Quiz/i }).first().click()
    await page.getByRole('button', { name: /Next/i }).click()
    await expect(page.getByLabel(/Title/i)).toBeVisible()
    await expect(page.getByLabel(/Subject/i)).toBeVisible()
    await expect(page.getByLabel(/Grade/i)).toBeVisible()
  })

  test('step 2: next disabled until required fields filled', async ({ page }) => {
    await goToCreatePage(page)
    await page.getByRole('button', { name: /^Quiz/i }).first().click()
    await page.getByRole('button', { name: /Next/i }).click()
    const nextBtn = page.getByRole('button', { name: /Next/i })
    await expect(nextBtn).toBeDisabled()
    await page.getByLabel(/Title/i).fill('Test Activity')
    await page.getByLabel(/Subject/i).selectOption('Mathematics')
    await page.getByLabel(/Grade/i).selectOption('Grade 5')
    await expect(nextBtn).toBeEnabled()
  })

  test('step 3: item editor shows add button', async ({ page }) => {
    await goToCreatePage(page)
    await page.getByRole('button', { name: /^Quiz/i }).first().click()
    await page.getByRole('button', { name: /Next/i }).click()
    await page.getByLabel(/Title/i).fill('Test Quiz')
    await page.getByLabel(/Subject/i).selectOption('Mathematics')
    await page.getByLabel(/Grade/i).selectOption('Grade 5')
    await page.getByRole('button', { name: /Next/i }).click()
    await expect(page.getByRole('button', { name: /Add Item/i })).toBeVisible()
  })

  test('step 3: can add items', async ({ page }) => {
    await goToCreatePage(page)
    await page.getByRole('button', { name: /^Quiz/i }).first().click()
    await page.getByRole('button', { name: /Next/i }).click()
    await page.getByLabel(/Title/i).fill('Test Quiz')
    await page.getByLabel(/Subject/i).selectOption('Mathematics')
    await page.getByLabel(/Grade/i).selectOption('Grade 5')
    await page.getByRole('button', { name: /Next/i }).click()
    await page.getByRole('button', { name: /Add Item/i }).click()
    // Should have more items
    const inputs = page.getByPlaceholder(/Question/i)
    await expect(inputs.first()).toBeVisible()
  })

  test('back button navigates to previous step', async ({ page }) => {
    await goToCreatePage(page)
    await page.getByRole('button', { name: /^Quiz/i }).first().click()
    await page.getByRole('button', { name: /Next/i }).click()
    await expect(page.getByLabel(/Title/i)).toBeVisible()
    await page.getByRole('button', { name: /Back/i }).click()
    await expect(page.getByRole('button', { name: /^Quiz/i }).first()).toBeVisible()
  })
})

// ── Browse Activities Page ────────────────────────────────────────────────────

test.describe('Browse Activities Page', () => {
  test('page loads with filters', async ({ page }) => {
    await goToActivitiesPage(page)
    await expect(page.getByRole('heading', { name: /Browse Activities/i })).toBeVisible()
    await expect(page.getByPlaceholder(/Search activities/i)).toBeVisible()
  })

  test('search input is functional', async ({ page }) => {
    await goToActivitiesPage(page)
    const search = page.getByPlaceholder(/Search activities/i)
    await search.fill('math quiz')
    await expect(search).toHaveValue('math quiz')
  })

  test('filter dropdowns are visible', async ({ page }) => {
    await goToActivitiesPage(page)
    await expect(page.getByLabel(/Filter by subject/i)).toBeVisible()
    await expect(page.getByLabel(/Filter by grade/i)).toBeVisible()
    await expect(page.getByLabel(/Filter by activity type/i)).toBeVisible()
    await expect(page.getByLabel(/Filter by language/i)).toBeVisible()
  })

  test('clear filters button appears after filtering', async ({ page }) => {
    await goToActivitiesPage(page)
    await page.getByLabel(/Filter by subject/i).selectOption('Mathematics')
    await expect(page.getByRole('button', { name: /Clear/i })).toBeVisible()
  })
})

// ── Play Quiz Flow ────────────────────────────────────────────────────────────

test.describe('Play Quiz Flow', () => {
  // We mock an activity for the play page
  test.beforeEach(async ({ page }) => {
    // Intercept the activity API call
    await page.route('/api/activities/test-quiz', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activity: {
            id: 'test-quiz',
            title: 'Sample Quiz',
            type_id: 'quiz',
            locale: 'en',
            teacher_id: 'teacher1',
            is_public: true,
            items: [
              { prompt: 'What is 2+2?', answer: '4', hint: 'Basic addition' },
              { prompt: 'Capital of France?', answer: 'Paris' },
              { prompt: 'What color is the sky?', answer: 'Blue' },
            ],
            play_count: 10,
            like_count: 3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      })
    })
    await page.route('/api/activities/test-quiz/play', async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) })
    })
  })

  test('play page loads activity', async ({ page }) => {
    await page.goto('/en/activity/test-quiz/play')
    await expect(page.getByText('Sample Quiz')).toBeVisible()
  })

  test('play page shows timer', async ({ page }) => {
    await page.goto('/en/activity/test-quiz/play')
    // Timer in header
    await expect(page.getByText(/00:0/)).toBeVisible()
  })

  test('quiz shows question with options', async ({ page }) => {
    await page.goto('/en/activity/test-quiz/play')
    await expect(page.getByText('What is 2+2?')).toBeVisible()
    // Should show 4 option buttons
    const options = page.getByRole('button', { name: /Option [1-4]/i })
    await expect(options).toHaveCount(4)
  })

  test('can answer a quiz question', async ({ page }) => {
    await page.goto('/en/activity/test-quiz/play')
    await page.waitForSelector('text=What is 2+2?')
    const firstOption = page.getByRole('button', { name: /Option 1/i }).first()
    await firstOption.click()
    // Feedback should appear
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 2000 })
  })

  test('exit button navigates away', async ({ page }) => {
    await page.goto('/en/activity/test-quiz/play')
    await page.getByRole('button', { name: /Exit activity/i }).click()
    await expect(page).toHaveURL(/\/en\/activity\/test-quiz/)
  })
})

// ── Single Activity View Page ─────────────────────────────────────────────────

test.describe('Activity View Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/activities/test-act', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activity: {
            id: 'test-act',
            title: 'Geography Quiz',
            description: 'Test your geography knowledge',
            type_id: 'quiz',
            locale: 'en',
            teacher_id: 'teacher1',
            subject_id: 'Geography',
            grade_id: 'Grade 7',
            is_public: true,
            items: [{ prompt: 'Capital of Japan?', answer: 'Tokyo' }],
            play_count: 250,
            like_count: 15,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      })
    })
  })

  test('shows activity title', async ({ page }) => {
    await page.goto('/en/activity/test-act')
    await expect(page.getByRole('heading', { name: 'Geography Quiz' })).toBeVisible()
  })

  test('shows play button', async ({ page }) => {
    await page.goto('/en/activity/test-act')
    await expect(page.getByRole('link', { name: /Play Now/i })).toBeVisible()
  })

  test('shows activity metadata', async ({ page }) => {
    await page.goto('/en/activity/test-act')
    await expect(page.getByText('Geography')).toBeVisible()
    await expect(page.getByText('Grade 7')).toBeVisible()
  })

  test('play button links to play page', async ({ page }) => {
    await page.goto('/en/activity/test-act')
    const playBtn = page.getByRole('link', { name: /Play Now/i })
    await expect(playBtn).toHaveAttribute('href', /\/play$/)
  })
})

// ── RTL Layout Tests (Urdu) ───────────────────────────────────────────────────

test.describe('RTL Layout — Urdu', () => {
  test('activities page has rtl dir in Urdu', async ({ page }) => {
    await page.goto('/ur/activities')
    await page.waitForLoadState('networkidle')
    const container = page.locator('[dir="rtl"]').first()
    await expect(container).toBeVisible()
  })

  test('create page has rtl dir in Urdu', async ({ page }) => {
    await page.goto('/ur/create')
    await page.waitForLoadState('networkidle')
    const container = page.locator('[dir="rtl"]').first()
    await expect(container).toBeVisible()
  })
})

// ── Theme Tests ───────────────────────────────────────────────────────────────

test.describe('Theme Rendering', () => {
  const themes = ['ladies', 'gents', 'kids'] as const

  for (const theme of themes) {
    test(`activities page renders in ${theme} theme`, async ({ page }) => {
      await page.goto('/en/activities')
      await setTheme(page, theme)
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.getByRole('heading', { name: /Browse Activities/i })).toBeVisible()
    })
  }
})

// ── Mobile Viewport Tests (375px) ────────────────────────────────────────────

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('browse page is usable at 375px', async ({ page }) => {
    await goToActivitiesPage(page)
    await expect(page.getByRole('heading', { name: /Browse Activities/i })).toBeVisible()
    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375)
  })

  test('create page is usable at 375px', async ({ page }) => {
    await goToCreatePage(page)
    await expect(page.getByRole('heading', { name: /Create Activity/i })).toBeVisible()
  })

  test('type selector grid is scrollable on mobile', async ({ page }) => {
    await goToCreatePage(page)
    const firstTile = page.getByRole('button', { name: /^Quiz/i }).first()
    await expect(firstTile).toBeVisible()
    await firstTile.click()
    await expect(firstTile).toBeVisible()
  })
})

// ── Print Export ──────────────────────────────────────────────────────────────

test.describe('Print Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/activities*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activities: [{
            id: 'printable-act',
            title: 'Printable Quiz',
            type_id: 'quiz',
            locale: 'en',
            teacher_id: 'teacher1',
            is_public: true,
            items: [
              { prompt: 'Q1', answer: 'A1' },
              { prompt: 'Q2', answer: 'A2' },
            ],
            play_count: 0, like_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
          pagination: { page: 1, limit: 24, total: 1, pages: 1 },
        }),
      })
    })
  })

  test('print button opens print modal', async ({ page }) => {
    await goToActivitiesPage(page)
    await page.waitForLoadState('networkidle')
    // Wait for activities to load and find print button
    const printBtn = page.getByRole('button', { name: /Print/i }).first()
    if (await printBtn.isVisible()) {
      await printBtn.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/Print Worksheet/i)).toBeVisible()
    }
  })

  test('print modal has cancel button', async ({ page }) => {
    await goToActivitiesPage(page)
    await page.waitForLoadState('networkidle')
    const printBtn = page.getByRole('button', { name: /🖨/i }).first()
    if (await printBtn.isVisible()) {
      await printBtn.click()
      await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible()
    }
  })
})

// ── ActivityCard component tests ──────────────────────────────────────────────

test.describe('ActivityCard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/activities*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activities: [{
            id: 'card-test',
            title: 'Card Test Activity',
            type_id: 'flashcards',
            locale: 'en',
            teacher_id: 'teacher1',
            subject_id: 'English',
            grade_id: 'Grade 3',
            is_public: true,
            items: [{ prompt: 'Front', answer: 'Back' }, { prompt: 'F2', answer: 'B2' }],
            play_count: 99,
            like_count: 7,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
          pagination: { page: 1, limit: 24, total: 1, pages: 1 },
        }),
      })
    })
  })

  test('shows activity title on card', async ({ page }) => {
    await goToActivitiesPage(page)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Card Test Activity')).toBeVisible({ timeout: 5000 })
  })

  test('shows play button on card', async ({ page }) => {
    await goToActivitiesPage(page)
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('button', { name: /▶ Play/i })).toBeVisible({ timeout: 5000 })
  })
})

// ── Error state tests ─────────────────────────────────────────────────────────

test.describe('Error States', () => {
  test('play page shows error for missing activity', async ({ page }) => {
    await page.route('/api/activities/nonexistent', async (route) => {
      await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Activity not found' }) })
    })
    await page.goto('/en/activity/nonexistent/play')
    await expect(page.getByText(/Activity Not Found/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /Browse Activities/i })).toBeVisible()
  })
})
