Status: MVP

# Quick Domain Check

Source: provision.json (domain-check)

## Product

A tool for checking if domains are available

## In scope

- Single public homepage for instant domain checks
- Query-param driven search via `?q=`
- Live availability checks for a small set of common TLDs
- Exact-domain-first lookups when the user pastes a full domain
- Simple result states: available, taken, unknown

## Out of scope

- Account features, saved searches, watchlists, and alerts
- Domain purchase or registrar checkout flows
- Exhaustive TLD coverage beyond the curated fast list
- Historical whois data, pricing, or DNS record management

## User flows

1. User lands on `/`, types a word like `atlas`, and sees live status results
   for the common endings.
2. User pastes a full domain like `atlas.com`; the app checks that exact match
   first and still shows the shortlist.
3. User shares or reloads `/` with `?q=atlas`, and the search restores from the
   URL.
4. User opens the RDAP inspection link for any result that needs deeper
   verification.

## Conceptual data model

- Search query
- Base label
- Exact domain, when present
- Candidate domains
- Result status
- Registrar name, when available
- Expiration date, when available

## Pages / routes

- `/`
  - Public landing page and search experience
- `/api/domain/search`
  - Public GET endpoint returning domain status results for a single query

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

## Test acceptance (MVP)

- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm --filter web exec vitest run tests/server/domain-search.test.ts`
- Homepage renders a single focused search flow with live results

## Open questions

- Which additional TLDs matter enough to justify slower lookups
- Whether to add registrar outbound links for available domains
- Whether to cache recent results more aggressively at the edge
