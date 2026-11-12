---
name: arch-appliance-img
description: 'Build persistent Arch .img appliances with EFI+SYS+DATA partitions: GPT partitioning, pacstrap installation, systemd services and a DATA partition portable across machines. Use when the user asks to "build an appliance", "create a persistent .img", "make a disk image for a kiosk", "set up EFI+SYS+DATA" or "install Arch onto a disk image".'
---

# Arch Appliance Image Builder — General Purpose

Skill for creating persistent Arch Linux `.img` images with EFI (512 MB), SYS
(root) and DATA (label `DATA`) partitions. It works for **any** Arch appliance.
The .img is self-sufficient: it contains the entire OS and the data, and the
DATA partition can be mounted on another machine without touching the OS.

## ⚠️ MANDATORY: prior Brief

> **Directive from `arch-distro-design`:** This skill must **NEVER** be invoked
> without first completing the design `Brief` (7 mandatory categories).

| Category | What it defines for this skill |
|---|---|
| **Objective** | If it is a persistent .img, it defines partitioning and DATA size |
| **Output format** | Determines whether we build a .img or ISO+.img |
| **Target hardware** | Minimum 8 GB disk, type (HDD/SSD/NVMe/USB). Validate with `arch-hardware-handler` |
| **Network** | networkd policy: `inactive` by default, the admin enables it |
| **Apps / Payloads** | Whether they go in the .img or are materialized later on the appliance |
| **Immutability** | Whether root is rw with an update-unit rule, or squashfs |
| **Update policy** | How it updates (by default `pacman -Syu` with temporary networkd) |

> **If the `Brief` is not complete, stop the invocation and ask the user for
> the 7 mandatory categories.**

## When to use this skill

- The user wants an `.img` image instead of (or after) an ISO.
- `arch-distro-design` has already made decisions about partitioning and objectives.
- A portable DATA partition (`DATA`) is needed, mountable on another machine.
- A persistent system with systemd services, ssh, and EFI+SYS+DATA partitioning
  is needed.
- The appliance must be validated in QEMU before writing it to a real USB drive.

## Startup Workflow

1. **Confirm the Brief** — `arch-distro-design` has already answered all 7 categories, including the target disk size.
2. **Confirm the target disk** — run `lsblk -o NAME,SIZE,MODEL` and confirm it is **not** the host's `/dev/sda`.
3. **Partition and install** — `parted`, `mkfs`, `pacstrap`, chroot configuration.
4. **Verify** — run the checks in [Verification](#verification), then validate in QEMU (`arch-qemu-validation`).
5. **Record the evidence** — see [State & Evidence](#state--evidence).

## Scope

**In scope:** the EFI+SYS+DATA partition table, the `pacstrap` installation, the chroot configuration, the systemd services, and the portable DATA partition.

**Out of scope:** the live ISO, the frozen repo contents, the payload code, and any physical media write.

| Out of scope | Delegate to |
|---|---|
| archiso profile and live ISO | `arch-iso-builder` |
| Signed offline repo | `arch-frozen-repo` |
| App manifest, runtime, database | `arch-payload-manifest` |
| Graphical layer, panel, kiosk | `arch-desktop-layers` |
| Boot tests in QEMU | `arch-qemu-validation` |
| Writing to a real USB drive | `arch-hardware-handler` |

## ⚠️ MANDATORY: validation with `arch-hardware-handler`

Before writing to any physical disk or creating .imgs, go through the
`arch-hardware-handler` checklist:

1. ✅ Identify the correct disk: `lsblk -o NAME,SIZE,MODEL` — it is NOT the host's `/dev/sda`
2. ✅ Confirm the minimum size: ≥ 8 GB
3. ✅ Clean GPT partitioning: `parted -s "$DESTINO" mklabel gpt`
4. ✅ EFI (512 MB), SYS, DATA partitions with label `DATA`
5. ✅ Formatting: `mkfs.vfat -F32 "${DESTINO}1"`, `mkfs.ext4 "${DESTINO}2"`,
   `mkfs.ext4 -L DATA "${DESTINO}3"`
6. ✅ `sync` three times after writing

## Partitioning parameters (size rule)

> The full scheme, the size bands and the exact `parted` sequence are in
> `references/partition-table.md`.

| Disk size | Partition | Size | Type | Mount |
|---|---|---|---|---|
| **< 8 GB** | ❌ Reject | Disk too small for the model | | |
| **8–10 GB** | EFI | 512 MB | vfat | `/boot` |
| | SYS | 3 GB | ext4 | `/` |
| | DATA | 2 GB | ext4 | `/data` (label `DATA`) |
| **10–20 GB** | EFI | 512 MB | vfat | `/boot` |
| | SYS | 6 GB | ext4 | `/` |
| | DATA | 5 GB | ext4 | `/data` (label `DATA`) |
| **> 20 GB** | EFI | 512 MB | vfat | `/boot` |
| | SYS | 20 GB | ext4 | `/` |
| | DATA | Remaining GB | ext4 | `/data` (label `DATA`) |

> **Mandatory rules:**
> - Disk < 8 GB → abort
> - SYS < 6 GB → abort
> - EFI FIXED at 512 MB
> - DATA label = `DATA`
> - The filesystem on the DATA partition must be **mountable on another machine**
>   without reformatting

## Mandatory workflow

### 1. `build.sh` CLI (mandatory parameters)

The script ships with this skill — `scripts/build.sh` — and the
ISO carries it at `/installer/build.sh`, so the operator can build the `.img`
straight from the live session.

```
Usage: build.sh --disk <PATH> --profile <PROFILE> --yes --dry-run
```

Flags:
- `--disk <PATH>`: Path to the target disk/.img file
- `--profile <PROFILE>`: Path to the archiso profile (builder/arch-profile)
- `--yes`: Skip confirmations (automated scripts only)
- `--dry-run`: Simulate EVERYTHING but do NOT write to disk
- `--no-ask`: Same as `--yes` (compatibility)

**Mandatory pre-flight validations:**
- `--disk` exists and has size >= 8 GB (otherwise abort)
- `--disk` is not the host disk `/dev/sda` or `/dev/nvme0n1`
- Verify that `--disk` is not any primary host partition
- `--profile` exists and contains `profiledef.sh`, `packages.x86_64`, `pacman.conf`
- `--yes` or double interaction: "Write .img of <size>? Write Y/N"

The asset implements exactly these steps and guards. Install it into the
project (or into the ISO overlay, see `arch-iso-builder`):

```bash
install -Dm755 skills/arch-appliance-img/scripts/build.sh ./build.sh
./build.sh --disk /path/to/appliance.img --profile builder/arch-profile --dry-run
```

### 2. `parted` partitioning

| Step | Command | Result |
|---|---|---|
| Clear table | `parted -s "$DISK" mklabel gpt` | New GPT table |
| EFI | `parted -s "$DISK" mkpart primary fat32 1MiB 513MiB` | EFI 512 MB |
| Set EFI boot | `parted -s "$DISK" set 1 esp on` | Mark boot |
| SYS | `parted -s "$DISK" mkpart primary ext4 513MiB 6513MiB` | SYS ~6 GB |
| DATA | `parted -s "$DISK" mkpart primary ext4 6513MiB -0s` | Remainder → DATA |
| Synchronize | `partprobe` / `sync` | Refresh the kernel |

> **Partition names:** Not fixed to `sda1`/`sda2`/`sda3`. The standard scheme is
> EFI+SYS+DATA, but the user may request another one.

### 3. Format and labels

```bash
set -euo pipefail

# EFI
mkfs.vfat -F32 "${DISK}1"

# SYS (root)
mkfs.ext4 -L SYS "${DISK}2"

# DATA
mkfs.ext4 -L DATA "${DISK}3"
```

### 4. `pacstrap` of the target

```bash
set -euo pipefail

mount "${DISK}2" /mnt
mount "${DISK}1" /mnt/boot
mkdir -p /mnt/data
mount "${DISK}3" /mnt/data

pacstrap -C <pacman.conf> -c -G -M -K /mnt \
  base linux linux-firmware grub efibootmgr \
  openssh sudo tmux htop nano vim less usbutils pciutils nftables \
  xorg-server xorg-xinit xf86-video-fbdev openbox tint2 falkon \
  qterminal featherpad pcmanfm-qt lximage-qt feh ttf-dejavu \
  shared-mime-info hicolor-icon-theme breeze-icons xdg-user-dirs \
  udisks2 polkit gvfs ntfs-3g zip unzip

# GRUB (UEFI)
grub-install --target=x86_64-efi --efi-directory="/mnt/boot" --bootloader-id=grub
grub-mkconfig -o "/mnt/boot/grub/grub.cfg"

# fstab
genfstab -U /mnt >> /mnt/etc/fstab
echo "LABEL=DATA /data ext4 defaults 0 2" >> /mnt/etc/fstab
```

### 5. Post-install configuration (inside the chroot)

> 🔴 **CRITICAL — root password:** NEVER use `root:root` or `toor` in
> production. This placeholder must be replaced with a strong password
> generated by the user or with interactive `passwd`. The administrator must
> change it on first boot.

```bash
arch-chroot /mnt <<'CHROOT'
set -euo pipefail

# 🔴 Root password — REPLACE with a secure value before the build.
# Option A (recommended): force a change on first login.
passwd -e root   # marks the password as expired → asks for a new one at login
# Option B: user-generated password (never "root"/"toor"):
#   echo "root:${ROOT_PASSWORD_HASH}" | chpasswd -e

# locale + TZ
ln -sf /usr/share/zoneinfo/America/Havana /etc/localtime
printf 'es_CU.UTF-8 UTF-8\n' >> /etc/locale.gen
# locale-gen is left pending: the user chooses at login

# ssh
systemctl enable sshd

# networkd (DISABLED by default, only the admin enables it)
systemctl disable systemd-networkd

# wheel user for polkit/udisks2
usermod -aG wheel root

# DATA dir
mkdir -p /data
chown root:root /data
chmod 0755 /data
CHROOT
```

### 6. Included systemd services

| Service | Purpose |
|---|---|
| `getty@tty1.service` | Root autologin on tty1 |
| `sshd.service` | SSH on port 22 (hostfwd 60022) |
| `appliance-update.service` | The **only** service that writes to root (`pacman -Syu`) |
| `systemd-networkd` | **Disabled** by default (network only if the admin allows it) |

### 7. Portable DATA partition (key)

| Requirement | How it is met |
|---|---|
| Mountable on **another** machine | `LABEL=DATA` + `ext4` |
| No need to reformat | `mkfs.ext4 -L DATA` |
| Does not touch the target machine's OS | Only mounts `/data` |
| Known size | By rule: <10 GB→2 GB · 10-20 GB→5 GB · >20 GB→SYS 20 GB+remainder |

**Post-build check:**

```bash
mkdir -p /mnt/data
mount -L DATA /mnt/data
ls /mnt/data/
```

## Verification

Run on the host against the produced `.img` or target disk. The script fails
fast on the first problem; the checklist below is then confirmed inside the
running appliance.

```bash
set -euo pipefail

DISK="${1:?usage: verify-appliance.sh <disk-or-img>}"

# 1. The target is NOT the host's root disk
ROOT_DISK="$(findmnt -n -o SOURCE / | sed 's/[0-9]*$//')"
[[ "$DISK" != "$ROOT_DISK" ]] || { echo "❌ target is the host root disk" >&2; exit 1; }

# 2. GPT with the EFI + SYS + DATA layout
parted -s "$DISK" print | grep -q 'Partition Table: gpt'
parted -s "$DISK" print | grep -q 'DATA'

# 3. The DATA partition carries the DATA label
lsblk -o NAME,FSTYPE,LABEL "$DISK" | grep -q 'DATA'

# 4. The size rule holds (SYS >= 6 GB)
SYS_GB=$(parted -s "$DISK" print | awk '/SYS/ {print $3}' | tr -d 'GB')
[[ -z "$SYS_GB" || "$SYS_GB" -ge 6 ]] || { echo "❌ SYS partition < 6 GB" >&2; exit 1; }

echo "✅ Partition layout verified"
```

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Partition table | `parted -s $DISK print` | EFI + SYS + DATA (`DATA`) |
| 2 | The appliance boots | serial console / SSH | login prompt |
| 3 | The three mount points | `findmnt / / /data` | ext4 + ext4 + DATA |
| 4 | DATA survives a reboot | write file → reboot → read | present |
| 5 | The kiosk panel starts | `pgrep -a openbox; pgrep -a tint2` | both |
| 6 | The kiosk serves the app | `curl -s http://127.0.0.1:3000/health` | `{"status":"ok",...}` |
| 7 | The DB responds | `systemctl is-active postgresql` | `active` |
| 8 | SSH works | `ssh -p 60022 root@localhost` | login |
| 9 | LAN network (DHCP) | `ip -4 addr show` | IP assigned |
| 10 | **No network by default** | `systemctl is-active systemd-networkd` | `inactive` |
| 11 | Portable DATA partition | mount `sda3` on **another** machine | readable, label `DATA` |
| 12 | `appliance-update` exists | `systemctl cat appliance-update.service` | unit present |
| 13 | Podman **not** installed | `command -v podman` | empty |

> **10** validates the "internet disabled by default" policy.
> **11** validates the "DATA mountable on another machine" requirement.

## Permissions and safety

| | |
|---|---|
| **Reads** | the target device, the profile directory, the host mount table (`findmnt /`) |
| **Writes** | **only** the device passed to `--disk`, `/mnt` while it is mounted, and the profile directory |
| **Requires root** | yes — `mkfs`, `parted`, `pacstrap` and `grub-install` need it |
| **Refuses** | the host root disk, any primary host disk, targets under 8 GB, an incomplete profile, and any write without an explicit confirmation |
| **Network** | only the Arch mirrors named in the profile's `pacman.conf`, with signature verification on |
| **Never** | formats or partitions a device that was not named on the command line, and never writes with `--yes` unattended without an explicit `--dry-run` first |

## Definition of Done

**Output:** `out/appliance-*.img` with the EFI+SYS+DATA layout, plus the `✅ Partition layout verified` line as evidence.

- [ ] Brief completed with all 7 categories before starting.
- [ ] Target disk identified with `lsblk` and confirmed **not** to be the host's `/dev/sda`.
- [ ] Disk is ≥ 8 GB and the SYS partition is ≥ 6 GB.
- [ ] GPT table created with EFI (512 MB), SYS and DATA; DATA is labelled `DATA`.
- [ ] `pacstrap` completed with `-c -G -M -K` against the profile's `pacman.conf`.
- [ ] GRUB installed with `root=UUID=` and `grub.cfg` regenerated.
- [ ] `fstab` contains the DATA entry (`LABEL=DATA /data ext4 defaults 0 2`).
- [ ] Root password is **not** `root:root` — `passwd -e root` or a secure hash.
- [ ] `systemd-networkd` disabled by default; only `appliance-update.service` writes to root.
- [ ] `appliance-update.service` unit exists and is enabled.
- [ ] `podman` is **not** installed unless the payload manifest requires it.
- [ ] Verified in QEMU (`arch-qemu-validation`) before any physical write.

## State & Evidence

| State | Where it lives |
|---|---|
| The target image | `out/appliance-<profile>-<date>.img` |
| Partition layout | `parted -s "$DISK" print` output |
| Installed package set | the `.img` itself (installed rootfs) |
| Update unit | `appliance-update.service` inside the image |
| Payload manifests | `apps/<slug>/app.conf` |
| Hardware log | `hardware-log.txt` (written by `arch-hardware-handler`) |

Record the evidence: the **command** you ran and its **output** — the `✅ Partition layout verified` line, the `parted` table, and the QEMU checklist result. An image without recorded evidence is not finished.

## Handoff

| If you touch... | Go to |
|---|---|
| package profile | `arch-iso-builder` |
| frozen repo + pacman config | `arch-frozen-repo` |
| KEY=VALUE manifest + runtime | `arch-payload-manifest` |
| desktop, panel, kiosk | `arch-desktop-layers` |
| QEMU tests, boot, shutdown | `arch-qemu-validation` |
| "this failed with..." | `arch-archlinux-pitfalls` |
| validate hardware before writing | `arch-hardware-handler` |

## Common errors

> The catalog is the canonical source: `arch-archlinux-pitfalls` holds every
> entry with its context, cause and fix. This table is the short index.

| Error | Symptom | Prevention |
|---|---|---|
| `error -71` when removing the USB | Sustained write without `sync` + `kill -9` | Always `sync` 3 times; never `kill -9` |
| Partitioning `/dev/sda` (host) | Destroys the system disk | Always run `lsblk` first; verify it is not the host's main partition |
| `ffs: bad journal` on DATA | `mkfs.ext4` without a label or with wrong flags | Use the exact syntax from this skill |
| `appliance-update` does not start | Missing `systemctl enable appliance-update` | Add it in the chroot or the unit file |
| No network after boot | `systemctl start systemd-networkd` does nothing | Remember: `inactive` by default, the admin enables it |
| Weak root password | `root:root` by default | Use `passwd -e root` (forces a change) or a secure hash |
| `locale` not configured | The system has no active locale by default | Leave `locale-gen` pending and choose at login |
