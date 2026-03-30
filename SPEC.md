Status: V1

# Quick Domain Check

Source: provision.json (domain-check)

## Product story

Quick Domain Check has two truths that must stay aligned:

1. The shipped MVP is a fast public utility for checking domain availability.
2. V1 extends that baseline with canonical route pages, optional auth-backed
   saved searches, and a single registrar clickout path for available domains.

## Audience

- Founders and indie builders naming startups, products, and side projects
- Secondary users: operators or agencies doing lightweight name validation for
  clients

## Primary conversion

- Submit a domain query and immediately understand whether a viable name is
  still open

## Secondary conversion

- Click out to the preferred registrar for an available domain
- Save a query to revisit it later from the authenticated dashboard

## In scope

- Public landing/search route at `/`
- Canonical keyword result pages at `/q/[label]`
- Canonical exact-domain result pages at `/d/[domain]`
- Backward-compatible support for legacy `/?q=` URLs, normalized to the
  canonical route shape
- Live RDAP-backed checks across the current 8-TLD shortlist
- Purchase CTA only for available domains, derived from a single runtime
  purchase URL template
- Auth-backed saved searches at `/dashboard`
- Login/register reuse from the existing layer auth stack
- Core analytics events for search submit, save, remove, and registrar clickout

## Out of scope

- Watchlists, alerts, notifications, or background re-checking
- Domain pricing, multi-registrar comparison, or checkout in-app
- ccTLD expansion or a broader noisy TLD surface
- Exact-domain SEO pages as crawl targets
- Custom admin/operator panels for domain tuning

## Public route groups

- `/`
  - Empty-state search entry point
- `/q/[label]`
  - Indexable keyword result page with live results
- `/d/[domain]`
  - Shareable exact-domain result page with `noindex`
- `/login`, `/register`, `/auth/callback`, `/auth/confirm`, `/reset-password`
  - Existing auth routes reused without a parallel auth stack

## Authenticated route groups

- `/dashboard`
  - Saved-search home for the signed-in user

## Core user flows

1. Visitor lands on `/`, searches for a keyword like `atlas`, and lands on
   `/q/atlas`.
2. Visitor pastes an exact domain like `atlas.com` and lands on `/d/atlas.com`.
3. Visitor opens a legacy `/?q=` link and is redirected to the canonical path.
4. Visitor inspects the shortlist and clicks the registrar CTA only on domains
   marked available.
5. Signed-in user saves a query and sees it appear in `/dashboard`.
6. Signed-out user attempts to save, goes through auth, then returns to the
   active domain-check route.

## Conceptual data model

- Search query
- Normalized query
- Query kind (`keyword` or `exact`)
- Candidate domains
- Result status
- Result reason
- RDAP verification URL
- Registrar metadata
- Purchase URL
- Saved search

## App-owned data

### `saved_searches`

- `id`
- `userId`
- `query`
- `normalizedQuery`
- `createdAt`
- `updatedAt`

Constraints:

- Unique on `(userId, normalizedQuery)`
- One saved record per normalized query per user

## Search behavior

- Keep the current shortlist: `.com`, `.ai`, `.io`, `.app`, `.dev`, `.co`,
  `.net`, `.org`
- Continue exact-match-first candidate ordering when a full domain is provided
- Keep result states `available`, `taken`, and `unknown`
- Continue the lightweight cache posture on the public search endpoint
- Only available results receive a purchase CTA

## SEO and discoverability

- `/q/[label]` is indexable and should carry canonical metadata to itself
- `/d/[domain]` is functional and shareable, but not part of organic landing
  scope and should emit `noindex`
- Every route continues to use `useSeo(...)` and a Schema.org helper

## Trust and product constraints

- RDAP remains the source of truth for live checks in v1
- Results should stay simple and legible rather than becoming a registrar
  marketplace
- Saved searches store the normalized query only and always reopen fresh live
  results

## Non-functional

### Guardrails

Do not reinvent platform primitives. Before adding new auth, session, CSRF,
analytics, SEO, OG images, rate limiting, mutation helpers, or DB access
patterns:

Auth: Use the template / layer auth (session, login/register routes, guards,
useUser-style composables) exactly as shipped. Extend with new tables and route
rules, not a parallel auth stack. Maps / geo (if needed): Use first-class
template or layer integrations (e.g. documented map components, env keys, server
utilities). Do not embed a new map SDK or geocoder unless the template has no
path and SPEC explicitly approves an exception. Data & API: Use useAppDatabase,
layer useDatabase rules, withValidatedBody / mutation wrappers, #server/
imports, and existing D1 + Drizzle patterns. UI & SEO: Use Nuxt UI v4, useSeo +
Schema.org helpers, useFetch / useAsyncData (no raw $fetch in pages). Reuse
OgImage templates from the layer where applicable. Analytics / admin patterns:
Wire through existing PostHog, GA, or admin patterns if the template already
exposes them; do not duplicate trackers or admin APIs. If something is missing,
extend the layer only when the feature is reusable across apps; otherwise keep
changes in apps/web/ and still call into layer utilities.

## Test acceptance

- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm --filter web exec vitest run tests/server/domain-search.test.ts tests/server/domain-search-server.test.ts tests/server/saved-searches.test.ts tests/server/saved-searches-api.test.ts`
- `pnpm --filter web run test:e2e -- --project=web apps/web/tests/e2e/smoke.spec.ts apps/web/tests/e2e/domain-search.spec.ts`
- `/q/[label]` renders a canonical keyword page with live results
- `/d/[domain]` renders a canonical exact-domain page with `noindex`
- `/dashboard` lists, reopens, and removes saved searches for the current user
