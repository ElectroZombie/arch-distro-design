---
name: arch-frozen-repo
description: 'Create and maintain a frozen (offline, signed) pacman repository inside the ISO or appliance. Handles repo creation with repo-add, version pinning, and offline consumption. Use when the appliance must work 100% offline and pacman -Syu must resolve against a local signed repo instead of the internet.'
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

### 6. Validation

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

## Handoff to other skills in the group

| If you touch... | Go to |
|---|---|
| profile + packages | `arch-iso-builder` |
| partitioning + .img | `arch-appliance-img` |
| KEY=VALUE manifest + runtime | `arch-payload-manifest` |
| desktop, panel, kiosk | `arch-desktop-layers` |
| QEMU tests, boot, shutdown | `arch-qemu-validation` |
| "this failed with..." | `arch-archlinux-pitfalls` |
| validate hardware before writing | `arch-hardware-handler` |
