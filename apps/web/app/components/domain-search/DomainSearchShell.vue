<script setup lang="ts">
import { getDomainQueryKind, buildCanonicalSearchPath } from '#shared/domainSearch'

const search = useDomainSearch()
const {
  commitQuery,
  clearQuery,
  errorMessage,
  hasQuery,
  isScanning,
  mode,
  pending,
  query,
  rawQuery,
  results,
  scanQueries,
  scanResults,
} = search
const savedSearches = useSavedSearches()
const { capture } = usePosthog()
const config = useRuntimeConfig()

const isCurrentQuerySaved = computed(() => savedSearches.isSaved(query.value))
const isCurrentQuerySaving = computed(() => savedSearches.savingQuery.value === query.value)

const canonicalUrl = computed(() => {
  if (!hasQuery.value) return null
  const path = buildCanonicalSearchPath(query.value)
  return new URL(path, config.public.appUrl).toString()
})

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
</script>

<template>
  <section class="min-h-screen bg-default text-default">
    <div class="mx-auto max-w-3xl px-4 sm:px-6">
      <DomainSearchToolbar />

      <!-- Primary search block -->
      <div class="py-6">
        <div class="flex items-center gap-3 pb-4">
          <DomainSearchModeToggle v-model="mode" />
          <p class="text-xs text-dimmed">
            {{
              mode === 'scan'
                ? 'Compare multiple keywords at once.'
                : 'One keyword or exact domain.'
            }}
          </p>
        </div>

        <DomainSearchInput v-model="rawQuery" :mode="mode" @submit="commitQuery" />
      </div>

      <!-- Mutation error -->
      <UAlert
        v-if="savedSearches.mutationError.value"
        color="error"
        variant="subtle"
        title="Save unavailable"
        :description="savedSearches.mutationError.value"
        class="mb-4"
      />

      <!-- Results region -->
      <ClientOnly fallback-tag="div">
        <template #fallback>
          <div class="rounded-lg border border-default bg-muted/50 px-4 py-4 text-center">
            <p class="text-sm text-muted">
              {{ query ? `Loading live checks for ${query}.` : 'Type a word to start checking.' }}
            </p>
          </div>
        </template>

        <!-- Search mode -->
        <DomainSearchInlineResults
          v-if="mode === 'search'"
          :query="query"
          :has-query="hasQuery"
          :is-refreshing="pending"
          :results="results"
          :error-message="errorMessage"
          @registrar-click="trackRegistrarClick"
        />

        <!-- Scan mode -->
        <DomainSearchScanTable
          v-else
          :queries="scanQueries"
          :scan-results="scanResults"
          :is-scanning="isScanning"
          @registrar-click="trackRegistrarClick"
        />
      </ClientOnly>

      <!-- Secondary actions -->
      <div class="py-4">
        <DomainSearchMetaBar
          :has-query="hasQuery"
          :is-authenticated="savedSearches.isAuthenticated.value"
          :is-saved="isCurrentQuerySaved"
          :is-saving="isCurrentQuerySaving"
          :canonical-url="canonicalUrl"
          @save="saveCurrentQuery"
          @clear="clearQuery"
        />
      </div>

      <!-- Compact footer -->
      <div class="border-t border-default py-4 text-center text-xs text-dimmed">
        RDAP-powered live checks · 8 TLDs per pass
      </div>
    </div>
  </section>
</template>
