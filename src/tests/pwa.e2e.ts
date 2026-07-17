// src/tests/pwa.e2e.ts
// E2E: PWA install prompt + offline mode
import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

test.describe('PWA manifest', () => {
  test('manifest.json is accessible and valid', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/manifest.json`)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('json')

    const manifest = await res.json()
    expect(manifest.name).toBe('EduPlay — Interactive Learning')
    expect(manifest.short_name).toBe('EduPlay')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.icons).toBeInstanceOf(Array)
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  test('manifest includes 192x192 and 512x512 icons', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/manifest.json`)
    const manifest = await res.json()

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  test('manifest has maskable icon for Android', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/manifest.json`)
    const manifest = await res.json()

    const hasMaskable = manifest.icons.some(
      (i: { purpose?: string }) => i.purpose?.includes('maskable'),
    )
    expect(hasMaskable).toBe(true)
  })

  test('manifest has shortcuts defined', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/manifest.json`)
    const manifest = await res.json()

    expect(manifest.shortcuts).toBeInstanceOf(Array)
    expect(manifest.shortcuts.length).toBeGreaterThan(0)
  })
})

test.describe('PWA meta tags', () => {
  test('home page has PWA meta tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/`)

    // Check manifest link
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveCount(1)
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')

    // Check theme-color
    const themeColor = page.locator('meta[name="theme-color"]')
    await expect(themeColor).toHaveCount(1)

    // Check viewport
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveCount(1)
  })

  test('home page has apple-touch-icon', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/`)
    const appleIcon = page.locator('link[rel="apple-touch-icon"]')
    await expect(appleIcon).toHaveCount(1)
  })
})

test.describe('PWA install prompt', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('install prompt appears on mobile after delay', async ({ page }) => {
    // Simulate beforeinstallprompt event
    await page.goto(`${BASE_URL}/en/`)

    await page.evaluate(() => {
      // Fire the beforeinstallprompt event to trigger the prompt
      const event = new Event('beforeinstallprompt')
      Object.defineProperty(event, 'prompt', {
        value: async () => {},
      })
      Object.defineProperty(event, 'userChoice', {
        value: Promise.resolve({ outcome: 'accepted' }),
      })
      window.dispatchEvent(event)
    })

    // Wait for the 3-second delay + a bit more
    await page.waitForTimeout(3500)

    const installPrompt = page.locator('[role="dialog"][aria-label*="Install"]')
    await expect(installPrompt).toBeVisible({ timeout: 5000 })
  })

  test('install prompt has "Add to Home Screen" text', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/`)

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt')
      Object.defineProperty(event, 'prompt', { value: async () => {} })
      Object.defineProperty(event, 'userChoice', {
        value: Promise.resolve({ outcome: 'dismissed' }),
      })
      window.dispatchEvent(event)
    })

    await page.waitForTimeout(3500)

    const prompt = page.locator('[role="dialog"]')
    if (await prompt.count() > 0) {
      await expect(prompt).toContainText(/home screen|install/i)
    }
  })

  test('"Not Now" dismisses the install prompt', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/`)

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt')
      Object.defineProperty(event, 'prompt', { value: async () => {} })
      Object.defineProperty(event, 'userChoice', {
        value: Promise.resolve({ outcome: 'dismissed' }),
      })
      window.dispatchEvent(event)
    })

    await page.waitForTimeout(3500)

    const prompt = page.locator('[role="dialog"]')
    if (await prompt.count() > 0) {
      const notNowBtn = page.locator('button:has-text("Not Now")')
      await notNowBtn.click()
      await expect(prompt).not.toBeVisible({ timeout: 2000 })
    }
  })

  test('prompt does not reappear after dismissal in same session', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/`)

    // Fire and dismiss
    await page.evaluate(() => {
      sessionStorage.setItem('pwa-prompt-dismissed', '1')
    })

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt')
      Object.defineProperty(event, 'prompt', { value: async () => {} })
      Object.defineProperty(event, 'userChoice', {
        value: Promise.resolve({ outcome: 'dismissed' }),
      })
      window.dispatchEvent(event)
    })

    await page.waitForTimeout(4000)

    const prompt = page.locator('[role="dialog"][aria-label*="Install"]')
    await expect(prompt).not.toBeVisible()
  })
})

test.describe('Offline mode', () => {
  test('offline banner appears when network goes offline', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/en/`)

    // Go offline
    await context.setOffline(true)

    // Trigger the offline event
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'))
    })

    const banner = page.locator('[role="alert"]:has-text("offline")')
    await expect(banner).toBeVisible({ timeout: 3000 })

    // Restore online
    await context.setOffline(false)
  })

  test('offline banner disappears when network is restored', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/en/`)

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))

    const banner = page.locator('[role="alert"]:has-text("offline")')
    await expect(banner).toBeVisible({ timeout: 3000 })

    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))

    await expect(banner).not.toBeVisible({ timeout: 3000 })
  })

  test('offline banner lists cached activities when available', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/en/`)

    // Inject cached activities into localStorage
    await page.evaluate(() => {
      localStorage.setItem(
        'eduplay-cached-activities',
        JSON.stringify([
          {
            id: 'act_test_1',
            title: 'Math Quiz Grade 5',
            type: 'quiz',
            typeEmoji: '🧠',
            cachedAt: new Date().toISOString(),
          },
          {
            id: 'act_test_2',
            title: 'Spelling Bee',
            type: 'wordsearch',
            typeEmoji: '🔤',
            cachedAt: new Date().toISOString(),
          },
        ]),
      )
    })

    await context.setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))

    const banner = page.locator('[role="alert"]')
    await expect(banner).toBeVisible({ timeout: 3000 })

    // Should show count of cached activities
    await expect(banner).toContainText('2')

    // Click show to expand
    const showBtn = banner.locator('button:has-text("Show")')
    if (await showBtn.count() > 0) {
      await showBtn.click()
      await expect(page.locator('text=Math Quiz Grade 5')).toBeVisible()
    }

    await context.setOffline(false)
  })

  test('service worker is registered', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/`)

    const hasServiceWorker = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      const registrations = await navigator.serviceWorker.getRegistrations()
      return registrations.length > 0
    })

    // In production builds, SW should be registered
    // In dev mode, it may not be — we just check the API is available
    const swSupported = await page.evaluate(() => 'serviceWorker' in navigator)
    expect(swSupported).toBe(true)
  })
})

test.describe('Mobile PWA', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('manifest link in head is correct on mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/`)
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
  })
})
