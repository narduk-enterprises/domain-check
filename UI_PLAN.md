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

Single-column, utility-first canvas using `blank` layout.

Replace the current left-copy / right-results split with:

- **Top utility bar**
  - product label
  - dashboard/login link
  - optional keyboard hint
  - no hero navigation clutter
- **Primary search block**
  - one prominent input
  - optional mode toggle: Search / Scan
  - submit action integrated into the input row
- **Results region**
  - inline below the input
  - immediate visibility
  - no giant empty whitespace
  - no marketing cards competing with results
- **Secondary actions row**
  - save search
  - copy canonical link
  - clear / new search

Why this is better: the old split layout is still half landing page. The updated
layout makes the app feel like a real tool.

### Components

- `DomainSearchShell`
- `DomainSearchToolbar`
- `DomainSearchInput`
- `DomainSearchModeToggle`
- `DomainSearchSaveButton`
- `DomainSearchInlineResults`
- `DomainSearchResultRow`
- `DomainSearchFeaturedResult`
- `DomainSearchScanTable`
- `DomainSearchStatusBadge`
- `DomainSearchMetaBar`

Notes:

- `DomainSearchExperience` is too vague. Split it into shell + mode-specific
  views.
- Featured result should be optional, not the organizing principle of the page.

### Search mode UI

#### Purpose

For one keyword or one exact domain.

#### Layout behavior

- Input at top
- Inline result stack below
- Best available result can be pinned first
- Remaining candidate domains shown as dense rows, not chunky cards

#### Row format

Each row should support:

- domain
- status
- optional reason
- optional latency / source metadata
- CTA: `Register` for available, `Inspect` for taken/unknown

#### Visual style

- dark default
- monospace-friendly
- minimal color
- green reserved for available
- red reserved for taken only where needed
- unknown should be neutral, not alarming
- no gradients
- minimal shadow
- tight spacing
- strong typography hierarchy

### Scan mode UI

#### Purpose

For bulk naming sessions.

#### Entry

Triggered by:

- multiple lines
- comma-separated keywords
- explicit mode switch

#### Layout behavior

- same top search block
- results render as a dense sortable table below
- no separate page required in V1

#### Table columns

- keyword
- best domain
- `.com`
- `.ai`
- `.io`
- `.app`
- `.dev`
- `.co`
- `.net`
- `.org`
- viability score

#### Table cell behavior

- status icon or text only
- available = quick register affordance
- taken = inspect
- unknown = muted warning state
- clicking row opens the canonical query route

Why this matters: this turns the app from "single check widget" into a real
naming workflow.

### Shared states

#### Empty

- one tight prompt
- example inputs
- small hint:
  - "Type a keyword or paste a domain"
  - "Paste multiple lines to scan"

#### Loading

- keep prior results visible
- show slim refreshing status
- never blank the screen if previous results exist

#### Success

- render result stack or scan table immediately
- highlight best available option if one exists

#### Partial failure

- keep successful results visible
- show compact warning: "2 registries timed out"
- avoid large alert banners

#### Hard failure

- inline error near results area
- preserve the input and last query

#### Saved query states

- signed-in and saved
- signed-in and savable
- signed-out with auth redirect on save

### Interaction rules

#### Search submissions

- keyword → `/q/[label]`
- exact domain → `/d/[domain]`
- legacy `/?q=` → canonical redirect
- multi-keyword scan may stay on `/q/[label]` only if you deliberately serialize
  a bulk label concept, otherwise keep scan as client state initiated from `/`
  in V1

That last point matters: bulk scan is a workflow, not obviously an SEO route.

#### Result actions

- available → `Register`, `Inspect`
- taken → `Inspect`
- unknown → `Inspect`

#### Save behavior

- save current normalized query
- preserve `next` through auth routes
- post-auth return to originating route
- reopening saved query always runs live checks

#### Keyboard interactions

- `Enter` → submit
- `Cmd/Ctrl + K` → focus search
- `Esc` → clear active transient UI
- arrow keys for result navigation if active selection is implemented
- `Cmd/Ctrl + Enter` in scan input → run bulk scan

## Route: `/`

### Purpose

Fast entry point for first visit and repeat use.

### Layout

- utility bar
- primary input
- small examples
- no split hero
- no testimonials
- no feature marketing blocks

### Content

Very little copy:

- product label
- one-line instruction
- optional tiny note on supported TLDs

### Goal

The user should be able to act within one second.

## Route: `/q/[label]`

### Purpose

Canonical keyword route for discovery and sharing.

### Layout

Same shell as `/`, but preloaded with the label and live results.

### SEO notes

- indexable
- title/description centered on keyword
- canonical to itself

### UX notes

- result list immediately visible above the fold
- save and copy-link controls near the query
- no landing-page framing

## Route: `/d/[domain]`

### Purpose

Canonical exact-domain route.

### Layout

Same shell as `/q/[label]`.

### SEO notes

- `noindex`
- canonical to itself

### UX notes

- exact domain pinned first
- supporting candidate domains below if that remains part of the current logic
- very explicit exact-domain state

## Route: `/dashboard`

### Purpose

Saved-search home.

### Layout

Use authenticated shell, but keep it tighter and more operational than
"dashboard marketing".

### Sections

- top bar: user context, new search, sign out
- saved queries list: dense rows or compact cards, sorted newest first

### Components

- `SavedSearchDashboard`
- `SavedSearchRow`
- `SavedSearchEmptyState`

### States

- loading
- empty
- populated
- remove in progress
- mutation error

### Interaction rules

- Reopen → canonical route
- Remove → delete inline
- optional Copy link

### Guidance

Do not overdesign this screen. It is storage, not a product showcase.

## Route: `/login` and `/register`

### Purpose

Reuse existing auth stack.

### Notes

- preserve `next`
- preserve active search context
- allow switching login/register without losing route intent
- return directly to originating query route on success

## Component-level UI guidance

### Typography

- Sans for shell labels and primary UI
- Monospace for domains, statuses, technical metadata
- Large headline marketing typography should be removed from search routes

### Spacing

- tighter than current
- prioritize scan density
- results should start close to the input

### Color

- mostly neutral
- green only for available
- red sparingly for taken
- yellow or muted neutral for unknown/timeouts
- avoid pastel marketing palette

### Surfaces

- flat or nearly flat
- subtle borders
- minimal elevation
- cards only where they improve structure, not as default

## Hard recommendation

### Keep

- canonical routes
- saved searches
- auth reuse
- current TLD shortlist
- exact-domain-first behavior

### Change

- kill the left-copy / right-results split
- kill shortlist cards as primary UI
- make inline dense rows the default
- add Scan mode as first-class workflow
- make the whole app feel like a utility console, not a startup homepage

## Final product framing

This app is **not**:

- a landing page
- a registrar
- a brand story

This app **is**:

- a domain decision tool

That distinction should drive the entire implementation.
