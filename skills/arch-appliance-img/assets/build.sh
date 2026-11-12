#!/usr/bin/env bash
# build.sh — build a persistent Arch .img appliance (EFI + SYS + DATA).
#
# Part of the arch-distro-design skill `arch-appliance-img`. Copy it into the
# live system's `/installer/` (or run it from a checkout) — the ISO profile
# ships it as `/installer/build.sh` so an operator can write an appliance
# straight from the live session.
#
# Usage:
#   build.sh --disk <PATH> --profile <PROFILE> [--yes] [--dry-run]
#
#   --disk <PATH>    target disk or .img file
#   --profile <DIR>  archiso profile directory (builder/arch-profile)
#   --yes            skip the interactive confirmation (automation only)
#   --dry-run        print every command without touching the target
#   --no-ask         alias for --yes
#
# Safety: refuses the host's root disk, refuses targets below 8 GB, and never
# writes without an explicit confirmation.
set -euo pipefail

DISK=""
PROFILE=""
ASSUME_YES=0
DRY_RUN=0
ROOT_LABEL="SYS"
DATA_LABEL="DATA"
MIN_GB=8
SYS_MIB=6144

usage() {
    sed -n '3,20p' "$0" | sed 's/^# \{0,1\}//'
    exit "${1:-0}"
}

die() {
    echo "❌ $*" >&2
    exit 1
}

run() {
    if [[ "$DRY_RUN" -eq 1 ]]; then
        printf '  would run: %s\n' "$*"
    else
        "$@"
    fi
}

run_sh() {
    if [[ "$DRY_RUN" -eq 1 ]]; then
        printf '  would run: %s\n' "$*"
    else
        eval "$@"
    fi
}

# --- arguments ---------------------------------------------------------------
while [[ $# -gt 0 ]]; do
    case "$1" in
        --disk)    DISK="${2:-}"; shift 2 ;;
        --profile) PROFILE="${2:-}"; shift 2 ;;
        --yes|--no-ask) ASSUME_YES=1; shift ;;
        --dry-run) DRY_RUN=1; shift ;;
        -h|--help) usage 0 ;;
        *) die "unknown argument: $1 (try --help)" ;;
    esac
done

[[ -n "$DISK" ]]    || die "--disk is required"
[[ -n "$PROFILE" ]] || die "--profile is required"

# --- pre-flight --------------------------------------------------------------
[[ -e "$DISK" ]] || die "target does not exist: $DISK"

if [[ -b "$DISK" ]]; then
    SIZE_BYTES=$(blockdev --getsize64 "$DISK")
else
    SIZE_BYTES=$(stat -c %s "$DISK")
fi
SIZE_GB=$(( SIZE_BYTES / 1000 / 1000 / 1000 ))
[[ "$SIZE_GB" -ge "$MIN_GB" ]] || die "target is ${SIZE_GB} GB — the model requires at least ${MIN_GB} GB"

ROOT_DISK="$(findmnt -n -o SOURCE / 2>/dev/null | sed 's/[0-9]*$//' || true)"
[[ "$DISK" != "$ROOT_DISK" ]] || die "refusing to write to the host root disk ($ROOT_DISK)"
case "$DISK" in
    /dev/sda|/dev/nvme0n1|/dev/sda[0-9]|/dev/nvme0n1p[0-9])
        die "refusing to write to a primary host disk: $DISK" ;;
esac

for required in profiledef.sh packages.x86_64 pacman.conf; do
    [[ -f "$PROFILE/$required" ]] || die "profile is missing $required: $PROFILE"
done

if [[ "$ASSUME_YES" -ne 1 ]]; then
    read -r -p "Write .img to $DISK (${SIZE_GB} GB)? [y/N] " reply
    [[ "$reply" =~ ^[Yy]$ ]] || die "aborted by the operator"
fi

# --- 1. partition ------------------------------------------------------------
echo "==> Partitioning $DISK (EFI + SYS + DATA)"
run parted -s "$DISK" mklabel gpt
run parted -s "$DISK" mkpart primary fat32 1MiB 513MiB
run parted -s "$DISK" set 1 esp on
run parted -s "$DISK" mkpart primary ext4 513MiB 6513MiB
run parted -s "$DISK" mkpart primary ext4 6513MiB -0s
run partprobe
run sync

# --- 2. format ---------------------------------------------------------------
echo "==> Formatting"
run mkfs.vfat -F32 "${DISK}1"
run mkfs.ext4 -L "$ROOT_LABEL" "${DISK}2"
run mkfs.ext4 -L "$DATA_LABEL" "${DISK}3"

# --- 3. install --------------------------------------------------------------
echo "==> Installing the base system with pacstrap"
run mkdir -p /mnt/boot /mnt/data
run mount "${DISK}2" /mnt
run mount "${DISK}1" /mnt/boot
run mount "${DISK}3" /mnt/data

PACMAN_CONF="$PROFILE/pacman.conf"
run_sh "sudo pacstrap -C '$PACMAN_CONF' -c -G -M -K /mnt \
  base linux linux-firmware grub efibootmgr \
  openssh sudo tmux htop nano vim less usbutils pciutils nftables \
  xorg-server xorg-xinit xf86-video-fbdev openbox tint2 falkon \
  qterminal featherpad pcmanfm-qt lximage-qt feh ttf-dejavu \
  shared-mime-info hicolor-icon-theme breeze-icons xdg-user-dirs \
  udisks2 polkit gvfs ntfs-3g zip unzip"

# --- 4. bootloader, fstab, chroot --------------------------------------------
echo "==> Installing the bootloader and fstab"
run grub-install --target=x86_64-efi --efi-directory=/mnt/boot --bootloader-id=grub
run grub-mkconfig -o /mnt/boot/grub/grub.cfg
run_sh "genfstab -U /mnt >> /mnt/etc/fstab"
run_sh "echo 'LABEL=$DATA_LABEL /data ext4 defaults 0 2' >> /mnt/etc/fstab"

echo "==> Configuring the target"
run_sh "sudo arch-chroot /mnt bash -c '
  set -euo pipefail
  # Root password: force a change on first login. Never root:root or toor.
  passwd -e root
  ln -sf /usr/share/zoneinfo/America/Havana /etc/localtime
  printf \"es_CU.UTF-8 UTF-8\n\" >> /etc/locale.gen
  systemctl enable sshd
  systemctl disable systemd-networkd
  usermod -aG wheel root
  mkdir -p /data
  chown root:root /data
  chmod 0755 /data
'"

# --- 5. unmount --------------------------------------------------------------
echo "==> Unmounting"
run umount -R /mnt
run sync

echo "✅ Appliance built at $DISK (${SIZE_GB} GB)"
echo "   Next: validate it in QEMU before writing it to a USB drive."
