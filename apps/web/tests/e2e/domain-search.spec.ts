import {
  createUniqueEmail,
  expect,
  test,
  waitForBaseUrlReady,
  waitForHydration,
  warmUpApp,
} from './fixtures'

test.describe('domain search routes', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('domain search e2e tests require Playwright baseURL to be configured.')
    }

    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  test('legacy query URLs redirect to canonical keyword pages', async ({ page }) => {
    await page.goto('/?q=atlas')
    await waitForHydration(page)

    await expect(page).toHaveURL(/\/q\/atlas$/)
    await expect(page.getByText('atlas.com').first()).toBeVisible()
  })

  test('exact-domain pages stay shareable but noindex', async ({ page }) => {
    await page.goto('/d/atlas.com')
    await waitForHydration(page)

    await expect(page).toHaveURL(/\/d\/atlas\.com$/)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('changing the search updates the visible result set', async ({ page }) => {
    await page.goto('/q/atlas')
    await waitForHydration(page)

    await expect(page).toHaveURL(/\/q\/atlas$/)
    await expect(page.getByText('atlas.com').first()).toBeVisible()

    await page.getByRole('textbox').fill('rally')
    await page.getByRole('button', { name: /check/i }).click()

    await expect(page).toHaveURL(/\/q\/rally$/)
    await expect(page.getByText('rally.com').first()).toBeVisible()
    await expect(page.getByText('atlas.com').first()).not.toBeVisible()
  })

  test('saving a search returns through auth and lands in dashboard state', async ({ page }) => {
    const email = createUniqueEmail('saved-search')

    await page.goto('/q/atlas')
    await waitForHydration(page)
    await page.getByTestId('domain-save-search').click()
    await expect
      .poll(() => {
        const url = new URL(page.url())
        return `${url.pathname}${url.search}`
      })
      .toBe('/login?next=/q/atlas')
    await waitForHydration(page)

    await page.getByRole('link', { name: /sign up/i }).click()
    await expect
      .poll(() => {
        const url = new URL(page.url())
        return `${url.pathname}${url.search}`
      })
      .toBe('/register?next=/q/atlas')
    await waitForHydration(page)
    await expect(page.getByTestId('auth-register-submit')).toBeEnabled()

    await page.getByTestId('auth-register-name').fill('Saved Search User')
    await page.getByTestId('auth-register-email').fill(email)
    await page.getByTestId('auth-register-password').fill('password123')
    await page.getByTestId('auth-register-submit').click()

    await expect.poll(() => new URL(page.url()).pathname).toBe('/q/atlas')
    await waitForHydration(page)
    await page.getByTestId('domain-save-search').click()
    await expect(page.getByTestId('domain-save-search')).toContainText(/saved/i)

    await page.goto('/dashboard')
    await waitForHydration(page)
    await expect(page.getByTestId('saved-search-item')).toContainText('atlas')

    await page.getByTestId('saved-search-remove').click()
    await expect(page.getByTestId('saved-searches-empty')).toBeVisible()
  })
})
