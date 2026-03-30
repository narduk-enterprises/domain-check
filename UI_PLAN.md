Status: MVP

# UI plan

## Sitemap

- `/`

## Route: `/`

### Layout

- Chromeless full-screen canvas using the `blank` layout
- Left column for positioning and search input
- Right column for featured available domain and result list

### Components

- `DomainSearchExperience`
- `DomainSearchInput`
- `DomainSearchResults`

### States

- Empty: prompt the user to type a word or paste a domain
- Loading: keep existing results visible and show a lightweight refreshing badge
- Success: show status cards for each checked domain
- Partial failure: show result cards plus a warning when one or more registries
  timeout

### Content notes

- Keep copy tight and functional
- Preserve the query in the URL
- Avoid marketing sections, pricing, testimonials, or navigation clutter
