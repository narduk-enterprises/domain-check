<script setup lang="ts">
const { canonicalUrl, query } = await useDomainSearchPageRoute()

const title = computed(() => `${query.value} domain status`)
const description = computed(
  () => `Live registration status for ${query.value}, plus the fastest common alternative endings.`,
)

definePageMeta({
  layout: 'blank',
  key: (route) => route.fullPath,
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
  <DomainSearchExperience />
</template>
