<script setup lang="ts">
const savedSearches = useSavedSearches()
const route = useRoute()

const loginHref = computed(() => ({
  path: '/login',
  query: { next: route.fullPath },
}))

const { colorModeIcon, cycleColorMode } = useColorModeToggle()
</script>

<template>
  <div class="flex items-center justify-between gap-4 py-3">
    <NuxtLink to="/" class="flex items-center gap-2.5 no-underline">
      <div
        class="flex size-8 items-center justify-center rounded-lg bg-primary text-inverted"
      >
        <UIcon name="i-lucide-scan-search" class="size-4" />
      </div>
      <span class="text-sm font-semibold text-highlighted">Quick Domain Check</span>
    </NuxtLink>

    <div class="flex items-center gap-1">
      <UKbd value="meta" size="sm" class="hidden sm:inline-flex" />
      <UKbd value="K" size="sm" class="hidden sm:inline-flex" />

      <UButton
        :icon="colorModeIcon"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Toggle color mode"
        @click="cycleColorMode"
      />

      <UButton
        v-if="savedSearches.isAuthenticated.value"
        to="/dashboard"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-bookmark"
      >
        Saved
      </UButton>
      <UButton
        v-else
        :to="loginHref"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-log-in"
      >
        Sign in
      </UButton>
    </div>
  </div>
</template>
