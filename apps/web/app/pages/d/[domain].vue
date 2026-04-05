<script setup lang="ts">
import { buildCanonicalSearchPath, readDomainRouteQuery } from '#shared/domainSearch'

const route = useRoute()
const config = useRuntimeConfig()

const query = computed(() =>
  readDomainRouteQuery({
    label: route.params.label,
    domain: route.params.domain,
    q: route.query.q,
  }),
)
const canonicalPath = computed(() => buildCanonicalSearchPath(query.value))
const canonicalUrl = computed(() => new URL(canonicalPath.value, config.public.appUrl).toString())

// Server-only 301 for legacy ?q= or non-canonical path
if (import.meta.server) {
  const hasLegacyQuery = typeof route.query.q === 'string' || Array.isArray(route.query.q)
  const needsRedirect = route.path !== canonicalPath.value || hasLegacyQuery
  if (needsRedirect) {
    await navigateTo(canonicalPath.value, { redirectCode: 301 })
  }
}

const title = computed(() => `${query.value} domain status`)
const description = computed(
  () => `Live registration status for ${query.value}, plus the fastest common alternative endings.`,
)

definePageMeta({
  layout: 'blank',
})

useSeo({
  title: title.value,
  description: description.value,
  canonicalUrl: canonicalUrl.value,
  robots: 'noindex, nofollow',
  ogImage: {
    title: title.value,
    description: description.value,
  },
})

useWebPageSchema({
  name: title.value,
  description: description.value,
})
</script>

<template>
  <DomainSearchShell />
</template>
