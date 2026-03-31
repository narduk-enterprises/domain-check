<script setup lang="ts">
import type { SavedSearchRecord } from '#shared/savedSearches'

definePageMeta({ middleware: ['auth'] })

const config = useRuntimeConfig()
const { user, logout } = useAuth()
const savedSearches = useSavedSearches()

useSeo({
  title: 'Saved Searches',
  description: 'Reopen the domain queries you decided were worth keeping.',
})

useWebPageSchema({
  name: 'Saved Searches',
  description: 'Reopen the domain queries you decided were worth keeping.',
})

async function signOut() {
  await logout()
  await navigateTo(config.public.authLoginPath, { replace: true })
}

async function removeSavedSearch(savedSearch: SavedSearchRecord) {
  try {
    await savedSearches.removeSavedSearch(savedSearch)
  } catch {
    // The dashboard renders the mutation error directly.
  }
}
</script>

<template>
  <section class="min-h-screen bg-default text-default">
    <div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <!-- Toolbar -->
      <div class="flex items-center justify-between gap-4 border-b border-default pb-4">
        <div>
          <h1 class="text-lg font-semibold text-highlighted">Saved searches</h1>
          <p class="mt-0.5 text-xs text-muted">
            {{ user?.email ? `${user.email}` : 'Your session is active.' }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <UButton to="/" color="primary" variant="soft" size="sm" icon="i-lucide-search">
            New search
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-log-out"
            data-testid="auth-signout"
            @click="signOut"
          >
            Sign out
          </UButton>
        </div>
      </div>

      <!-- Content -->
      <div class="py-6">
        <SavedSearchesSavedSearchDashboard
          :is-loading="savedSearches.isLoading.value"
          :mutation-error="savedSearches.mutationError.value"
          :removing-ids="savedSearches.removingIds.value"
          :saved-searches="savedSearches.savedSearches.value"
          @remove="removeSavedSearch"
        />
      </div>
    </div>
  </section>
</template>
