import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)
vi.stubGlobal('useRuntimeConfig', () => ({
  domainPurchaseUrlTemplate: 'https://registrar.test/search?domain={domain}',
}))

const { searchDomains } = await import('../../server/utils/domainSearch')

describe('server domain search', () => {
  beforeEach(() => {
    fetchMock.mockReset()
  })

  it('adds a purchase URL only for available domains', async () => {
    fetchMock
      .mockResolvedValueOnce({
        status: 404,
        ok: false,
        json: vi.fn(),
      })
      .mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          entities: [],
          events: [],
        }),
      })

    const result = await searchDomains({} as never, 'atlas.com')
    const exactMatch = result.results[0]
    const takenMatch = result.results.find((candidate) => candidate.domain === 'atlas.ai')

    expect(exactMatch).toMatchObject({
      domain: 'atlas.com',
      status: 'available',
      purchaseUrl: 'https://registrar.test/search?domain=atlas.com',
    })
    expect(takenMatch?.status).toBe('taken')
    expect(takenMatch?.purchaseUrl).toBeNull()
  })

  it('returns an empty result set for blank queries', async () => {
    const result = await searchDomains({} as never, '   ')

    expect(result.results).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
