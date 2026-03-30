<script setup lang="ts">
const appName = 'Quick Domain Check'
const appDescription =
  'Type a name and get a fast, stripped-down live check across the TLDs people actually reach for.'

await useDomainSearchPageRoute()

definePageMeta({
  layout: 'blank',
})

useSeo({
  title: appName,
  description: appDescription,
  ogImage: {
    title: appName,
    description: appDescription,
  },
})

useWebPageSchema({
  name: appName,
  description: appDescription,
})
</script>

<template>
  <DomainSearchExperience />
</template>
