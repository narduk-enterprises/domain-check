import type { DomainSearchResponse } from '#shared/domainSearch'
import {
  buildCanonicalSearchPath,
  emptyDomainSearchResponse,
  getDomainQueryKind,
  normalizeDomainQuery,
  readDomainRouteQuery,
} from '#shared/domainSearch'

export function useDomainSearch() {
  const route = useRoute()
  const router = useRouter()
  const { capture } = usePosthog()

  const routeQuery = computed(() =>
    readDomainRouteQuery({
      label: route.params.label,
      domain: route.params.domain,
      q: route.query.q,
    }),
  )
  const initialQuery = routeQuery.value
  const rawQuery = shallowRef(initialQuery)
  const settledQuery = shallowRef(initialQuery)
  const normalizedQuery = computed(() => normalizeDomainQuery(rawQuery.value))

  // --- Scan mode ---
  const mode = ref<'search' | 'scan'>('search')
  const scanResults = ref<Record<string, DomainSearchResponse | null>>({})
  const isScanning = ref(false)

  const scanQueries = computed(() => {
    if (mode.value !== 'scan') return []
    return rawQuery.value
      .split(/[\n,]+/)
      .map((q) => normalizeDomainQuery(q))
      .filter((q) => q.length > 0)
  })

  async function runScan() {
    const queries = scanQueries.value
    if (queries.length === 0) return

    isScanning.value = true
    scanResults.value = {}

    try {
      const responses = await Promise.allSettled(
        queries.map((q) =>
          $fetch<DomainSearchResponse>('/api/domain/search' as string, {
            query: { q },
          }),
        ),
      )

      const results: Record<string, DomainSearchResponse | null> = {}
      for (const [index, response] of responses.entries()) {
        const query = queries[index] ?? ''
        if (!query) continue
        results[query] = response.status === 'fulfilled' ? response.value : null
      }

      scanResults.value = results

      capture('domain_scan_submitted', {
        queryCount: queries.length,
      })
    } finally {
      isScanning.value = false
    }
  }
  // --- End scan mode ---

  let debounceHandle: ReturnType<typeof globalThis.setTimeout> | undefined

  const clearScheduledLookup = () => {
    if (debounceHandle === undefined) return

    globalThis.clearTimeout(debounceHandle)
    debounceHandle = undefined
  }

  const scheduleLookup = (value: string, delay: number) => {
    if (!import.meta.client) {
      settledQuery.value = value
      return
    }

    clearScheduledLookup()
    debounceHandle = globalThis.setTimeout(() => {
      settledQuery.value = value
    }, delay)
  }

  watch(
    normalizedQuery,
    (value) => {
      if (mode.value === 'scan') return
      scheduleLookup(value, value ? 140 : 0)
    },
    { immediate: true },
  )

  watch(routeQuery, (nextQuery) => {
    if (!import.meta.client) return
    if (nextQuery === normalizedQuery.value) return

    rawQuery.value = nextQuery
    settledQuery.value = nextQuery
  })

  watch(settledQuery, (value) => {
    if (!import.meta.client) return
    if (mode.value === 'scan') return

    const targetPath = buildCanonicalSearchPath(value)
    const hasLegacyQuery = typeof route.query.q === 'string' || Array.isArray(route.query.q)
    if (route.path === targetPath && !hasLegacyQuery) return

    // Determine if this is the same page family (e.g. /q/a → /q/b)
    // or a cross-family transition (e.g. / → /q/a, /q/a → /d/b)
    const currentPrefix = route.path.split('/')[1] ?? ''
    const targetPrefix = targetPath.split('/')[1] ?? ''
    const isSameFamily = currentPrefix === targetPrefix && currentPrefix !== ''

    if (isSameFamily) {
      // Intra-page transition: Nuxt reuses the same page component
      router.replace(targetPath)
    } else {
      // Cross-page transition: use replaceState to avoid page swap & focus loss
      globalThis.history?.replaceState(globalThis.history.state, '', targetPath)
    }
  })

  onBeforeUnmount(() => {
    clearScheduledLookup()
  })
  const {
    data,
    error,
    status,
    refresh,
    clear: _clear,
  } = useAsyncData<DomainSearchResponse>(
    'domain-search',
    async (_nuxtApp, { signal }) => {
      const query = settledQuery.value
      if (!query) return emptyDomainSearchResponse()

      return await $fetch<DomainSearchResponse>('/api/domain/search' as string, {
        query: { q: query },
        signal,
      })
    },
    {
      watch: [settledQuery],
      default: () => emptyDomainSearchResponse(settledQuery.value || initialQuery),
      deep: false,
      dedupe: 'cancel',
    },
  )

  // Force a client-side refetch when settledQuery changes.
  // useAsyncData's watch option may not trigger after SSR hydration.
  watch(settledQuery, (value, previousValue) => {
    if (!import.meta.client || value === previousValue) return
    refresh()
  })

  watch(settledQuery, (value, previousValue) => {
    if (!import.meta.client || !value || value === previousValue) return

    capture('domain_search_submitted', {
      query: value,
      queryKind: getDomainQueryKind(value),
    })
  })

  const hasQuery = computed(() => settledQuery.value.length > 0)
  const results = computed(() => data.value?.results ?? [])
  const query = computed(() => data.value?.normalizedQuery || settledQuery.value)
  const pending = computed(() => status.value === 'pending')
  const errorMessage = computed(() =>
    error.value
      ? 'Some registries did not answer in time. Results marked unknown can be retried.'
      : null,
  )

  const commitQuery = () => {
    if (mode.value === 'scan') {
      runScan()
      return
    }
    clearScheduledLookup()
    settledQuery.value = normalizedQuery.value
  }

  const setQuery = (value: string) => {
    rawQuery.value = value
    commitQuery()
  }

  const clearQuery = () => {
    rawQuery.value = ''
    settledQuery.value = ''
    scanResults.value = {}
  }

  return {
    data,
    error,
    errorMessage,
    hasQuery,
    pending,
    query,
    rawQuery,
    refresh,
    results,
    settledQuery,
    setQuery,
    commitQuery,
    clearQuery,
    status,
    // Scan mode
    mode,
    scanQueries,
    scanResults,
    isScanning,
    runScan,
  }
}
