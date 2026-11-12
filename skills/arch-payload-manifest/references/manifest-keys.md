# The payload manifest — every key

> Supporting file for `arch-payload-manifest`.

## Format

`KEY=VALUE`, one key per line, parsed with **pure bash** (no `jq`, `yq` or
`python`).

- `#` starts a comment.
- Empty lines are ignored.
- Keys must match `^[A-Z_][A-Z0-9_]*$`; anything else is skipped.
- Values are trimmed and unquoted on both sides.

## The keys

| Key | Mandatory | Type | Default | Meaning |
|---|---|---|---|---|
| `NAME` | ✅ | text | — | App name, used in logs and in the unit description |
| `VERSION` | ✅ | text | — | Payload version, recorded in the update log |
| `SOURCE` | ✅ | https URL | — | The app's own repo — **never** vendored here |
| `SOURCE_REF` | | git ref | `main` | Branch, tag or commit to materialize |
| `RUNTIME` | | `native`·`nspawn`·`podman` | `native` | Isolation model |
| `PORT` | | integer | — | Local port the app serves on |
| `BIND` | | IP | `127.0.0.1` | Listen address |
| `DATABASE` | | `embedded`·`external`·`none` | `none` | Data engine |
| `DATABASE_URL` | | URL | — | Required when `DATABASE=external` |
| `DATA_DIR` | | path | `/data/apps/<slug>` | Persistent data location |
| `COMMAND` | | command | — | Start command (runtime `native`) |
| `ENV` | | `K=V` | — | Environment variable, repeatable |
| `AUTOSTART` | | `true`·`false` | `false` | Start with the system |
| `RESTART` | | `always`·`on-failure`·`never` | `always` | Restart policy |
| `HEALTHCHECK` | | URL or command | — | Health probe |
| `VOLUMES` | | `host:cont` | — | Volume mappings — `podman` only |
| `ROOTFS` | | path | — | Rootfs directory — `nspawn` only |

## Rules the installer enforces

| Rule | Why |
|---|---|
| `SOURCE` must be an `https` URL | The code is pulled from the app's own repo at install time, over an authenticated channel |
| `DATA_DIR` must be under `/data` | Data on a rw COW layer is lost on reboot and punishes USB flash |
| `DATABASE=external` requires `DATABASE_URL` | Otherwise the app starts without a database |
| `RUNTIME` must be one of the three | `podman` is only installed when the manifest asks for it |
| The slug is derived from `NAME` | It names `/opt/<slug>` and `app-<slug>.service` |

## Credentials never go in the manifest

The manifest is committed to a repository and travels inside the ISO. Put the
credentials in an environment file on the appliance:

```bash
# /etc/app/<slug>.env  — mode 600, owned by root
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db.host:5432/dbname?sslmode=disable
```

and reference it from the unit:

```ini
[Service]
EnvironmentFile=-/etc/app/<slug>.env
```

The manifest only carries the **name** of the variable.

## A complete example

```bash
# apps/mail/app.conf
NAME=Mail System
VERSION=1.0.0
SOURCE=https://github.com/example/mail-system.git
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

## The three runtimes

| Runtime | Overhead | When | Isolation |
|---|---|---|---|
| `native` | **0** | In-house apps, already validated | None — a system process |
| `nspawn` | +35–65 MB RAM | The app needs another userspace | systemd container with its own rootfs |
| `podman` | +20–50 MB/container | Third-party app that is **only** OCI | OCI container |

With `podman`, data goes to `/data` through a **direct mapping**:

```bash
VOLUMES=/data/apps/mail:/var/lib/mail:Z
```

Never put database data on the rw layer: the COW is lost on reboot, and on
USB flash every write is expensive.
