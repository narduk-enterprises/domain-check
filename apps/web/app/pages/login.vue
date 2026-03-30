<script setup lang="ts">
useSeo({
  title: 'Sign In',
  description: 'Sign in with Apple or email to access your dashboard.',
})

useWebPageSchema({
  name: 'Sign In',
  description: 'Sign in with Apple or email to access your dashboard.',
})

definePageMeta({ middleware: ['guest'] })
</script>

<template>
  <div class="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
    <AuthLoginCard />
  </div>
</template>
