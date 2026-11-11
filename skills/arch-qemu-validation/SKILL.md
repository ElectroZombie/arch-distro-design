---
name: arch-qemu-validation
description: 'Automated QEMU test harness for Arch ISOs and .img appliances. Validates boot, serial console, SSH, partitions, graceful shutdown, and a 15+ item checklist. Use when an artifact must be verified in QEMU before touching real hardware.'
---

# Arch QEMU Validation — General Purpose

Skill for **automatically** validating Arch Linux ISOs and `.img` appliances in
QEMU. It is **not** limited to a specific distribution: it works for any
artifact built with the group's skills. Every artifact goes through this gate
**before** touching real hardware.

## Purpose

Prevent build errors from reaching real hardware. QEMU allows you to:
- Test boot, partitioning, systemd, serial console, and SSH repeatably.
- Verify the "internet disabled by default" policy.
- Test graceful shutdown (lesson: never `kill -9`).
- Automate checks with shell/python scripts.

## Host requirements

```bash
sudo pacman -S --needed qemu-desktop edk2-ovmf archiso
```

> **OVMF on Arch uses the `.4m.fd` suffix**: do not use `OVMF_CODE.fd`.
> `OVMF_VARS.4m.fd` is **writable**: copy it to `/tmp` on every run.

## Validation parameters (user decisions)

| Parameter | Description | Default value (suggested) |
|---|---|---|
| `ISO_SIZE` | Expected ISO size for check #1 | Leave empty to autodetect |
| `IMG_SIZE` | Expected .img size for check #1 | Leave empty to autodetect |
| `RAM_ISO` | RAM assigned to the ISO in MB | `2048` |
| `RAM_IMG` | RAM assigned to the .img in MB | `1024` |
| `TIMEZONE` | Expected time zone for check #14 | `America/Havana` |
| `DISK_LABEL` | DATA partition label for check #11 | `DATA` |

## A. Live ISO validation

### A.1 Booting with `run_archiso`

```bash
run_archiso -i out/<distro>-<date>-x86_64.iso
```

- Network: user-mode networking.
- **SSH redirected**: `localhost:60022` → guest port 22.
- `-c` / `-u` to boot with or without UEFI.

```bash
ssh -p 60022 root@localhost    # password: the one defined by the admin
```

### A.2 Controlled boot (serial console + UEFI + clean shutdown)

```bash
set -euo pipefail

ISO="out/<distro>-<date>-x86_64.iso"
OVMF_VARS="/tmp/ovmf-vars-$$.fd"     # new fd per session
cp /usr/share/edk2/x64/OVMF_VARS.4m.fd "$OVMF_VARS"

qemu-system-x86_64 \
  -m "${RAM_ISO:-2048}" -smp 2 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4m.fd \
  -drive if=pflash,format=raw,file="$OVMF_VARS" \
  -drive file="$ISO",format=raw,if=virtio,readonly=on \
  -netdev user,id=net0,hostfwd=tcp::60022-:22 \
  -device virtio-net-pci,netdev=net0 \
  -serial mon:stdio -nographic \
  -qmp unix:/tmp/qmp.sock,server,nowait &
QMP_PID=$!
```

| Option | Purpose |
|---|---|
| `-serial mon:stdio -nographic` | Serial console in the terminal + monitor (`Ctrl-a c`) |
| `if=pflash ... OVMF_CODE.4m.fd` | UEFI boot (Secure Boot: `.secboot.`) |
| `hostfwd=tcp::60022-:22` | SSH from the host |
| `-qmp unix:/tmp/qmp.sock` | **Graceful** shutdown (see §B.4) |

#### ISO checklist (15 items) — example with L1 (Openbox)

> Checks 12 and 13 assume the L1 layer from `arch-desktop-layers`. Adjust
> according to the layer chosen in the Brief.

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | ISO exists and has a reasonable size | `ls -lh out/*.iso` | Size per the Brief |
| 2 | Checksum OK | `sha256sum -c out/SHA256SUMS` | `OK` |
| 3 | Contains the frozen repo | `bsdtar -tf out/*.iso \| grep arch-repo` | `arch/arch-repo/appliance.db.tar.gz` |
| 4 | Contains the installer | `bsdtar -tf out/*.iso \| grep installer` | `arch/installer/build.sh` |
| 5 | Boots and shows the prompt | serial console | login on tty1 or ttyS0 |
| 6 | The live system mounts the repo | `ls /arch-repo/` | `appliance.db.tar.gz` + `.pkg.tar.zst` |
| 7 | **Syncs without a 404** | `pacman -Sy` | no `community.db` 404 |
| 8 | Installs a package | `pacman -S --noconfirm --dbpath /tmp/t <package>` | OK |
| 9 | sshd active | `systemctl is-active sshd` | `active` |
| 10 | SSH from the host | `ssh -p 60022 root@localhost` | login |
| 11 | Serial console alive | send `Enter` on `ttyS0` | prompt |
| 12 | Desktop starts (L1) | `pgrep -a openbox` / `pgrep -a tint2` | both alive |
| 13 | Correct locale | `locale` | per the Brief |
| 14 | Correct time | `timedatectl` | per the Brief |
| 15 | Keyring initialized | `pacman-key --list-keys` | Arch keys |

> Check **7** detects the `community` → `extra` failure.
> **8** validates that the frozen repo is correctly signed and installable.

### A.3 BIOS boot (syslinux)

```bash
set -euo pipefail

qemu-system-x86_64 \
  -m "${RAM_ISO:-2048}" -smp 2 \
  -drive file="$ISO",format=raw,if=virtio,readonly=on \
  -boot order=c \
  -serial mon:stdio -nographic \
  -netdev user,id=net0,hostfwd=tcp::60022-:22 \
  -device virtio-net-pci,netdev=net0
```

### A.4 Common ISO validation failures

| Error | Cause | Solution |
|---|---|---|
| Black screen after login | `ttf-dejavu` missing | Include it in `packages.x86_64` |
| The tint2 panel does not appear | `tint2` without `strut` | `strut_mode = strut_on_top` in `.config/tint2/tint2rc` |
| SSH does not respond | `sshd` not enabled | `systemctl enable sshd` in the overlay |
| `community.db 404` | `[community]` in pacman.conf | Remove it; use only core+extra |
| Silent serial console | Wrong `console=` order | `console=tty0 console=ttyS0,115200n8` (serial last) |

## B. .img appliance validation

### B.1 Boot the .img as a disk

```bash
set -euo pipefail

IMG="out/appliance-<profile>-<date>.img"

qemu-system-x86_64 \
  -m "${RAM_IMG:-1024}" -smp 2 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4m.fd \
  -drive if=pflash,format=raw,file=/tmp/ovmf-vars.img \
  -drive file="$IMG",format=raw,if=virtio \
  -netdev user,id=net0,hostfwd=tcp::60022-:22 \
  -device virtio-net-pci,netdev=net0 \
  -serial mon:stdio -nographic \
  -qmp unix:/tmp/qmp.sock,server,nowait &
```

> With `virtio` the root is `/dev/vda`, **not** `/dev/sda`. The appliance's GRUB
> uses `root=UUID=`, so it works in both cases.

### B.2 Appliance checklist (13 items)

> Example with layer L1. Adjust checks 5-7 according to the layer and payload
> from the Brief.

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Partition table | `parted -s $IMG print` | EFI 512 MB · SYS · DATA (`DATA`) |
| 2 | Boots OK | serial console / SSH | login prompt |
| 3 | The three mount points | `findmnt / / /data` | ext4 + ext4 + DATA |
| 4 | DATA portable | `mount -L DATA /tmp/test` | readable, no password |
| 5 | Kiosk panel (L1) | `pgrep -a openbox; pgrep -a tint2` | both |
| 6 | The kiosk serves the app | `curl -s http://127.0.0.1:3000/health` | `{"status":"ok",...}` |
| 7 | The DB responds | `systemctl is-active postgresql` | `active` |
| 8 | SSH works | `ssh -p 60022 root@localhost` | login |
| 9 | LAN network DHCP | `ip -4 addr show` | IP assigned |
| 10 | No network by default | `systemctl is-active systemd-networkd` | `inactive` |
| 11 | DATA portable on another machine | mount `sda3` on another host | readable, label `DATA` |
| 12 | `appliance-update` exists | `systemctl cat appliance-update.service` | unit present |
| 13 | Podman NOT installed | `command -v podman` | empty |

### B.3 Pre-partitioning checklist

```bash
parted -s "$IMG" print
# You must see GPT with 3 partitions:
# - P1: EFI (vfat, 512 MB)
# - P2: SYS (ext4, root)
# - P3: DATA (ext4, label DATA)
```

### B.4 Shutdown is ALWAYS graceful

📏 **Critical lesson:** `kill -9` on QEMU left the USB hung with `error -71`.

```bash
# 1. Verify that the QMP monitor is active
echo '{"execute":"qmp_capabilities"}' | socat - UNIX-CONNECT:/tmp/qmp.sock

# 2. Shut down gracefully
echo '{"execute":"system_powerdown"}' | socat - UNIX-CONNECT:/tmp/qmp.sock
```

| Method | Command | Safe? |
|---|---|---|
| **QMP `system_powerdown`** | `echo '{"execute":"system_powerdown"}' \| socat - UNIX-CONNECT:/tmp/qmp.sock` | ✅ preferred |
| `systemctl poweroff` over SSH | `ssh -p 60022 root@localhost 'systemctl poweroff'` | ✅ |
| QEMU monitor | `Ctrl-a x` | ⚠️ closes without ACPI |
| `kill -9` | ❌ | ⛔ **forbidden** |

Wait for QEMU to exit before touching the USB:

```bash
wait $QMP_PID          # or: while kill -0 $QMP_PID; do sleep 1; done
sync
```

### B.5 Evidence log

| Artifact | Minimum evidence |
|---|---|
| ISO | `sha256sum`, date, result of the 15 checks §A.4 |
| .img | `parted print`, result of the 13 checks §B.2 |
| Payload | healthcheck OK, unit log, installed version |

If a check fails, the artifact is **not committed**.

## C. PTY bridge for an automatable serial console

QEMU with `-serial unix:/tmp/ser.sock,server,nowait` exposes the console on a
socket; automating it requires a PTY bridge:

```python
#!/usr/bin/env python3
"""serial-bridge.py — turn a QEMU unix socket into a readable PTY."""
import os
import pty
import select      # ← FIX: this import was missing
import socket
import sys

sock_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ser.sock"
master, slave = pty.openpty()
name = os.ttyname(slave)
print(name, flush=True)

s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.connect(sock_path)

def pump(src, dst):
    while True:
        try:
            data = src.recv(4096)
        except OSError:
            break
        if not data:
            break
        os.write(dst, data)

while True:
    r, _, _ = select.select([s, master], [], [], 1)
    if s in r:
        pump(s, master)
    if master in r:
        try:
            data = os.read(master, 4096)
        except OSError:
            break
        if not data:
            break
        os.write(1, data)
```

> In production, the bridge must **also send** keystrokes: the `select` loop
> must read from the PTY master and write it to the socket.

## D. ISO ↔ .img cross-validation

| Check | ISO | .img |
|---|---|---|
| Frozen repo present | ✅ (in the ISO) | ❌ (base OS only) |
| Portable DATA partition | ❌ | ✅ (LABEL=DATA) |
| Desktop (per layer) | ✅ | ✅ (same config) |
| SSH active | ✅ | ✅ |
| No internet by default | ✅ | ✅ |
| `appliance-update` service | ❌ (ISO build only) | ✅ (in the .img) |
| `pacman -Sy` without a 404 | ✅ | ❌ (installed system, not live) |

## Handoff to other skills in the group

| If you touch... | Go to |
|---|---|
| ISO build + profile | `arch-iso-builder` |
| .img + partitioning | `arch-appliance-img` |
| desktop + panel (L0-L6) | `arch-desktop-layers` |
| payloads + runtime | `arch-payload-manifest` |
| "this fails with..." | `arch-archlinux-pitfalls` |
| frozen repo + pacman | `arch-frozen-repo` |
