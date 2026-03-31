<script setup lang="ts">
import type { DomainResult, DomainSearchResponse } from '#shared/domainSearch'
import { POPULAR_TLDS, buildCanonicalSearchPath } from '#shared/domainSearch'

const props = defineProps<{
  queries: string[]
  scanResults: Record<string, DomainSearchResponse | null>
  isScanning: boolean
}>()

const emit = defineEmits<{
  registrarClick: [domain: string, placement: 'result']
}>()

type SortKey = 'keyword' | 'viability'
const sortKey = ref<SortKey>('keyword')
const sortAsc = ref(true)

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = key === 'keyword'
  }
}

function sortIndicator(key: SortKey) {
  if (sortKey.value !== key) return ''
  return sortAsc.value ? '↑' : '↓'
}

function tldStatus(query: string, tld: string): DomainResult['status'] | null {
  const response = props.scanResults[query]
  if (!response) return null
  const result = response.results.find((r) => r.domain.endsWith(`.${tld}`))
  return result?.status ?? null
}

function bestDomain(query: string): string {
  const response = props.scanResults[query]
  if (!response) return '—'
  const best = response.results.find((r) => r.status === 'available')
  return best?.domain ?? '—'
}

function viabilityScore(query: string): number {
  const response = props.scanResults[query]
  if (!response) return 0
  return response.results.filter((r) => r.status === 'available').length
}

function purchaseUrl(query: string, tld: string): string | null {
  const response = props.scanResults[query]
  if (!response) return null
  const result = response.results.find((r) => r.domain.endsWith(`.${tld}`))
  return result?.status === 'available' ? (result.purchaseUrl ?? null) : null
}

const sortedQueries = computed(() => {
  const list = [...props.queries]
  list.sort((a, b) => {
    if (sortKey.value === 'viability') {
      const diff = viabilityScore(a) - viabilityScore(b)
      return sortAsc.value ? diff : -diff
    }
    return sortAsc.value ? a.localeCompare(b) : b.localeCompare(a)
  })
  return list
})

function statusIcon(status: DomainResult['status'] | null): string {
  switch (status) {
    case 'available':
      return '●'
    case 'taken':
      return '✕'
    case 'unknown':
      return '?'
    default:
      return '·'
  }
}

function statusClass(status: DomainResult['status'] | null): string {
  switch (status) {
    case 'available':
      return 'text-success cursor-pointer'
    case 'taken':
      return 'text-muted'
    case 'unknown':
      return 'text-warning'
    default:
      return 'text-dimmed'
  }
}

function cellTitle(query: string, tld: string): string {
  const domain = `${query}.${tld}`
  const status = tldStatus(query, tld)
  if (status === 'available') return `${domain} — click to register`
  return domain
}

function hasResult(query: string): boolean {
  return !!props.scanResults[query]
}

function viabilityLabel(query: string): string {
  return `${viabilityScore(query)}/${POPULAR_TLDS.length}`
}

function viabilityClass(query: string): string {
  return viabilityScore(query) > 0 ? 'text-success' : 'text-muted'
}

function cellClass(query: string, tld: string): string {
  return statusClass(tldStatus(query, tld))
}

function cellIcon(query: string, tld: string): string {
  return statusIcon(tldStatus(query, tld))
}

function handleCellClick(query: string, tld: string) {
  if (!import.meta.client) return
  const url = purchaseUrl(query, tld)
  if (url) {
    const response = props.scanResults[query]
    const result = response?.results.find((r) => r.domain.endsWith(`.${tld}`))
    if (result) {
      emit('registrarClick', result.domain, 'result')
    }
    globalThis.open(url, '_blank')
  }
}
</script>

<template>
  <div class="overflow-x-auto rounded-lg border border-default">
    <div class="min-w-[700px]">
      <!-- Header -->
      <div class="flex border-b border-default bg-muted/50 text-xs font-medium text-muted">
        <div
          class="w-28 shrink-0 cursor-pointer px-3 py-2"
          @click="toggleSort('keyword')"
        >
          Keyword {{ sortIndicator('keyword') }}
        </div>
        <div class="w-32 shrink-0 px-3 py-2">Best</div>
        <div
          v-for="tld in POPULAR_TLDS"
          :key="tld"
          class="w-12 shrink-0 px-1 py-2 text-center font-mono"
        >
          .{{ tld }}
        </div>
        <div
          class="w-16 shrink-0 cursor-pointer px-3 py-2 text-right"
          @click="toggleSort('viability')"
        >
          Score {{ sortIndicator('viability') }}
        </div>
      </div>

      <!-- Rows -->
      <div
        v-for="query in sortedQueries"
        :key="query"
        class="flex border-b border-default text-xs transition-colors last:border-b-0 hover:bg-accented"
      >
        <div class="w-28 shrink-0 px-3 py-2">
          <NuxtLink
            :to="buildCanonicalSearchPath(query)"
            class="font-mono font-medium text-highlighted no-underline hover:text-primary"
          >
            {{ query }}
          </NuxtLink>
        </div>
        <div class="w-32 shrink-0 px-3 py-2 font-mono text-success">
          {{ bestDomain(query) }}
        </div>
        <div
          v-for="tld in POPULAR_TLDS"
          :key="`${query}-${tld}`"
          class="w-12 shrink-0 px-1 py-2 text-center font-mono"
          :class="cellClass(query, tld)"
          :title="cellTitle(query, tld)"
          @click="handleCellClick(query, tld)"
        >
          <template v-if="hasResult(query)">
            {{ cellIcon(query, tld) }}
          </template>
          <template v-else>
            <span class="inline-block size-2 animate-pulse rounded-full bg-muted" />
          </template>
        </div>
        <div class="w-16 shrink-0 px-3 py-2 text-right font-mono tabular-nums">
          <span :class="viabilityClass(query)">
            {{ viabilityLabel(query) }}
          </span>
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-if="queries.length === 0"
        class="px-3 py-6 text-center text-xs text-muted"
      >
        Enter multiple keywords (one per line or comma-separated) to scan.
      </div>
    </div>

    <div
      v-if="isScanning"
      class="flex items-center gap-2 border-t border-default bg-muted/30 px-3 py-2 text-xs text-primary"
    >
      <UIcon name="i-lucide-loader-2" class="size-3 animate-spin" />
      Scanning {{ queries.length }} keywords…
    </div>
  </div>
</template>
