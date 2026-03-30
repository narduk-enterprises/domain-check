export const POPULAR_TLDS = ['com', 'ai', 'io', 'app', 'dev', 'co', 'net', 'org'] as const
export const SAMPLE_DOMAIN_QUERIES = ['atlas', 'rally', 'northstar', 'craft', 'betterhq'] as const
export const MAX_SEARCH_RESULTS = POPULAR_TLDS.length

export type DomainStatus = 'available' | 'taken' | 'unknown'
export type DomainQueryKind = 'keyword' | 'exact'
export type DomainReason =
  | 'rdap-found'
  | 'rdap-missing'
  | 'timeout'
  | 'rate-limited'
  | 'lookup-failed'

export interface DomainCandidate {
  domain: string
  tld: string
  isExactMatch: boolean
}

export interface DomainResult extends DomainCandidate {
  status: DomainStatus
  reason: DomainReason
  rdapUrl: string
  purchaseUrl: string | null
  registrar: string | null
  expiresAt: string | null
}

export interface DomainSearchResponse {
  query: string
  normalizedQuery: string
  baseLabel: string
  exactDomain: string | null
  results: DomainResult[]
}

function encodeRouteSegment(value: string) {
  return encodeURIComponent(value).replaceAll('%2F', '/')
}

function sanitizeLabel(value: string): string {
  return value.replaceAll(/[^a-z0-9-]/g, '').replaceAll(/^-+|-+$/g, '')
}

export function normalizeDomainQuery(value: string): string {
  const trimmedValue = value.trim().toLowerCase()
  if (!trimmedValue) return ''

  const withoutProtocol = trimmedValue.replace(/^[a-z]+:\/\//, '')
  const hostCandidate = withoutProtocol.split(/[/?#]/, 1)[0]?.replace(/^www\./, '') ?? ''
  const rawParts = hostCandidate.split('.').map(sanitizeLabel).filter(Boolean)

  if (rawParts.length === 0) return ''
  if (rawParts.length === 1) return rawParts[0] ?? ''

  return `${rawParts.at(-2) ?? ''}.${rawParts.at(-1) ?? ''}`
}

export function splitDomainQuery(value: string) {
  const normalizedValue = normalizeDomainQuery(value)
  if (!normalizedValue) {
    return {
      normalizedQuery: '',
      baseLabel: '',
      exactDomain: null,
      exactTld: null,
    }
  }

  const parts = normalizedValue.split('.')
  if (parts.length === 1) {
    return {
      normalizedQuery: normalizedValue,
      baseLabel: parts[0] ?? '',
      exactDomain: null,
      exactTld: null,
    }
  }

  const baseLabel = parts[0] ?? ''
  const exactTld = parts[1] ?? ''

  return {
    normalizedQuery: normalizedValue,
    baseLabel,
    exactDomain: baseLabel && exactTld ? `${baseLabel}.${exactTld}` : null,
    exactTld: exactTld || null,
  }
}

export function getDomainQueryKind(value: string): DomainQueryKind | null {
  const { normalizedQuery, exactDomain } = splitDomainQuery(value)
  if (!normalizedQuery) return null
  return exactDomain ? 'exact' : 'keyword'
}

export function buildCanonicalSearchPath(value: string) {
  const { normalizedQuery, baseLabel, exactDomain } = splitDomainQuery(value)

  if (!normalizedQuery) return '/'
  if (exactDomain) return `/d/${encodeRouteSegment(exactDomain)}`

  return `/q/${encodeRouteSegment(baseLabel)}`
}

export function readDomainRouteQuery(input: {
  label?: string | string[] | null
  domain?: string | string[] | null
  q?: string | Array<string | null> | null
}) {
  const routeLabel = Array.isArray(input.label) ? input.label[0] : input.label
  if (typeof routeLabel === 'string' && routeLabel.length > 0) {
    return normalizeDomainQuery(routeLabel)
  }

  const routeDomain = Array.isArray(input.domain) ? input.domain[0] : input.domain
  if (typeof routeDomain === 'string' && routeDomain.length > 0) {
    return normalizeDomainQuery(routeDomain)
  }

  const queryValue = Array.isArray(input.q) ? input.q[0] : input.q
  return typeof queryValue === 'string' ? normalizeDomainQuery(queryValue) : ''
}

export function buildCandidateDomains(
  value: string,
  limit = MAX_SEARCH_RESULTS,
): DomainCandidate[] {
  const { baseLabel, exactDomain, exactTld } = splitDomainQuery(value)
  if (!baseLabel) return []

  const seen = new Set<string>()
  const candidates: DomainCandidate[] = []

  const appendDomain = (domain: string, isExactMatch: boolean) => {
    if (!domain || seen.has(domain) || candidates.length >= limit) return

    seen.add(domain)
    candidates.push({
      domain,
      tld: domain.split('.').at(-1) ?? '',
      isExactMatch,
    })
  }

  if (exactDomain) appendDomain(exactDomain, true)

  for (const tld of POPULAR_TLDS) {
    appendDomain(`${baseLabel}.${tld}`, tld === exactTld)
  }

  return candidates
}

export function rdapUrlForDomain(domain: string): string {
  return `https://rdap.org/domain/${domain}`
}

export function emptyDomainSearchResponse(query = ''): DomainSearchResponse {
  const { normalizedQuery, baseLabel, exactDomain } = splitDomainQuery(query)

  return {
    query,
    normalizedQuery,
    baseLabel,
    exactDomain,
    results: [],
  }
}
