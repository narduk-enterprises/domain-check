<script setup lang="ts">
const props = defineProps<{
  hasQuery: boolean
  isAuthenticated: boolean
  isSaved: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: []
}>()

const config = useRuntimeConfig()
const route = useRoute()
const authLink = computed(() => ({
  path: config.public.authLoginPath,
  query: { next: route.fullPath },
}))

const buttonLabel = computed(() => {
  if (!props.hasQuery) return 'Save search'
  if (props.isSaving) return 'Saving'
  if (props.isSaved) return 'Saved'
  if (props.isAuthenticated) return 'Save search'
  return 'Sign in to save'
})

async function handleClick() {
  if (!props.hasQuery || props.isSaving || props.isSaved) return

  if (!props.isAuthenticated) return

  emit('save')
}
</script>

<template>
  <UButton
    :to="!isAuthenticated && hasQuery ? authLink : undefined"
    color="neutral"
    variant="soft"
    icon="i-lucide-bookmark"
    :disabled="!hasQuery || isSaved"
    :loading="isSaving"
    data-testid="domain-save-search"
    @click="handleClick"
  >
    {{ buttonLabel }}
  </UButton>
</template>
