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
  registrarClick: [domain: string, placement: 'result']
}>()

const availableCount = computed(
  () => props.results.filter((result) => result.status === 'available').length,
)

const badgeColor = (status: DomainResult['status']) => {
  switch (status) {
    case 'available':
      return 'success'
    case 'taken':
      return 'neutral'
    default:
      return 'warning'
  }
}

const statusLabel = (status: DomainResult['status']) => {
  switch (status) {
    case 'available':
      return 'Available'
    case 'taken':
      return 'Taken'
    default:
      return 'Unknown'
  }
}

const resultCardClass = (status: DomainResult['status']) => {
  switch (status) {
    case 'available':
      return 'border-success/30 bg-success/10'
    case 'taken':
      return 'border-default bg-default/90'
    default:
      return 'border-warning/30 bg-warning/10'
  }
}

const helperText = (result: DomainResult) => {
  switch (result.reason) {
    case 'rdap-missing':
      return 'No live RDAP registration record was found for this name.'
    case 'rdap-found':
      return 'A live RDAP registration record was found for this name.'
    case 'timeout':
      return 'The registry was slow to respond. Retry this search for a cleaner answer.'
    case 'rate-limited':
      return 'The upstream registry rate-limited this request. Retry in a moment.'
    default:
      return 'The registry lookup did not resolve cleanly.'
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2 text-sm text-muted">
      <UBadge color="primary" variant="soft" class="rounded-full">
        {{ results.length || 0 }} live checks
      </UBadge>

      <UBadge v-if="availableCount > 0" color="success" variant="soft" class="rounded-full">
        {{ availableCount }} open
      </UBadge>

      <UBadge v-if="isRefreshing" color="neutral" variant="soft" class="rounded-full">
        Refreshing
      </UBadge>

      <span v-if="hasQuery">Showing the fastest common endings for {{ query }}.</span>
    </div>

    <UCard v-if="!hasQuery" class="border-default bg-default/88 shadow-card">
      <div class="space-y-3">
        <p class="font-display text-2xl font-semibold">
          Type a word and stop thinking about the rest.
        </p>
        <p class="max-w-xl text-sm leading-6 text-muted">
          This checks the exact domain first when you paste one, then runs through the common
          endings people usually care about.
        </p>
      </div>
    </UCard>

    <UCard v-else-if="results.length === 0" class="border-default bg-default/88 shadow-card">
      <div class="space-y-2">
        <p class="font-medium text-default">No results yet.</p>
        <p class="text-sm text-muted">
          Try another query or submit again to rerun the live lookup.
        </p>
      </div>
    </UCard>

    <UCard v-if="errorMessage" class="border-warning/30 bg-warning/10 shadow-none">
      <p class="text-sm text-warning">
        {{ errorMessage }}
      </p>
    </UCard>

    <ul v-if="hasQuery && results.length > 0" class="grid gap-3">
      <li v-for="result in results" :key="result.domain">
        <UCard :class="['shadow-none', resultCardClass(result.status)]">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="space-y-3">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-display text-2xl font-semibold tracking-tight text-default">
                  {{ result.domain }}
                </p>
                <UBadge :color="badgeColor(result.status)" variant="soft" class="rounded-full">
                  {{ statusLabel(result.status) }}
                </UBadge>
                <UBadge
                  v-if="result.isExactMatch"
                  color="primary"
                  variant="outline"
                  class="rounded-full"
                >
                  Exact
                </UBadge>
              </div>

              <p class="text-sm leading-6 text-muted">
                {{ helperText(result) }}
              </p>

              <div class="flex flex-wrap items-center gap-3 text-sm text-dimmed">
                <span v-if="result.registrar">Registrar {{ result.registrar }}</span>
                <span v-if="result.expiresAt">
                  Expires
                  <NuxtTime
                    :datetime="result.expiresAt"
                    year="numeric"
                    month="short"
                    day="numeric"
                  />
                </span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UButton
                v-if="result.purchaseUrl"
                :to="result.purchaseUrl"
                external
                target="_blank"
                color="primary"
                variant="soft"
                icon="i-lucide-shopping-cart"
                @click="emit('registrarClick', result.domain, 'result')"
              >
                Register
              </UButton>

              <UButton
                :to="result.rdapUrl"
                external
                target="_blank"
                color="neutral"
                variant="ghost"
                icon="i-lucide-arrow-up-right"
              >
                Inspect
              </UButton>
            </div>
          </div>
        </UCard>
      </li>
    </ul>
  </div>
</template>
