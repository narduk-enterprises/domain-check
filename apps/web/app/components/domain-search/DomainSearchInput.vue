<script setup lang="ts">
import { SAMPLE_DOMAIN_QUERIES } from '#shared/domainSearch'

const model = defineModel<string>({ required: true })

const props = defineProps<{
  mode?: 'search' | 'scan'
}>()

const emit = defineEmits<{
  submit: []
}>()

const inputRef = ref<{ $el?: HTMLElement } | null>(null)

const applySuggestion = (value: string) => {
  model.value = value
  emit('submit')
}

function handleKeydown(event: KeyboardEvent) {
  if (props.mode === 'scan' && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    emit('submit')
  } else if (props.mode !== 'scan' && event.key === 'Enter') {
    emit('submit')
  }
}

// Cmd/Ctrl+K focuses the input
function handleGlobalShortcut(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    const el = inputRef.value?.$el
    const input = el?.querySelector?.('input') ?? el?.querySelector?.('textarea')
    input?.focus()
  }
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('keydown', handleGlobalShortcut)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('keydown', handleGlobalShortcut)
  }
})
</script>

<template>
  <div class="space-y-3" role="search" aria-label="Domain search">
    <div class="flex gap-2">
      <UTextarea
        v-if="mode === 'scan'"
        ref="inputRef"
        v-model="model"
        class="w-full font-mono text-sm"
        :rows="4"
        placeholder="One keyword per line, or comma-separated…"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        autofocus
        @keydown="handleKeydown"
      />

      <UInput
        v-else
        ref="inputRef"
        v-model="model"
        class="w-full"
        size="lg"
        icon="i-lucide-search"
        placeholder="Try atlas or atlas.com"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        inputmode="url"
        autofocus
        @keydown="handleKeydown"
      />

      <UButton
        :size="mode === 'scan' ? 'md' : 'lg'"
        icon="i-lucide-arrow-right"
        class="shrink-0"
        @click="emit('submit')"
      >
        {{ mode === 'scan' ? 'Scan' : 'Check' }}
      </UButton>
    </div>

    <div v-if="mode !== 'scan'" class="flex flex-wrap items-center gap-1.5">
      <span class="text-[10px] uppercase tracking-[0.2em] text-dimmed">Try</span>
      <UButton
        v-for="sample in SAMPLE_DOMAIN_QUERIES"
        :key="sample"
        color="neutral"
        variant="soft"
        size="xs"
        class="rounded-full"
        @click="applySuggestion(sample)"
      >
        {{ sample }}
      </UButton>
    </div>

    <p v-if="mode === 'scan'" class="text-[10px] text-dimmed">
      <UKbd value="meta" size="sm" /> + <UKbd value="Enter" size="sm" /> to run scan
    </p>
  </div>
</template>
