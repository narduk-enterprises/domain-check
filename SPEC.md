Status: V1

# Quick Domain Check

## Product position

Quick Domain Check is a fast public utility for checking domain availability
with minimal friction. V1 extends the MVP with canonical routes, auth-backed
saved searches, and a simple registrar clickout for available domains. The
product should feel like a system tool, not a marketing site.

## Product principles

- Utility first
- One primary action per screen
- Results over copy
- Dense, legible information
- Fast repeat usage
- Progressive disclosure for power features
- No decorative startup marketing patterns

## Audience

- Founders and indie builders naming products
- Operators and agencies validating names quickly
- Repeat users doing shortlist passes across multiple keywords

## Primary conversion

- Submit a query and immediately understand which viable names are still open

## Secondary conversions

- Click out to the registrar for an available domain
- Save a query for later revisit
- Move from single-query search into multi-query scan

## In scope

- `/` public search entry
- `/q/[label]` canonical keyword result page
- `/d/[domain]` canonical exact-domain result page
- Support for legacy `/?q=` URLs with canonical normalization
- Live RDAP-backed checks across the current 8-TLD shortlist
- Available-only registrar CTA
- Auth-backed saved searches at `/dashboard`
- Existing auth stack reuse
- Core analytics for submit, save, remove, registrar click

## Out of scope

- Watchlists, alerts, notifications
- Background re-checking
- In-app checkout
- Registrar marketplace behavior
- Large noisy TLD expansion
- Admin tuning panels
- Decorative content marketing sections on search routes

## Core UX model

### Mode 1: Search

Single keyword or exact domain input.

Used for:

- landing on `/`
- direct searching
- canonical result pages
- fast repeat lookups

### Mode 2: Scan

Bulk keyword comparison in a structured table.

Used for:

- comparing many naming options
- sorting by viable availability
- higher-throughput naming sessions

This mode is part of the product, not a separate app.

## Search behavior

- TLD shortlist remains: `.com`, `.ai`, `.io`, `.app`, `.dev`, `.co`, `.net`,
  `.org`
- Exact-domain input preserves exact-match-first ordering
- Result states remain: `available`, `taken`, `unknown`
- Keep lightweight public cache posture
- Only available domains get purchase CTA
- Single keyword input stays in Search mode
- Multi-line or comma-separated input can enter Scan mode

## Trust and product constraints

- RDAP remains the live source of truth
- Results should stay simple and direct
- Saved searches store normalized query only
- Reopened searches always re-run live checks
- Unknown states must be explicit and non-alarming
- Timeout/partial registry failures must not collapse the whole screen

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
7. User enters multiple keywords (multi-line or comma-separated) and enters Scan
   mode for bulk comparison.

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

## SEO and discoverability

- `/q/[label]` is indexable with canonical metadata to itself and
  keyword-centered title/description
- `/d/[domain]` is `noindex`, canonical to itself, functional/shareable only
- Search experience remains visually consistent between `/`, `/q/[label]`, and
  `/d/[domain]` even when metadata differs
- Every route continues to use `useSeo(...)` and a Schema.org helper

## Non-functional

### Guardrails

Do not reinvent platform primitives. Before adding new auth, session, CSRF,
analytics, SEO, OG images, rate limiting, mutation helpers, or DB access
patterns:

- **Auth**: Use the template / layer auth exactly as shipped. Extend with new
  tables and route rules, not a parallel auth stack.
- **Data & API**: Use `useAppDatabase`, layer `useDatabase` rules,
  `withValidatedBody` / mutation wrappers, `#server/` imports, and existing D1 +
  Drizzle patterns.
- **UI & SEO**: Use Nuxt UI v4, `useSeo` + Schema.org helpers, `useFetch` /
  `useAsyncData` (no raw `$fetch` in pages). Reuse OgImage templates from the
  layer where applicable.
- **Analytics / admin patterns**: Wire through existing PostHog, GA, or admin
  patterns if the template already exposes them; do not duplicate trackers or
  admin APIs.

If something is missing, extend the layer only when the feature is reusable
across apps; otherwise keep changes in `apps/web/` and still call into layer
utilities.

## Keyboard interactions

- `Enter` → submit
- `Cmd/Ctrl + K` → focus search
- `Esc` → clear active transient UI
- Arrow keys for result navigation if active selection is implemented
- `Cmd/Ctrl + Enter` in scan input → run bulk scan

## Test acceptance

- `pnpm --filter web lint`
- `pnpm --filter web typecheck`
- `pnpm --filter web exec vitest run tests/server/domain-search.test.ts tests/server/domain-search-server.test.ts tests/server/saved-searches.test.ts tests/server/saved-searches-api.test.ts`
- `pnpm --filter web run test:e2e -- --project=web apps/web/tests/e2e/smoke.spec.ts apps/web/tests/e2e/domain-search.spec.ts`
- `/q/[label]` renders a canonical keyword page with live results
- `/d/[domain]` renders a canonical exact-domain page with `noindex`
- `/dashboard` lists, reopens, and removes saved searches for the current user
