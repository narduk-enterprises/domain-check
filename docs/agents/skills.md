# Skills Guide

This repository treats `~/.agents/skills` as the local source of truth and
`.github/skills/` as the committed mirror for GitHub-facing agents.

## Repo Contract

- Keep your canonical local skills in `~/.agents/skills/`.
- Refresh the committed GitHub-facing mirror with `pnpm run sync:github-skills`.
- `sync-template` and starter export carry the committed `.github/skills/`
  mirror into downstream repos. They do not reach into your workstation path
  directly.

## Editing Repo Skills

If you want a skill to ship with the repository:

1. Update the canonical local copy under `~/.agents/skills/`.
2. Run `pnpm run sync:github-skills`.
3. Commit the resulting `.github/skills/` changes.

Recommended layout:

```text
.github/skills/
└── my-skill/
    ├── SKILL.md
    ├── scripts/      # optional
    ├── examples/     # optional
    ├── references/   # optional
    └── resources/    # optional
```

Minimal frontmatter:

```yaml
---
name: my-skill
description: Brief trigger-oriented summary
---
```

## Local-Only Skills

If you want additional local-only skills for Codex, Cursor, Claude, or other
tools, keep them in `~/.agents/skills/` and skip the mirror step. Only skills
mirrored into `.github/skills/` will be available to GitHub coding agents and
downstream starters.

## Installing New Skills

```bash
# From a GitHub repo (open standard)
npx skills add https://github.com/<owner>/<repo> --skill <name>

# Interactive scaffolding via agent workflow
/skill-create
```

Use those commands when you intentionally want to update your local skill
environment. After local changes, run `pnpm run sync:github-skills` to refresh
the committed GitHub-visible mirror.
