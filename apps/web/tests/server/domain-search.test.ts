import { describe, expect, it } from 'vitest'
import {
  buildCandidateDomains,
  emptyDomainSearchResponse,
  normalizeDomainQuery,
  splitDomainQuery,
} from '../../shared/domainSearch'

describe('domain search utilities', () => {
  it('normalizes pasted domains into a clean search query', () => {
    expect(normalizeDomainQuery('https://www.Example.com/pricing')).toBe('example.com')
    expect(normalizeDomainQuery('  Better HQ  ')).toBe('betterhq')
  })

  it('extracts the base label and exact domain when a full domain is provided', () => {
    expect(splitDomainQuery('hello.io')).toEqual({
      normalizedQuery: 'hello.io',
      baseLabel: 'hello',
      exactDomain: 'hello.io',
      exactTld: 'io',
    })
  })

  it('builds an exact-match-first candidate list without duplicates', () => {
    expect(buildCandidateDomains('hello.io').map((candidate) => candidate.domain)).toEqual([
      'hello.io',
      'hello.com',
      'hello.ai',
      'hello.app',
      'hello.dev',
      'hello.co',
      'hello.net',
      'hello.org',
    ])
  })

  it('returns an empty response shape for blank queries', () => {
    expect(emptyDomainSearchResponse()).toEqual({
      query: '',
      normalizedQuery: '',
      baseLabel: '',
      exactDomain: null,
      results: [],
    })
  })
})
