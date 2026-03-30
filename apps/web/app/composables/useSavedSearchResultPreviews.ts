import type { DomainResult, DomainSearchResponse } from '#shared/domainSearch'
import type { SavedSearchRecord } from '#shared/savedSearches'
import { getDomainQueryKind } from '#shared/domainSearch'

export interface SavedSearchResultPreview {
  normalizedQuery: string
  queryKind: ReturnType<typeof getDomainQueryKind>
  results: DomainResult[]
  exactMatch: DomainResult | null
  bestAvailable: DomainResult | null
  availableCount: number
}

function buildPreview(response: DomainSearchResponse): SavedSearchResultPreview {
  const results = response.results.slice(0, 3)
  const exactMatch = response.results.find((result) => result.isExactMatch) ?? null
  const bestAvailable = response.results.find((result) => result.status === 'available') ?? null
  const normalizedQuery = response.normalizedQuery || response.query

  return {
    normalizedQuery,
    queryKind: getDomainQueryKind(normalizedQuery),
    results,
    exactMatch,
    bestAvailable,
    availableCount: response.results.filter((result) => result.status === 'available').length,
  }
}

export function useSavedSearchResultPreviews(savedSearches: Ref<SavedSearchRecord[]>) {
  const queries = computed(() =>
    Array.from(
      new Set(
        savedSearches.value
          .map((savedSearch) => savedSearch.normalizedQuery)
          .filter((query) => query.length > 0),
      ),
    ),
  )

  const { data, refresh, status } = useAsyncData<Record<string, SavedSearchResultPreview | null>>(
    'saved-search-previews',
    async () => {
      if (queries.value.length === 0) return {}

      const responses = await Promise.allSettled(
        queries.value.map((query) =>
          $fetch<DomainSearchResponse>('/api/domain/search' as string, {
            query: { q: query },
          }),
        ),
      )

      return Object.fromEntries(
        responses.map((response, index) => {
          const query = queries.value[index] ?? ''
          if (!query) return ['', null]

          return [
            query,
            response.status === 'fulfilled' ? buildPreview(response.value) : null,
          ] as const
        }),
      )
    },
    {
      watch: [queries],
      default: () => ({}),
      deep: false,
      server: false,
    },
  )

  return {
    previews: computed(() => data.value ?? {}),
    isLoading: computed(() => status.value === 'pending'),
    refresh,
    status,
  }
}
