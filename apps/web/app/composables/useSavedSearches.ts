import type { SavedSearchListResponse, SavedSearchRecord } from '#shared/savedSearches'
import { getDomainQueryKind, normalizeDomainQuery } from '#shared/domainSearch'

function toUserFacingError(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback

  const maybeError = error as {
    data?: { statusMessage?: string; message?: string }
    statusMessage?: string
    message?: string
  }

  return (
    maybeError.data?.statusMessage ||
    maybeError.data?.message ||
    maybeError.statusMessage ||
    maybeError.message ||
    fallback
  )
}

export function useSavedSearches() {
  const { isAuthenticated, user } = useAuth()
  const nuxtApp = useNuxtApp()
  const { capture } = usePosthog()
  const csrfFetch = (nuxtApp.$csrfFetch ?? $fetch) as typeof $fetch
  const mutationHeaders = { 'X-Requested-With': 'XMLHttpRequest' } as const

  const mutationError = shallowRef<string | null>(null)
  const savingQuery = shallowRef<string | null>(null)
  const removingIds = shallowRef<string[]>([])

  const { data, refresh, status } = useAsyncData<SavedSearchListResponse>(
    'saved-searches',
    async () => {
      if (!isAuthenticated.value) {
        return { savedSearches: [] }
      }

      return await $fetch<SavedSearchListResponse>('/api/saved-searches' as string)
    },
    {
      watch: [isAuthenticated],
      default: () => ({ savedSearches: [] }),
      deep: false,
    },
  )

  const savedSearches = computed(() => data.value?.savedSearches ?? [])
  const savedQuerySet = computed(
    () => new Set(savedSearches.value.map((item) => item.normalizedQuery)),
  )
  const isLoading = computed(() => status.value === 'pending')

  onMounted(() => {
    if (!isAuthenticated.value) return

    void refresh()
  })

  function isSaved(query: string) {
    const normalizedQuery = normalizeDomainQuery(query)
    return normalizedQuery ? savedQuerySet.value.has(normalizedQuery) : false
  }

  async function saveQuery(query: string) {
    const normalizedQuery = normalizeDomainQuery(query)
    if (!normalizedQuery) return null

    mutationError.value = null
    savingQuery.value = normalizedQuery

    try {
      const result = await csrfFetch<{ savedSearch: SavedSearchRecord }>(
        '/api/saved-searches' as string,
        {
          method: 'POST',
          body: { query },
          headers: mutationHeaders,
        },
      )

      await refresh()
      capture('domain_search_saved', {
        query: normalizedQuery,
        queryKind: getDomainQueryKind(normalizedQuery),
        userId: user.value?.id ?? null,
      })

      return result.savedSearch
    } catch (error) {
      mutationError.value = toUserFacingError(error, 'Unable to save this search right now.')
      throw error
    } finally {
      savingQuery.value = null
    }
  }

  async function removeSavedSearch(savedSearch: SavedSearchRecord) {
    mutationError.value = null
    removingIds.value = [...removingIds.value, savedSearch.id]

    try {
      await csrfFetch(`/api/saved-searches/${savedSearch.id}` as string, {
        method: 'DELETE',
        headers: mutationHeaders,
      })

      await refresh()
      capture('domain_search_removed', {
        query: savedSearch.normalizedQuery,
        queryKind: getDomainQueryKind(savedSearch.normalizedQuery),
        userId: user.value?.id ?? null,
      })
    } catch (error) {
      mutationError.value = toUserFacingError(error, 'Unable to remove this saved search.')
      throw error
    } finally {
      removingIds.value = removingIds.value.filter((id) => id !== savedSearch.id)
    }
  }

  return {
    isAuthenticated,
    isLoading,
    isSaved,
    mutationError,
    refresh,
    removeSavedSearch,
    removingIds,
    saveQuery,
    savedSearches,
    savingQuery,
    status,
    user,
  }
}
