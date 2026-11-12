# The hardware checklist and compatibility matrix

> Supporting file for `arch-hardware-handler`.

## Pre-write checklist

Run before anything touches physical media.

```text
=== ARCH HARDWARE CHECKLIST ===
1. ✅ Identify the correct device: lsblk -o NAME,SIZE,MODEL
2. ✅ Confirm it is NOT the host root disk
3. ✅ Unmount previous partitions: umount "${USB}"?
4. ✅ Write with `dd bs=4M ... conv=fsync`
5. ✅ `sync` three times in a row
6. ✅ `sha256sum -c SHA256SUMS` (if present)
7. ✅ `parted -s $USB print` → EFI 512 MB · SYS · DATA
8. ✅ `mount -L DATA /tmp/test` → readable, no error
9. ✅ `findmnt / / /data` after boot → 3 mounts OK
10. ✅ Never `kill -9` QEMU or a write process
11. ✅ Document the USB model and capacity in the log
=== END CHECKLIST ===
```

## The three guards

The write is refused unless all three pass:

```bash
# 1. It is a block device
[[ -b "$USB" ]] || { echo "❌ $USB is not a block device" >&2; exit 1; }

# 2. It is not the host root disk
ROOT_DISK="$(findmnt -n -o SOURCE / | sed 's/[0-9]*$//')"
[[ "$USB" != "$ROOT_DISK" ]] || { echo "❌ $USB is the host root disk" >&2; exit 1; }

# 3. It is not mounted
if mount | grep -q "^$USB"; then
  echo "❌ $USB is mounted. Unmount it first." >&2; exit 1
fi
```

## The safe write

```bash
set -euo pipefail

sudo dd bs=4M if="$ISO" of="$USB" conv=fsync status=progress

# Three syncs before the media is removed. Two is not enough.
sync
sync
sync
```

`conv=fsync` makes `dd` flush at the end of the write; the three `sync` calls
flush the **page cache** the kernel still holds. Skipping them is what leaves
the USB hung with `error -71` on the next use.

## Shutting QEMU down

```bash
echo '{"execute":"system_powerdown"}' | socat - UNIX-CONNECT:/tmp/qmp.sock
wait $QEMU_PID
sync
```

`kill -9` on QEMU during a write is the single most expensive mistake in the
Lubuntu cycle: the USB came back with `error -71`.

## Compatibility matrix

| Component | Verification command | Expected |
|---|---|---|
| UEFI firmware | `ls /usr/share/edk2/x64/OVMF.*.fd` | `OVMF_CODE.4m.fd` + `OVMF_VARS.4m.fd` |
| virtio support (for `.img`) | `lspci -nnk \| grep -i virtio` | driver loaded or available |
| Serial console (ttyS0) | `dmesg \| grep -i uart` | `16550A` or compatible |
| Space for an ISO | `df -h /` | ≥ 5 GB free in the work dir |
| Space for a `.img` | `df -h /` | ≥ 20 GB free |

> On Arch the OVMF files use the **`.4m.fd`** suffix. `OVMF_VARS.4m.fd` is
> writable and QEMU corrupts a shared copy — copy it fresh on every run.

## Post-write validation

| Check | Command | Expected |
|---|---|---|
| GPT partition table | `parted -s $USB print` | `gpt`, 3 partitions |
| EFI partition | `lsblk -o NAME,FSTYPE,LABEL $USB1` | `vfat` |
| SYS partition | `lsblk -o NAME,FSTYPE,LABEL $USB2` | `ext4` |
| DATA partition | `lsblk -o NAME,FSTYPE,LABEL $USB3` | `ext4`, label `DATA` |
| Boots in BIOS | QEMU `-cdrom $ISO -boot d` | login prompt |
| Boots in UEFI | QEMU `-drive if=pflash ...` | login prompt |
| Mounts after boot | `findmnt / / /data` | ext4 + ext4 + DATA |

## The hardware log

Every operation leaves a record:

| Data | Where |
|---|---|
| USB model + capacity | `hardware-log.txt` in the project repo |
| Artifact checksum | `SHA256SUMS` (already committed) |
| `sync` success or failure | an entry in `hardware-log.txt` |
| Incompatible hardware | tagged in the commit: `hardware::incompatible` |
