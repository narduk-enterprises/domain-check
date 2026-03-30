# Shared Layer Auth Prompt

Use this prompt when the shared template maintainer is ready to absorb the
fleet auth contract into `layers/narduk-nuxt-layer/` so downstream apps do not
need to keep app-level auth overrides forever.

## Prompt

Implement a shared Supabase-backed auth provider in the template layer without
breaking existing local auth flows for downstream apps that have not opted in.

Requirements:

1. Keep the current layer-facing auth contract stable for app code:
   - `server/utils/auth.ts`
   - `app/composables/useAuth.ts`
   - route middleware behavior

2. Add a runtime-config-driven backend switch:
   - `local` remains the default fallback
   - `supabase` becomes active when the auth authority URL and anon key are
     configured

3. Implement these shared server endpoints in the layer:
   - `POST /api/auth/login`
   - `POST /api/auth/register`
   - `POST /api/auth/oauth/start`
   - `POST /api/auth/session/exchange`
   - `POST /api/auth/logout`
   - `POST /api/auth/mfa/enroll`
   - `POST /api/auth/mfa/verify`
   - `POST /api/auth/password/reset`

4. Preserve the v1 session model:
   - downstream apps keep `nuxt-auth-utils` first-party sessions
   - apps do not persist Supabase refresh tokens in the browser
   - the layer stores any Supabase token material server-side only

5. Keep authorization app-local:
   - identity comes from Supabase Auth
   - roles, org membership, billing state, and feature flags stay in the app DB
     keyed by `auth_user_id`

6. Push Sign in with Apple hard in the shared UI primitives:
   - Apple is the primary CTA
   - email remains available as fallback and recovery
   - display name is optional because Apple may only return it once

7. Support automatic identity linking for verified email matches so Apple and
   email/password converge on one `auth_user_id`

8. Keep the layer Cloudflare-safe:
   - no Node built-ins in deployed server code
   - Web Crypto only
   - Drizzle only
   - no shared mutable request state

9. Add a migration path for downstream apps:
   - document required runtime config
   - document required app-owned tables for auth user linking and token storage
   - document the callback route contract (`/login`, `/auth/callback`,
     `/logout`, `/auth/confirm`, `/reset-password`)

10. Add tests for:

- local fallback auth
- Supabase email confirmation flow
- Apple OAuth start and callback exchange
- app-local session minting after Supabase exchange
- MFA enroll and verify flows
- duplicate verified-email identity linking

Acceptance criteria:

- a downstream app can opt into the shared Supabase auth backend through runtime
  config only
- app-level auth overrides are no longer required
- existing downstream apps that still rely on local auth do not break
