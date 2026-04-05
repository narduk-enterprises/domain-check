import { expect, test, waitForBaseUrlReady, waitForHydration, warmUpApp } from './fixtures'
import {
  buildKeywordResponse,
  installStaticDomainSearchMock,
  installErrorDomainSearchMock,
  installDelayedDomainSearchMock,
} from './helpers/domain-search-mocks'

import type { Page } from '@playwright/test'

/**
 * Get location.pathname from the browser. Vue Router's replaceState
 * updates window.location but CDP may lag behind, so we read it directly.
 */
function getPathname(page: Page) {
  return page.evaluate(() => globalThis.location.pathname)
}

/* ------------------------------------------------------------------ */
/*  Domain Search UI — mocked                                        */
/*                                                                    */
/*  page.route() only intercepts BROWSER-side requests. SSR fetches   */
/*  bypass it. So all mocked tests start from `/` (empty state),      */
/*  install the mock, then fill + submit to trigger client-only fetch. */
/* ------------------------------------------------------------------ */

test.describe('domain search UI (mocked)', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('domain search UI tests require Playwright baseURL to be configured.')
    }

    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  /* ---- empty state ---- */

  test('empty state shows instructional copy', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(page.getByText('Type a word and stop thinking about the rest.')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByPlaceholder(/try atlas or atlas\.com/i)).toBeVisible()
  })

  /* ---- keyword search with 8 results ---- */

  test('keyword search renders result grid with status badges', async ({ page }) => {
    const mockResponse = buildKeywordResponse('testword')
    await installStaticDomainSearchMock(page, mockResponse)

    await page.goto('/')
    await waitForHydration(page)

    // Type and submit to trigger client-side fetch (intercepted by mock)
    await page.getByPlaceholder(/try atlas/i).fill('testword')
    await page.getByRole('button', { name: /check/i }).click()

    // Wait for mock results to render
    await expect(page.getByText('testword.com').first()).toBeVisible({ timeout: 10_000 })

    // "8 live checks" badge
    await expect(page.getByText('8 live checks')).toBeVisible()
    // "2 open" badge (2 available: .com and .ai)
    await expect(page.getByText('2 open')).toBeVisible()

    // Status badges
    await expect(page.getByText('Available').first()).toBeVisible()
    await expect(page.getByText('Taken').first()).toBeVisible()
    await expect(page.getByText('Unknown').first()).toBeVisible()

    // Exact match badge on testword.com
    await expect(page.getByText('Exact').first()).toBeVisible()

    // All 8 TLD domains visible
    for (const tld of ['com', 'ai', 'io', 'app', 'dev', 'co', 'net', 'org']) {
      await expect(page.getByText(`testword.${tld}`).first()).toBeVisible()
    }
  })

  /* ---- featured "Best open option" ---- */

  test('available domain shows featured card with Register and Inspect', async ({ page }) => {
    const mockResponse = buildKeywordResponse('testopen')
    await installStaticDomainSearchMock(page, mockResponse)

    await page.goto('/')
    await waitForHydration(page)

    await page.getByPlaceholder(/try atlas/i).fill('testopen')
    await page.getByRole('button', { name: /check/i }).click()

    await expect(page.getByText('Best open option')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('link', { name: /register/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /inspect/i }).first()).toBeVisible()
  })

  /* ---- error state ---- */

  test('API error shows user-facing error message', async ({ page }) => {
    await installErrorDomainSearchMock(page)

    await page.goto('/')
    await waitForHydration(page)

    await page.getByPlaceholder(/try atlas/i).fill('errortest')
    await page.getByRole('button', { name: /check/i }).click()

    await expect(page.getByText(/some registries did not answer in time/i)).toBeVisible({
      timeout: 10_000,
    })
  })

  /* ---- refreshing indicator ---- */

  test('refreshing badge appears during slow responses', async ({ page }) => {
    const mockResponse = buildKeywordResponse('slowtest')
    await installDelayedDomainSearchMock(page, mockResponse, 2000)

    await page.goto('/')
    await waitForHydration(page)

    await page.getByPlaceholder(/try atlas/i).fill('slowtest')
    await page.getByRole('button', { name: /check/i }).click()

    // "Refreshing" badge should appear while the response is pending
    await expect(page.getByText('Refreshing')).toBeVisible({ timeout: 5_000 })

    // After the delayed response arrives, results should appear
    await expect(page.getByText('slowtest.com').first()).toBeVisible({ timeout: 10_000 })
  })

  /* ---- guest chrome ---- */

  test('guest sees Sign in, not Saved dashboard link', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /^saved$/i })).not.toBeVisible()
  })
})

/* ------------------------------------------------------------------ */
/*  Domain Search Routing                                             */
/* ------------------------------------------------------------------ */

test.describe('domain search routing', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    if (!baseURL) {
      throw new Error('domain search routing tests require Playwright baseURL to be configured.')
    }

    await waitForBaseUrlReady(baseURL)
    await warmUpApp(browser, baseURL)
  })

  /* ---- debounce updates URL (intra-page, /q → /q) ---- */

  test('typing a keyword updates URL via router.replace within /q/ page', async ({ page }) => {
    await page.goto('/q/placeholder')
    await waitForHydration(page)

    await page.getByRole('textbox').fill('atlas')

    // Vue Router's replaceState is invisible to CDP, so read location directly
    await expect.poll(() => getPathname(page), { timeout: 5_000 }).toBe('/q/atlas')
  })

  /* ---- Enter key submits ---- */

  test('pressing Enter submits the query like the Check button', async ({ page }) => {
    await page.goto('/q/placeholder')
    await waitForHydration(page)

    await page.getByRole('textbox').fill('rally')
    await page.getByRole('textbox').press('Enter')

    await expect.poll(() => getPathname(page), { timeout: 5_000 }).toBe('/q/rally')
    await expect(page.getByText('rally.com').first()).toBeVisible({ timeout: 15_000 })
  })

  /* ---- sample pills ---- */

  test('clicking sample query pills navigates and initiates search', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)

    // Click the "atlas" sample pill
    await page.getByRole('button', { name: 'atlas' }).click()

    await expect.poll(() => getPathname(page), { timeout: 5_000 }).toBe('/q/atlas')
    await expect(page.getByText('atlas.com').first()).toBeVisible({ timeout: 15_000 })
  })

  /* ---- URL normalization ---- */

  test('pasting a full URL normalizes to canonical /d/ path', async ({ page }) => {
    await page.goto('/q/placeholder')
    await waitForHydration(page)

    await page.getByRole('textbox').fill('https://www.Example.COM/path')
    await page.getByRole('button', { name: /check/i }).click()

    // normalizeDomainQuery strips protocol, www, path → "example.com"
    // buildCanonicalSearchPath → "/d/example.com"
    await expect.poll(() => getPathname(page), { timeout: 5_000 }).toBe('/d/example.com')
  })

  /* ---- direct /q/ navigation (live API, structural only) ---- */

  test('direct navigation to /q/atlas loads with results', async ({ page }) => {
    await page.goto('/q/atlas')
    await waitForHydration(page)

    await expect(page.getByText('atlas.com').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('live checks')).toBeVisible()
  })

  /* ---- direct /d/ navigation (live API, structural only) ---- */

  test('direct navigation to /d/atlas.com loads with results', async ({ page }) => {
    await page.goto('/d/atlas.com')
    await waitForHydration(page)

    await expect(page.getByText('atlas.com').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('live checks')).toBeVisible()
  })
})
