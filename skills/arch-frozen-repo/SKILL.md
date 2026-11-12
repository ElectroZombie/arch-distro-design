---
name: arch-frozen-repo
description: 'Create and maintain a frozen (offline, signed) pacman repository inside the ISO or the appliance: repo-add signing, version pinning with versions.txt and offline consumption from the live system. Use when the user asks to "work offline", "build a local pacman repo", "freeze the package versions", "let pacman -Syu work without internet" or "air-gap the packages".'
---

# Arch Frozen Repo — General Purpose

Skill for creating and maintaining a **frozen** (offline, signed, reproducible)
pacman repository that lives inside the ISO or the `.img` appliance. This
repository is what the live system/appliance uses to synchronize packages
**without internet**, and it is the trusted source for `pacman -Syu`.

## ⚠️ Integrates with the `arch-distro-design` Brief

> **Directive from `arch-distro-design`:** Decisions about repos and updates
> are made here. The `Brief` determines:

| Category from the Brief | Decision in `arch-frozen-repo` |
|---|---|
| **Objective** | Whether the repo serves a live ISO, a .img, or both. Defines `versions.txt` and policy. |
| **Network** | Whether internet is disabled by default (`inactive` networkd). The frozen repo is the only source. |
| **Apps / Payloads** | Who materializes the payloads: the frozen repo provides packages, but materialization comes from the app's own repo. |
| **Immutability** | The frozen repo is **offline** by design; updates only through `appliance-update.service`. |
| **Update policy** | `versions.txt` committed after every build. The user can change the network policy (§3). |

> **If the `Brief` is not complete, generation of the frozen repo pauses and the
> user is asked for the 7 mandatory categories.**

## Startup Workflow

1. **Confirm the Brief** — the network and update policy decide whether the repo is the only package source.
2. **Collect the packages** — download with `pacman -Sw` into a staging directory, without installing them.
3. **Sign and freeze** — `repo-add` the database, then write `out/versions.txt`.
4. **Wire the consumer** — the live system and the appliance point at `file:///arch-repo` with `SigLevel = PackageRequired`.
5. **Verify** — run the checks in [Verification](#verification).
6. **Record the evidence** — see [State & Evidence](#state--evidence).

## Scope

**In scope:** the frozen repo inside the ISO, its signed database, version pinning, and offline consumption from the live system and the appliance.

**Out of scope:** the ISO itself, the `.img` installation, app payload code, and any repo that is not signed by the Arch keyring.

| Out of scope | Delegate to |
|---|---|
| archiso profile and live ISO | `arch-iso-builder` |
| Partitioning, `.img`, systemd units | `arch-appliance-img` |
| App manifest, runtime, database | `arch-payload-manifest` |
| Boot tests in QEMU | `arch-qemu-validation` |

## Purpose

- Allows the ISO or .img to work **100% offline** after being built.
- Prevents the admin from depending on the internet for updates (project policy).
- Serves as the package source for installing payloads (apps).
- Is versioned together with the ISO/appliance (`versions.txt` + `SHA256SUMS` files).

## Produced artifacts

| File | Content |
|---|---|
| `arch-repo/appliance.db.tar.gz` | Signed pacman database |
| `arch-repo/*.pkg.tar.zst` | Binary packages (frozen) |
| `versions.txt` | `package version` list (for rollback/verification) |
| `x86_64/` | Repository directory structure |

## Mandatory workflow

### 1. Build the frozen repo (after the ISO build)

> The repo layout, the consumer `pacman.conf` and the pinning procedure are
> in `references/repo-layout.md`.

The package list comes from the ISO build: `builder/repo-packages.txt`, written
by `arch-iso-builder`, is the subset of the profile's packages that must be
available **offline**.

```bash
set -euo pipefail

# 1. Temporary directory with the .pkg files to install (WITHOUT installing them)
mkdir -p "$WORKDIR/pkg"
sudo pacman -Sw --cachedir "$WORKDIR/pkg" \
  --config builder/arch-profile/pacman.conf \
  $(cat builder/repo-packages.txt)

# 2. Package the repo inside the airootfs overlay
mkdir -p "$ISODIR/builder/arch-profile/airootfs/arch-repo"
cp "$WORKDIR/pkg"/*.pkg.tar.zst "$ISODIR/builder/arch-profile/airootfs/arch-repo/"
repo-add "$ISODIR/builder/arch-profile/airootfs/arch-repo/appliance.db.tar.gz" \
  "$ISODIR/builder/arch-profile/airootfs/arch-repo"/*.pkg.tar.zst

# 3. Freeze the documented versions
pacman -Sp --print-format '%n %v' --config builder/arch-profile/pacman.conf \
  $(cat builder/repo-packages.txt) > out/versions.txt
```

### 2. `arch-repo/` structure

```
arch-repo/
├── appliance.db.tar.gz   # Signed DB (SigLevel PackageRequired on the live system)
├── pkg1.pkg.tar.zst
├── pkg2.pkg.tar.zst
└── ... (all LIVE + REPO extra packages)
```

### 3. Consumption from the live system (the live system's `/etc/pacman.conf`)

```ini
[appliance]
SigLevel = PackageRequired
Server = file:///arch-repo
```

The live system mounts this repo at root (`/arch-repo`) because it does
`switch_root` onto the squashfs, so `/arch-repo` is an absolute path inside the
live session.

### 4. Consumption from the appliance (after `pacstrap`)

The appliance already has the packages installed. To update:

```bash
# Use the frozen repo that is already in the .img
pacman -Sy --root / --config /etc/pacman.conf
# Or update only the packages from the appliance repo
pacman -Su --noconfirm --ignore glibc
```

### 5. Controlled updates (project policy)

| Scenario | Action |
|---|---|
| Normal update | `pacman -Syu` with networkd temporarily up |
| Appliance repo only | `pacman -Sy --root / --config /etc/pacman.conf` (uses `file:///arch-repo`) |
| Avoid updating glibc | `pacman -Su --noconfirm --ignore glibc` |
| Version log | `versions.txt` committed after every build |

## Verification

Run after building the repo. The script fails fast on the first problem.

```bash
set -euo pipefail

REPO="builder/arch-profile/airootfs/arch-repo"
PACCONF="builder/arch-profile/airootfs/etc/pacman.conf"

# 1. The signed database exists
test -f "$REPO/appliance.db.tar.gz"

# 2. At least one frozen package
ls "$REPO"/*.pkg.tar.zst >/dev/null

# 3. The version manifest was frozen
test -s out/versions.txt

# 4. The live points at the frozen repo with signature verification ON
grep -q 'PackageRequired' "$PACCONF"
grep -q 'file:///arch-repo' "$PACCONF"

# 5. No unsigned repo in the default flow
! grep -qs '^\[aur\]' "$PACCONF"

echo "✅ Frozen repo verified"
```

| Check | Command | Expected |
|---|---|---|
| Signed DB exists | `ls arch-repo/appliance.db.tar.gz` | present |
| .pkg packages exist | `ls arch-repo/*.pkg.tar.zst` | non-empty list |
| versions.txt exists | `cat versions.txt` | `linux 6.6.8-1-etc` etc. |
| SigLevel correct | `grep 'PackageRequired' etc/pacman.conf` | found |
| Repo consumable | `pacman -Sy --root / -c /etc/pacman.conf` | sync without error |

## ⚠️ ADVANCED section: alternative package managers (AUR)

> 🔴 **SECURITY WARNING — DO NOT USE BY DEFAULT.**
> AUR packages are **not signed** by the official Arch keyring. Including an
> AUR repo in the live system **breaks the trust model** of the frozen repo and
> requires `SigLevel = Optional` (signature verification disabled). This is
> exactly the kind of pattern a security scanner flags as a risk.
> **Only use it if the `Brief` explicitly authorizes it and the user accepts the
> risk in writing.**

If the Brief authorizes it, the flow is:

### A.1 Injecting AUR repos into the `airootfs/` overlay

```bash
set -euo pipefail

mkdir -p "$ISODIR/builder/arch-profile/airootfs/aur-repo"

# Option A: copy already-built .pkg.tar.zst files (PREFERRED — no network during build)
cp "$WORKDIR/pkg-aur"/*.pkg.tar.zst \
   "$ISODIR/builder/arch-profile/airootfs/aur-repo/"

# Option B: clone and build (requires network and manual PKGBUILD review)
# ⚠️ Review the PKGBUILD before running makepkg. Never `makepkg -si` blindly.
```

### A.2 Live `/etc/pacman.conf` with the AUR repo

```ini
[appliance]
SigLevel = PackageRequired
Server = file:///arch-repo

# 🔴 Only if the Brief authorizes it. SigLevel=Optional disables signature
# verification for these packages. Isolate this repo from the rest.
[aur]
SigLevel = Optional
Server = file:///aur-repo
```

### A.3 Consumption from the appliance

```bash
# From the appliance, using yay against the frozen repo (if installed)
yay -Sy --noconfirm

# Or using pamac with the system config
pamac update --force-refresh
```

## Permissions and safety

| | |
|---|---|
| **Reads** | the package list and the profile's `pacman.conf` |
| **Writes** | `airootfs/arch-repo/` inside the profile, and `out/versions.txt` |
| **Requires root** | yes — `pacman -Sw` and `repo-add` need it |
| **Refuses** | an unsigned database, and an `[aur]` repo in the default flow |
| **Network** | only the Arch mirrors named in the profile's `pacman.conf`, with signature verification on |
| **Never** | weakens signature verification: `SigLevel = PackageRequired` on the live system, always |

## Definition of Done

**Output:** the signed repo at `airootfs/arch-repo/`, `out/versions.txt`, plus the `✅ Frozen repo verified` line as evidence.

- [ ] Brief completed (network policy and update policy) before generating the repo.
- [ ] The repo lives **inside the ISO** (`airootfs/arch-repo/`), never inside DATA.
- [ ] The database is signed with `repo-add` and the live uses `SigLevel = PackageRequired`.
- [ ] Every package in `builder/repo-packages.txt` is present in the repo.
- [ ] `out/versions.txt` written and committed (rollback and verification).
- [ ] The default flow has **no** `[aur]` repo; if the Brief authorizes one, it is isolated and documented.
- [ ] The repo is consumable: `pacman -Sy --root / -c /etc/pacman.conf` syncs without error.
- [ ] `SHA256SUMS` covers the produced artifacts.

## State & Evidence

| State | Where it lives |
|---|---|
| The frozen repo | `builder/arch-profile/airootfs/arch-repo/` |
| Signed database | `arch-repo/appliance.db.tar.gz` |
| Pinned versions | `out/versions.txt` |
| Requested package list | `builder/repo-packages.txt` |
| Live repo configuration | `airootfs/etc/pacman.conf` |

Record the evidence: the **command** you ran and its **output** — the `✅ Frozen repo verified` line, the `pacman -Sy` sync output, and the head of `out/versions.txt`.

## Handoff

| If you touch... | Go to |
|---|---|
| profile + packages | `arch-iso-builder` |
| partitioning + .img | `arch-appliance-img` |
| KEY=VALUE manifest + runtime | `arch-payload-manifest` |
| desktop, panel, kiosk | `arch-desktop-layers` |
| QEMU tests, boot, shutdown | `arch-qemu-validation` |
| "this failed with..." | `arch-archlinux-pitfalls` |
| validate hardware before writing | `arch-hardware-handler` |
