<script setup lang="ts">
import type { DomainResult } from '#shared/domainSearch'

const props = defineProps<{
  query: string
  hasQuery: boolean
  isRefreshing: boolean
  results: DomainResult[]
  errorMessage: string | null
}>()

const emit = defineEmits<{
  registrarClick: [domain: string, placement: 'result' | 'featured']
}>()

const featuredResult = computed(() => {
  if (!props.hasQuery) return null

  return (
    props.results.find((r) => r.isExactMatch && r.status === 'available') ??
    props.results.find((r) => r.status === 'available') ??
    null
  )
})

const nonFeaturedResults = computed(() => {
  if (!featuredResult.value) return props.results
  return props.results.filter((r) => r.domain !== featuredResult.value!.domain)
})

const availableCount = computed(
  () => props.results.filter((r) => r.status === 'available').length,
)
</script>

<template>
  <div class="space-y-3">
    <!-- Status summary -->
    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
      <span v-if="hasQuery" class="font-mono">
        {{ results.length }} checked
        <template v-if="availableCount > 0">
          · <span class="text-success">{{ availableCount }} open</span>
        </template>
      </span>

      <span
        v-if="isRefreshing"
        class="inline-flex items-center gap-1 text-primary"
      >
        <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
        Refreshing
      </span>
    </div>

    <!-- Error -->
    <div
      v-if="errorMessage"
      class="flex items-center gap-2 rounded-md border border-warning/25 bg-warning/5 px-3 py-2 text-xs text-warning"
    >
      <UIcon name="i-lucide-alert-triangle" class="size-3.5 shrink-0" />
      {{ errorMessage }}
    </div>

    <!-- Empty state -->
    <div
      v-if="!hasQuery"
      class="rounded-lg border border-default bg-muted/50 px-4 py-6 text-center"
    >
      <p class="text-sm text-muted">
        Type a keyword or paste a domain to start checking.
      </p>
      <p class="mt-1 text-xs text-dimmed">
        Paste multiple lines to scan in bulk.
      </p>
    </div>

    <!-- No results -->
    <div
      v-else-if="results.length === 0 && !isRefreshing"
      class="rounded-lg border border-default bg-muted/50 px-4 py-4 text-center"
    >
      <p class="text-sm text-muted">No results yet — try another query.</p>
    </div>

    <template v-else>
      <!-- Featured result -->
      <DomainSearchFeaturedResult
        v-if="featuredResult"
        :result="featuredResult"
        @registrar-click="(domain, placement) => emit('registrarClick', domain, placement)"
      />

      <!-- Dense result rows -->
      <div
        v-if="nonFeaturedResults.length > 0"
        class="overflow-hidden rounded-lg border border-default"
      >
        <DomainSearchResultRow
          v-for="result in nonFeaturedResults"
          :key="result.domain"
          :result="result"
          @registrar-click="(domain, placement) => emit('registrarClick', domain, placement)"
        />
      </div>
    </template>
  </div>
</template>
