<script setup lang="ts">
import type { DomainResult } from '#shared/domainSearch'

const props = defineProps<{
  status: DomainResult['status']
  size?: 'sm' | 'md'
}>()

const badgeColor = computed(() => {
  switch (props.status) {
    case 'available':
      return 'success'
    case 'taken':
      return 'neutral'
    default:
      return 'warning'
  }
})

const statusLabel = computed(() => {
  switch (props.status) {
    case 'available':
      return 'Available'
    case 'taken':
      return 'Taken'
    default:
      return 'Unknown'
  }
})
</script>

<template>
  <UBadge
    :color="badgeColor"
    variant="soft"
    :size="size ?? 'sm'"
    class="rounded-full font-mono text-xs"
  >
    {{ statusLabel }}
  </UBadge>
</template>
