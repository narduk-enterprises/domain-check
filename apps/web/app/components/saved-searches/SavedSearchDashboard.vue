<script setup lang="ts">
import type { DomainResult } from '#shared/domainSearch'
import type { SavedSearchRecord } from '#shared/savedSearches'
import { buildCanonicalSearchPath, getDomainQueryKind } from '#shared/domainSearch'

const props = defineProps<{
  isLoading: boolean
  mutationError: string | null
  removingIds: string[]
  savedSearches: SavedSearchRecord[]
}>()

const emit = defineEmits<{
  remove: [savedSearch: SavedSearchRecord]
}>()

const livePreviews = useSavedSearchResultPreviews(computed(() => props.savedSearches))

function isRemoving(id: string) {
  return props.removingIds.includes(id)
}

function searchHref(query: string) {
  return buildCanonicalSearchPath(query)
}

function queryKindLabel(query: string) {
  return getDomainQueryKind(query) === 'exact' ? 'Exact domain' : 'Keyword'
}

function statusLabel(status: DomainResult['status']) {
  switch (status) {
    case 'available':
      return 'Available'
    case 'taken':
      return 'Taken'
    default:
      return 'Unknown'
  }
}

function statusColor(status: DomainResult['status']) {
  switch (status) {
    case 'available':
      return 'success'
    case 'taken':
      return 'neutral'
    default:
      return 'warning'
  }
}

function previewFor(query: string) {
  return livePreviews.previews.value[query] ?? null
}

function previewHeadline(query: string) {
  const preview = previewFor(query)
  if (!preview)
    return livePreviews.isLoading.value ? 'Refreshing live results' : 'Live preview unavailable'

  if (preview.exactMatch?.status === 'taken') return 'Already taken'
  if (preview.exactMatch?.status === 'available') return 'Exact match open'
  if (preview.availableCount > 0) return `${preview.availableCount} open now`
  if (preview.exactMatch?.status === 'unknown') return 'Exact match still resolving'
  return 'No live status yet'
}

function previewDescription(query: string) {
  const preview = previewFor(query)
  if (!preview) return 'Open the search to rerun the live checks.'

  if (preview.exactMatch?.status === 'taken') {
    return preview.bestAvailable
      ? `${preview.normalizedQuery} is already taken. Best open option: ${preview.bestAvailable.domain}.`
      : `${preview.normalizedQuery} is already taken.`
  }

  if (preview.exactMatch?.status === 'available') {
    return `${preview.exactMatch.domain} is still available right now.`
  }

  if (preview.bestAvailable) {
    return `Best open option: ${preview.bestAvailable.domain}.`
  }

  return 'The live registries did not return a clean answer for this query.'
}

function previewTone(query: string): DomainResult['status'] {
  const preview = previewFor(query)
  if (!preview) return 'unknown'
  if (preview.exactMatch?.status) return preview.exactMatch.status
  if (preview.availableCount > 0) return 'available'
  return 'unknown'
}

function previewStatusColor(query: string) {
  return statusColor(previewTone(query))
}

function previewResults(query: string) {
  return previewFor(query)?.results ?? []
}

function hasPreviewResults(query: string) {
  return previewResults(query).length > 0
}
</script>

<template>
  <div class="space-y-4">
    <UAlert
      v-if="mutationError"
      color="error"
      variant="subtle"
      title="Saved searches are unavailable"
      :description="mutationError"
    />

    <UCard v-if="isLoading" class="border-default bg-default/88 shadow-card">
      <p class="text-sm text-muted">Loading your saved searches.</p>
    </UCard>

    <UCard
      v-else-if="savedSearches.length === 0"
      class="border-default bg-default/88 shadow-card"
      data-testid="saved-searches-empty"
    >
      <div class="space-y-3">
        <p class="font-display text-2xl font-semibold">Nothing saved yet.</p>
        <p class="max-w-2xl text-sm leading-6 text-muted">
          Save a query from the public search flow and it will show up here as a quick-return list.
        </p>
        <UButton to="/" color="primary" variant="soft" icon="i-lucide-arrow-up-right">
          Open domain search
        </UButton>
      </div>
    </UCard>

    <ul v-else class="grid gap-3">
      <li
        v-for="savedSearch in savedSearches"
        :key="savedSearch.id"
        data-testid="saved-search-item"
      >
        <UCard class="border-default bg-default/88 shadow-card">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-display text-2xl font-semibold tracking-tight text-default">
                  {{ savedSearch.normalizedQuery }}
                </p>
                <UBadge color="primary" variant="soft" class="rounded-full">
                  {{ queryKindLabel(savedSearch.normalizedQuery) }}
                </UBadge>
              </div>

              <div class="flex flex-wrap items-center gap-3 text-sm text-dimmed">
                <span>
                  Saved
                  <NuxtTime
                    :datetime="savedSearch.updatedAt"
                    year="numeric"
                    month="short"
                    day="numeric"
                    hour="numeric"
                    minute="2-digit"
                  />
                </span>
              </div>

              <div class="space-y-3" data-testid="saved-search-preview">
                <div class="flex flex-wrap items-center gap-2">
                  <UBadge
                    :color="previewStatusColor(savedSearch.normalizedQuery)"
                    variant="soft"
                    class="rounded-full"
                  >
                    {{ previewHeadline(savedSearch.normalizedQuery) }}
                  </UBadge>
                  <span class="text-sm text-muted">
                    {{ previewDescription(savedSearch.normalizedQuery) }}
                  </span>
                </div>

                <div
                  v-if="hasPreviewResults(savedSearch.normalizedQuery)"
                  class="flex flex-wrap gap-2"
                >
                  <UBadge
                    v-for="result in previewResults(savedSearch.normalizedQuery)"
                    :key="result.domain"
                    :color="statusColor(result.status)"
                    variant="outline"
                    class="rounded-full"
                  >
                    {{ result.domain }} · {{ statusLabel(result.status) }}
                  </UBadge>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UButton
                :to="searchHref(savedSearch.normalizedQuery)"
                color="primary"
                variant="soft"
                icon="i-lucide-arrow-up-right"
              >
                Reopen
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                :loading="isRemoving(savedSearch.id)"
                data-testid="saved-search-remove"
                @click="emit('remove', savedSearch)"
              >
                Remove
              </UButton>
            </div>
          </div>
        </UCard>
      </li>
    </ul>
  </div>
</template>
