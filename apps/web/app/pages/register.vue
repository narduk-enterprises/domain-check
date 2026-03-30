<script setup lang="ts">
useSeo({
  title: 'Create an Account',
  description: 'Use Apple first, or create an account with email and password.',
})

useWebPageSchema({
  name: 'Create an Account',
  description: 'Use Apple first, or create an account with email and password.',
})

definePageMeta({ middleware: ['guest'] })
</script>

<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
    <AuthRegisterCard />
  </div>
</template>
