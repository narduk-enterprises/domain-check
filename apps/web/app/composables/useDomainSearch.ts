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

  watch(settledQuery, async (value) => {
    if (!import.meta.client) return

    const targetPath = buildCanonicalSearchPath(value)
    const hasLegacyQuery = typeof route.query.q === 'string' || Array.isArray(route.query.q)
    if (route.path === targetPath && !hasLegacyQuery) return

    await router.replace(targetPath)
  })

  onBeforeUnmount(() => {
    clearScheduledLookup()
  })

  const { data, error, status, refresh } = useAsyncData<DomainSearchResponse>(
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
      default: () => emptyDomainSearchResponse(initialQuery),
      deep: false,
      dedupe: 'cancel',
    },
  )

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
    clearScheduledLookup()
    settledQuery.value = normalizedQuery.value
  }

  const setQuery = (value: string) => {
    rawQuery.value = value
    commitQuery()
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
    status,
  }
}
