# The EFI + SYS + DATA layout

> Supporting file for `arch-appliance-img`. The complete partition reference.

## The scheme

| # | Partition | Type | Size | Mount | Label |
|---|---|---|---|---|---|
| 1 | EFI | `vfat` | 512 MB (fixed) | `/boot` | — |
| 2 | SYS | `ext4` | by disk size | `/` | `SYS` |
| 3 | DATA | `ext4` | remainder | `/data` | `DATA` |

## Size bands

| Target disk | EFI | SYS | DATA |
|---|---|---|---|
| **< 8 GB** | — | — | — | **reject**: the model needs at least 8 GB |
| **8–10 GB** | 512 MB | 3 GB | 2 GB |
| **10–20 GB** | 512 MB | 6 GB | 5 GB |
| **> 20 GB** | 512 MB | 20 GB | remainder |

Hard rules:

- Disk **< 8 GB** → abort.
- SYS **< 6 GB** → abort.
- EFI is **fixed** at 512 MB.
- DATA's label is always `DATA`.

## The command sequence

```bash
set -euo pipefail

DISK="/path/to/target.img"

parted -s "$DISK" mklabel gpt
parted -s "$DISK" mkpart primary fat32 1MiB 513MiB
parted -s "$DISK" set 1 esp on
parted -s "$DISK" mkpart primary ext4 513MiB 6513MiB
parted -s "$DISK" mkpart primary ext4 6513MiB -0s
partprobe
sync

mkfs.vfat -F32 "${DISK}1"
mkfs.ext4 -L SYS "${DISK}2"
mkfs.ext4 -L DATA "${DISK}3"
```

> The `1MiB` offset leaves room for the GPT header. The `513MiB` boundary is
> 512 MB + 1 MiB — keep both numbers identical across every script.

## Why DATA is a separate partition

| Requirement | How it is met |
|---|---|
| Mountable on **another** machine | `LABEL=DATA` + `ext4` |
| No reformat needed | `mkfs.ext4 -L DATA` |
| Never touches the target's OS | it mounts only `/data` |
| Survives a reinstall of the base OS | it lives outside the SYS partition |

```bash
# On the host, after the appliance is shut down
mkdir -p /mnt/data
mount -L DATA /mnt/data
ls /mnt/data/          # readable, no password, no reformat
umount /mnt/data
```

## What goes in each partition

| Partition | Contents |
|---|---|
| EFI | the bootloader only (`grub-install --efi-directory=/mnt/boot`) |
| SYS | the installed rootfs: `/etc`, `/usr`, `/opt` (the payloads) |
| DATA | `/data`: the persistent data — app data, `/data/update-log/`, the payloads' `src/` |

`/opt` holds the payloads and `/data` holds their data: that split is what
makes an appliance upgradeable without losing state.

## The fstab entries

```bash
genfstab -U /mnt >> /mnt/etc/fstab
echo "LABEL=DATA /data ext4 defaults 0 2" >> /mnt/etc/fstab
```

Use `LABEL=`, never a device path: the partition numbers change when the image
is written to a different medium.
