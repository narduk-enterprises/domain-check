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
  <UPage>
    <UPageHero
      title="Saved searches"
      :description="
        user?.email
          ? `Signed in as ${user.email}. Keep the domain ideas worth returning to.`
          : 'Your session is active.'
      "
    >
      <template #links>
        <UButton to="/" color="primary" variant="soft" icon="i-lucide-search"> New search </UButton>
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-log-out"
          data-testid="auth-signout"
          @click="signOut"
        >
          Sign out
        </UButton>
      </template>
    </UPageHero>

    <UPageSection
      title="Your shortlist"
      description="Saved queries stay lightweight: one record per normalized query, always reopened with fresh live results."
    >
      <SavedSearchesSavedSearchDashboard
        :is-loading="savedSearches.isLoading.value"
        :mutation-error="savedSearches.mutationError.value"
        :removing-ids="savedSearches.removingIds.value"
        :saved-searches="savedSearches.savedSearches.value"
        @remove="removeSavedSearch"
      />
    </UPageSection>
  </UPage>
</template>
