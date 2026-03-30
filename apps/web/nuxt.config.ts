import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { getProvisionDisplayName, readProvisionMetadata } from '../../tools/provision-metadata'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '../..')
const provision = readProvisionMetadata(repoRoot)
const localNuxtPort = Number(process.env.NUXT_PORT || 3000)
const localAppUrl = `http://localhost:${Number.isFinite(localNuxtPort) ? localNuxtPort : 3000}`
const defaultAppName = getProvisionDisplayName(provision, process.env.APP_NAME || 'Nuxt 4 Demo')
const defaultAppDescription =
  provision.description ||
  'A production-ready demo template showcasing Nuxt 4, Nuxt UI 4, Tailwind CSS 4, and Cloudflare Workers with D1 database.'
const siteUrl = process.env.SITE_URL || provision.url || ''
const configuredAuthBackend = process.env.AUTH_BACKEND
const authBackend =
  configuredAuthBackend === 'supabase' || configuredAuthBackend === 'local'
    ? configuredAuthBackend
    : process.env.AUTH_AUTHORITY_URL && process.env.SUPABASE_AUTH_ANON_KEY
      ? 'supabase'
      : 'local'
const authAuthorityUrl = process.env.AUTH_AUTHORITY_URL || ''

function parseAuthProviders(value: string | undefined) {
  return (value || 'apple,email')
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter((provider, index, providers) => provider && providers.indexOf(provider) === index)
}

const authProviders =
  authBackend === 'supabase' ? parseAuthProviders(process.env.AUTH_PROVIDERS) : ['email']

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Extend the published Narduk Nuxt Layer
  extends: ['@narduk-enterprises/narduk-nuxt-template-layer'],

  // nitro-cloudflare-dev proxies D1 bindings to the local dev server
  modules: ['nitro-cloudflare-dev'],

  nitro: {
    cloudflareDev: {
      configPath: resolve(__dirname, 'wrangler.json'),
      ...(process.env.NUXT_WRANGLER_ENVIRONMENT
        ? { environment: process.env.NUXT_WRANGLER_ENVIRONMENT }
        : {}),
    },
  },

  future: {
    compatibilityVersion: 4,
  },

  devServer: {
    port: Number.isFinite(localNuxtPort) ? localNuxtPort : 3000,
  },

  runtimeConfig: {
    posthogOwnerDistinctId: process.env.POSTHOG_OWNER_DISTINCT_ID || '',
    authBackend,
    authAuthorityUrl,
    authAnonKey: process.env.SUPABASE_AUTH_ANON_KEY || '',
    authServiceRoleKey: process.env.SUPABASE_AUTH_SERVICE_ROLE_KEY || '',
    authStorageKey: process.env.AUTH_STORAGE_KEY || 'web-auth',
    domainPurchaseUrlTemplate:
      process.env.DOMAIN_PURCHASE_URL_TEMPLATE ||
      'https://www.namecheap.com/domains/registration/results/?domain={domain}',
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '',
    // Server-only (admin API routes)
    googleServiceAccountKey: process.env.GSC_SERVICE_ACCOUNT_JSON || '',
    posthogApiKey: process.env.POSTHOG_PERSONAL_API_KEY || '',
    gaPropertyId: process.env.GA_PROPERTY_ID || '',
    posthogProjectId: process.env.POSTHOG_PROJECT_ID || '',
    public: {
      appUrl: process.env.SITE_URL || provision.url || localAppUrl,
      appName: defaultAppName,
      authBackend,
      authAuthorityUrl,
      authLoginPath: '/login',
      authRegisterPath: '/register',
      authCallbackPath: '/auth/callback',
      authConfirmPath: '/auth/confirm',
      authResetPath: '/reset-password',
      authLogoutPath: '/logout',
      authRedirectPath: '/dashboard/',
      authProviders,
      authPublicSignup: process.env.AUTH_PUBLIC_SIGNUP !== 'false',
      authRequireMfa: process.env.AUTH_REQUIRE_MFA === 'true',
      authTurnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
      // Analytics (client-side tracking)
      posthogPublicKey: process.env.POSTHOG_PUBLIC_KEY || '',
      posthogHost: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      gaMeasurementId: process.env.GA_MEASUREMENT_ID || '',
      // IndexNow
      indexNowKey: process.env.INDEXNOW_KEY || '',
    },
  },

  site: {
    ...(siteUrl ? { url: siteUrl } : {}),
    name: defaultAppName,
    description: defaultAppDescription,
    defaultLocale: 'en',
  },

  schemaOrg: {
    identity: {
      type: 'Organization',
      name: defaultAppName,
      ...(siteUrl ? { url: siteUrl } : {}),
      logo: '/favicon.svg',
    },
  },

  image: {
    cloudflare: {
      ...(siteUrl ? { baseURL: siteUrl } : {}),
    },
  },
})
