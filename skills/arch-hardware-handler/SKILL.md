---
name: arch-hardware-handler
description: 'Handles direct Arch Linux hardware interactions: USB writing, disk partitioning verification, hardware compatibility checks, and safe read/write operations. Prevents the "error -71" and data-loss issues from the Lubuntu cycle. Use before writing any .iso/.img to physical media.'
---

# Arch Hardware Handler — Direct Hardware Interaction

Skill for **physical hardware** operations with Arch Linux distributions.
Designed to prevent the errors that destroyed data during the Lubuntu cycle 📏:
sustained writes that leave the USB drive hung (`error -71`), partitioning the
wrong disk, and missing shutdown precautions.

## Purpose

This skill is the **bridge between build artifacts (ISO/.img) and real
hardware**. It is used to:

- Write `.iso` and `.img` files to USB **safely and with validation**.
- Verify that the partition is the expected one **before** mounting.
- Review **hardware compatibility** (UEFI/BIOS, firmware, partition tables).
- Automate **post-write validation**.
- Document the hardware state for future builds.

## When to use this skill

- The user says "write the ISO to the USB", "verify the .img on the disk",
  "is this hardware compatible with Arch?".
- Before writing to a real USB drive, this harness must be used.
- The `DATA` partition must be validated as correctly formed.
- You want to confirm that the system will boot on the target hardware.

## Startup Workflow

1. **Confirm the artifact** — the `.iso` or `.img` exists and its checksum matches `SHA256SUMS`.
2. **Identify the target** — `lsblk -o NAME,SIZE,MODEL`; confirm it is **not** the host root disk.
3. **Validate compatibility** — UEFI firmware, virtio, serial console, free space.
4. **Write safely** — `dd ... conv=fsync` followed by three `sync` calls.
5. **Verify the write** — partition table, labels, and a boot test in BIOS and UEFI.
6. **Record the evidence** — see [State & Evidence](#state--evidence).

## Scope

**In scope:** physical media writes, partition verification on real disks, hardware compatibility checks, and post-write validation.

**Out of scope:** building artifacts, partitioning the appliance image, and running QEMU test suites.

| Out of scope | Delegate to |
|---|---|
| Building the ISO | `arch-iso-builder` |
| Building the `.img` appliance | `arch-appliance-img` |
| Boot tests in QEMU | `arch-qemu-validation` |
| "this hardware does not work" errors | `arch-archlinux-pitfalls` |
| Specific payloads | `arch-payload-manifest` |

## Mandatory workflow

### 1. Pre-write validation

| Check | Command | Expected |
|---|---|---|
| ISO/img file exists and size | `ls -lh <file>` | ~1.2 GB (ISO) or ~10 GB (.img) |
| Checksum OK (if available) | `sha256sum -c SHA256SUMS` | `OK` |
| Space on the destination disk | `df -h <destination_directory>` | Enough space |
| Not writing to the host disk | `lsblk -o NAME,SIZE,MODEL` | Different from host `/dev/sda` |

### 2. Safe ISO write to USB

```bash
set -euo pipefail

# 🔴 Identify the correct USB drive (NEVER the host's /dev/sda or /dev/nvme0n1)
USB=/dev/sdb   # Example: verify with lsblk first

# Guard: the device must exist and be a block device
[[ -b "$USB" ]] || { echo "❌ $USB is not a block device" >&2; exit 1; }

# Guard: never write to the host root disk
ROOT_DISK="$(findmnt -n -o SOURCE / | sed 's/[0-9]*$//')"
[[ "$USB" != "$ROOT_DISK" ]] || { echo "❌ $USB is the host root disk" >&2; exit 1; }

# Guard: it must not be mounted
if mount | grep -q "^$USB"; then
  echo "❌ $USB is mounted. Unmount it first." >&2; exit 1
fi

# 1. Unmount partitions if they were mounted
umount "${USB}"? 2>/dev/null || true

# 2. Write the ISO (dd with fsync, no blind blocks)
sudo dd bs=4M if="$ISO" of="$USB" conv=fsync status=progress

# 3. FORCE synchronization (lesson from the Lubuntu cycle)
sync
sync
sync
```

#### ⚠️ Critical lesson (Lubuntu cycle)

| Action | Result | Recommendation |
|---|---|---|
| `kill -9` on QEMU during a write | USB hung, `error -71` | **NEVER** use `kill -9` |
| `system_powerdown` via QMP | Graceful shutdown, USB intact | `echo '{"execute":"system_powerdown"}' \| socat - UNIX-CONNECT:/tmp/qmp.sock` |
| `sync` three times before removing the USB | Consistent data | Always `sync` before `umount` |

### 3. Post-write validation

| Check | Command | Expected |
|---|---|---|
| GPT partition table | `parted -s $USB print` | `gpt`, 3 partitions (EFI+SYS+DATA) |
| EFI partition labeled | `lsblk -o NAME,FSTYPE,LABEL $USB` | `vfat` |
| SYS (root) partition | `lsblk -o NAME,FSTYPE,LABEL $USB` | `ext4` |
| DATA partition | `lsblk -o NAME,FSTYPE,LABEL $USB` | `ext4`, label `DATA` |
| The USB boots in BIOS | QEMU `-cdrom $ISO -boot d` → prompt | login |
| The USB boots in UEFI | QEMU `-drive if=pflash ...` → prompt | login |
| `findmnt / / /data` (after boot) | `ext4` + `ext4` + `DATA` | correct |

### 4. Partitioning a new disk (for the .img appliance)

```bash
set -euo pipefail

# 1. Verify the minimum size
TAMANO_GB=$(lsblk -d -o SIZE "$DESTINO" | tail -1 | numfmt --from=iec --suffix=B)
if (( $(echo "$TAMANO_GB < 8" | bc -l) )); then
    echo "❌ Disk < 8 GB: abort — the model requires at least 8 GB"
    exit 1
fi

# 2. Guard: it is not the host disk
ROOT_DISK="$(findmnt -n -o SOURCE / | sed 's/[0-9]*$//')"
[[ "$DESTINO" != "$ROOT_DISK" ]] || { echo "❌ $DESTINO is the root disk" >&2; exit 1; }

# 3. Clean GPT table
parted -s "$DESTINO" mklabel gpt

# 4. EFI partition (512 MB)
parted -s "$DESTINO" mkpart primary fat32 1MiB 513MiB
parted -s "$DESTINO" set 1 esp on

# 5. SYS partition (~6 GB)
parted -s "$DESTINO" mkpart primary ext4 513MiB 6513MiB

# 6. DATA partition (remainder, label DATA)
parted -s "$DESTINO" mkpart primary ext4 6513MiB -0s
parted -s "$DESTINO" name 3 "DATA"
parted -s "$DESTINO" set 3 lba on

# 7. Format
mkfs.vfat -F32 "${DESTINO}1"
mkfs.ext4 "${DESTINO}2"
mkfs.ext4 -L DATA "${DESTINO}3"
```

### 5. Hardware compatibility check

| Component | Verification command | Expected |
|---|---|---|
| UEFI firmware | `ls /usr/share/edk2/x64/OVMF.*.fd` | `OVMF_CODE.4m.fd` + `OVMF_VARS.4m.fd` |
| virtio support (for .img) | `lspci -nnk \| grep -i virtio` | Driver loaded or available |
| Serial console (ttyS0) | `dmesg \| grep -i uart` | `16550A` or compatible |
| Minimum space for ISO | `df -h /` | ≥ 5 GB free in work_dir |
| Minimum space for .img | `df -h /` | ≥ 20 GB free |

## Verification

Run before writing to physical media and again after. The script fails fast on
the first problem.

```bash
set -euo pipefail

USB="${1:?usage: verify-hardware.sh <device> <iso-or-img>}"

# 1. The device exists and is a block device
[[ -b "$USB" ]] || { echo "❌ $USB is not a block device" >&2; exit 1; }

# 2. It is NOT the host's root disk
ROOT_DISK="$(findmnt -n -o SOURCE / | sed 's/[0-9]*$//')"
[[ "$USB" != "$ROOT_DISK" ]] || { echo "❌ $USB is the host root disk" >&2; exit 1; }

# 3. It is not currently mounted
if mount | grep -q "^$USB"; then
  echo "❌ $USB is mounted. Unmount it first." >&2; exit 1
fi

# 4. The artifact checksum matches
sha256sum -c SHA256SUMS

# 5. Enough space on the destination
df -h .

echo "✅ Target device validated"
```

| Check | Command | Expected |
|---|---|---|
| ISO/img file exists and size | `ls -lh <file>` | ~1.2 GB (ISO) or ~10 GB (.img) |
| Checksum OK (if available) | `sha256sum -c SHA256SUMS` | `OK` |
| Space on the destination disk | `df -h <destination_directory>` | Enough space |
| Not writing to the host disk | `lsblk -o NAME,SIZE,MODEL` | Different from host `/dev/sda` |

## Definition of Done

- [ ] Target device identified with `lsblk` and confirmed **not** to be the host root disk.
- [ ] Artifact checksum verified with `sha256sum -c SHA256SUMS`.
- [ ] Write performed with `dd bs=4M ... conv=fsync`.
- [ ] `sync` executed **three** times before unmounting or removing the media.
- [ ] QEMU (if used) was shut down **gracefully** via QMP `system_powerdown` — never `kill -9`.
- [ ] Post-write validation passed: GPT table, EFI/SYS/DATA labels, boot in BIOS and UEFI.
- [ ] USB model and capacity recorded in `hardware-log.txt`.
- [ ] Any incompatibility tagged as `hardware::incompatible` in the commit message.

## State & Evidence

| State | Where it is stored |
|---|---|
| USB model + capacity | `hardware-log.txt` in the project repo |
| ISO/.img checksum | `SHA256SUMS` (already committed) |
| `sync` success/failure | Comment in `docs/08-LECCIONES-APRENDIDAS.md` |
| Incompatible hardware | Tag in the `git commit`: `hardware::incompatible` |

Record the evidence: the **command** you ran and its **output** — the `✅ Target device validated` line, the `parted` table after the write, and the boot result.

## Handoff

| If you touch... | Go to |
|---|---|
| Writing the ISO to USB | `arch-iso-builder` |
| Partitioning the .img from scratch | `arch-appliance-img` |
| QEMU validation after writing | `arch-qemu-validation` |
| "this hardware does not work" errors | `arch-archlinux-pitfalls` |
| Specific payloads | `arch-payload-manifest` |

## Common errors and prevention

| Error | Symptom | Prevention |
|---|---|---|
| `error -71` when removing the USB | Sustained write without `sync` + `kill -9` | `sync` 3 times; never `kill -9` |
| Partitioning `/dev/sda` (host) | Destroys the system disk | Always run `lsblk` first; guard with `ROOT_DISK` |
| `ffs: bad journal` on DATA | `mkfs.ext4` without `-L DATA` or without the `lba` flag | Exact syntax from this skill |
| ISO does not boot (black screen) | `community` repo 404 leaves systemd in an error state | Verify `pacman -Sy` before removing the USB |
| `root=UUID=` not found | Old GRUB, stale PARTUUID | `grub-mkconfig` after partitioning |

## Hardware operations checklist (paste in the work area)

```text
=== ARCH HARDWARE CHECKLIST ===
1. ✅ Identify the correct USB: lsblk -o NAME,SIZE,MODEL
2. ✅ Confirm it is NOT the host root disk
3. ✅ Unmount previous partitions: umount "${USB}"?
4. ✅ Write with `dd bs=4M ... conv=fsync`
5. ✅ `sync` three times in a row
6. ✅ `sha256sum -c SHA256SUMS` (if present)
7. ✅ `parted -s $USB print` → EFI 512 MB · SYS · DATA
8. ✅ `mount -L DATA /tmp/test` → readable, no error
9. ✅ `findmnt / / /data` after boot → 3 mounts OK
10. ✅ Never `kill -9` QEMU or write processes
11. ✅ Document the USB model and capacity in the log
=== END CHECKLIST ===
```

## Methodology

1. **Confirm assumptions** — `lsblk`, `parted`, `df` before touching hardware.
2. **Measure, do not assume** — actual sizes, expected throughput, free space.
3. **Test in QEMU first** — `arch-qemu-validation` before real hardware.
4. **Document everything** — `error -71`, `bad journal`, and wrong partitions do not happen again.

## Integration with the skill group

This skill covers the **gap** between build artifacts (ISO/.img) and physical
hardware. While the other skills build the artifacts in software,
`arch-hardware-handler` ensures they arrive alive on the hardware and that the
hardware is compatible.
