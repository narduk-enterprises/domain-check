/// <reference types="@cloudflare/workers-types" />

import type { H3Event } from 'h3'
import type { DomainCandidate, DomainReason, DomainResult } from '#shared/domainSearch'
import { POPULAR_TLDS, rdapUrlForDomain } from '#shared/domainSearch'
import { kvGet, kvSet } from '#layer/server/utils/kv'
import { useLogger } from '#layer/server/utils/logger'

const RDAP_ACCEPT_HEADER = 'application/rdap+json, application/json'
const IANA_RDAP_BOOTSTRAP_URL = 'https://data.iana.org/rdap/dns.json'
const IANA_RDAP_BOOTSTRAP_CACHE_KEY = 'domain-search:rdap-bootstrap:v1'
const DEFAULT_TIMEOUT_MS = 3000
const DEFAULT_BOOTSTRAP_TTL_SECONDS = 60 * 60 * 24

export const DOMAIN_LOOKUP_PROVIDER_NAMES = [
  'hybrid',
  'authoritative-rdap',
  'rdap-proxy',
  'domainr',
  'whoisxml',
] as const

export type DomainLookupProviderName = (typeof DOMAIN_LOOKUP_PROVIDER_NAMES)[number]
export type DomainLookupPhase = 'primary' | 'fallback' | 'shadow'
export type DomainLookupFailureKind =
  | 'none'
  | 'timeout'
  | 'network'
  | 'http'
  | 'parse'
  | 'unsupported'
  | 'missing-config'

export interface DomainLookupDiagnostics {
  phase: DomainLookupPhase
  provider: DomainLookupProviderName
  domain: string
  tld: string
  upstreamUrl: string | null
  httpStatus: number | null
  failureKind: DomainLookupFailureKind
  latencyMs: number
  outcome: DomainResult['status']
  reason: DomainReason
}

interface DomainLookupConfig {
  primaryProvider: DomainLookupProviderName
  fallbackProvider: DomainLookupProviderName | null
  shadowProviders: DomainLookupProviderName[]
  timeoutMs: number
  bootstrapTtlSeconds: number
  authoritativeRdapEnabled: boolean
  domainrClientId: string
  whoisxmlApiKey: string
}

interface DomainLookupAttemptResult {
  status: DomainResult['status']
  reason: DomainReason
  rdapUrl: string
  registrar: string | null
  expiresAt: string | null
}

interface DomainLookupAttempt {
  supported: boolean
  result: DomainLookupAttemptResult | null
  diagnostics: DomainLookupDiagnostics[]
}

export interface DomainLookupResolution extends DomainLookupAttemptResult {
  diagnostics: DomainLookupDiagnostics[]
}

interface DomainLookupResolver {
  lookupCandidate: (candidate: DomainCandidate) => Promise<DomainLookupResolution>
}

interface IanaRdapBootstrapResponse {
  publication?: string
  services?: Array<[string[], string[]]>
}

interface IanaRdapBootstrapCache {
  publication: string | null
  endpoints: Record<string, string>
}

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

interface DomainrStatusRecord {
  domain?: string
  status?: string
  summary?: string
}

interface DomainrStatusResponse {
  status?: DomainrStatusRecord[]
}

interface WhoisXmlAvailabilityRecord {
  domainAvailability?: string
  domainName?: string
}

interface WhoisXmlAvailabilityResponse {
  DomainInfo?: WhoisXmlAvailabilityRecord
}

const STATIC_AUTHORITATIVE_RDAP_ENDPOINTS: Record<string, string> = {
  com: 'https://rdap.verisign.com/com/v1/',
  net: 'https://rdap.verisign.com/net/v1/',
  org: 'https://rdap.publicinterestregistry.org/rdap/',
  app: 'https://pubapi.registry.google/rdap/',
  dev: 'https://pubapi.registry.google/rdap/',
  ai: 'https://rdap.identitydigital.services/rdap/',
}

function isDomainLookupProviderName(value: string): value is DomainLookupProviderName {
  return DOMAIN_LOOKUP_PROVIDER_NAMES.includes(value as DomainLookupProviderName)
}

function parseOptionalProvider(value: unknown): DomainLookupProviderName | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return isDomainLookupProviderName(normalized) ? normalized : null
}

function parseProviderList(value: unknown) {
  if (!Array.isArray(value) && typeof value !== 'string') return []

  const rawValues = Array.isArray(value) ? value : value.split(',')
  const providers: DomainLookupProviderName[] = []

  for (const rawValue of rawValues) {
    if (typeof rawValue !== 'string') continue
    const provider = parseOptionalProvider(rawValue)
    if (!provider || providers.includes(provider)) continue
    providers.push(provider)
  }

  return providers
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback

  return Math.min(max, Math.max(min, Math.round(parsed)))
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return fallback
}

export function getDomainLookupConfig(event: H3Event): DomainLookupConfig {
  const config = useRuntimeConfig(event)
  const primaryProvider = parseOptionalProvider(config.domainLookupPrimaryProvider) ?? 'hybrid'
  const fallbackProvider = parseOptionalProvider(config.domainLookupFallbackProvider)
  const shadowProviders = parseProviderList(config.domainLookupShadowProviders).filter(
    (provider) => provider !== primaryProvider,
  )

  return {
    primaryProvider,
    fallbackProvider,
    shadowProviders,
    timeoutMs: clampNumber(config.domainLookupTimeoutMs, DEFAULT_TIMEOUT_MS, 250, 10000),
    bootstrapTtlSeconds: clampNumber(
      config.domainLookupBootstrapTtlSeconds,
      DEFAULT_BOOTSTRAP_TTL_SECONDS,
      60,
      60 * 60 * 24 * 7,
    ),
    authoritativeRdapEnabled: toBoolean(config.domainLookupAuthoritativeRdapEnabled, true),
    domainrClientId: `${config.domainrClientId ?? ''}`.trim(),
    whoisxmlApiKey: `${config.whoisxmlApiKey ?? ''}`.trim(),
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

function createDiagnostics(
  phase: DomainLookupPhase,
  provider: DomainLookupProviderName,
  candidate: DomainCandidate,
  input: {
    upstreamUrl?: string | null
    httpStatus?: number | null
    failureKind?: DomainLookupFailureKind
    latencyMs: number
    outcome: DomainResult['status']
    reason: DomainReason
  },
): DomainLookupDiagnostics {
  return {
    phase,
    provider,
    domain: candidate.domain,
    tld: candidate.tld,
    upstreamUrl: input.upstreamUrl ?? null,
    httpStatus: input.httpStatus ?? null,
    failureKind: input.failureKind ?? 'none',
    latencyMs: input.latencyMs,
    outcome: input.outcome,
    reason: input.reason,
  }
}

function normalizeBaseUrl(url: string) {
  return url.endsWith('/') ? url : `${url}/`
}

function buildRegistryRdapUrl(baseUrl: string, domain: string) {
  return new URL(`domain/${domain}`, normalizeBaseUrl(baseUrl)).toString()
}

export function parseIanaRdapBootstrap(
  response: IanaRdapBootstrapResponse,
): Record<string, string> {
  const endpoints: Record<string, string> = { ...STATIC_AUTHORITATIVE_RDAP_ENDPOINTS }

  for (const entry of response.services ?? []) {
    const [tlds, urls] = entry
    const baseUrl = typeof urls?.[0] === 'string' ? urls[0] : null
    if (!baseUrl) continue

    for (const tld of tlds ?? []) {
      if (typeof tld !== 'string') continue
      endpoints[tld.toLowerCase()] = normalizeBaseUrl(baseUrl)
    }
  }

  return endpoints
}

function hasKvBinding(event: H3Event) {
  return Boolean(event.context?.cloudflare?.env?.KV)
}

function ensureEventContext(event: H3Event) {
  if (!event.context) {
    ;(event as H3Event & { context: NonNullable<H3Event['context']> }).context = {} as NonNullable<
      H3Event['context']
    >
  }

  return event.context
}

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs: number,
  init?: Omit<RequestInit, 'signal'>,
) {
  const abortController = new AbortController()
  const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(url, {
      ...init,
      signal: abortController.signal,
    })

    return {
      response,
      latencyMs: Date.now() - startedAt,
      async json() {
        return (await response.json().catch(() => null)) as T | null
      },
    }
  } finally {
    clearTimeout(timeoutHandle)
  }
}

async function getAuthoritativeRdapEndpoints(
  event: H3Event,
  config: DomainLookupConfig,
): Promise<Record<string, string>> {
  if (hasKvBinding(event)) {
    const cached = await kvGet<IanaRdapBootstrapCache>(event, IANA_RDAP_BOOTSTRAP_CACHE_KEY).catch(
      () => null,
    )
    if (cached?.endpoints) {
      return {
        ...STATIC_AUTHORITATIVE_RDAP_ENDPOINTS,
        ...cached.endpoints,
      }
    }
  }

  try {
    const request = await fetchJsonWithTimeout<IanaRdapBootstrapResponse>(
      IANA_RDAP_BOOTSTRAP_URL,
      config.timeoutMs,
      {
        headers: {
          accept: 'application/json',
        },
        redirect: 'follow',
      },
    )

    const payload = request.response.ok ? await request.json() : null
    const endpoints = payload
      ? parseIanaRdapBootstrap(payload)
      : { ...STATIC_AUTHORITATIVE_RDAP_ENDPOINTS }

    if (hasKvBinding(event)) {
      await kvSet(
        event,
        IANA_RDAP_BOOTSTRAP_CACHE_KEY,
        {
          publication: payload?.publication ?? null,
          endpoints,
        } satisfies IanaRdapBootstrapCache,
        config.bootstrapTtlSeconds,
      ).catch(() => {})
    }

    return endpoints
  } catch (error) {
    useLogger(event)
      .child('DomainLookup')
      .warn('Failed to refresh IANA RDAP bootstrap', {
        error: error instanceof Error ? error.message : String(error),
      })

    return { ...STATIC_AUTHORITATIVE_RDAP_ENDPOINTS }
  }
}

function classifyDomainrStatus(
  summary: string | null | undefined,
  status: string | null | undefined,
) {
  const normalizedSummary = `${summary ?? ''}`.trim().toLowerCase()
  const normalizedStatus = `${status ?? ''}`.trim().toLowerCase()
  const combined = `${normalizedSummary} ${normalizedStatus}`.trim()

  if (!combined) return 'unknown' as const
  if (combined.includes('inactive') || combined.includes('undelegated')) return 'available' as const
  if (combined.includes('active')) return 'taken' as const
  return 'unknown' as const
}

function classifyWhoisXmlAvailability(value: string | null | undefined) {
  const normalized = `${value ?? ''}`.trim().toUpperCase()
  if (normalized === 'AVAILABLE') return 'available' as const
  if (normalized === 'UNAVAILABLE') return 'taken' as const
  return 'unknown' as const
}

function logDiagnostics(event: H3Event, diagnostics: DomainLookupDiagnostics) {
  const log = useLogger(event).child('DomainLookup')
  const data = {
    provider: diagnostics.provider,
    phase: diagnostics.phase,
    domain: diagnostics.domain,
    tld: diagnostics.tld,
    upstreamUrl: diagnostics.upstreamUrl,
    httpStatus: diagnostics.httpStatus,
    failureKind: diagnostics.failureKind,
    latencyMs: diagnostics.latencyMs,
    outcome: diagnostics.outcome,
    reason: diagnostics.reason,
  }

  if (diagnostics.outcome === 'unknown' || diagnostics.failureKind !== 'none') {
    log.warn('Lookup attempt degraded', data)
    return
  }

  log.debug('Lookup attempt completed', data)
}

function logShadowDelta(
  event: H3Event,
  candidate: DomainCandidate,
  primary: DomainLookupDiagnostics,
  shadow: DomainLookupDiagnostics,
) {
  useLogger(event).child('DomainLookup').warn('Shadow provider delta detected', {
    domain: candidate.domain,
    primaryProvider: primary.provider,
    primaryOutcome: primary.outcome,
    primaryReason: primary.reason,
    shadowProvider: shadow.provider,
    shadowOutcome: shadow.outcome,
    shadowReason: shadow.reason,
  })
}

function buildUnknownAttempt(
  phase: DomainLookupPhase,
  provider: DomainLookupProviderName,
  candidate: DomainCandidate,
  diagnostics: {
    upstreamUrl?: string | null
    httpStatus?: number | null
    failureKind?: DomainLookupFailureKind
    latencyMs: number
    outcome: DomainResult['status']
    reason: DomainReason
  },
): DomainLookupAttempt {
  return {
    supported: true,
    result: {
      status: 'unknown',
      reason: diagnostics.reason,
      rdapUrl: rdapUrlForDomain(candidate.domain),
      registrar: null,
      expiresAt: null,
    },
    diagnostics: [createDiagnostics(phase, provider, candidate, diagnostics)],
  }
}

function buildUnsupportedAttempt(
  phase: DomainLookupPhase,
  provider: DomainLookupProviderName,
  candidate: DomainCandidate,
  failureKind: Extract<DomainLookupFailureKind, 'unsupported' | 'missing-config'>,
): DomainLookupAttempt {
  return {
    supported: false,
    result: null,
    diagnostics: [
      createDiagnostics(phase, provider, candidate, {
        latencyMs: 0,
        failureKind,
        outcome: 'unknown',
        reason: 'lookup-failed',
      }),
    ],
  }
}

async function lookupViaRdap(
  phase: DomainLookupPhase,
  provider: DomainLookupProviderName,
  candidate: DomainCandidate,
  url: string,
  timeoutMs: number,
): Promise<DomainLookupAttempt> {
  try {
    const request = await fetchJsonWithTimeout<RdapRecord>(url, timeoutMs, {
      headers: {
        accept: RDAP_ACCEPT_HEADER,
      },
      redirect: 'follow',
    })

    if (request.response.status === 404) {
      return {
        supported: true,
        result: {
          status: 'available',
          reason: 'rdap-missing',
          rdapUrl: url,
          registrar: null,
          expiresAt: null,
        },
        diagnostics: [
          createDiagnostics(phase, provider, candidate, {
            upstreamUrl: url,
            httpStatus: 404,
            latencyMs: request.latencyMs,
            outcome: 'available',
            reason: 'rdap-missing',
          }),
        ],
      }
    }

    if (request.response.status === 429) {
      return buildUnknownAttempt(phase, provider, candidate, {
        upstreamUrl: url,
        httpStatus: 429,
        latencyMs: request.latencyMs,
        failureKind: 'http',
        outcome: 'unknown',
        reason: 'rate-limited',
      })
    }

    if (!request.response.ok) {
      return buildUnknownAttempt(phase, provider, candidate, {
        upstreamUrl: url,
        httpStatus: request.response.status,
        latencyMs: request.latencyMs,
        failureKind: 'http',
        outcome: 'unknown',
        reason: 'lookup-failed',
      })
    }

    const record = await request.json()

    return {
      supported: true,
      result: {
        status: 'taken',
        reason: 'rdap-found',
        rdapUrl: url,
        registrar: record ? readRegistrar(record) : null,
        expiresAt: record ? readExpiration(record) : null,
      },
      diagnostics: [
        createDiagnostics(phase, provider, candidate, {
          upstreamUrl: url,
          httpStatus: request.response.status,
          latencyMs: request.latencyMs,
          failureKind: record ? 'none' : 'parse',
          outcome: 'taken',
          reason: 'rdap-found',
        }),
      ],
    }
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'

    return buildUnknownAttempt(phase, provider, candidate, {
      upstreamUrl: url,
      latencyMs: timeoutMs,
      failureKind: isTimeout ? 'timeout' : 'network',
      outcome: 'unknown',
      reason: isTimeout ? 'timeout' : 'lookup-failed',
    })
  }
}

async function resolveInspectionUrl(
  candidate: DomainCandidate,
  getAuthoritativeEndpoints: () => Promise<Record<string, string>>,
) {
  const endpoints = await getAuthoritativeEndpoints()
  const baseUrl = endpoints[candidate.tld]
  return baseUrl
    ? buildRegistryRdapUrl(baseUrl, candidate.domain)
    : rdapUrlForDomain(candidate.domain)
}

async function lookupViaAuthoritativeRdap(
  phase: DomainLookupPhase,
  candidate: DomainCandidate,
  config: DomainLookupConfig,
  getAuthoritativeEndpoints: () => Promise<Record<string, string>>,
): Promise<DomainLookupAttempt> {
  if (!config.authoritativeRdapEnabled) {
    return buildUnsupportedAttempt(phase, 'authoritative-rdap', candidate, 'unsupported')
  }

  const endpoints = await getAuthoritativeEndpoints()
  const baseUrl = endpoints[candidate.tld]
  if (!baseUrl) {
    return buildUnsupportedAttempt(phase, 'authoritative-rdap', candidate, 'unsupported')
  }

  return await lookupViaRdap(
    phase,
    'authoritative-rdap',
    candidate,
    buildRegistryRdapUrl(baseUrl, candidate.domain),
    config.timeoutMs,
  )
}

async function lookupViaRdapProxy(
  phase: DomainLookupPhase,
  candidate: DomainCandidate,
  config: DomainLookupConfig,
): Promise<DomainLookupAttempt> {
  return await lookupViaRdap(
    phase,
    'rdap-proxy',
    candidate,
    rdapUrlForDomain(candidate.domain),
    config.timeoutMs,
  )
}

async function lookupViaDomainr(
  phase: DomainLookupPhase,
  candidate: DomainCandidate,
  config: DomainLookupConfig,
  getAuthoritativeEndpoints: () => Promise<Record<string, string>>,
): Promise<DomainLookupAttempt> {
  if (!config.domainrClientId) {
    return buildUnsupportedAttempt(phase, 'domainr', candidate, 'missing-config')
  }

  const url = new URL('https://api.domainr.com/v2/status')
  url.searchParams.set('client_id', config.domainrClientId)
  url.searchParams.set('domain', candidate.domain)

  try {
    const request = await fetchJsonWithTimeout<DomainrStatusResponse>(
      url.toString(),
      config.timeoutMs,
      {
        headers: {
          accept: 'application/json',
        },
        redirect: 'follow',
      },
    )

    if (request.response.status === 429) {
      return buildUnknownAttempt(phase, 'domainr', candidate, {
        upstreamUrl: url.toString(),
        httpStatus: 429,
        latencyMs: request.latencyMs,
        failureKind: 'http',
        outcome: 'unknown',
        reason: 'rate-limited',
      })
    }

    if (!request.response.ok) {
      return buildUnknownAttempt(phase, 'domainr', candidate, {
        upstreamUrl: url.toString(),
        httpStatus: request.response.status,
        latencyMs: request.latencyMs,
        failureKind: 'http',
        outcome: 'unknown',
        reason: 'lookup-failed',
      })
    }

    const payload = await request.json()
    const record =
      payload?.status?.find((entry) => entry.domain === candidate.domain) ?? payload?.status?.[0]
    const status = classifyDomainrStatus(record?.summary, record?.status)
    const inspectionUrl = await resolveInspectionUrl(candidate, getAuthoritativeEndpoints)

    if (status === 'available') {
      return {
        supported: true,
        result: {
          status: 'available',
          reason: 'rdap-missing',
          rdapUrl: inspectionUrl,
          registrar: null,
          expiresAt: null,
        },
        diagnostics: [
          createDiagnostics(phase, 'domainr', candidate, {
            upstreamUrl: url.toString(),
            httpStatus: request.response.status,
            latencyMs: request.latencyMs,
            outcome: 'available',
            reason: 'rdap-missing',
          }),
        ],
      }
    }

    if (status === 'taken') {
      return {
        supported: true,
        result: {
          status: 'taken',
          reason: 'rdap-found',
          rdapUrl: inspectionUrl,
          registrar: null,
          expiresAt: null,
        },
        diagnostics: [
          createDiagnostics(phase, 'domainr', candidate, {
            upstreamUrl: url.toString(),
            httpStatus: request.response.status,
            latencyMs: request.latencyMs,
            outcome: 'taken',
            reason: 'rdap-found',
          }),
        ],
      }
    }

    return buildUnknownAttempt(phase, 'domainr', candidate, {
      upstreamUrl: url.toString(),
      httpStatus: request.response.status,
      latencyMs: request.latencyMs,
      failureKind: 'parse',
      outcome: 'unknown',
      reason: 'lookup-failed',
    })
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'

    return buildUnknownAttempt(phase, 'domainr', candidate, {
      upstreamUrl: url.toString(),
      latencyMs: config.timeoutMs,
      failureKind: isTimeout ? 'timeout' : 'network',
      outcome: 'unknown',
      reason: isTimeout ? 'timeout' : 'lookup-failed',
    })
  }
}

async function lookupViaWhoisXml(
  phase: DomainLookupPhase,
  candidate: DomainCandidate,
  config: DomainLookupConfig,
  getAuthoritativeEndpoints: () => Promise<Record<string, string>>,
): Promise<DomainLookupAttempt> {
  if (!config.whoisxmlApiKey) {
    return buildUnsupportedAttempt(phase, 'whoisxml', candidate, 'missing-config')
  }

  const url = new URL('https://domain-availability.whoisxmlapi.com/api/v1')
  url.searchParams.set('apiKey', config.whoisxmlApiKey)
  url.searchParams.set('domainName', candidate.domain)
  url.searchParams.set('credits', 'DA')
  url.searchParams.set('mode', 'DNS_AND_WHOIS')
  url.searchParams.set('rdap', '0')
  url.searchParams.set('outputFormat', 'JSON')

  try {
    const request = await fetchJsonWithTimeout<WhoisXmlAvailabilityResponse>(
      url.toString(),
      config.timeoutMs,
      {
        headers: {
          accept: 'application/json',
        },
        redirect: 'follow',
      },
    )

    if (request.response.status === 429) {
      return buildUnknownAttempt(phase, 'whoisxml', candidate, {
        upstreamUrl: url.toString(),
        httpStatus: 429,
        latencyMs: request.latencyMs,
        failureKind: 'http',
        outcome: 'unknown',
        reason: 'rate-limited',
      })
    }

    if (!request.response.ok) {
      return buildUnknownAttempt(phase, 'whoisxml', candidate, {
        upstreamUrl: url.toString(),
        httpStatus: request.response.status,
        latencyMs: request.latencyMs,
        failureKind: 'http',
        outcome: 'unknown',
        reason: 'lookup-failed',
      })
    }

    const payload = await request.json()
    const status = classifyWhoisXmlAvailability(payload?.DomainInfo?.domainAvailability)
    const inspectionUrl = await resolveInspectionUrl(candidate, getAuthoritativeEndpoints)

    if (status === 'available') {
      return {
        supported: true,
        result: {
          status: 'available',
          reason: 'rdap-missing',
          rdapUrl: inspectionUrl,
          registrar: null,
          expiresAt: null,
        },
        diagnostics: [
          createDiagnostics(phase, 'whoisxml', candidate, {
            upstreamUrl: url.toString(),
            httpStatus: request.response.status,
            latencyMs: request.latencyMs,
            outcome: 'available',
            reason: 'rdap-missing',
          }),
        ],
      }
    }

    if (status === 'taken') {
      return {
        supported: true,
        result: {
          status: 'taken',
          reason: 'rdap-found',
          rdapUrl: inspectionUrl,
          registrar: null,
          expiresAt: null,
        },
        diagnostics: [
          createDiagnostics(phase, 'whoisxml', candidate, {
            upstreamUrl: url.toString(),
            httpStatus: request.response.status,
            latencyMs: request.latencyMs,
            outcome: 'taken',
            reason: 'rdap-found',
          }),
        ],
      }
    }

    return buildUnknownAttempt(phase, 'whoisxml', candidate, {
      upstreamUrl: url.toString(),
      httpStatus: request.response.status,
      latencyMs: request.latencyMs,
      failureKind: 'parse',
      outcome: 'unknown',
      reason: 'lookup-failed',
    })
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError'

    return buildUnknownAttempt(phase, 'whoisxml', candidate, {
      upstreamUrl: url.toString(),
      latencyMs: config.timeoutMs,
      failureKind: isTimeout ? 'timeout' : 'network',
      outcome: 'unknown',
      reason: isTimeout ? 'timeout' : 'lookup-failed',
    })
  }
}

async function lookupWithProvider(
  provider: DomainLookupProviderName,
  phase: DomainLookupPhase,
  candidate: DomainCandidate,
  config: DomainLookupConfig,
  getAuthoritativeEndpoints: () => Promise<Record<string, string>>,
): Promise<DomainLookupAttempt> {
  switch (provider) {
    case 'authoritative-rdap':
      return await lookupViaAuthoritativeRdap(phase, candidate, config, getAuthoritativeEndpoints)
    case 'rdap-proxy':
      return await lookupViaRdapProxy(phase, candidate, config)
    case 'domainr':
      return await lookupViaDomainr(phase, candidate, config, getAuthoritativeEndpoints)
    case 'whoisxml':
      return await lookupViaWhoisXml(phase, candidate, config, getAuthoritativeEndpoints)
    case 'hybrid':
      return await lookupViaHybrid(phase, candidate, config, getAuthoritativeEndpoints)
  }
}

async function lookupViaHybrid(
  phase: DomainLookupPhase,
  candidate: DomainCandidate,
  config: DomainLookupConfig,
  getAuthoritativeEndpoints: () => Promise<Record<string, string>>,
): Promise<DomainLookupAttempt> {
  const primaryAttempt = await lookupViaAuthoritativeRdap(
    phase,
    candidate,
    config,
    getAuthoritativeEndpoints,
  )

  if (
    primaryAttempt.supported &&
    primaryAttempt.result &&
    (primaryAttempt.result.status === 'available' || primaryAttempt.result.status === 'taken')
  ) {
    return primaryAttempt
  }

  if (!config.fallbackProvider || config.fallbackProvider === 'hybrid') {
    return primaryAttempt
  }

  const fallbackAttempt = await lookupWithProvider(
    config.fallbackProvider,
    'fallback',
    candidate,
    config,
    getAuthoritativeEndpoints,
  )

  if (fallbackAttempt.supported && fallbackAttempt.result) {
    return {
      ...fallbackAttempt,
      diagnostics: [...primaryAttempt.diagnostics, ...fallbackAttempt.diagnostics],
    }
  }

  if (primaryAttempt.supported) {
    return {
      ...primaryAttempt,
      diagnostics: [...primaryAttempt.diagnostics, ...fallbackAttempt.diagnostics],
    }
  }

  return {
    supported: false,
    result: null,
    diagnostics: [...primaryAttempt.diagnostics, ...fallbackAttempt.diagnostics],
  }
}

export function createDomainLookupResolver(event: H3Event): DomainLookupResolver {
  ensureEventContext(event)
  const config = getDomainLookupConfig(event)
  let authoritativeEndpointsPromise: Promise<Record<string, string>> | null = null
  const getAuthoritativeEndpoints = () => {
    authoritativeEndpointsPromise ??= getAuthoritativeRdapEndpoints(event, config)
    return authoritativeEndpointsPromise
  }

  return {
    async lookupCandidate(candidate) {
      const primaryAttempt = await lookupWithProvider(
        config.primaryProvider,
        'primary',
        candidate,
        config,
        getAuthoritativeEndpoints,
      )

      const diagnostics = [...primaryAttempt.diagnostics]
      for (const diagnostic of primaryAttempt.diagnostics) {
        logDiagnostics(event, diagnostic)
      }

      if (config.shadowProviders.length > 0) {
        const shadowAttempts = await Promise.all(
          config.shadowProviders.map((provider) =>
            lookupWithProvider(provider, 'shadow', candidate, config, getAuthoritativeEndpoints),
          ),
        )

        for (const attempt of shadowAttempts) {
          diagnostics.push(...attempt.diagnostics)
          for (const diagnostic of attempt.diagnostics) {
            logDiagnostics(event, diagnostic)
          }
          const shadowDiagnostic = attempt.diagnostics.at(-1)
          const primaryDiagnostic = primaryAttempt.diagnostics.at(-1)
          if (!shadowDiagnostic || !primaryDiagnostic) continue
          if (
            primaryDiagnostic.outcome !== shadowDiagnostic.outcome ||
            primaryDiagnostic.reason !== shadowDiagnostic.reason
          ) {
            logShadowDelta(event, candidate, primaryDiagnostic, shadowDiagnostic)
          }
        }
      }

      const result = primaryAttempt.result
      if (result) {
        return {
          ...result,
          diagnostics,
        }
      }

      const inspectionUrl = await resolveInspectionUrl(candidate, getAuthoritativeEndpoints)
      return {
        status: 'unknown',
        reason: 'lookup-failed',
        rdapUrl: inspectionUrl,
        registrar: null,
        expiresAt: null,
        diagnostics,
      }
    },
  }
}

export function supportedAuthoritativeTlds() {
  return POPULAR_TLDS.filter((tld) => STATIC_AUTHORITATIVE_RDAP_ENDPOINTS[tld])
}
