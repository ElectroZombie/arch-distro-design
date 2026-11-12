---
name: arch-archlinux-pitfalls
description: 'Living catalog of the real errors hit while building Arch Linux ISOs and appliances, each with its cause and its fix: community.db 404, realpath aborts, DisableDownloadTimeout, error -71, SDDM hangs and more. Use when the user asks "why did this fail", "what went wrong with mkarchiso", "consult the known Arch pitfalls", "the build broke with X" or "how do I fix this Arch error".'
---

# arch-archlinux-pitfalls — Real-World Error Catalog

> **This is the empirical record** of the errors found while developing Arch
> Linux distributions based on the `arch-distro-design` skill. Any agent or user
> building an Arch ISO/appliance must review this before starting the build.

## Startup Workflow

> A symptom → entry index, for jumping straight to the failure you are
> looking at, is in `references/symptom-index.md`.

1. **Consult before building** — read the entries that match the stage you are about to run.
2. **Profile errors first** — `realpath`, boot modes, `[community]`, `DisableDownloadTimeout`.
3. **Install errors next** — `mkinitcpio`, overlay permissions, `/etc/shadow`.
4. **Hardware errors last** — `error -71`, `bad journal`, wrong disk.
5. **Record what you hit** — a new real failure is added here with its cause and its fix.

## Scope

**In scope:** the empirical catalog of real, dated failures — what broke, why, and the fix.

**Out of scope:** the design decisions, the build steps themselves, and the validation gates.

| Out of scope | Delegate to |
|---|---|
| Deciding the artifact and the layers | `arch-distro-design` |
| Building the ISO | `arch-iso-builder` |
| Building the `.img` appliance | `arch-appliance-img` |
| Boot tests in QEMU | `arch-qemu-validation` |
| Physical media writes | `arch-hardware-handler` |

## Design errors and an incomplete Brief

### 1. Incomplete Brief

**Context:** The `arch-distro-design` skill establishes that the 7 mandatory
categories must **always** be completed before starting the design. When this
step is skipped, the final artifact does not meet the user's real objective.

**Cause:** The agent or user starts the design without first answering the
mandatory `Brief` questions:
- Objective, Output format, Hardware, Network, Apps/Payloads, Immutability,
  Update policy.

**Solution:** **NEVER** start designing an ISO or appliance without first
completing the `Brief`. If the `Brief` is incomplete, stop the process and ask
for the 7 categories.

**New rule:**

| Check | Requirement |
|---|---|
| `brief_completed` | All 7 categories must be signed off in `brief.md` |
| `objective_defined` | The system objective must be clear |
| `output_format` | Live ISO, persistent .img, or both |
| `hardware_identified` | UEFI/BIOS/USB/SSD/NVMe |
| `network_policy` | Network policy decided (default `inactive`) |
| `apps_payloads` | Apps and payloads declared (never vendored) |
| `update_policy` | Update policy defined |

---

## Profile and `mkarchiso` errors

### 2. `realpath: '': No such file or directory`

**Context:** `mkarchiso` aborts on the first useful line with this error, which
does not mention which path or variable is to blame.

**Cause:** `mkarchiso` resolves three profile paths with `realpath`
(`packages`, `bootstrap_packages`, `pacman_conf`). If any of them is empty:
- `realpath -- ""` → immediate error
- `bootstrap_packages.x86_64` **must exist** (even if empty)

**Solution:**
- All paths in `profiledef.sh` must be **relative to the profile**
- Create `bootstrap_packages.x86_64` even if empty (`touch`)
- Never leave variables undefined

### 3. archiso 91-1 boot modes

**Context:** `uefi.systemd-boot.esp` and `uefi.systemd-boot.eltorito` →
`is not a valid boot mode!`. `bios.syslinux.mbr` → "deprecated".

**Cause:** Those suffixes (`.esp`, `.mbr`, `.eltorito`) are **internal
functions** of archiso, not `bootmodes` values.

**Only these are valid:**

| Boot mode | Purpose |
|---|---|
| `bios.syslinux` | Legacy BIOS + syslinux |
| `uefi.grub` | UEFI with GRUB |
| `uefi.systemd-boot` | UEFI with systemd-boot |

**Rule:** Never write `.esp` / `.mbr` / `.eltorito` suffixes by hand.

### 4. `community.db` → **404** on every mirror 📏 2026-11-09

**Context:** The build died with `error: failed retrieving file 'community.db'
from geo.mirror.pkgbuild.com : 404`.

**Cause:** **Arch merged the `community` repo into `extra`**. `community` no
longer exists.

**Solution:** Profile `pacman.conf` with `[core]` + `[extra]` only.

**Rule:** On a rolling distro, **never** assume a repo still exists. Verify
against the API/mirror before writing `pacman.conf`.

### 5. The build host is Manjaro: it contaminates the ISO 📏

**Context:** A `pacman.conf` with `Include = /etc/pacman.d/mirrorlist` downloads
packages from a **non-Arch distribution**.

**Cause:** On non-Arch distributions, `/etc/pacman.d/mirrorlist` points to their
own repos. With `Include`, the ISO "works" but is not Arch Linux.

**Solution:** Profile `pacman.conf` with **explicit** `Server =` entries and Arch
mirrors. Overlay `airootfs/etc/pacman.conf` so the live system does not inherit
the `pacman` package's config either.

**Rule:** On a non-Arch host, the profile `pacman.conf` **never** uses `Include`.

### 6. Geolocated / slow mirrors 📏

**Context:** `Operation too slow. Less than 1 bytes/sec transferred the last 10
seconds` and the build aborted.

**Cause:** The "geo" mirror resolved to a slow node from this network.

**Solution:** Three `Server =` entries per repo (automatic fallback) with the
fastest first, and `XferCommand` with curl.

**Rule:** Measure throughput **before** building an ISO. Do not trust the
"default" mirror.

### 7. `DisableDownloadTimeout` does not exist in `pacman.conf` (pacman 7)

**Context:**

```text
warning: config file .../pacman.conf, line 32: directive 'DisableDownloadTimeout' in section 'options' not recognized.
```

**Cause:** In pacman 7 it is **only a CLI flag**
(`--disable-download-timeout`); the `pacman.conf` parser does not expose it as a
directive.

**Solution:** The configuration equivalent is `XferCommand` with curl:

```ini
XferCommand = /usr/bin/curl -sSfL --retry 5 --retry-delay 3 --speed-time 120 --speed-limit 10 -o %o %u
```

`--speed-time 120 --speed-limit 10` aborts only if the speed drops below 10 B/s
for 120 s.

**Extra trap:** `curl -C -` (resume) **fails** if the destination file does not
exist. Do not use `-C -` with `XferCommand`.

**Rule:** When you see `directive ... not recognized`, check whether the option
is a CLI option (`pacman --help`) before looking for a replacement.

### 8. `pacman --root` does NOT relocate `GPGDir` 📏

**Context:** Concern about `pacstrap -G`, which avoids copying the keyring to the
target, so `SigLevel = Required` would not find keys.

**Cause proven empirically:**

| Scenario | Result |
|---|---|
| `pacman --root R -U pkg` (empty keyring in R) | ✅ **verifies** → uses the **host's** `/etc/pacman.d/gnupg` |
| `pacman --root --gpgdir R/etc/pacman.d/gnupg -U pkg` (empty) | ❌ `required key missing from keyring` |

`pacman --root` only relocates `DBPath`, `CacheDir`, `LogFile`, and `RootDir`;
`GPGDir` still points to the host.

**Solution:** The host already has `archlinux-keyring` installed. The target is
left with an empty keyring on purpose → `pacman-init.service` initializes it on
first boot.

**Rule:** The build host needs `archlinux-keyring` installed with Arch's master
keys imported.

### 9. `mkinitcpio` + `mkinitcpio-archiso` are mandatory

**Context:** Without `mkinitcpio-archiso`, the initramfs does not include the
`archiso` hook → kernel panic when mounting the squashfs.

**Cause:** `README.profile.rst` marks them as *mandatory*.

**Solution:** Both packages in `packages.x86_64` + the hooks file in the overlay
(`airootfs/etc/mkinitcpio.conf.d/archiso.conf`).

**Rule:** Without `mkinitcpio-archiso` there is no live system. It is not optional.

### 10. The `airootfs` overlay does not preserve permissions or owners

**Context:** `root/.xinitrc` arrives at the target with mode **644** → `startx`
cannot execute it.

**Cause:** `mkarchiso` copies with `cp -af --no-preserve=ownership,mode` and
everything ends up as root:root, 644/755.

**Solution:** `file_permissions` in `profiledef.sh`:

```bash
file_permissions=(
  ["/etc/shadow"]="0:0:400"
  ["/root"]="0:0:750"
  ["/root/.xinitrc"]="0:0:755"
)
```

**Rule:** Every executable in the overlay goes in `file_permissions`.

### 11. `customize_airootfs.sh` is deprecated

**Context:** The old post-install mechanism is no longer the official path.

**Cause:** The archiso 91-1 CHANGELOG says: *"Use pacman hooks for things
previously done in `customize_airootfs.sh`"* and *"Remove `customize_airootfs.sh`
from the vendored profiles*".

**Solution:** The overlay (`airootfs/`) + `file_permissions` cover what is
needed; for the rest, pacman hooks in `airootfs/etc/pacman.d/hooks/`.

**Rule:** Do not write `customize_airootfs.sh` in new profiles.

### 12. The overlay's `/etc/shadow` survives the `filesystem` package

**Context:** Concern: if `filesystem` (which ships `/etc/shadow` as a
*conffile*) were installed on top, the live root password would be lost.

**Verified cause:** The `filesystem` package declares `backup = etc/shadow` and
`backup = etc/passwd`, and only ships the `root` entry. Pacman handles modified
conffiles: it **keeps** the existing one and writes a `.pacnew`, which archiso
then deletes (`_cleanup_pacstrap_dir`).

**Solution:** Overlay with `/etc/shadow` (SHA-512 hash) and `file_permissions`
`0:0:400`.

**Rule:** Overlay conffiles are preserved; but they must be **complete**.

### 13. `mkarchiso` requires `-w` and `-o` to already exist

**Context:** `realpath -- "$work_dir"` and `realpath -- "$out_dir"` abort if the
paths do not exist.

**Solution:** `mkdir -p` before invoking `mkarchiso`.

### 14. Lessons inherited from the lost Lubuntu cycle 📏

| Lesson | Application |
|---|---|
| Never `--bind=/usr` from the host inside a target rootfs | Clean `pacstrap` target |
| GRUB needs `root=UUID=` (virtio = `/dev/vda`) | `build.sh` generates the UUID |
| The **last** `console=` receives `/dev/console` | `console=tty0 console=ttyS0,115200n8` (serial last) |
| Long serial syntax in GRUB 2.12 | `serial --unit=0 --speed=115200 --word=8 --parity=no --stop=1` |
| Never `mkfs`/`parted` without reviewing the target disk | `build.sh` with double confirmation and guards |
| Always `e2fsck` before `resize2fs` | Resize script in the project repo |
| Shut QEMU down gracefully (`system_powerdown`) | QEMU validation script with clean shutdown |
| SDDM hung → no display manager | Openbox + tint2 + autologin on tty1 |
| systemd `WorkingDirectory=` does **not** strip quotes | Paths without spaces (symlink) |
| Prisma CLI lives in `node_modules/.bin/prisma` | Documented in the manifest |
| Explicit `sslmode` in staging/production | `DATABASE_URL=...&sslmode=disable` |

### 15. Network and update policy

**Rule:**
- Network **disabled** by default: `systemctl is-active systemd-networkd` → `inactive`
- Updates: `pacman -Syu` with networkd temporarily up
- Version log: `versions.txt` committed after every build
- Only `appliance-update.service` writes to root

### 16. Display manager = hang

**Context:** SDDM hung and the system became unusable.

**Rule:** **No display manager.** The graphical session is started by `startx`
from a `getty@tty1` autologin.

### 17. Errors derived from an incomplete Brief

| Error | Symptom | Consequence |
|---|---|---|
| Objective not defined | The system is technically valid but useless | The user does not get what they expected |
| Unknown output format | ISO when the user wanted a .img | Wasted time and space |
| Hardware not validated | `error -71`, partition on the wrong disk | Data loss |
| Network not defined | The admin does not know how to update | Too little or too much connectivity |
| Apps/Payloads not declared | The payload does not install or overwrites things | The system does not work as expected |
| Update policy undefined | The admin cannot update | The system becomes obsolete |

### 18. Corrected methodology (with mandatory Brief)

1. **Apply the mandatory Brief** — 7 categories before writing a line.
2. **Design with decisions made** — do not guess.
3. **Validate empirically** — measure, do not assume.
4. **Document the error** — every real failure goes into this table.
5. **Build the artifact** — the design is already complete.
6. **Verify with QEMU** — `arch-qemu-validation` before real hardware.
7. **Validate hardware** — `arch-hardware-handler` if writing to disk is involved.

**Rule:** A design that does not complete the **mandatory Brief** **must not**
advance to the construction phase.

## Verification

The catalog is only useful if it is complete and current. Run this before
starting a build, and again after recording a new failure.

```bash
set -euo pipefail

CATALOG="skills/arch-archlinux-pitfalls/SKILL.md"

# 1. Every entry is numbered, and there are enough of them
entries="$(grep -c '^### [0-9]' "$CATALOG")"
[[ "$entries" -ge 18 ]] || { echo "❌ expected >= 18 entries, found $entries" >&2; exit 1; }

# 2. The classic failures are all still present
for known in 'realpath' 'boot mode' 'community.db' 'DisableDownloadTimeout' \
              'error -71' 'mkinitcpio-archiso' 'customize_airootfs.sh'; do
  grep -qi "$known" "$CATALOG" || { echo "❌ missing known failure: $known" >&2; exit 1; }
done

# 3. Entries are dated so they can be aged
grep -q '📏' "$CATALOG"

echo "✅ Pitfalls catalog verified ($entries entries)"
```

| Check | Expected |
|---|---|
| Entry count | ≥ 18 numbered entries |
| Known failures present | realpath, boot modes, community 404, DisableDownloadTimeout, error -71, mkinitcpio-archiso, customize_airootfs.sh |
| Dating | at least one entry carries the 📏 marker and a date |
| Structure | every entry has a context, a cause and a solution (or their equivalent) |

## Definition of Done

**Output:** a numbered, dated catalog entry with its context, cause and fix, plus the `✅ Pitfalls catalog verified (N entries)` line as evidence.

- [ ] The new failure is recorded with its context, its cause and its fix.
- [ ] The entry is numbered and dated (📏 YYYY-MM-DD).
- [ ] The affected skills are cross-referenced — the entry says which skill must now check it.
- [ ] The "Common errors" table of the affected skill points at the new entry.
- [ ] The catalog still passes the verification script.

> **This catalog is the single source of truth** for the failures below. The
> "Common errors" tables in the other skills are short indexes into it — when
> an entry changes here, update the index, not the reasoning.

## State & Evidence

| State | Where it lives |
|---|---|
| The catalog itself | `skills/arch-archlinux-pitfalls/SKILL.md` |
| Cross-references from other skills | the "Common errors" tables of the affected skills |
| Build evidence behind an entry | the relevant artifact's checklist result |
| Pinned versions at the time of the failure | `out/versions.txt` |

Record the evidence: the **command** you ran and its **output** — the `✅ Pitfalls catalog verified (N entries)` line plus the entry number and date you added.

## Handoff

| If you are touching... | Go to |
|---|---|
| The design and the Brief | `arch-distro-design` |
| The ISO build | `arch-iso-builder` |
| The `.img` appliance | `arch-appliance-img` |
| The frozen repo | `arch-frozen-repo` |
| Boot tests | `arch-qemu-validation` |
| Physical media writes | `arch-hardware-handler` |
