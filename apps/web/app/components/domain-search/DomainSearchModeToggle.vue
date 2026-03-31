<script setup lang="ts">
const model = defineModel<'search' | 'scan'>({ default: 'search' })
</script>

<template>
  <div class="inline-flex items-center rounded-lg border border-default bg-muted p-0.5">
    <UButton
      size="xs"
      :color="model === 'search' ? 'primary' : 'neutral'"
      :variant="model === 'search' ? 'soft' : 'ghost'"
      @click="model = 'search'"
    >
      Search
    </UButton>
    <UButton
      size="xs"
      :color="model === 'scan' ? 'primary' : 'neutral'"
      :variant="model === 'scan' ? 'soft' : 'ghost'"
      @click="model = 'scan'"
    >
      Scan
    </UButton>
  </div>
</template>
