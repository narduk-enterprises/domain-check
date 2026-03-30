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
  rdapUrlForDomain,
} from '#shared/domainSearch'

const RDAP_ACCEPT_HEADER = 'application/rdap+json, application/json'
const RDAP_TIMEOUT_MS = 3000
const DEFAULT_PURCHASE_URL_TEMPLATE =
  'https://www.namecheap.com/domains/registration/results/?domain={domain}'

interface RdapEvent {
  eventAction?: string
  eventDate?: string
}

interface RdapEntity {
  handle?: string
  roles?: string[]
  vcardArray?: [string, Array<[string, unknown, unknown, unknown]>]
}

interface RdapRecord {
  entities?: RdapEntity[]
  events?: RdapEvent[]
}

function buildDomainResult(
  candidate: DomainCandidate,
  status: DomainResult['status'],
  reason: DomainReason,
  extras: Pick<DomainResult, 'purchaseUrl' | 'registrar' | 'expiresAt'> = {
    purchaseUrl: null,
    registrar: null,
    expiresAt: null,
  },
): DomainResult {
  return {
    ...candidate,
    status,
    reason,
    rdapUrl: rdapUrlForDomain(candidate.domain),
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

function getVCardText(entity: RdapEntity, fieldName: string) {
  if (!Array.isArray(entity.vcardArray?.[1])) return null

  for (const entry of entity.vcardArray[1]) {
    if (!Array.isArray(entry) || entry[0] !== fieldName) continue

    const value = entry[3]
    return typeof value === 'string' ? value : null
  }

  return null
}

function readRegistrar(record: RdapRecord) {
  if (!Array.isArray(record.entities)) return null

  for (const entity of record.entities) {
    if (!Array.isArray(entity.roles) || !entity.roles.includes('registrar')) continue

    return getVCardText(entity, 'fn') || getVCardText(entity, 'org') || entity.handle || null
  }

  return null
}

function readExpiration(record: RdapRecord) {
  if (!Array.isArray(record.events)) return null

  const expirationEvent = record.events.find((event) => event.eventAction === 'expiration')
  return typeof expirationEvent?.eventDate === 'string' ? expirationEvent.eventDate : null
}

async function checkDomain(event: H3Event, candidate: DomainCandidate) {
  const abortController = new AbortController()
  const timeoutHandle = setTimeout(() => abortController.abort(), RDAP_TIMEOUT_MS)
  const purchaseUrl = buildPurchaseUrl(event, candidate.domain)

  try {
    const response = await fetch(rdapUrlForDomain(candidate.domain), {
      headers: {
        accept: RDAP_ACCEPT_HEADER,
      },
      redirect: 'follow',
      signal: abortController.signal,
    })

    if (response.status === 404) {
      return buildDomainResult(candidate, 'available', 'rdap-missing', {
        purchaseUrl,
        registrar: null,
        expiresAt: null,
      })
    }

    if (response.status === 429) {
      return buildDomainResult(candidate, 'unknown', 'rate-limited')
    }

    if (!response.ok) {
      return buildDomainResult(candidate, 'unknown', 'lookup-failed')
    }

    const record = (await response.json().catch(() => null)) as RdapRecord | null

    return buildDomainResult(candidate, 'taken', 'rdap-found', {
      purchaseUrl,
      registrar: record ? readRegistrar(record) : null,
      expiresAt: record ? readExpiration(record) : null,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return buildDomainResult(candidate, 'unknown', 'timeout')
    }

    return buildDomainResult(candidate, 'unknown', 'lookup-failed')
  } finally {
    clearTimeout(timeoutHandle)
  }
}

export async function searchDomains(event: H3Event, query: string): Promise<DomainSearchResponse> {
  const normalizedQuery = normalizeDomainQuery(query)
  const response = emptyDomainSearchResponse(query)
  const candidates = buildCandidateDomains(normalizedQuery)

  if (candidates.length === 0) {
    return response
  }

  const results = await Promise.all(candidates.map((candidate) => checkDomain(event, candidate)))

  return {
    ...response,
    normalizedQuery,
    results,
  }
}
