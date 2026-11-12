---
name: arch-iso-builder
description: 'Build Arch Linux live ISOs with archiso: profile configuration, package selection, boot modes (BIOS syslinux and UEFI systemd-boot), the airootfs overlay and ISO generation. Use when the user asks to "build an ISO", "create a live ISO", "make a bootable Arch image", "configure archiso" or "add packages to the live system".'
---

# Arch ISO Builder — General Purpose

Skill for building Arch Linux live ISOs using `archiso 91-1`. It works for
**any** Arch-based distribution. It decides the profile structure, which
packages go in the live system versus the frozen repo, and runs `mkarchiso`.

## ⚠️ MANDATORY: prior Brief

> **Directive from `arch-distro-design`:** This skill must **NEVER** be invoked
> without first completing the design `Brief`.

| Category | What it defines for this skill |
|---|---|
| **Objective** | Whether it is a live ISO, a persistent .img, or both. |
| **Output format** | Determines whether we build an ISO, a .img, or both. |
| **Target hardware** | x86_64 UEFI, BIOS, USB disk, HDD, SSD, NVMe. |
| **Network** | 100% local, LAN DHCP, internet expected, or completely offline. |
| **Apps / Payloads** | Which applications are included, runtimes, DB. |
| **Immutability** | Root squashfs ro, rw with a rule, or overlay? |
| **Update policy** | How and when it updates. |

> **If the `Brief` is not complete, stop the invocation and ask for the 7
> mandatory categories.**

## When to use this skill

- The user wants to create an Arch live ISO for a specific purpose.
- `arch-distro-design` has already made the design decisions and passed them on.
- A valid archiso profile is needed (boot modes, variables, overlay).
- The profile must pass `mkarchiso --validate` before building.
- A custom `airootfs/` overlay must be injected.

## Startup Workflow

1. **Confirm the Brief** — `arch-distro-design` has already answered all 7 categories. If not, stop and ask for them.
2. **Confirm the host** — the build host must be Arch, and `archiso 91-1` must be installed.
3. **Build the profile** — `profiledef.sh`, `packages.x86_64`, `pacman.conf`, `airootfs/` overlay.
4. **Verify the profile** — run the checks in [Verification](#verification) before calling `mkarchiso`.
5. **Build and freeze** — run `mkarchiso`, then write `out/SHA256SUMS`.
6. **Record the evidence** — see [State & Evidence](#state--evidence).

## Scope

**In scope:** the archiso profile, the package selection, the `airootfs/` overlay, the boot modes, and running `mkarchiso`.

**Out of scope:** the `.img` appliance, the frozen repo contents, the payload materialization, and the desktop layer choice.

| Out of scope | Delegate to |
|---|---|
| Partitioning, `.img`, systemd units | `arch-appliance-img` |
| Building the signed offline repo | `arch-frozen-repo` |
| App manifest, runtime, database | `arch-payload-manifest` |
| Choosing the graphical layer | `arch-desktop-layers` |
| Boot tests in QEMU | `arch-qemu-validation` |
| Writing to physical media | `arch-hardware-handler` |

## Produced artifacts

| Output | Description |
|---|---|
| `out/*.iso` | Bootable ISO (BIOS + UEFI) with a squashfs rootfs |
| `out/SHA256SUMS` | ISO checksums (for versioning) |
| `builder/arch-profile/` | Profile ready for `mkarchiso` |
| `builder/repo-packages.txt` | The subset of the profile's packages to freeze into the offline repo (read by `arch-frozen-repo`) |

## Mandatory workflow

### 1. Receive the `Brief` from `arch-distro-design`

`arch-distro-design` must have already defined the 7 categories.

### 2. Define the profile (`profiledef.sh`)

> The complete profile tree, every `profiledef.sh` variable and the overlay
> map are in `references/profile-layout.md`.

Critical variables that must **always** be declared:

```bash
iso_name="distro-name"
iso_label="LABEL"
iso_publisher="publisher"
iso_application="Description"
install_dir="arch"          # relative, max 30 chars [a-z0-9]
buildmodes=('iso')         # valid: bios.syslinux, uefi.systemd-boot
bootmodes=('bios.syslinux' 'uefi.systemd-boot') # ONLY these 3 in archiso 91-1
pacman_conf="pacman.conf"
packages="packages.x86_64"
bootstrap_packages="bootstrap_packages.x86_64" # MUST EXIST even if empty
airootfs_image_type="squashfs"
kernel_params="console=tty0 console=ttyS0,115200n8"
```

### 3. Package list (`packages.x86_64`)

| Category | Packages (examples — choose according to the Brief's objective) |
|---|---|
| **system base** | `base`, `linux`, `linux-firmware`, `grub`, `efibootmgr` |
| **mandatory archiso** | `mkinitcpio`, `mkinitcpio-archiso`, `syslinux` |
| **builder tools** | `e2fsprogs`, `dosfstools`, `parted`, `arch-install-scripts` |
| **access and maintenance** | `openssh`, `sudo`, `tmux`, `curl`, `rsync`, `wget`, `htop`, `nano`, `vim`, `less`, `usbutils`, `pciutils`, `nftables` |
| **window managers** (choose) | `openbox`, `i3`, `bspwm`, `awesome`, `herbstluftwm`, `jwm`, `fluxbox`, `windowmaker` |
| **file managers** (choose) | `pcmanfm-qt`, `thunar`, `nemo`, `caja`, `rox-filer`, `spacefm`, `ranger`, `nnn`, `lf` |
| **desktop environment** (optional) | `xorg-server`, `xorg-xinit`, `falkon`, `plasma-desktop`, `xfce4`, `gnome`, `mate-desktop` |
| **image viewer** | `feh`, `sxiv`, `imagemagick` |
| **text editor** | `vim`, `nano`, `neovim`, `leafpad`, `mousepad` |
| **NEVER in live** | `base-devel` (~1 GB unused), `calamares` (unless explicitly requested) |

> **⚠️ `community` was merged into `extra`** (2026-11-09). Never declare
> `[community]`: it breaks the build with a 404.

### 4. Profile `pacman.conf`

**⚠️ MANDATORY:** The build host must always be **Arch**. Do not use
`Include = /etc/pacman.d/mirrorlist` (the host may be Manjaro or another distro
and would contaminate the ISO with non-Arch packages).

```ini
[options]
HoldPkg = pacman glibc
Architecture = auto
SigLevel = Required DatabaseOptional
LocalFileSigLevel = Optional
ParallelDownloads = 5

[core]
Server = https://mirror.raiolanetworks.com/archlinux/$repo/os/$arch
Server = https://mirror.dkm.cz/archlinux/$repo/os/$arch
Server = https://mirror.rackspace.com/archlinux/$repo/os/$arch
Server = https://mirrors.dotsrc.org/archlinux/$repo/os/$arch
Server = https://mirror.garr.it/archlinux/$repo/os/$arch

[extra]
Server = https://mirror.raiolanetworks.com/archlinux/$repo/os/$arch
Server = https://mirror.dkm.cz/archlinux/$repo/os/$arch
Server = https://mirror.rackspace.com/archlinux/$repo/os/$arch
Server = https://mirrors.dotsrc.org/archlinux/$repo/os/$arch
Server = https://mirror.garr.it/archlinux/$repo/os/$arch

# 🔴 AUR repository — DO NOT INCLUDE BY DEFAULT.
# AUR packages are not signed by the Arch keyring. SigLevel=Optional
# disables signature verification. Only include it if the Brief explicitly
# authorizes it and the user accepts the risk in writing.
# [aur]
# SigLevel = Optional
# Server = file:///aur-repo
```

> **Minimum 5 servers per repo** (core and extra) to tolerate mirror failures.

> **XferCommand** (CLI flag, not a config directive): `--speed-time 120 --speed-limit 10`
> to tolerate intermittent mirrors.

### 5. `airootfs/` overlay

`mkarchiso` copies `airootfs/.` **with mode 644/755**, which is why
`file_permissions` in `profiledef.sh` is mandatory for executables.

| File | Reason |
|---|---|
| `etc/shadow` | live root password |
| `etc/pacman.conf` | override: `community` repo 404 → own config with `[appliance]` |
| `etc/mkinitcpio.conf.d/archiso.conf` | MANDATORY hooks: `base udev archiso archiso_loop_mnt memdisk microcode` |
| `etc/systemd/system/getty@tty1.service.d/autologin.conf` | tty1 autologin |
| `root/.bash_profile` | `startx` if `tty = /dev/tty1` |
| `root/.xinitrc` | `tint2 &` + `exec openbox-session` (or the WM chosen by the Brief) |
| `root/.xprofile` | Qt/X environment variables |
| `installer/build.sh` | the `.img` builder (asset of `arch-appliance-img`) |
| `installer/payload.sh` | the payload materializer (asset of `arch-payload-manifest`) |
| `installer/load-manifest.sh` | the pure-bash manifest parser (asset of `arch-payload-manifest`) |

#### The installer travels inside the ISO

The other skills ship their scripts as **assets**, and the ISO carries them so
an operator can write an appliance or install a payload straight from the live
session, with no extra downloads:

| Asset | Owner skill | Destination in the profile |
|---|---|---|
| `scripts/build.sh` | `arch-appliance-img` | `airootfs/installer/build.sh` |
| `scripts/payload.sh` | `arch-payload-manifest` | `airootfs/installer/payload.sh` |
| `scripts/load-manifest.sh` | `arch-payload-manifest` | `airootfs/installer/load-manifest.sh` |

Copy them in while assembling the profile:

```bash
set -euo pipefail

PROFILE="builder/arch-profile"

install -Dm755 skills/arch-appliance-img/scripts/build.sh \
  "$PROFILE/airootfs/installer/build.sh"
install -Dm755 skills/arch-payload-manifest/scripts/payload.sh \
  "$PROFILE/airootfs/installer/payload.sh"
install -Dm755 skills/arch-payload-manifest/scripts/load-manifest.sh \
  "$PROFILE/airootfs/installer/load-manifest.sh"
```

> **Why it matters:** `arch-qemu-validation` check #4 asserts that the ISO
> carries the installer, and `arch-payload-manifest` expects
> `installer/payload.sh` to read the manifest. If the profile does not carry
> them, those two steps have nothing to run and the ISO fails its own gate.

### 6. Valid boot modes (archiso 91-1)

| Boot mode | Boot | Requires |
|---|---|---|
| `bios.syslinux` | Legacy BIOS | `syslinux/` with `.cfg` |
| `uefi.systemd-boot` | UEFI systemd-boot | `efiboot/loader/loader.conf` + `.conf` |
| `uefi.grub` | UEFI with GRUB | `grub/` |

> The `.esp` / `.mbr` / `.eltorito` suffixes are **internal** to archiso and
> fail with `return 1`. Do not use them.

### 7. Calling `mkarchiso`

```bash
set -euo pipefail

mkdir -p /var/tmp/archiso-work "$PWD/out"
sudo mkarchiso -v -w /var/tmp/archiso-work -o "$PWD/out" "$PWD/builder/arch-profile"
```

Mandatory pre-checks:
- `work_dir` and `out_dir` exist (`mkdir -p`)
- `bootstrap_packages.x86_64` exists (even if empty)
- Paths are **relative to the profile** (archiso `cd`s into the profile)

### 8. Post-build

```bash
set -euo pipefail

# Work dir cleanup — guarded against empty paths
: "${WORKDIR:=/var/tmp/archiso-work}"
case "$WORKDIR" in
  /|""|/var/tmp|/tmp) echo "❌ Unsafe WORKDIR: $WORKDIR" >&2; exit 1 ;;
esac
rm -rf -- "$WORKDIR"

sha256sum out/*.iso > out/SHA256SUMS
```

## Verification

Run before `mkarchiso`. The script fails fast on the first problem.

```bash
set -euo pipefail

PROFILE="builder/arch-profile"

# 1. The profile has every mandatory file
test -f "$PROFILE/profiledef.sh"
test -f "$PROFILE/packages.x86_64"
test -f "$PROFILE/pacman.conf"
test -f "$PROFILE/bootstrap_packages.x86_64"   # must exist even if empty

# 2. No [community] repo (merged into extra on 2026-11-09 → 404)
! grep -Rqs '^\[community\]' "$PROFILE"

# 3. Only documented boot modes (archiso 91-1)
grep -q 'bootmodes=' "$PROFILE/profiledef.sh"
! grep -qE '\.(esp|mbr|eltorito)' "$PROFILE/profiledef.sh"

# 4. The host mirrorlist is never inherited
! grep -qs 'Include *= */etc/pacman.d/mirrorlist' "$PROFILE/pacman.conf"

# 5. The installer assets are in the overlay (QEMU check #4 depends on it)
test -f "$PROFILE/airootfs/installer/build.sh"
test -f "$PROFILE/airootfs/installer/payload.sh"
test -f "$PROFILE/airootfs/installer/load-manifest.sh"

# 6. Work dir and out dir exist before mkarchiso
mkdir -p /var/tmp/archiso-work "$PWD/out"

echo "✅ Profile is valid for mkarchiso"
```

| Check | Command | Expected |
|---|---|---|
| Valid profile | `mkarchiso -v ... 2>&1 \| head -10` | No ERROR, only INFO |
| No community | `grep -R 'community' builder/arch-profile/` | absent |
| Syslinux exists | `ls builder/arch-profile/syslinux/` | `.cfg` present |
| UEFI exists | `ls builder/arch-profile/efiboot/loader/` | `loader.conf` present |
| XferCommand ok | `grep XferCommand builder/arch-profile/pacman.conf` | has `curl` |

## Permissions and safety

| | |
|---|---|
| **Reads** | the profile directory and the build host's Arch mirrors |
| **Writes** | `builder/arch-profile/`, `out/*.iso`, `out/SHA256SUMS` and `/var/tmp/archiso-work` (removed afterwards) |
| **Requires root** | yes — `mkarchiso` and `pacstrap` need it |
| **Refuses** | a profile that is missing a mandatory file, a `[community]` repo, an inherited host mirrorlist, or an invalid boot mode |
| **Network** | only the Arch mirrors listed in the profile's `pacman.conf`, with signature verification on |
| **Never** | leaves `base-devel` or a GUI installer in the live system unless the Brief asked for them |

## Definition of Done

**Output:** `out/*.iso`, `out/SHA256SUMS` and the profile at `builder/arch-profile/`, plus the `✅ Profile is valid for mkarchiso` line as evidence.

- [ ] Brief completed with all 7 categories **before** starting.
- [ ] `profiledef.sh` declares every critical variable, with **relative** paths.
- [ ] `bootstrap_packages.x86_64` exists (even if empty).
- [ ] Package list holds only what the Brief's objective needs — no `base-devel`, no `calamares` unless explicitly requested.
- [ ] `pacman.conf` uses explicit Arch mirrors, ≥ 5 servers per repo, and never `Include = /etc/pacman.d/mirrorlist`.
- [ ] No `[community]` repo anywhere in the profile.
- [ ] Boot modes limited to `bios.syslinux`, `uefi.grub`, `uefi.systemd-boot`.
- [ ] Every executable in the `airootfs/` overlay is listed in `file_permissions`.
- [ ] `mkarchiso` completed and produced `out/*.iso`.
- [ ] `out/SHA256SUMS` written and re-verified with `sha256sum -c`.

## State & Evidence

| State | Where it lives |
|---|---|
| The build profile | `builder/arch-profile/` |
| Package selection | `builder/arch-profile/packages.x86_64` |
| Frozen-repo package list | `builder/repo-packages.txt` |
| Built ISO and checksums | `out/*.iso`, `out/SHA256SUMS` |
| Pinned versions | `out/versions.txt` (written by `arch-frozen-repo`) |

Record the evidence: the **command** you ran and its **output** — the `✅ Profile is valid for mkarchiso` line, the tail of `mkarchiso`, and the SHA256 of the produced ISO.

## Handoff

| If you touch... | Go to |
|---|---|
| partitioning, .img, DATA | `arch-appliance-img` |
| local signed offline repo | `arch-frozen-repo` |
| KEY=VALUE manifest + runtime | `arch-payload-manifest` |
| desktop, panel, kiosk | `arch-desktop-layers` |
| tests, boot, shutdown | `arch-qemu-validation` |
| "this failed with..." | `arch-archlinux-pitfalls` |
| validate hardware before writing | `arch-hardware-handler` |

## Common errors

> The catalog is the canonical source: `arch-archlinux-pitfalls` holds every
> entry with its context, cause and fix. This table is the short index.

| Error | Cause | Prevention |
|---|---|---|
| `realpath: ''` | Empty variable in profiledef.sh | Relative paths + empty file created |
| `bootmode invalid` | `uefi.systemd-boot.esp` written by hand | Only the 3 documented names |
| `community.db` → **404** | `[community]` in pacman.conf | Remove it; use only core+extra |
| `DisableDownloadTimeout not recognized` | Config flag, not CLI | Use `XferCommand` with curl |
| `pacman --root` relocates `GPGDir` | Not true | Host keyring, empty target |
| `overlay` does not preserve permissions | `cp -af` without `--no-preserve` | `file_permissions` in profiledef.sh |
| Build without completing the Brief | Real objective not met | **MANDATORY**: Brief with 7 categories |
| `base-devel` in live unnecessarily | ~1 GB installed without use | Review the package list |
| `calamares` without an explicit request | Unrequested GUI installer | Do not include it unless the Brief asks for it |
