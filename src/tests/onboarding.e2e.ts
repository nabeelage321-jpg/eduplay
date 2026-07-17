import { test, expect } from '@playwright/test'

test.describe('Onboarding flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear stored theme to always show onboarding
    await page.goto('/en')
    await page.evaluate(() => localStorage.removeItem('edtech-theme'))
    await page.reload()
  })

  test('shows onboarding screen on first visit', async ({ page }) => {
    await expect(page.getByText('Welcome to EduPlay!')).toBeVisible()
    await expect(page.getByText('Choose your experience')).toBeVisible()
  })

  test('shows 3 audience options', async ({ page }) => {
    await expect(page.getByText('For Ladies')).toBeVisible()
    await expect(page.getByText('For Gents')).toBeVisible()
    await expect(page.getByText('For Kids')).toBeVisible()
  })

  test('continue button is disabled until audience selected', async ({ page }) => {
    const btn = page.getByRole('button', { name: "Let's go! →" })
    await expect(btn).toBeDisabled()
  })

  test('selecting ladies audience enables continue button', async ({ page }) => {
    await page.getByText('For Ladies').click()
    const btn = page.getByRole('button', { name: "Let's go! →" })
    await expect(btn).toBeEnabled()
  })

  test('selecting ladies + continue navigates to home', async ({ page }) => {
    await page.getByText('For Ladies').click()
    await page.getByRole('button', { name: "Let's go! →" }).click()
    await expect(page).toHaveURL('/en')
    await expect(page.getByText('Make learning unforgettable')).toBeVisible()
  })

  test('selecting kids shows theme picker step', async ({ page }) => {
    await page.getByText('For Kids').click()
    await page.getByRole('button', { name: "Let's go! →" }).click()
    await expect(page.getByText('Pick your favourite theme!')).toBeVisible()
    await expect(page.getByText('Space')).toBeVisible()
    await expect(page.getByText('Ocean')).toBeVisible()
  })

  test('kids can go back to audience selection', async ({ page }) => {
    await page.getByText('For Kids').click()
    await page.getByRole('button', { name: "Let's go! →" }).click()
    await page.getByRole('button', { name: '← Back' }).click()
    await expect(page.getByText('Choose your experience')).toBeVisible()
  })

  test('kids can select magic theme and continue', async ({ page }) => {
    await page.getByText('For Kids').click()
    await page.getByRole('button', { name: "Let's go! →" }).click()
    await page.getByTitle('magic').click()
    await page.getByRole('button', { name: 'magic theme selected!' }).waitFor()
    await page.getByRole('button', { name: "Let's go! 🚀" }).click()
    await expect(page).toHaveURL('/en')
  })

  test('ladies theme applies rose CSS variables', async ({ page }) => {
    await page.getByText('For Ladies').click()
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
    )
    expect(primary).toBe('#D63384')
  })

  test('gents theme applies blue CSS variables', async ({ page }) => {
    await page.getByText('For Gents').click()
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
    )
    expect(primary).toBe('#1565C0')
  })

  test('skip button goes directly to home with ladies default', async ({ page }) => {
    await page.getByText('Skip for now').click()
    await expect(page).toHaveURL('/en')
  })

  test('Urdu locale sets RTL direction', async ({ page }) => {
    await page.goto('/ur')
    await page.evaluate(() => localStorage.removeItem('edtech-theme'))
    await page.reload()
    const dir = await page.evaluate(() => document.documentElement.getAttribute('dir'))
    expect(dir).toBe('rtl')
  })

  test('Urdu locale shows Urdu onboarding text', async ({ page }) => {
    await page.goto('/ur')
    await page.evaluate(() => localStorage.removeItem('edtech-theme'))
    await page.reload()
    await expect(page.getByText('ایجو پلے میں خوش آمدید!')).toBeVisible()
  })
})

test.describe('Theme persistence', () => {
  test('theme persists across page reload', async ({ page }) => {
    await page.goto('/en')
    await page.evaluate(() => localStorage.removeItem('edtech-theme'))
    await page.reload()
    await page.getByText('For Gents').click()
    await page.getByRole('button', { name: "Let's go! →" }).click()
    await page.reload()
    // Should NOT show onboarding again
    await expect(page.getByText('Make learning unforgettable')).toBeVisible()
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    )
    expect(theme).toBe('gents')
  })
})
