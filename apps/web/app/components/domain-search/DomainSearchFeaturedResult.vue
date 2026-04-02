<script setup lang="ts">
import type { DomainResult } from '#shared/domainSearch'

defineProps<{
  result: DomainResult
}>()

const emit = defineEmits<{
  registrarClick: [domain: string, placement: 'featured']
}>()
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-lg border border-success/25 bg-success/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="min-w-0">
      <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-success">
        Best open option
      </p>
      <p class="mt-1 font-mono text-lg font-semibold text-highlighted">
        {{ result.domain }}
      </p>
      <p class="mt-0.5 text-xs text-muted">No live RDAP registration record found.</p>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <UButton
        v-if="result.purchaseUrl"
        :to="result.purchaseUrl"
        external
        target="_blank"
        color="success"
        size="sm"
        icon="i-lucide-external-link"
        @click="emit('registrarClick', result.domain, 'featured')"
      >
        Register
      </UButton>

      <UButton
        :to="result.rdapUrl"
        external
        target="_blank"
        color="success"
        variant="outline"
        size="sm"
        icon="i-lucide-arrow-up-right"
      >
        Inspect
      </UButton>
    </div>
  </div>
</template>
