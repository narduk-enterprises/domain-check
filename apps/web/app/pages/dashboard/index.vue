<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

const config = useRuntimeConfig()
const { user, logout } = useAuth()

useSeo({
  title: 'Dashboard',
  description: 'Your authenticated dashboard for this app.',
})

useWebPageSchema({
  name: 'Dashboard',
  description: 'Your authenticated dashboard for this app.',
})

async function signOut() {
  await logout()
  await navigateTo(config.public.authLoginPath, { replace: true })
}
</script>

<template>
  <UPage>
    <UPageHero
      title="Welcome back"
      :description="user?.email ? `Signed in as ${user.email}` : 'Your session is active.'"
    >
      <template #links>
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
      title="Protected route confirmed"
      description="This app keeps its own first-party session while sharing identity with the fleet auth backend."
    >
      <UCard data-testid="auth-dashboard" class="max-w-2xl">
        <div class="space-y-4">
          <div>
            <p class="text-sm text-muted">Current user</p>
            <p class="font-medium" data-testid="auth-user-email">
              {{ user?.email || 'Unknown user' }}
            </p>
          </div>

          <div>
            <p class="text-sm text-muted">Display name</p>
            <p class="font-medium" data-testid="auth-user-name">{{ user?.name || 'User' }}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UBadge color="neutral" variant="subtle">
              {{ user?.authBackend === 'supabase' ? 'Shared auth enabled' : 'Local auth fallback' }}
            </UBadge>
            <UBadge
              v-for="provider in user?.authProviders || []"
              :key="provider"
              color="primary"
              variant="soft"
            >
              {{ provider }}
            </UBadge>
            <UBadge v-if="user?.aal" color="success" variant="subtle">
              {{ user.aal.toUpperCase() }}
            </UBadge>
          </div>

          <UAlert
            v-if="user?.needsPasswordSetup"
            color="warning"
            variant="subtle"
            title="Set an email password"
            description="This account was created with Apple. Add a password if you want email login as a fallback."
          >
            <template #actions>
              <UButton :to="config.public.authResetPath" color="warning" variant="soft" size="sm">
                Set password
              </UButton>
            </template>
          </UAlert>
        </div>
      </UCard>
    </UPageSection>
  </UPage>
</template>
