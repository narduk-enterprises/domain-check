import type { H3Event } from 'h3'
import type {
  DomainCandidate,
  DomainReason,
  DomainResult,
  DomainSearchResponse,
} from '#shared/domainSearch'
import {
  buildCandidateDomains,
  emptyDomainSearchResponse,
  normalizeDomainQuery,
} from '#shared/domainSearch'
import { createDomainLookupResolver } from '#server/utils/domainLookup'

const DEFAULT_PURCHASE_URL_TEMPLATE =
  'https://www.namecheap.com/domains/registration/results/?domain={domain}'

function buildDomainResult(
  candidate: DomainCandidate,
  status: DomainResult['status'],
  reason: DomainReason,
  extras: Pick<DomainResult, 'purchaseUrl' | 'registrar' | 'expiresAt' | 'rdapUrl'> = {
    rdapUrl: '',
    purchaseUrl: null,
    registrar: null,
    expiresAt: null,
  },
): DomainResult {
  return {
    ...candidate,
    status,
    reason,
    rdapUrl: extras.rdapUrl,
    purchaseUrl: status === 'available' ? (extras.purchaseUrl ?? null) : null,
    registrar: extras.registrar,
    expiresAt: extras.expiresAt,
  }
}

function buildPurchaseUrl(event: H3Event, domain: string) {
  const config = useRuntimeConfig(event)
  const template = `${config.domainPurchaseUrlTemplate || DEFAULT_PURCHASE_URL_TEMPLATE}`.trim()
  if (!template) return null

  const encodedDomain = encodeURIComponent(domain)
  if (template.includes('{domain}')) {
    return template.replaceAll('{domain}', encodedDomain)
  }

  try {
    const url = new URL(template)
    url.searchParams.set('domain', domain)
    return url.toString()
  } catch {
    return null
  }
}

export async function searchDomains(event: H3Event, query: string): Promise<DomainSearchResponse> {
  const normalizedQuery = normalizeDomainQuery(query)
  const response = emptyDomainSearchResponse(query)
  const candidates = buildCandidateDomains(normalizedQuery)

  if (candidates.length === 0) {
    return response
  }

  const resolver = createDomainLookupResolver(event)
  const resolutions = await Promise.all(candidates.map((candidate) => resolver.lookupCandidate(candidate)))
  const results = candidates.map((candidate, index) => {
    const resolution = resolutions[index]
    if (!resolution) {
      return buildDomainResult(candidate, 'unknown', 'lookup-failed', {
        rdapUrl: '',
        purchaseUrl: buildPurchaseUrl(event, candidate.domain),
        registrar: null,
        expiresAt: null,
      })
    }

    return buildDomainResult(candidate, resolution.status, resolution.reason, {
      rdapUrl: resolution.rdapUrl,
      purchaseUrl: buildPurchaseUrl(event, candidate.domain),
      registrar: resolution.registrar,
      expiresAt: resolution.expiresAt,
    })
  })

  return {
    ...response,
    normalizedQuery,
    results,
  }
}
