<script setup lang="ts">
import type { DomainResult } from '#shared/domainSearch'

defineProps<{
  result: DomainResult
}>()

const emit = defineEmits<{
  registrarClick: [domain: string, placement: 'result']
}>()

function helperText(result: DomainResult) {
  switch (result.reason) {
    case 'rdap-missing':
      return 'No live RDAP record found.'
    case 'rdap-found':
      return 'Live RDAP record exists.'
    case 'timeout':
      return 'Registry timed out — retry.'
    case 'rate-limited':
      return 'Rate-limited — retry shortly.'
    default:
      return 'Lookup inconclusive.'
  }
}
</script>

<template>
  <div
    class="group flex items-center gap-4 border-b border-default px-3 py-2.5 transition-colors duration-100 last:border-b-0 hover:bg-accented"
  >
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-mono text-sm font-medium text-highlighted">
          {{ result.domain }}
        </span>
        <DomainSearchStatusBadge :status="result.status" />
        <UBadge
          v-if="result.isExactMatch"
          color="primary"
          variant="outline"
          size="sm"
          class="rounded-full"
        >
          Exact
        </UBadge>
      </div>

      <div class="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-dimmed">
        <span>{{ helperText(result) }}</span>
        <span v-if="result.registrar">{{ result.registrar }}</span>
        <span v-if="result.expiresAt">
          Exp
          <NuxtTime :datetime="result.expiresAt" year="numeric" month="short" day="numeric" />
        </span>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-1.5">
      <UButton
        v-if="result.purchaseUrl"
        :to="result.purchaseUrl"
        external
        target="_blank"
        color="success"
        variant="soft"
        size="xs"
        icon="i-lucide-external-link"
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
        size="xs"
        icon="i-lucide-arrow-up-right"
      >
        Inspect
      </UButton>
    </div>
  </div>
</template>
