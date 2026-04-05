import type { Page } from '@playwright/test'

/* ------------------------------------------------------------------ */
/*  Minimal type shapes mirroring #shared/domainSearch                */
/* ------------------------------------------------------------------ */

type DomainStatus = 'available' | 'taken' | 'unknown'
type DomainReason = 'rdap-found' | 'rdap-missing' | 'timeout' | 'rate-limited' | 'lookup-failed'

interface DomainResult {
  domain: string
  tld: string
  isExactMatch: boolean
  status: DomainStatus
  reason: DomainReason
  rdapUrl: string
  purchaseUrl: string | null
  registrar: string | null
  expiresAt: string | null
}

interface DomainSearchResponse {
  query: string
  normalizedQuery: string
  baseLabel: string
  exactDomain: string | null
  results: DomainResult[]
}

/* ------------------------------------------------------------------ */
/*  Builder helpers                                                   */
/* ------------------------------------------------------------------ */

function buildResult(domain: string, overrides: Partial<DomainResult> = {}): DomainResult {
  const tld = domain.split('.').at(-1) ?? ''
  return {
    domain,
    tld,
    isExactMatch: false,
    status: 'taken',
    reason: 'rdap-found',
    rdapUrl: `https://rdap.org/domain/${domain}`,
    purchaseUrl: null,
    registrar: null,
    expiresAt: null,
    ...overrides,
  }
}

/**
 * Build a realistic keyword search response with 8 mixed-status results.
 * The exact-match domain (label.com) is marked available by default.
 */
export function buildKeywordResponse(
  label: string,
  overrides: Partial<DomainSearchResponse> = {},
): DomainSearchResponse {
  const tlds = ['com', 'ai', 'io', 'app', 'dev', 'co', 'net', 'org'] as const

  const results: DomainResult[] = tlds.map((tld, i) => {
    const domain = `${label}.${tld}`
    const isExactMatch = tld === 'com'

    if (i === 0) {
      /* .com — available, exact match */
      return buildResult(domain, {
        isExactMatch,
        status: 'available',
        reason: 'rdap-missing',
        purchaseUrl: `https://www.namecheap.com/domains/registration/results/?domain=${domain}`,
      })
    }
    if (i === 1) {
      /* .ai — available */
      return buildResult(domain, {
        status: 'available',
        reason: 'rdap-missing',
        purchaseUrl: `https://www.namecheap.com/domains/registration/results/?domain=${domain}`,
      })
    }
    if (i === 6) {
      /* .net — unknown / timeout */
      return buildResult(domain, {
        status: 'unknown',
        reason: 'timeout',
      })
    }

    /* everything else — taken */
    return buildResult(domain, {
      status: 'taken',
      reason: 'rdap-found',
      registrar: 'Example Registrar Inc.',
      expiresAt: '2027-03-31T00:00:00Z',
    })
  })

  return {
    query: label,
    normalizedQuery: label,
    baseLabel: label,
    exactDomain: null,
    results,
    ...overrides,
  }
}

/**
 * Build a realistic exact-domain search response.
 */
export function buildExactDomainResponse(
  domain: string,
  status: DomainStatus = 'taken',
): DomainSearchResponse {
  const parts = domain.split('.')
  const baseLabel = parts[0] ?? ''
  const tlds = ['com', 'ai', 'io', 'app', 'dev', 'co', 'net', 'org'] as const

  const results: DomainResult[] = tlds.map((tld) => {
    const d = `${baseLabel}.${tld}`
    const isExact = d === domain
    return buildResult(d, {
      isExactMatch: isExact,
      status: isExact ? status : 'taken',
      reason: isExact ? (status === 'available' ? 'rdap-missing' : 'rdap-found') : 'rdap-found',
      registrar: isExact ? null : 'Example Registrar Inc.',
      purchaseUrl:
        isExact && status === 'available'
          ? `https://www.namecheap.com/domains/registration/results/?domain=${d}`
          : null,
    })
  })

  return {
    query: domain,
    normalizedQuery: domain,
    baseLabel,
    exactDomain: domain,
    results,
  }
}

/* ------------------------------------------------------------------ */
/*  Mock installer                                                    */
/* ------------------------------------------------------------------ */

type MockHandler = (url: URL) => DomainSearchResponse | null | { error: true; status: number }

/**
 * Install an API mock for /api/domain/search on the given Playwright page.
 * The handler receives the parsed URL and returns either a DomainSearchResponse
 * or `{ error: true, status: 500 }` to simulate a server error.
 * Return null to let the request pass through to the real server.
 */
export async function installDomainSearchMock(page: Page, handler: MockHandler) {
  await page.route('**/api/domain/search**', async (route) => {
    const url = new URL(route.request().url())
    const result = handler(url)

    if (result === null) {
      return route.fallback()
    }

    if ('error' in result && result.error) {
      return route.fulfill({
        status: result.status,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal server error' }),
      })
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(result),
    })
  })
}

/**
 * Convenience: install a mock that always returns the given response.
 */
export async function installStaticDomainSearchMock(page: Page, response: DomainSearchResponse) {
  await installDomainSearchMock(page, () => response)
}

/**
 * Install a mock that returns a 500 error for /api/domain/search.
 */
export async function installErrorDomainSearchMock(page: Page) {
  await installDomainSearchMock(page, () => ({ error: true as const, status: 500 }))
}

/**
 * Install a mock that resolves after a delay (for asserting loading states).
 */
export async function installDelayedDomainSearchMock(
  page: Page,
  response: DomainSearchResponse,
  delayMs: number,
) {
  await page.route('**/api/domain/search**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    })
  })
}
