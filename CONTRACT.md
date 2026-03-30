Status: V1

# API contract

## `GET /api/domain/search`

Public endpoint for the homepage, keyword pages, and exact-domain pages.

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
- `purchaseUrl: string | null`
- `registrar: string | null`
- `expiresAt: string | null`

### Cache

- `Cache-Control: public, max-age=30, s-maxage=30, stale-while-revalidate=300`

### Errors

- `400` when `q` is missing or blank

### Auth

- None

## `GET /api/saved-searches`

Authenticated endpoint returning the current user’s saved queries.

### Response

- `savedSearches: SavedSearchRecord[]`

### `SavedSearchRecord`

- `id: string`
- `query: string`
- `normalizedQuery: string`
- `createdAt: string`
- `updatedAt: string`

### Headers

- `Cache-Control: no-store`

### Errors

- `401` when the user is not authenticated

### Auth

- Required

## `POST /api/saved-searches`

Authenticated mutation that saves or refreshes a query for the current user.

### Body

- `query: string` required

### Behavior

- Normalize the query server-side
- Reject blank or unusable values
- Upsert by `(userId, normalizedQuery)`
- Refresh `updatedAt` on duplicate saves instead of creating a new row

### Response

- `savedSearch: SavedSearchRecord`

### Errors

- `400` when `query` is blank or unusable
- `401` when the user is not authenticated

### Auth

- Required

## `DELETE /api/saved-searches/:id`

Authenticated mutation that removes one saved search owned by the current user.

### Params

- `id: string` required

### Response

- `success: true`

### Errors

- `400` when `id` is missing
- `401` when the user is not authenticated
- `404` when the saved search does not exist for the current user

### Auth

- Required
