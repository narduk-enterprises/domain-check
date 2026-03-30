import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const appRoot = fileURLToPath(new URL('.', import.meta.url))
const layerRoot = resolve(appRoot, '../../layers/narduk-nuxt-layer')

export default defineConfig({
  resolve: {
    alias: {
      '#server': resolve(appRoot, 'server'),
      '#shared': resolve(appRoot, 'shared'),
      '#layer': layerRoot,
      '#layer/orm-tables': resolve(layerRoot, 'server/database/schema.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
