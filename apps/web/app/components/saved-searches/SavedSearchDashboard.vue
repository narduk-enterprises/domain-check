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
  return getDomainQueryKind(query) === 'exact' ? 'Exact' : 'Keyword'
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
    return livePreviews.isLoading.value ? 'Refreshing' : 'No preview'

  if (preview.exactMatch?.status === 'taken') return 'Taken'
  if (preview.exactMatch?.status === 'available') return 'Open'
  if (preview.availableCount > 0) return `${preview.availableCount} open`
  if (preview.exactMatch?.status === 'unknown') return 'Resolving'
  return 'No status'
}

function previewTone(query: string): DomainResult['status'] {
  const preview = previewFor(query)
  if (!preview) return 'unknown'
  if (preview.exactMatch?.status) return preview.exactMatch.status
  if (preview.availableCount > 0) return 'available'
  return 'unknown'
}

function previewResults(query: string) {
  return previewFor(query)?.results ?? []
}

function previewColor(query: string) {
  return statusColor(previewTone(query))
}
</script>

<template>
  <div class="space-y-3">
    <!-- Mutation error -->
    <div
      v-if="mutationError"
      class="flex items-center gap-2 rounded-md border border-error/25 bg-error/5 px-3 py-2 text-xs text-error"
    >
      <UIcon name="i-lucide-alert-circle" class="size-3.5 shrink-0" />
      {{ mutationError }}
    </div>

    <!-- Loading -->
    <div
      v-if="isLoading"
      class="flex items-center gap-2 rounded-lg border border-default bg-muted/50 px-4 py-4 text-sm text-muted"
    >
      <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
      Loading saved searches…
    </div>

    <!-- Empty -->
    <div
      v-else-if="savedSearches.length === 0"
      class="rounded-lg border border-default bg-muted/50 px-4 py-8 text-center"
      data-testid="saved-searches-empty"
    >
      <p class="text-sm text-muted">Nothing saved yet.</p>
      <p class="mt-1 text-xs text-dimmed">
        Save a query from search and it will appear here.
      </p>
      <UButton to="/" color="primary" variant="soft" size="sm" class="mt-3" icon="i-lucide-search">
        Open search
      </UButton>
    </div>

    <!-- Populated list -->
    <div v-else class="overflow-hidden rounded-lg border border-default">
      <div
        v-for="savedSearch in savedSearches"
        :key="savedSearch.id"
        class="flex items-center gap-4 border-b border-default px-3 py-3 last:border-b-0 hover:bg-accented"
        data-testid="saved-search-item"
      >
        <!-- Query info -->
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink
              :to="searchHref(savedSearch.normalizedQuery)"
              class="font-mono text-sm font-medium text-highlighted no-underline hover:text-primary"
            >
              {{ savedSearch.normalizedQuery }}
            </NuxtLink>
            <UBadge color="neutral" variant="outline" size="sm" class="rounded-full">
              {{ queryKindLabel(savedSearch.normalizedQuery) }}
            </UBadge>
            <UBadge
              :color="previewColor(savedSearch.normalizedQuery)"
              variant="soft"
              size="sm"
              class="rounded-full"
              data-testid="saved-search-preview"
            >
              {{ previewHeadline(savedSearch.normalizedQuery) }}
            </UBadge>
          </div>

          <div class="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-dimmed">
            <span>
              Saved
              <NuxtTime
                :datetime="savedSearch.updatedAt"
                year="numeric"
                month="short"
                day="numeric"
              />
            </span>
            <template v-if="previewResults(savedSearch.normalizedQuery).length > 0">
              <span
                v-for="result in previewResults(savedSearch.normalizedQuery)"
                :key="result.domain"
                class="font-mono"
                :class="{
                  'text-success': result.status === 'available',
                  'text-muted': result.status === 'taken',
                  'text-warning': result.status === 'unknown',
                }"
              >
                {{ result.domain }}
              </span>
            </template>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex shrink-0 items-center gap-1.5">
          <UButton
            :to="searchHref(savedSearch.normalizedQuery)"
            color="primary"
            variant="soft"
            size="xs"
            icon="i-lucide-arrow-up-right"
          >
            Reopen
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            icon="i-lucide-trash-2"
            :loading="isRemoving(savedSearch.id)"
            data-testid="saved-search-remove"
            @click="emit('remove', savedSearch)"
          >
            Remove
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
