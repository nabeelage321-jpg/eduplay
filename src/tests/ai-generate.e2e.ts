/**
 * E2E tests — AI Generation Flow (Phase 4)
 * Tests: generate quiz, daily limit enforcement, content in creator
 */

import { test, expect, type Page } from '@playwright/test'

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? 'teacher@test.eduplay.com'
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'test-password-123'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/en/api/auth/signin`)
  await page.fill('[name="email"]', TEST_EMAIL)
  await page.fill('[name="password"]', TEST_PASSWORD)
  await page.click('[type="submit"]')
  await page.waitForURL(`${BASE_URL}/en/**`)
}

async function goToCreate(page: Page) {
  await page.goto(`${BASE_URL}/en/create`)
  await page.waitForLoadState('networkidle')
}

async function switchToAIMode(page: Page) {
  const aiToggle = page.getByRole('button', { name: /generate with ai/i })
  await aiToggle.click()
  await expect(aiToggle).toHaveAttribute('aria-pressed', 'true')
}

async function openAIPanel(page: Page) {
  const openBtn = page.getByRole('button', { name: /generate with ai/i }).last()
  await openBtn.click()
  await expect(page.getByRole('dialog', { name: /ai activity generator/i })).toBeVisible()
}

// ─── Test: Generate quiz from topic ───────────────────────────────────────────

test.describe('AI Activity Generation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('generates quiz from topic "multiplication tables grade 3"', async ({ page }) => {
    await goToCreate(page)
    await switchToAIMode(page)
    await openAIPanel(page)

    // Fill in topic
    const topicInput = page.getByLabel(/what topic do you want to teach/i)
    await topicInput.fill('multiplication tables')

    // Select quiz type
    const typeSelect = page.getByLabel('Activity Type')
    await typeSelect.selectOption('quiz')

    // Select grade 3
    const gradeSelect = page.getByLabel('Grade')
    await gradeSelect.selectOption('Grade 3')

    // Set item count to 5 for speed
    const countSlider = page.getByLabel(/number of items/i)
    await countSlider.fill('5')

    // Click generate
    const generateBtn = page.getByRole('button', { name: /generate activity/i })
    await generateBtn.click()

    // Wait for generation (up to 30s)
    await expect(page.getByText(/items generated/i)).toBeVisible({ timeout: 30_000 })

    // Verify items appeared
    const items = page.locator('[role="list"] [role="listitem"]')
    await expect(items).toHaveCount(5, { timeout: 5000 })

    // Verify each item has a prompt and answer
    const firstItem = items.first()
    await expect(firstItem).toContainText('→')
  })

  test('generated content appears in creator after "Add All"', async ({ page }) => {
    await goToCreate(page)
    await switchToAIMode(page)
    await openAIPanel(page)

    // Quick generation
    await page.getByLabel(/topic/i).fill('colors in english')
    await page.getByLabel('Activity Type').selectOption('flashcards')
    await page.getByLabel('Grade').selectOption('KG')
    await page.getByLabel(/number of items/i).fill('3')
    await page.getByRole('button', { name: /generate activity/i }).click()

    // Wait for results
    await expect(page.getByText(/items generated/i)).toBeVisible({ timeout: 30_000 })

    // Click "Add All to Activity"
    await page.getByRole('button', { name: /add all to activity/i }).click()

    // Panel should close, items should appear in activity summary
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/activity items/i)).toBeVisible()
  })

  test('can edit a generated item before adding', async ({ page }) => {
    await goToCreate(page)
    await switchToAIMode(page)
    await openAIPanel(page)

    await page.getByLabel(/topic/i).fill('basic shapes')
    await page.getByLabel('Activity Type').selectOption('quiz')
    await page.getByLabel('Grade').selectOption('Grade 1')
    await page.getByLabel(/number of items/i).fill('3')
    await page.getByRole('button', { name: /generate activity/i }).click()
    await expect(page.getByText(/items generated/i)).toBeVisible({ timeout: 30_000 })

    // Click edit on first item
    const editBtn = page.getByLabel('Edit this item').first()
    await editBtn.click()

    // Edit the prompt
    const promptField = page.getByLabel('Question / Prompt')
    await promptField.clear()
    await promptField.fill('Custom edited question')

    // Save
    await page.getByRole('button', { name: 'Save' }).click()

    // Verify edited text appears
    await expect(page.getByText('Custom edited question')).toBeVisible()
  })

  test('can delete a generated item', async ({ page }) => {
    await goToCreate(page)
    await switchToAIMode(page)
    await openAIPanel(page)

    await page.getByLabel(/topic/i).fill('animals')
    await page.getByLabel('Activity Type').selectOption('quiz')
    await page.getByLabel('Grade').selectOption('Grade 2')
    await page.getByLabel(/number of items/i).fill('3')
    await page.getByRole('button', { name: /generate activity/i }).click()
    await expect(page.getByText(/3 items generated/i)).toBeVisible({ timeout: 30_000 })

    // Delete first item
    await page.getByLabel('Delete this item').first().click()

    // Should show 2 items
    await expect(page.getByText(/2 items/i)).toBeVisible()
  })

  test('usage counter updates after generation', async ({ page }) => {
    await goToCreate(page)

    // Check initial usage
    const usageIndicator = page.getByLabel(/ai:/i).first()
    const initialText = await usageIndicator.textContent()

    await switchToAIMode(page)
    await openAIPanel(page)
    await page.getByLabel(/topic/i).fill('planets')
    await page.getByLabel('Activity Type').selectOption('quiz')
    await page.getByLabel('Grade').selectOption('Grade 4')
    await page.getByLabel(/number of items/i).fill('2')
    await page.getByRole('button', { name: /generate activity/i }).click()
    await expect(page.getByText(/items generated/i)).toBeVisible({ timeout: 30_000 })

    // Close panel
    await page.getByRole('button', { name: 'Close AI panel' }).click()

    // Usage should have incremented
    const updatedText = await usageIndicator.textContent()
    expect(updatedText).not.toBe(initialText)
  })
})

// ─── Test: Daily limit enforcement ───────────────────────────────────────────

test.describe('Daily Limit', () => {
  test('shows upgrade prompt when daily limit is reached', async ({ page }) => {
    // Mock the usage API to return "limit reached"
    await page.route('**/api/ai/usage', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          todayCount: 10,
          dailyLimit: 10,
          remaining: 0,
          isPremium: false,
        }),
      })
    })

    await page.goto(`${BASE_URL}/en/create`)
    await switchToAIMode(page)
    await openAIPanel(page)

    // Should show upgrade prompt, not the form
    await expect(page.getByText(/daily limit reached/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /upgrade to premium/i })).toBeVisible()
    await expect(page.getByLabel(/topic/i)).not.toBeVisible()
  })

  test('returns 429 when limit is reached via API', async ({ page }) => {
    // Mock the generate API to return 429
    await page.route('**/api/ai/generate-activity', (route) => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Daily limit reached',
          code: 'LIMIT_REACHED',
          todayCount: 10,
          dailyLimit: 10,
        }),
      })
    })

    await page.goto(`${BASE_URL}/en/create`)
    await switchToAIMode(page)
    await openAIPanel(page)

    await page.getByLabel(/topic/i).fill('test topic')
    await page.getByRole('button', { name: /generate activity/i }).click()

    // Should show limit reached error
    await expect(page.getByRole('alert')).toContainText(/limit/i)
  })

  test('shows unlimited badge for premium users', async ({ page }) => {
    await page.route('**/api/ai/usage', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          todayCount: 42,
          dailyLimit: null,
          remaining: null,
          isPremium: true,
        }),
      })
    })

    await page.goto(`${BASE_URL}/en/create`)

    const usageIndicator = page.getByLabel(/AI: Unlimited/i)
    await expect(usageIndicator).toBeVisible()
    await expect(usageIndicator).toContainText('∞')
  })
})

// ─── Test: Urdu generation ────────────────────────────────────────────────────

test.describe('Urdu / RTL Generation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('generates activity in Urdu locale', async ({ page }) => {
    await page.goto(`${BASE_URL}/ur/create`)
    await page.waitForLoadState('networkidle')

    // Page should be RTL
    const html = page.locator('html')
    await expect(html).toHaveAttribute('dir', 'rtl')

    // Switch to AI mode
    const aiToggle = page.getByRole('button', { name: /ai سے بنائیں/i })
    await aiToggle.click()

    // Open panel
    await page.getByRole('button', { name: /ai سے بنائیں/i }).last().click()

    // Should show Urdu panel title
    await expect(page.getByRole('dialog')).toBeVisible()

    // Fill topic in Urdu
    const topicInput = page.getByLabel(/موضوع/i).or(page.getByLabel(/topic/i))
    await topicInput.fill('ضرب کی میزیں')

    // Select Urdu language
    const localeSelect = page.getByLabel('Language')
    await localeSelect.selectOption('ur')

    // Generate
    await page.getByRole('button', { name: /generate/i }).click()
    await expect(page.getByText(/items generated/i)).toBeVisible({ timeout: 30_000 })
  })
})

// ─── Test: Content moderation ─────────────────────────────────────────────────

test.describe('Content Moderation', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('rejects inappropriate topics', async ({ page }) => {
    // Mock generate endpoint to simulate moderation rejection
    await page.route('**/api/ai/generate-activity', (route) => {
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Topic rejected: inappropriate content',
        }),
      })
    })

    await goToCreate(page)
    await switchToAIMode(page)
    await openAIPanel(page)

    await page.getByLabel(/topic/i).fill('inappropriate content here')
    await page.getByRole('button', { name: /generate activity/i }).click()

    // Should show error
    await expect(page.getByRole('alert')).toContainText(/rejected/i)
  })
})

// ─── Test: Mobile viewport ────────────────────────────────────────────────────

test.describe('Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('AI panel renders correctly on mobile', async ({ page }) => {
    await goToCreate(page)
    await switchToAIMode(page)
    await openAIPanel(page)

    const panel = page.getByRole('dialog')
    await expect(panel).toBeVisible()

    // Panel should not overflow viewport
    const panelBox = await panel.boundingBox()
    expect(panelBox?.width).toBeLessThanOrEqual(375)

    // Generate button should be visible
    const generateBtn = page.getByRole('button', { name: /generate activity/i })
    await expect(generateBtn).toBeVisible()
    await expect(generateBtn).toBeInViewport()
  })

  test('mode toggle is tappable on mobile', async ({ page }) => {
    await goToCreate(page)

    const aiToggle = page.getByRole('button', { name: /generate with ai/i })
    await expect(aiToggle).toBeVisible()

    // Should be at least 44px for touch target
    const box = await aiToggle.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })
})

// ─── Test: API key not exposed ────────────────────────────────────────────────

test.describe('Security', () => {
  test('ANTHROPIC_API_KEY is never in client-side network requests', async ({ page }) => {
    const apiKeyRequests: string[] = []

    page.on('request', (req) => {
      const headers = req.headers()
      for (const value of Object.values(headers)) {
        if (value.includes('sk-ant-')) {
          apiKeyRequests.push(req.url())
        }
      }
      const body = req.postData()
      if (body?.includes('sk-ant-')) {
        apiKeyRequests.push(req.url())
      }
    })

    await signIn(page)
    await goToCreate(page)
    await switchToAIMode(page)
    await openAIPanel(page)

    // Fill and attempt generation
    await page.getByLabel(/topic/i).fill('test')
    await page.getByRole('button', { name: /generate activity/i }).click()
    await page.waitForTimeout(2000)

    expect(apiKeyRequests).toHaveLength(0)
  })

  test('AI generate endpoint requires authentication', async ({ page }) => {
    // Don't sign in — call API directly
    const res = await page.request.post(`${BASE_URL}/api/ai/generate-activity`, {
      data: {
        topic: 'test',
        activityType: 'quiz',
        itemCount: 5,
        locale: 'en',
        grade: 'Grade 1',
      },
    })

    expect(res.status()).toBe(401)
  })
})
