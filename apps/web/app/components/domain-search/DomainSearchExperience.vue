<script setup lang="ts">
import { MAX_SEARCH_RESULTS, getDomainQueryKind } from '#shared/domainSearch'

const search = useDomainSearch()
const { commitQuery, errorMessage, hasQuery, pending, query, rawQuery, results } = search
const savedSearches = useSavedSearches()
const { capture } = usePosthog()
const route = useRoute()

const featuredResult = computed(() => {
  if (!hasQuery.value) return null

  return (
    results.value.find((result) => result.isExactMatch && result.status === 'available') ??
    results.value.find((result) => result.status === 'available') ??
    null
  )
})
const isCurrentQuerySaved = computed(() => savedSearches.isSaved(query.value))
const isCurrentQuerySaving = computed(() => savedSearches.savingQuery.value === query.value)

async function saveCurrentQuery() {
  if (!query.value || isCurrentQuerySaved.value) return

  try {
    await savedSearches.saveQuery(query.value)
  } catch {
    // The composable exposes a user-facing message; the page only needs to avoid throwing.
  }
}

function trackRegistrarClick(domain: string, placement: 'featured' | 'result') {
  capture('domain_registrar_click', {
    domain,
    placement,
    query: query.value,
    queryKind: getDomainQueryKind(query.value),
  })
}

const loginHref = computed(() =>
  hasQuery.value
    ? {
        path: '/login',
        query: { next: route.fullPath },
      }
    : { path: '/login' },
)
</script>

<template>
  <section class="relative min-h-screen overflow-hidden bg-default text-default">
    <div
      class="absolute inset-0 bg-linear-to-b from-primary/14 via-transparent to-info/10"
      aria-hidden="true"
    />
    <div
      class="absolute inset-0 opacity-70"
      aria-hidden="true"
      style="
        background-image:
          linear-gradient(to right, rgb(148 163 184 / 0.12) 1px, transparent 1px),
          linear-gradient(to bottom, rgb(148 163 184 / 0.12) 1px, transparent 1px);
        background-size: 48px 48px;
      "
    />

    <div class="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between gap-4 py-4">
        <div class="flex items-center gap-3">
          <div
            class="flex size-11 items-center justify-center rounded-2xl bg-primary text-inverted shadow-card"
          >
            <UIcon name="i-lucide-scan-search" class="size-5" />
          </div>

          <div>
            <p class="font-display text-lg font-semibold">Quick Domain Check</p>
            <p class="text-sm text-muted">One box. Live status. No filler.</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UBadge color="neutral" variant="soft" class="rounded-full">RDAP powered</UBadge>
          <UButton
            v-if="savedSearches.isAuthenticated.value"
            to="/dashboard"
            color="neutral"
            variant="ghost"
            icon="i-lucide-bookmark"
          >
            Saved
          </UButton>
          <UButton v-else :to="loginHref" color="neutral" variant="ghost" icon="i-lucide-log-in">
            Sign in
          </UButton>
        </div>
      </div>

      <div class="flex flex-1 items-center py-8 sm:py-12">
        <div class="grid w-full gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div class="space-y-8">
            <div class="space-y-5">
              <UBadge color="primary" variant="soft" size="lg" class="rounded-full">
                Lightning-fast shortlist
              </UBadge>

              <div class="space-y-4">
                <h1
                  class="max-w-4xl font-display text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl"
                >
                  Find the domain that still feels early.
                </h1>

                <p class="max-w-2xl text-lg leading-8 text-muted">
                  Start with a word or paste a full domain. The exact match gets checked first, then
                  the common endings people actually reach for.
                </p>
              </div>
            </div>

            <UCard class="border-default bg-default/88 shadow-overlay backdrop-blur">
              <div class="space-y-6">
                <DomainSearchInput v-model="rawQuery" @submit="commitQuery" />

                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div class="flex flex-wrap items-center gap-3 text-sm text-muted">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-clock-3" class="size-4 text-primary" />
                      <span>Debounced live lookups at the edge</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-link" class="size-4 text-primary" />
                      <span>Canonical `/q` and `/d` routes</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-layers-3" class="size-4 text-primary" />
                      <span>{{ MAX_SEARCH_RESULTS }} common endings per pass</span>
                    </div>
                  </div>

                  <DomainSearchSaveButton
                    :has-query="hasQuery"
                    :is-authenticated="savedSearches.isAuthenticated.value"
                    :is-saved="isCurrentQuerySaved"
                    :is-saving="isCurrentQuerySaving"
                    @save="saveCurrentQuery"
                  />
                </div>

                <UAlert
                  v-if="savedSearches.mutationError.value"
                  color="error"
                  variant="subtle"
                  title="Saved search unavailable"
                  :description="savedSearches.mutationError.value"
                />

                <div
                  v-if="savedSearches.isAuthenticated.value && hasQuery"
                  class="flex flex-wrap items-center gap-2 text-sm text-muted"
                >
                  <UIcon name="i-lucide-bookmark-check" class="size-4 text-primary" />
                  <span v-if="isCurrentQuerySaved">This query is already in your dashboard.</span>
                  <span v-else
                    >Signed-in searches can be saved and reopened from your dashboard.</span
                  >
                </div>

                <div
                  v-else-if="hasQuery"
                  class="flex flex-wrap items-center gap-2 text-sm text-muted"
                >
                  <UIcon name="i-lucide-log-in" class="size-4 text-primary" />
                  <span>Sign in once to keep this query in your saved-search dashboard.</span>
                </div>
              </div>
            </UCard>
          </div>

          <ClientOnly fallback-tag="div">
            <template #fallback>
              <UCard class="border-default bg-default/88 shadow-card">
                <p class="text-sm text-muted">
                  {{
                    query ? `Loading live checks for ${query}.` : 'Type a word to start checking.'
                  }}
                </p>
              </UCard>
            </template>

            <div class="space-y-4">
              <div
                v-if="featuredResult"
                class="rounded-[1.75rem] border border-success/30 bg-success/10 p-5 shadow-card"
              >
                <p class="text-xs uppercase tracking-[0.24em] text-success">Best open option</p>
                <div
                  class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p class="font-display text-3xl font-semibold tracking-tight">
                      {{ featuredResult.domain }}
                    </p>
                    <p class="mt-2 text-sm leading-6 text-muted">
                      No live RDAP record was found for this name.
                    </p>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <UButton
                      v-if="featuredResult.purchaseUrl"
                      :to="featuredResult.purchaseUrl"
                      external
                      color="success"
                      icon="i-lucide-shopping-cart"
                      @click="trackRegistrarClick(featuredResult.domain, 'featured')"
                    >
                      Register
                    </UButton>

                    <UButton
                      :to="featuredResult.rdapUrl"
                      external
                      color="success"
                      variant="outline"
                      icon="i-lucide-arrow-up-right"
                    >
                      Inspect
                    </UButton>
                  </div>
                </div>
              </div>

              <DomainSearchResults
                :query="query"
                :has-query="hasQuery"
                :is-refreshing="pending"
                :results="results"
                :error-message="errorMessage"
                @registrar-click="trackRegistrarClick"
              />
            </div>
          </ClientOnly>
        </div>
      </div>
    </div>
  </section>
</template>
