<script setup lang="ts">
const props = defineProps<{
  hasQuery: boolean
  isAuthenticated: boolean
  isSaved: boolean
  isSaving: boolean
  canonicalUrl: string | null
}>()

const emit = defineEmits<{
  save: []
  clear: []
}>()

const toast = useToast()

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    toast.add({ title: 'Link copied', color: 'success', duration: 2000 })
  } catch {
    toast.add({ title: 'Copy failed', color: 'error', duration: 2000 })
  }
}

const config = useRuntimeConfig()
const route = useRoute()
const authLink = computed(() => ({
  path: config.public.authLoginPath,
  query: { next: route.fullPath },
}))

const saveLabel = computed(() => {
  if (!props.hasQuery) return 'Save'
  if (props.isSaving) return 'Saving'
  if (props.isSaved) return 'Saved'
  if (props.isAuthenticated) return 'Save'
  return 'Sign in to save'
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UButton
      v-if="isAuthenticated && hasQuery"
      color="neutral"
      variant="soft"
      size="xs"
      icon="i-lucide-bookmark"
      :disabled="!hasQuery || isSaved"
      :loading="isSaving"
      data-testid="domain-save-search"
      @click="emit('save')"
    >
      {{ saveLabel }}
    </UButton>

    <UButton
      v-else-if="hasQuery"
      :to="authLink"
      color="neutral"
      variant="soft"
      size="xs"
      icon="i-lucide-bookmark"
    >
      Sign in to save
    </UButton>

    <UButton
      v-if="hasQuery && canonicalUrl"
      color="neutral"
      variant="ghost"
      size="xs"
      icon="i-lucide-link"
      @click="copyLink(canonicalUrl)"
    >
      Copy link
    </UButton>

    <UButton
      v-if="hasQuery"
      color="neutral"
      variant="ghost"
      size="xs"
      icon="i-lucide-x"
      @click="emit('clear')"
    >
      Clear
    </UButton>
  </div>
</template>
