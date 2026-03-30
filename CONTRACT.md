Status: MVP

# API contract

## `GET /api/domain/search`

Public endpoint for the homepage domain lookup.

### Query

- `q: string` required

### Response

- `query: string`
- `normalizedQuery: string`
- `baseLabel: string`
- `exactDomain: string | null`
- `results: DomainResult[]`

### `DomainResult`

- `domain: string`
- `tld: string`
- `isExactMatch: boolean`
- `status: 'available' | 'taken' | 'unknown'`
- `reason: 'rdap-found' | 'rdap-missing' | 'timeout' | 'rate-limited' | 'lookup-failed'`
- `rdapUrl: string`
- `registrar: string | null`
- `expiresAt: string | null`

### Errors

- `400` when `q` is missing or blank

### Auth

- None
