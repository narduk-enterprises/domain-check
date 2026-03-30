Status: V1

# UI plan

## Sitemap

- `/`
- `/q/[label]`
- `/d/[domain]`
- `/dashboard`
- `/login`
- `/register`

## Shared search surface

### Routes

- `/`
- `/q/[label]`
- `/d/[domain]`

### Layout

- Chromeless full-screen canvas using the `blank` layout
- Left rail for copy, search input, route hints, and save action
- Right rail for featured available result plus the shortlist cards

### Components

- `DomainSearchExperience`
- `DomainSearchInput`
- `DomainSearchSaveButton`
- `DomainSearchResults`

### States

- Empty: generic prompt to type a keyword or paste a domain
- Loading: keep prior results visible and show a lightweight refreshing badge
- Success: show the featured available result plus the shortlist cards
- Partial failure: show cards plus a warning when one or more registries timeout
- Saved query:
  - signed-in and already saved
  - signed-in and savable
  - signed-out, prompting auth on save attempt

### Interaction rules

- Keyword submissions navigate to `/q/[label]`
- Exact-domain submissions navigate to `/d/[domain]`
- Legacy `/?q=` loads normalize to the canonical route
- Available cards show `Register` and `Inspect`
- Taken/unknown cards show `Inspect` only

## Route: `/`

### Purpose

- Empty-state entry route for first visits and fresh searches

### Content notes

- Keep copy tight and functional
- No pricing, testimonials, or multi-section marketing
- Surface the auth/dashboard link without turning the page into an app shell

## Route: `/q/[label]`

### Purpose

- Canonical keyword page for organic discovery and shareable founder naming
  flows

### SEO notes

- Indexable
- Title/description centered on the keyword
- Canonical to itself

## Route: `/d/[domain]`

### Purpose

- Canonical exact-domain route for direct sharing and clean route-path UX

### SEO notes

- `noindex`
- Canonical to itself
- Same visual search experience as the keyword route

## Route: `/dashboard`

### Purpose

- Saved-search home for the signed-in user

### Layout

- Reuse the authenticated page shell
- Hero section with current user context plus sign-out / new-search actions
- Main section devoted to saved-search cards

### Components

- `SavedSearchDashboard`

### States

- Loading
- Empty
- Populated list
- Remove in progress
- Mutation error

### Interaction rules

- `Reopen` navigates to the canonical route for the saved query
- `Remove` deletes the saved record in place

## Route: `/login` and `/register`

### Purpose

- Reuse the existing auth stack and support `next` redirects back into the
  search flow

### Notes

- Preserve the active search route through login/register switching
- Successful auth returns the user to the originating search route when `next`
  is present
