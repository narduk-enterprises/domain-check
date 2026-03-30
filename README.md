# **DISPLAY_NAME**

Starter generated from `narduk-nuxt-template`.

## First Run

```bash
pnpm install
pnpm run validate
pnpm run db:migrate
doppler setup --project domain-check --config dev
doppler run -- pnpm run dev
```

## Workspace Shape

- `apps/web/` is the application you ship.
- `deploy/preview/` holds the repo-managed PR preview Docker assets.
- `layers/narduk-nuxt-layer/` is the shared Nuxt layer.
- `packages/eslint-config/` contains the shared lint plugins.
- `tools/` and `scripts/` contain local automation and helper commands.

## GitHub PR Preview Assets

This starter includes `.dockerignore`, `deploy/preview/Dockerfile`, and
`deploy/preview/docker-compose.yml` so the `narduk` preview host can run PR
previews without app-local Docker edits.

The stack binds to `127.0.0.1:${PREVIEW_HOST_PORT}`, uses `/api/health`, and
reads GitHub Packages auth from a BuildKit secret backed by `GITHUB_TOKEN`
(which still needs repository read access and `read:packages`).

## Ongoing Template Updates

Use the local sync tools to pull newer template infrastructure into this app:

```bash
pnpm run sync-template -- --from ~/new-code/narduk-nuxt-template
pnpm run update-layer -- --from ~/new-code/narduk-nuxt-template
```

## Deployment

Deployment is local-only:

```bash
cd apps/web && pnpm run db:migrate -- --remote
cd ../..
pnpm run ship
```
