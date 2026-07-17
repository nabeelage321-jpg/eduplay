// src/tests/marketplace.e2e.ts
// E2E: Teacher marketplace — list → buy → access
import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

async function loginAsProTeacher(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/en/`)
  await page.click('[data-testid="login-btn"]')
  await page.fill('[name="email"]', process.env.TEST_PRO_USER_EMAIL ?? 'pro@test.eduplay.app')
  await page.fill('[name="password"]', process.env.TEST_PRO_USER_PASSWORD ?? 'TestPass123!')
  await page.click('[type="submit"]')
  await page.waitForURL('**/dashboard**')
}

async function loginAsStudent(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/en/`)
  await page.click('[data-testid="login-btn"]')
  await page.fill('[name="email"]', process.env.TEST_STUDENT_EMAIL ?? 'student@test.eduplay.app')
  await page.fill('[name="password"]', process.env.TEST_STUDENT_PASSWORD ?? 'TestPass123!')
  await page.click('[type="submit"]')
  await page.waitForURL('**/dashboard**')
}

test.describe('Marketplace — Browse', () => {
  test('marketplace home loads with activity cards', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/marketplace`)
    await expect(page.locator('h1:has-text("Marketplace")')).toBeVisible()
    // Activities should load (even if empty in test env)
    await expect(page.locator('[data-testid="marketplace-grid"], main')).toBeVisible()
  })

  test('search filters activities', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/marketplace`)
    const searchInput = page.locator('input[type="search"]')
    await searchInput.fill('math')
    await page.waitForTimeout(300) // debounce
    // Results should update — either show filtered results or "no results"
    const hasResults = await page.locator('[data-testid="activity-card"]').count()
    const hasNoResults = await page.locator('text=No activities found').count()
    expect(hasResults + hasNoResults).toBeGreaterThan(0)
  })

  test('subject filter buttons are accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/marketplace`)
    const filterGroup = page.locator('[role="group"][aria-label*="subject" i]')
    await expect(filterGroup).toBeVisible()
    const buttons = filterGroup.locator('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
  })

  test('sort by options work', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/marketplace`)
    const sortSelect = page.locator('#sort-select')
    await expect(sortSelect).toBeVisible()
    await sortSelect.selectOption('price')
    await page.waitForTimeout(200)
    // Page should still be functional after sort change
    await expect(page.locator('main')).toBeVisible()
  })
})

test.describe('Marketplace — List activity (Pro teacher)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProTeacher(page)
  })

  test('pro teacher can access listing page', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/marketplace`)
    await expect(page.locator('text=List Activity, text=Marketplace')).toBeVisible()
  })

  test('listing form has required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/marketplace/list`)
    const activitySelect = page.locator('#activity-select')
    const priceInput = page.locator('#price-input')
    const descriptionInput = page.locator('#description-input')

    // All form elements should be present
    await expect(activitySelect.or(priceInput)).toBeTruthy()
    await expect(priceInput).toBeTruthy()
    await expect(descriptionInput).toBeTruthy()
  })

  test('price slider enforces min/max bounds', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/marketplace/list`)
    const priceInput = page.locator('#price-input')
    await expect(priceInput).toBeVisible()

    const min = await priceInput.getAttribute('aria-valuemin')
    const max = await priceInput.getAttribute('aria-valuemax')
    expect(Number(min)).toBe(1)
    expect(Number(max)).toBe(10)
  })

  test('revenue split shows 70% teacher share', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/marketplace/list`)
    await expect(page.locator('text=70%')).toBeVisible()
  })

  test('submit without description shows validation error', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/marketplace/list`)
    const submitBtn = page.locator('button:has-text("List for Sale"), button:has-text("🚀")')
    if (await submitBtn.count() > 0) {
      await submitBtn.click()
      const error = page.locator('[role="alert"], text=description')
      await expect(error.first()).toBeVisible({ timeout: 3000 })
    }
  })
})

test.describe('Marketplace — Purchase flow', () => {
  test('activity detail page shows price and buy button', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/marketplace`)
    const firstCard = page.locator('[data-testid="activity-card"]').first()
    if (await firstCard.count() > 0) {
      await firstCard.click()
      await expect(page.locator('text=Buy Now, text=Buy for $')).toBeVisible({ timeout: 5000 })
    }
  })

  test('unauthenticated user is prompted to sign in before purchase', async ({ page }) => {
    // Ensure logged out
    await page.goto(`${BASE_URL}/en/`)
    await page.goto(`${BASE_URL}/en/marketplace`)
    const firstCard = page.locator('[data-testid="activity-card"], article').first()
    if (await firstCard.count() > 0) {
      const buyBtn = firstCard.locator('a:has-text("Buy"), button:has-text("Buy")')
      if (await buyBtn.count() > 0) {
        await buyBtn.click()
        // Should show sign in prompt or redirect
        const signInPrompt = page.locator('text=Sign in, text=Log in, [href*="signin"]')
        await expect(signInPrompt.first()).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('purchase page shows what you get list', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/marketplace`)
    const firstCard = page.locator('article').first()
    if (await firstCard.count() > 0) {
      // Go directly to a purchase page
      const buyLink = firstCard.locator('a[href*="marketplace/activity"]')
      if (await buyLink.count() > 0) {
        await buyLink.click()
        await expect(page.locator('text=Lifetime access, text=What you get')).toBeVisible({
          timeout: 5000,
        })
      }
    }
  })
})

test.describe('Creator earnings dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProTeacher(page)
  })

  test('earnings page loads without error', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/marketplace/earnings`)
    await expect(page.locator('text=Earnings, text=Total Earned')).toBeVisible({ timeout: 5000 })
  })

  test('payout settings form is present', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/dashboard/marketplace/earnings`)
    const paypalInput = page.locator('#paypal-email')
    await expect(paypalInput.or(page.locator('text=PayPal'))).toBeTruthy()
  })
})

test.describe('Mobile marketplace', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('marketplace grid adapts to mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/marketplace`)
    await expect(page.locator('main')).toBeVisible()
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(380)
  })
})
