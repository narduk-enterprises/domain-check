<script setup lang="ts">
import { SAMPLE_DOMAIN_QUERIES } from '../../../shared/domainSearch'

const model = defineModel<string>({ required: true })

const emit = defineEmits<{
  submit: []
}>()

const applySuggestion = (value: string) => {
  model.value = value
  emit('submit')
}
</script>

<template>
  <div class="space-y-4" role="search" aria-label="Domain search">
    <div class="flex flex-col gap-3 sm:flex-row">
      <UInput
        v-model="model"
        class="w-full"
        size="xl"
        icon="i-lucide-search"
        placeholder="Try atlas or atlas.com"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        inputmode="url"
        autofocus
        @keyup.enter="emit('submit')"
      />

      <UButton
        size="xl"
        icon="i-lucide-arrow-right"
        class="justify-center sm:min-w-36"
        @click="emit('submit')"
      >
        Check
      </UButton>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs uppercase tracking-[0.24em] text-dimmed">Try</span>
      <UButton
        v-for="sample in SAMPLE_DOMAIN_QUERIES"
        :key="sample"
        color="neutral"
        variant="soft"
        size="sm"
        class="rounded-full"
        @click="applySuggestion(sample)"
      >
        {{ sample }}
      </UButton>
    </div>
  </div>
</template>
