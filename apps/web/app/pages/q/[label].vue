<script setup lang="ts">
const { canonicalUrl, query } = await useDomainSearchPageRoute()

const title = computed(() => `${query.value} domain check`)
const description = computed(
  () =>
    `Live domain availability for ${query.value} across the fastest common endings founders usually check first.`,
)

definePageMeta({
  layout: 'blank',
  key: (route) => route.fullPath,
})

useSeo({
  title: title.value,
  description: description.value,
  canonicalUrl: canonicalUrl.value,
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
