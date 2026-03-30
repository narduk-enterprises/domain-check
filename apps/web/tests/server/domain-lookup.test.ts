import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()
const runtimeConfig = {
  domainLookupPrimaryProvider: 'hybrid',
  domainLookupFallbackProvider: 'rdap-proxy',
  domainLookupShadowProviders: [] as string[],
  domainLookupTimeoutMs: 3000,
  domainLookupBootstrapTtlSeconds: 60 * 60 * 24,
  domainLookupAuthoritativeRdapEnabled: true,
  domainrClientId: '',
  whoisxmlApiKey: '',
}

const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

vi.stubGlobal('fetch', fetchMock)
vi.stubGlobal('useRuntimeConfig', () => runtimeConfig)

const { createDomainLookupResolver, parseIanaRdapBootstrap, supportedAuthoritativeTlds } =
  await import('../../server/utils/domainLookup')

const candidateCom = {
  domain: 'atlas.com',
  tld: 'com',
  isExactMatch: true,
}

const candidateIo = {
  domain: 'atlas.io',
  tld: 'io',
  isExactMatch: true,
}

afterAll(() => {
  consoleDebugSpy.mockRestore()
  consoleWarnSpy.mockRestore()
  consoleInfoSpy.mockRestore()
  consoleErrorSpy.mockRestore()
})

describe('domain lookup providers', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    runtimeConfig.domainLookupPrimaryProvider = 'hybrid'
    runtimeConfig.domainLookupFallbackProvider = 'rdap-proxy'
    runtimeConfig.domainLookupShadowProviders = []
    runtimeConfig.domainLookupTimeoutMs = 3000
    runtimeConfig.domainLookupBootstrapTtlSeconds = 60 * 60 * 24
    runtimeConfig.domainLookupAuthoritativeRdapEnabled = true
    runtimeConfig.domainrClientId = ''
    runtimeConfig.whoisxmlApiKey = ''
  })

  it('parses the IANA bootstrap and preserves static authoritative coverage', () => {
    const endpoints = parseIanaRdapBootstrap({
      services: [
        [['io'], ['https://rdap.nic.example/']],
        [['co'], ['https://rdap.co.example']],
      ],
    })

    expect(supportedAuthoritativeTlds()).toEqual(['com', 'ai', 'app', 'dev', 'net', 'org'])
    expect(endpoints.com).toBe('https://rdap.verisign.com/com/v1/')
    expect(endpoints.io).toBe('https://rdap.nic.example/')
    expect(endpoints.co).toBe('https://rdap.co.example/')
  })

  it('uses authoritative registry RDAP for covered TLDs', async () => {
    runtimeConfig.domainLookupPrimaryProvider = 'authoritative-rdap'
    runtimeConfig.domainLookupFallbackProvider = ''

    fetchMock
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          publication: '2026-03-23T19:00:02Z',
          services: [[['com'], ['https://rdap.verisign.com/com/v1/']]],
        }),
      })
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: vi.fn(),
      })

    const resolver = createDomainLookupResolver({} as never)
    const result = await resolver.lookupCandidate(candidateCom)

    expect(result).toMatchObject({
      status: 'available',
      reason: 'rdap-missing',
      rdapUrl: 'https://rdap.verisign.com/com/v1/domain/atlas.com',
    })
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://rdap.verisign.com/com/v1/domain/atlas.com',
      expect.objectContaining({
        redirect: 'follow',
      }),
    )
  })

  it('falls back in hybrid mode for unsupported TLDs', async () => {
    runtimeConfig.domainLookupPrimaryProvider = 'hybrid'
    runtimeConfig.domainLookupFallbackProvider = 'domainr'
    runtimeConfig.domainrClientId = 'domainr-test'

    fetchMock
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          publication: '2026-03-23T19:00:02Z',
          services: [[['com'], ['https://rdap.verisign.com/com/v1/']]],
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: [
            {
              domain: 'atlas.io',
              summary: 'inactive',
              status: 'undelegated inactive',
            },
          ],
        }),
      })

    const resolver = createDomainLookupResolver({} as never)
    const result = await resolver.lookupCandidate(candidateIo)

    expect(result.status).toBe('available')
    expect(result.diagnostics.map((entry) => entry.provider)).toEqual([
      'authoritative-rdap',
      'domainr',
    ])
    expect(result.diagnostics.map((entry) => entry.phase)).toEqual(['primary', 'fallback'])
  })

  it('keeps the primary result while shadow providers run in parallel', async () => {
    runtimeConfig.domainLookupPrimaryProvider = 'authoritative-rdap'
    runtimeConfig.domainLookupFallbackProvider = ''
    runtimeConfig.domainLookupShadowProviders = ['rdap-proxy']

    fetchMock
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          publication: '2026-03-23T19:00:02Z',
          services: [[['com'], ['https://rdap.verisign.com/com/v1/']]],
        }),
      })
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: vi.fn(),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      })

    const resolver = createDomainLookupResolver({} as never)
    const result = await resolver.lookupCandidate(candidateCom)

    expect(result.status).toBe('available')
    expect(result.diagnostics.map((entry) => entry.phase)).toEqual(['primary', 'shadow'])
    expect(result.diagnostics.map((entry) => entry.provider)).toEqual([
      'authoritative-rdap',
      'rdap-proxy',
    ])
  })

  it('normalizes WhoisXML availability responses', async () => {
    runtimeConfig.domainLookupPrimaryProvider = 'whoisxml'
    runtimeConfig.domainLookupFallbackProvider = ''
    runtimeConfig.whoisxmlApiKey = 'whoisxml-test'

    fetchMock
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          DomainInfo: {
            domainAvailability: 'UNAVAILABLE',
          },
        }),
      })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          publication: '2026-03-23T19:00:02Z',
          services: [[['com'], ['https://rdap.verisign.com/com/v1/']]],
        }),
      })

    const resolver = createDomainLookupResolver({} as never)
    const result = await resolver.lookupCandidate(candidateIo)

    expect(result.status).toBe('taken')
    expect(result.reason).toBe('rdap-found')
    expect(result.diagnostics.at(-1)).toMatchObject({
      provider: 'whoisxml',
      outcome: 'taken',
    })
  })

  it('treats RDAP parse failures as taken with degraded diagnostics', async () => {
    runtimeConfig.domainLookupPrimaryProvider = 'rdap-proxy'
    runtimeConfig.domainLookupFallbackProvider = ''

    fetchMock.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('bad json')),
    })

    const resolver = createDomainLookupResolver({} as never)
    const result = await resolver.lookupCandidate(candidateCom)

    expect(result.status).toBe('taken')
    expect(result.registrar).toBeNull()
    expect(result.expiresAt).toBeNull()
    expect(result.diagnostics.at(-1)).toMatchObject({
      provider: 'rdap-proxy',
      failureKind: 'parse',
      outcome: 'taken',
    })
  })

  it('maps aborted fetches to timeout results', async () => {
    runtimeConfig.domainLookupPrimaryProvider = 'rdap-proxy'
    runtimeConfig.domainLookupFallbackProvider = ''

    fetchMock.mockRejectedValueOnce(Object.assign(new Error('timeout'), { name: 'AbortError' }))

    const resolver = createDomainLookupResolver({} as never)
    const result = await resolver.lookupCandidate(candidateCom)

    expect(result).toMatchObject({
      status: 'unknown',
      reason: 'timeout',
    })
    expect(result.diagnostics.at(-1)).toMatchObject({
      provider: 'rdap-proxy',
      failureKind: 'timeout',
      outcome: 'unknown',
    })
  })
})
