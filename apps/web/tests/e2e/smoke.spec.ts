import { expect, test, waitForBaseUrlReady, waitForHydration, warmUpApp } from './fixtures'

test.describe('web smoke', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('web smoke tests require Playwright baseURL to be configured.')
    }

    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('home page renders the domain search surface', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
    await expect(page.getByRole('heading', { name: /find the domain/i })).toBeVisible()
    await expect(page.getByPlaceholder(/try atlas or atlas\.com/i)).toBeVisible()
    await expect(page).toHaveTitle(/Quick Domain Check/)
  })
})
