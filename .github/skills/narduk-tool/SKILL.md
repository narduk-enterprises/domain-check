---
name: narduk-tool
description: Run narduk-cli commands for Doppler secrets management, AI image generation, Cloudflare Workers/DNS, fleet diagnostics, Hetzner Cloud, Linode/Akamai, Tailscale, Proxmox, Technitium DNS, NextDNS, Ollama, Forgejo, MyBoat, Fly.io, Supabase, secrets auditing, git cleanup, and dev utilities (IP, UUID, encoding). Use when the user needs to query Doppler keys, generate images with xAI, deploy Workers, diagnose fleet apps, manage DNS, audit secrets, manage infrastructure, or perform common dev utility tasks.
---

# Narduk CLI Tool

`narduk-cli` (aliased as `narduk`) is a modular CLI toolkit for common dev workflows. It wraps Doppler, xAI-backed image generation, Cloudflare, Hetzner, Linode, Tailscale, Proxmox, Technitium, NextDNS, Ollama, Forgejo, Fly.io, Supabase, and other tools into a single binary with optional interactive TUI mode.

## Prerequisites

- The binary must already be installed. If not, run from the project root (`/Users/narduk/new-code/narduk-tools`):
  ```bash
  make install
  ```
- [Doppler CLI](https://docs.doppler.com/docs/install-cli) authenticated via `doppler login`
- Cloudflare credentials: `CLOUDFLARE_API_TOKEN_DNS`, `CLOUDFLARE_API_TOKEN_WORKERS`, `CLOUDFLARE_ACCOUNT_ID` (or Doppler fallback via `0_global-canonical-tokens/cloudflare`)
- xAI credentials: `XAI_API_KEY` preferred, `GROK_API_KEY` accepted for compatibility, or Doppler fallback via `0_global-canonical-tokens/ai`
- Hetzner credentials: `HETZNER_API_KEY` or `HCLOUD_TOKEN`, or Doppler fallback via `platform/prd`
- Linode credentials: `LINODE_API_TOKEN`, `LINODE_API_TOKEN_MANAGE`, or `LINODE_API_KEY`, or Doppler fallback via `0_global-canonical-tokens/infrastructure`
- Tailscale credentials: `TAILSCALE_API_KEY` or Doppler fallback via `0_global-canonical-tokens/apis`
- Technitium credentials: `TECHNITIUM_URL` + `TECHNITIUM_TOKEN`, or Doppler fallback via `0_global-canonical-tokens/apis`
- NextDNS credentials: `NEXTDNS_API_KEY` or Doppler fallback via `0_global-canonical-tokens/apis`
- Forgejo credentials: `FORGEJO_TOKEN` or Doppler fallback via `platform/prd`
- Proxmox: passwordless SSH (`BatchMode`) to the Proxmox host
- `flyctl` for Fly.io commands
- `supabase` CLI for Supabase commands

## Global Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--format`, `-f` | Output format: `table`, `json`, `csv` | `table` |
| `--tui` | Launch interactive TUI mode | `false` |
| `--no-cache` | Bypass Doppler cache (still writes new results) | `false` |
| `--cache-ttl` | Doppler cache TTL (e.g. `5m`, `30s`, `1h`) | `5m` |

## Command Reference

### Doppler — Secrets Management

Aggregate and inspect Doppler secrets across all projects.

```bash
# List all deduplicated keys
narduk-cli doppler keys
narduk-cli doppler keys --show-projects     # Show which projects use each key
narduk-cli doppler keys --format json       # JSON output
narduk-cli doppler keys --config-filter prd # Filter to a specific config
narduk-cli doppler keys --tui              # Interactive TUI browser

# Search keys by partial name
narduk-cli doppler search <query>
narduk-cli doppler search stripe --show-projects
narduk-cli doppler search stripe --config-filter prd
narduk-cli doppler search --tui            # Interactive search view

# Export all secrets
narduk-cli doppler export                  # Summary table
narduk-cli doppler export --format json    # Full JSON to stdout
narduk-cli doppler export -o file.json     # Save to file
narduk-cli doppler export --project-filter my-project
narduk-cli doppler export --tui            # Interactive export wizard

# Show cross-project secret references
narduk-cli doppler refs

# Clear the local Doppler cache
narduk-cli doppler clear-cache
```

### Cloudflare — Workers & DNS

```bash
narduk-cli cf workers                       # List all deployed Workers
narduk-cli cf zones                         # List Cloudflare zones
narduk-cli cf dns list <domain>             # List DNS records for a domain
narduk-cli cf dns upsert <domain> <type> <name> <content> [--proxied]
narduk-cli cf dns delete <domain> <type> <name> --content <content>
narduk-cli cf deploy [name]                 # Deploy a Worker
narduk-cli cf tail <name>                   # Tail Worker logs
```

### Hetzner — Cloud Infrastructure

Inventory, guarded creates, and provisioning helpers against the Hetzner Cloud API.
Mutating commands support `--dry-run` and require `--yes` before calling the API.

```bash
# Inventory
narduk-cli hetzner servers                  # List all servers
narduk-cli hetzner server <id>              # Show one server
narduk-cli hetzner volumes                  # List volumes
narduk-cli hetzner ssh-keys                 # List SSH keys
narduk-cli hetzner floating-ips             # List floating IPs
narduk-cli hetzner types                    # List server types
narduk-cli hetzner datacenters              # List datacenters

# Server lifecycle (guarded)
narduk-cli hetzner create-server --dry-run  # Preview server creation
narduk-cli hetzner create-server --yes      # Create a server
narduk-cli hetzner delete-server <id> --yes # Delete a server

# Volume management (guarded)
narduk-cli hetzner create-volume --dry-run  # Preview volume creation
narduk-cli hetzner attach-volume <id> --yes # Attach volume to server

# SSH
narduk-cli hetzner ssh                      # Interactive server chooser
narduk-cli hetzner ssh <name-or-id>         # SSH to a specific server

# SSH key management
narduk-cli hetzner ensure-ssh-key           # Create SSH key from pubkey file if missing

# Provisioning
narduk-cli hetzner provision-platform-host  # Guarded flow: create server + volume + attach + wait
narduk-cli hetzner wait-action <id>         # Poll an action until completion

# Output format
narduk-cli hetzner servers --format json    # JSON output
narduk-cli hetzner servers --page-size 25   # Control pagination (1–50)
```

### Linode — Akamai Cloud Infrastructure

Read and guarded write access to the Linode API v4. Mutating commands print
current state and proposed change, support `--dry-run`, and require `--yes`.

```bash
# Inventory
narduk-cli linode instances                 # List all Linodes
narduk-cli linode instance <id>             # Show one Linode
narduk-cli linode volumes                   # List block storage volumes
narduk-cli linode domains                   # List DNS domains
narduk-cli linode types                     # List instance types
narduk-cli linode regions                   # List regions
narduk-cli linode profile                   # Show current user profile

# Instance mutations (guarded)
narduk-cli linode linode resize <id> --type g6-standard-2 --dry-run
narduk-cli linode linode resize <id> --type g6-standard-2 --yes
narduk-cli linode linode reboot <id> --yes

# Volume mutations (guarded)
narduk-cli linode volume resize <id> --size 50 --dry-run
narduk-cli linode volume resize <id> --size 50 --yes  # Optional ext4 fs growth

# Output
narduk-cli linode instances --format json
narduk-cli linode instances --page-size 100  # Pagination (25–500, default 500)
```

### Tailscale — Tailnet & Device Management

Interact with the Tailscale HTTP API for device inventory, tailnet settings,
auth keys, subnet routes, and split DNS.

```bash
# Device inventory
narduk-cli tailscale devices                # List all devices in the tailnet
narduk-cli tailscale device <id-or-nodeId>  # Show one device
narduk-cli tailscale status                 # Local Tailscale state summary

# Tailnet
narduk-cli tailscale tailnet                # Show tailnet settings
narduk-cli tailscale keys                   # List auth keys
narduk-cli tailscale keys --all-scopes      # Show full key scopes

# DNS
narduk-cli tailscale dns split              # Show split DNS configuration

# Routes
narduk-cli tailscale routes set <deviceId> <CIDR>  # Enable subnet routes

# Output
narduk-cli tailscale devices --format json
narduk-cli tailscale devices --tailnet my-tailnet   # Override tailnet
```

### Proxmox — VM & LXC Inventory

Read-only inventory and safe operational helpers via SSH to a Proxmox node.

```bash
# Inventory
narduk-cli proxmox inventory                # List VMs and LXCs (VMID, type, status, resources, IP, tags)
narduk-cli proxmox inventory --host root@pve
narduk-cli proxmox cleanup-candidates       # Advisory list of stale guests (never deletes)

# LXC operations
narduk-cli proxmox lxc bootstrap <vmid> --script ./boot.sh --host root@pve

# Output
narduk-cli proxmox inventory --format json
```

### Technitium — Private DNS Server

Configure authoritative DNS records on a Technitium DNS Server instance.

```bash
# List zone records
narduk-cli technitium records list <zone>

# Upsert a record (add with overwrite=true)
narduk-cli technitium records upsert <zone> <type> <name> <content>

# Delete a specific record (requires --content for disambiguation)
narduk-cli technitium records delete <zone> <type> <name> --content <content>
```

### NextDNS — Profile & Log Management

Manage NextDNS profiles and query DNS logs.

```bash
narduk-cli nextdns profiles                 # List all NextDNS profiles
narduk-cli nextdns profile <id>             # Show a single profile
narduk-cli nextdns logs <profile-id>        # Query recent DNS logs
narduk-cli nextdns logs <id> --limit 50     # Control result count (10–1000)
narduk-cli nextdns logs <id> --status blocked  # Filter: default, blocked, allowed, error
narduk-cli nextdns logs <id> --search facebook # Filter by domain substring
narduk-cli nextdns logs <id> --device phone    # Filter by device
```

### Ollama — Remote Model Management

Talk to Ollama on another host for model inventory and ai-lab provisioning.

```bash
# Model inventory
narduk-cli ollama models list --host ai-lab.lan    # List installed models
narduk-cli ollama models prune --host ai-lab.lan --keep llama3.2:latest --dry-run

# Provisioning
narduk-cli ollama provision ai-lab \
  --proxmox-host root@pve \
  --vmid 108 \
  --script ./boot.sh \
  --hostname ai-lab \
  --models llama3.2:latest \
  --ollama-host ai-lab.lan
```

### Forgejo — Platform Pilot Operations

Operate the narrow Forgejo pilot lane for the platform environment.
Defaults to `https://code.platform.nard.uk` and repo `narduk-enterprises/myboat`.

```bash
# Diagnostics
narduk-cli forgejo diagnose auth            # Check PAT, package, and platform cookie access

# Canary deployments
narduk-cli forgejo canary                   # Dispatch and watch myboat canary via platform AppOperation

# Package management
narduk-cli forgejo packages inspect <pkg>   # Inspect npm package metadata from registry
narduk-cli forgejo packages verify <pkg>    # Verify metadata + tarball fetchability
narduk-cli forgejo packages link            # Emit scoped .npmrc stanza for @narduk-enterprises

# Runner inspection
narduk-cli forgejo runner status            # Show runner container status on platform host
narduk-cli forgejo runner logs              # Tail runner logs from platform host

# Secret management
narduk-cli forgejo secrets list             # List repo action secrets
narduk-cli forgejo secrets set <name> <val> # Create or update a repo action secret
```

### MyBoat — Operational Workflows

Guarded workflows for the MyBoat production stack, focused on collector
replacement.

```bash
narduk-cli myboat collector replace         # Replace active collector with Bee-hosted consumer
```

### Image — AI Image Generation

Generate and save AI images locally. Provider selection defaults to xAI.
Authentication prefers `XAI_API_KEY`, then `GROK_API_KEY`, then the current
Doppler scope, then `0_global-canonical-tokens/ai`.

```bash
narduk-cli image generate "A brutalist fox logo in black ink"
narduk-cli image generate --prompt "Retro synthwave poster" --n 4 --aspect-ratio 16:9
narduk-cli image generate --prompt "Steel water bottle product shot" --output-dir ./tmp/renders
narduk-cli image models
narduk-cli image models --format json

# Root TUI includes an Image Tools submenu
narduk-cli
```

### Fleet — App Diagnostics & Deployment

Uses the deployed control-plane API as the source of truth.

```bash
narduk-cli fleet apps                       # List apps from the remote fleet registry
narduk-cli fleet status [app]               # Check live reachability + build metadata
narduk-cli fleet audit [app]                # Compare live runtime config to registry
narduk-cli fleet doctor [app]               # Run status + audit + Doppler validation
narduk-cli fleet doppler validate [app]     # Check required Doppler secrets
narduk-cli fleet doppler sync-urls [app]    # Sync SITE_URL from registry to Doppler
narduk-cli fleet doppler sync-analytics     # Sync shared analytics refs to Doppler
narduk-cli fleet ship <app> [<app>...]      # Ship selected fleet apps
narduk-cli fleet ship --all                 # Ship the full fleet catalog
narduk-cli fleet logs <app>                 # Tail Cloudflare logs for an app
```

### Fly.io — Application Management

```bash
narduk-cli fly status                       # List all apps, regions, machine counts
narduk-cli fly status <app>                 # Detailed status view
narduk-cli fly logs <app>                   # Tail recent logs
```

### DNS — macOS DNS Utilities

```bash
narduk-cli dns flush                        # Flush macOS DNS cache (prompts for sudo)
```

### LAN — HomePod / Bonjour Diagnostics

```bash
narduk-cli lan snapshot                     # Immediate LAN, DHCP, ARP, Bonjour snapshot
narduk-cli lan multicast diagnose          # Short generic multicast + gateway-jitter sample
narduk-cli lan homepod diagnose            # 5-minute Bonjour + LAN RTT sample
narduk-cli lan homepod diagnose --output-dir ./tmp/homepod-lan
narduk-cli lan homepod diagnose --skip-capture
```

Timed workflows always perform Bonjour discovery. Raw mDNS/IGMP packet capture
is attempted only when the current user can access `/dev/bpf*`; otherwise the
command records that limitation and continues with discovery and latency
checks.

### Supabase

```bash
narduk-cli supabase status                  # List linked projects
narduk-cli supabase migrations              # Show pending/applied migrations
```

### Secrets Audit

Cross-reference codebase environment variables with Doppler.

```bash
narduk-cli secrets audit <path>             # Find orphaned/missing secrets
narduk-cli secrets audit . --project app    # Audit specific project
```

### Git Cleanup

```bash
narduk-cli git cleanup                      # Delete merged branches
narduk-cli git cleanup --dry-run            # Preview deletions
```

### Utilities

```bash
narduk-cli ip                               # Show Public, Local, and Tailscale IP
narduk-cli uuid                             # Generate UUID v4
narduk-cli uuid -n 5                        # Bulk generate 5 UUIDs
narduk-cli uuid --timestamp                 # Prefix UUID with timestamp
narduk-cli encode base64 <str>              # Base64 encode
narduk-cli encode base64 -d <str>           # Base64 decode
narduk-cli encode url <str>                 # URL encode
narduk-cli encode jwt <token>               # Decode JWT header + payload
```

## When to Use Which Command

| Scenario | Command |
|----------|---------|
| Find a secret across all Doppler projects | `doppler search <name>` |
| Export secrets for a specific project | `doppler export --project-filter <name>` |
| Check if a fleet app is healthy | `fleet doctor <app>` |
| Generate images with xAI | `image generate "<prompt>"` |
| Deploy a fleet app | `fleet ship <app>` |
| Deploy a Cloudflare Worker | `cf deploy <name>` |
| Manage public DNS records (Cloudflare) | `cf dns list/upsert/delete` |
| Manage private DNS records (Technitium) | `technitium records list/upsert/delete` |
| List Hetzner servers | `hetzner servers` |
| Provision a new Hetzner platform host | `hetzner provision-platform-host` |
| SSH into a Hetzner server | `hetzner ssh` |
| List Linode instances | `linode instances` |
| Resize a Linode | `linode linode resize <id> --type <plan>` |
| List Tailscale devices | `tailscale devices` |
| Check tailnet settings | `tailscale tailnet` |
| Enable subnet routes | `tailscale routes set <deviceId> <CIDR>` |
| List Proxmox VMs and LXCs | `proxmox inventory` |
| Bootstrap an LXC container | `proxmox lxc bootstrap <vmid>` |
| Manage NextDNS profiles | `nextdns profiles` |
| Query NextDNS blocked logs | `nextdns logs <id> --status blocked` |
| List Ollama models on a host | `ollama models list --host <host>` |
| Check Forgejo runner health | `forgejo runner status` |
| Run the myboat canary | `forgejo canary` |
| Replace MyBoat collector | `myboat collector replace` |
| Capture a generic LAN snapshot | `lan snapshot` |
| Diagnose multicast / Bonjour jitter | `lan multicast diagnose` |
| Diagnose HomePod / Bonjour LAN behavior | `lan homepod diagnose` |
| Audit missing env vars in a codebase | `secrets audit .` |
| Clean up stale git branches | `git cleanup` |
| Decode a JWT for debugging | `encode jwt <token>` |
| Get your current IP addresses | `ip` |

## Tips

- Use `--format json` to get machine-readable output that you can parse.
- Use `--tui` to launch interactive views for Doppler commands when browsing is more useful than direct queries.
- Use the root TUI (`narduk-cli`) when you want the interactive `Image Tools` submenu instead of CLI flags.
- Fleet commands use `CONTROL_PLANE_API_KEY` (env var or Doppler fallback from `narduk-nuxt-template/prd`).
- Image commands save files locally and can list xAI image models with `narduk-cli image models`.
- The `fleet ship` command uses the local `~/new-code/template-apps/control-plane` checkout.
- Hetzner and Linode mutating commands always require `--yes` and support `--dry-run` for previewing.
- Proxmox commands require passwordless SSH to the host; set `PROXMOX_SSH` or use `--host`.

## Feature Requests

> [!IMPORTANT]
> If during your work you identify a task or workflow that **would benefit from a new narduk-cli command or enhancement** but doesn't currently exist, you MUST notify the user with a suggestion. Examples include:
> - A repetitive multi-step shell workflow that could be a single CLI command
> - Missing flags or output formats that would make automation easier
> - New integrations with tools the user frequently uses (e.g., Neon, GitHub Actions, etc.)
> - Improvements to existing commands (batch operations, better error messages, etc.)
>
> Frame the suggestion clearly: what the command would do, why it's useful, and a proposed invocation (e.g., `narduk-cli neon branches`).

## Development

The source lives at `/Users/narduk/new-code/narduk-tools`. After any change:

```bash
cd /Users/narduk/new-code/narduk-tools
make install   # Rebuild and install the binary
```
