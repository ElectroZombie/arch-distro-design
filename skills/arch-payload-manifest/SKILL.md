---
name: arch-payload-manifest
description: 'Parse and materialize app payloads from their own repositories with a KEY=VALUE manifest and bash-only parsing (no jq, yq or python): runtime selection (native/nspawn/podman), embedded or external databases and volume mappings. Use when the user asks to "install a self-hosted app", "bundle a payload", "add an app to the appliance", "materialize a manifest" or "run the app in a container".'
---

# Arch Payload Manifest — General Purpose

Skill for reading, validating, and materializing **payloads** (complete
self-hosted systems) from **each app's own repository**. This repo does **not
vendor** app code: each payload lives in its own repo and is materialized on the
appliance when it is installed.

## Non-negotiable principle

> ❌ An app's code is **never** vendored into the project repo.
> ✅ The payload is declared by a **manifest** and materialized from the app's
> own repo at install time.

This keeps the builder generic: one ISO serves N different apps, and updating an
app does not force a rebuild of the ISO.

## Startup Workflow

1. **Confirm the manifest** — `apps/<slug>/app.conf` exists and declares `NAME`, `VERSION` and `SOURCE`.
2. **Validate the keys** — run the checks in [Verification](#verification) before touching the appliance.
3. **Materialize on the appliance** — clone `SOURCE@SOURCE_REF` into `/data/apps/<slug>/src`.
4. **Wire the service** — write the systemd unit and enable it.
5. **Prove it runs** — the healthcheck must pass on the appliance.

## Scope

**In scope:** the manifest format, the pure-bash parser, runtime selection, database selection, volume mapping, and the systemd unit of the payload.

**Out of scope:** the app's own source code (it lives in the app's repo), the appliance image, and the frozen package repo.

| Out of scope | Delegate to |
|---|---|
| The appliance image and its installation | `arch-appliance-img` |
| Signed offline package repo | `arch-frozen-repo` |
| Graphical layer for the payload's UI | `arch-desktop-layers` |
| Boot tests of the container | `arch-qemu-validation` |

## Manifest format

`KEY=VALUE`, one key per line, parseable with **pure bash** (no `jq`, `yq`, or
`python`). Comments use `#`. Empty lines are ignored.

```bash
# Example: apps/mail/app.conf
NAME=Mail System
VERSION=1.0.0
SOURCE=https://github.com/<owner>/mail-system.git
SOURCE_REF=main

# --- network ---
PORT=8080
BIND=127.0.0.1

# --- data ---
DATABASE=embedded
DATA_DIR=/data/apps/mail

# --- process ---
COMMAND=/usr/local/bin/mail-system
AUTOSTART=true
RESTART=always
HEALTHCHECK=http://127.0.0.1:8080/health
```

## Recognized keys

> Every key with its type, default and validation rule is in
> `references/manifest-keys.md`.

| Key | Mandatory | Values | Meaning |
|---|---|---|---|
| `NAME` | ✅ | text | App name (for logs and UI) |
| `VERSION` | ✅ | text | Payload version (stored in the update log) |
| `SOURCE` | ✅ | URL | Source repo/artifact (⚠️ **not** vendored) |
| `SOURCE_REF` | | git ref | Branch, tag, or commit to materialize (default: `main`) |
| `RUNTIME` | | `native`·`nspawn`·`podman` | Isolation model (default `native`) |
| `PORT` | | integer | Local port the app serves |
| `BIND` | | IP | Listen address (default `127.0.0.1`) |
| `DATABASE` | | `embedded`·`external`·`none` | Data engine |
| `DATABASE_URL` | | URL | Mandatory if `DATABASE=external` |
| `DATA_DIR` | | path | Persistent directory under `/data` |
| `COMMAND` | | cmd | Start command (runtime `native`) |
| `ENV` | | `K=V` | Environment variable (repeatable) |
| `AUTOSTART` | | `true`·`false` | Whether it starts with the system |
| `RESTART` | | `always`·`on-failure`·`never` | Restart policy |
| `HEALTHCHECK` | | URL/cmd | Health probe (optional) |
| `VOLUMES` | | `host:cont` | `podman` only: mappings (⚠️ see rules) |

## Parsing in bash (no dependencies)

> 🔧 Fixed parser: the previous version had a broken trim line.

The parser ships with this skill — `scripts/load-manifest.sh` — and
the ISO carries it at `/installer/load-manifest.sh`. The reference copy:

```bash
#!/usr/bin/env bash
# load-manifest.sh — read a KEY=VALUE manifest and export an associative array
set -euo pipefail

load_manifest() {
    local file="$1" key value line
    declare -gA MANIFEST=()

    [[ -f "$file" ]] || { echo "❌ does not exist: $file" >&2; return 1; }

    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue

        # Must contain '='
        [[ "$line" == *=* ]] || continue

        key="${line%%=*}"
        value="${line#*=}"

        # Trim spaces on both sides
        key="$(printf '%s' "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
        value="$(printf '%s' "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

        # Remove surrounding single or double quotes
        value="${value%\"}"; value="${value#\"}"
        value="${value%\'}"; value="${value#\'}"

        # Validate key
        [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue

        MANIFEST["$key"]="$value"
    done < "$file"
}
```

## Usage

```bash
load_manifest apps/mail/app.conf
echo "NAME: ${MANIFEST[NAME]}"
echo "VERSION: ${MANIFEST[VERSION]}"
echo "SOURCE: ${MANIFEST[SOURCE]}"
echo "RUNTIME: ${MANIFEST[RUNTIME]:-native}"
```

## Runtimes

| Runtime | Overhead | When to use | Isolation |
|---|---|---|---|
| `native` | **0** | In-house apps, already validated | None (system process) |
| `nspawn` | +35–65 MB RAM | The app requires a different userspace | systemd container with its own rootfs |
| `podman` | +20–50 MB/container | Third-party app that is **only** OCI | OCI container |

### ⚠️ `podman` rules

1. **Never** put DB data on the rw layer (overlay COW). COW is lost on reboot
   and on USB flash it punishes writes.
2. Data goes to `/data` with a **direct mapping**:
   ```bash
   VOLUMES=/data/apps/mail:/var/lib/mail:Z
   ```
3. Podman is installed **only** if the manifest declares `RUNTIME=podman`.
4. On USB flash, a container with a rw COW layer is unviable: use `--read-only` +
   volumes.

## Supported database systems

### `DATABASE=embedded` (default)

| Component | Description |
|---|---|
| Engine | Integrated SQLite or an embedded engine with no separate service |
| Use | Lightweight applications, no separate DB service |
| Example | `DATA_DIR=/data/app/db`, `sqlite3 /data/app/db/app.db` |
| Autonomy | ✅ data travels inside the appliance |
| RAM | +0 MB (using native SQLite) |

### `DATABASE=external`

| Component | Description |
|---|---|
| Engine | PostgreSQL, MySQL, MariaDB, or any external DB server |
| Requirement | `DATABASE_URL` must contain the connection URL |
| Network | Requires LAN or access to the DB server |
| Autonomy | ❌ depends on its external server |
| RAM | +30–80 MB |
| URL example | `postgresql://${DB_USER}:${DB_PASSWORD}@db.host:5432/dbname?sslmode=disable` |

### `DATABASE=none`

| Component | Description |
|---|---|
| Engine | None. The app does not use a local database. |
| Use | Frontend-only, APIs without their own DB, file managers |
| Autonomy | ✅ total, no DB dependencies |

## Payload installation flow

```text
ADMIN (host)                          APPLIANCE
───────────                           ─────────
1. build.sh creates the appliance     ──────────
2. payload install app.conf           1. ssh root@appliance
   ├─ validates the manifest          2. payload-install app.conf
   ├─ materializes SOURCE@SOURCE_REF ─→ /data/apps/<slug>/src
   ├─ installs runtime if needed      3. systemctl enable --now app-<slug>.service
   ├─ prepares DB (embedded/external) 4. Verify healthcheck
   └─ writes the systemd unit         5. Enjoy the app
3. systemctl enable --now app-<slug>.service
```

Code materialization happens **on the appliance**, from the app's repo, at
install time. The ISO does not carry the code.

## Payload systemd units (generic example)

```ini
[Unit]
Description=Self-hosted system
RequiresMountsFor=/data
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/<app-slug>
EnvironmentFile=-/etc/app/<app-slug>.env
Environment=NODE_ENV=production
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> ⚠️ **Credentials never go in the manifest.** The database URL and any token
> belong in `/etc/app/<app-slug>.env` (mode `600`), which the unit reads through
> `EnvironmentFile`. The manifest only carries the *name* of the variable.

```bash
# /etc/app/<app-slug>.env  (mode 600, owned by root)
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db.host:5432/dbname?sslmode=disable
```

> ⚠️ `WorkingDirectory=/opt/<app-slug>` (symlink without spaces) — never the
> original path with quotes: systemd does not strip them and the service will
> not start.

## Payload repository in this project

```text
apps/
└── mail-system/
    └── app.conf        # ONLY the manifest — the code is NOT here
```

The installer reads the manifest, validates the keys and delegates the
materialization on the appliance. Both halves ship as scripts of this skill, and
the ISO carries them at `/installer/`:

| Asset | Destination in the ISO | What it does |
|---|---|---|
| `scripts/payload.sh` | `/installer/payload.sh` | materializes `SOURCE@SOURCE_REF`, writes the unit, enables the service, waits for the healthcheck |
| `scripts/load-manifest.sh` | `/installer/load-manifest.sh` | the pure-bash parser (no `jq`, `yq` or `python`) |

```bash
# From the live session
/installer/payload.sh apps/mail-system/app.conf
```

See `arch-iso-builder` for how the assets get into the overlay.

## Verification

Run on the manifest before installing anything. The script fails fast on the
first problem.

```bash
set -euo pipefail

MANIFEST="${1:?usage: verify-payload.sh <app.conf>}"

# Load the manifest with the pure-bash parser (no jq/yq/python)
source skills/arch-payload-manifest/scripts/load-manifest.sh
load_manifest "$MANIFEST"

# 1. Mandatory keys are present
for key in NAME VERSION SOURCE; do
  [[ -n "${MANIFEST[$key]:-}" ]] || { echo "❌ missing key: $key" >&2; exit 1; }
done

# 2. The runtime is supported
case "${MANIFEST[RUNTIME]:-native}" in
  native|nspawn|podman) ;;
  *) echo "❌ unsupported RUNTIME: ${MANIFEST[RUNTIME]}" >&2; exit 1 ;;
esac

# 3. Persistent data lives under /data (never on a rw COW layer)
case "${MANIFEST[DATA_DIR]:-/data}" in
  /data/*) ;;
  *) echo "❌ DATA_DIR must be under /data" >&2; exit 1 ;;
esac

# 4. An external database requires its URL
if [[ "${MANIFEST[DATABASE]:-}" == "external" ]]; then
  [[ -n "${MANIFEST[DATABASE_URL]:-}" ]] || { echo "❌ DATABASE_URL is required" >&2; exit 1; }
fi

# 5. SOURCE is reachable — the code is pulled, never vendored
curl -fsI "${MANIFEST[SOURCE]}" >/dev/null

echo "✅ Payload manifest verified"
```

| Check | Command | Expected |
|---|---|---|
| Valid manifest | `load-manifest.sh app.conf` | `MANIFEST[NAME]` set |
| Parser asset present | `test -f skills/arch-payload-manifest/scripts/load-manifest.sh` | present |
| Installer asset present | `test -f skills/arch-payload-manifest/scripts/payload.sh` | present |
| SOURCE is a valid URL | `curl -I "${MANIFEST[SOURCE]}"` | 200 OK |
| Supported RUNTIME | `${MANIFEST[RUNTIME]:-native}` in `native nspawn podman` | valid |
| DATA_DIR under /data | `${MANIFEST[DATA_DIR]}` starts with `/data` | true |
| Healthcheck defined | `${MANIFEST[HEALTHCHECK]}` not empty | URL or cmd |

## Permissions and safety

| | |
|---|---|
| **Reads** | the manifest file the operator passed, and the appliance's own `/etc` and `/opt` |
| **Writes** | `/data/apps/<slug>`, `/opt/<slug>` and `/etc/systemd/system/app-<slug>.service` |
| **Requires root** | yes — it installs a systemd unit and enables a service |
| **Refuses** | a `DATA_DIR` outside `/data`, a missing mandatory key, an unsupported `RUNTIME`, and a `SOURCE` that is not an `https` URL |
| **Network** | **only** the repository named in the manifest's `SOURCE`, over `https` |
| **Never** | stores credentials — the database URL is read from the environment, never written into the manifest |

## Definition of Done

**Output:** the materialized app under `/data/apps/<slug>`, the running `app-<slug>.service`, plus the `✅ Payload manifest verified` and healthcheck lines as evidence.

- [ ] Manifest declares `NAME`, `VERSION` and `SOURCE`.
- [ ] `SOURCE` is a remote repo — no app code is vendored in this repository.
- [ ] `RUNTIME` is `native`, `nspawn` or `podman` and matches the Brief.
- [ ] `DATA_DIR` is under `/data`; no database data on a rw COW layer.
- [ ] `DATABASE=external` implies a `DATABASE_URL`.
- [ ] `podman` installed **only** when the manifest declares `RUNTIME=podman`.
- [ ] systemd unit written with `WorkingDirectory=/opt/<app-slug>` (no spaces, no quotes).
- [ ] Healthcheck defined and passing on the appliance.
- [ ] Service enabled and running: `systemctl enable --now app-<slug>.service`.

## State & Evidence

| State | Where it lives |
|---|---|
| The manifest | `apps/<slug>/app.conf` |
| Materialized source | `/data/apps/<slug>/src` (on the appliance) |
| systemd unit | `app-<slug>.service` (on the appliance) |
| Persistent data | `/data/apps/<slug>` (DATA partition) |
| App version | `MANIFEST[VERSION]`, recorded in the update log |

Record the evidence: the **command** you ran and its **output** — the `✅ Payload manifest verified` line, the healthcheck response, and the installed version.

## Handoff

| If you touch... | Go to |
|---|---|
| frozen repo + pacman config | `arch-frozen-repo` |
| payload materialization | `arch-appliance-img` |
| podman/nspawn runtime | `arch-qemu-validation` |
| desktop integration (L0-L6) | `arch-desktop-layers` |
| profile + packages | `arch-iso-builder` |
| hardware validation | `arch-hardware-handler` |
