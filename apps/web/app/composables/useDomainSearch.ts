import type { DomainSearchResponse } from '../../shared/domainSearch'
import { emptyDomainSearchResponse, normalizeDomainQuery } from '../../shared/domainSearch'

function readQueryValue(value: unknown) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

export async function useDomainSearch() {
  const route = useRoute()
  const router = useRouter()

  const initialQuery = normalizeDomainQuery(readQueryValue(route.query.q))
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

  watch(
    () => route.query.q,
    (value) => {
      if (!import.meta.client) return

      const nextQuery = normalizeDomainQuery(readQueryValue(value))
      if (nextQuery === normalizedQuery.value) return

      rawQuery.value = nextQuery
      settledQuery.value = nextQuery
    },
  )

  watch(settledQuery, async (value) => {
    if (!import.meta.client) return

    const currentQuery = normalizeDomainQuery(readQueryValue(route.query.q))
    if (value === currentQuery) return

    const nextQuery = { ...route.query }
    if (value) nextQuery.q = value
    else delete nextQuery.q

    await router.replace({ query: nextQuery })
  })

  onBeforeUnmount(() => {
    clearScheduledLookup()
  })

  const { data, error, status, refresh } = await useAsyncData<DomainSearchResponse>(
    'domain-search',
    async (_nuxtApp, { signal }) => {
      const query = settledQuery.value
      if (!query) return emptyDomainSearchResponse()

      return await $fetch('/api/domain/search', {
        query: { q: query },
        signal,
      })
    },
    {
      watch: [settledQuery],
      default: () => emptyDomainSearchResponse(initialQuery),
      deep: false,
      dedupe: 'cancel',
      server: false,
    },
  )

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
