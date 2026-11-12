# The validation checklists

> Supporting file for `arch-qemu-validation`. The 15 ISO checks and the 13
> appliance checks in one place, with the exact command for each.

## ISO checklist — 15 checks

Run after the ISO is built, before anything touches a real disk.

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | The ISO exists and has a reasonable size | `ls -lh out/*.iso` | size per the Brief |
| 2 | Checksum | `sha256sum -c out/SHA256SUMS` | `OK` |
| 3 | Carries the squashfs rootfs | `bsdtar -tf out/*.iso \| grep airootfs.sfs` | `airootfs.sfs` present |
| 4 | Carries the installer | `ls /installer/` (in the session) | `build.sh`, `payload.sh`, `load-manifest.sh` |
| 5 | Boots and shows the prompt | serial console | login on tty1 or ttyS0 |
| 6 | The live system mounts the frozen repo | `ls /arch-repo/` | `appliance.db.tar.gz` + `.pkg.tar.zst` |
| 7 | **Syncs without a 404** | `pacman -Sy` | no `community.db` 404 |
| 8 | Installs a package | `pacman -S --noconfirm --dbpath /tmp/t <package>` | `OK` |
| 9 | sshd active | `systemctl is-active sshd` | `active` |
| 10 | SSH from the host | `ssh -p 60022 root@localhost` | login |
| 11 | Serial console alive | send `Enter` on `ttyS0` | prompt |
| 12 | Desktop starts (L1) | `pgrep -a openbox` / `pgrep -a tint2` | both alive |
| 13 | Locale | `locale` | per the Brief |
| 14 | Time | `timedatectl` | per the Brief |
| 15 | Keyring initialized | `pacman-key --list-keys` | Arch keys |

Checks **3** and **4** are about the **overlay**, which lives inside the
squashfs: #3 looks at the ISO file, #4 looks inside the running session.

Checks **12** and **13** assume the L1 layer. Adjust them to the layer the
Brief chose.

## Appliance checklist — 13 checks

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Partition table | `parted -s $IMG print` | EFI 512 MB · SYS · DATA (`DATA`) |
| 2 | Boots | serial console / SSH | login prompt |
| 3 | The three mount points | `findmnt / / /data` | ext4 + ext4 + DATA |
| 4 | DATA portable | `mount -L DATA /tmp/test` | readable, no password |
| 5 | Kiosk panel (L1) | `pgrep -a openbox; pgrep -a tint2` | both |
| 6 | The kiosk serves the app | `curl -s http://127.0.0.1:3000/health` | `{"status":"ok",...}` |
| 7 | The DB responds | `systemctl is-active postgresql` | `active` |
| 8 | SSH works | `ssh -p 60022 root@localhost` | login |
| 9 | LAN network (DHCP) | `ip -4 addr show` | IP assigned |
| 10 | **No network by default** | `systemctl is-active systemd-networkd` | `inactive` |
| 11 | DATA portable on another machine | mount `sda3` on another host | readable, label `DATA` |
| 12 | `appliance-update` exists | `systemctl cat appliance-update.service` | unit present |
| 13 | Podman **not** installed | `command -v podman` | empty |

Checks **5**–**7** assume a kiosk-style appliance with a database. Adjust them
to what the Brief asked for.

## The graceful shutdown rule

```bash
# 1. Verify that the QMP monitor is active
echo '{"execute":"qmp_capabilities"}' | socat - UNIX-CONNECT:/tmp/qmp.sock

# 2. Shut down gracefully
echo '{"execute":"system_powerdown"}' | socat - UNIX-CONNECT:/tmp/qmp.sock

# 3. Wait for QEMU to exit, then sync
wait $QMP_PID
sync
```

| Method | Safe? |
|---|---|
| QMP `system_powerdown` | ✅ preferred |
| `systemctl poweroff` over SSH | ✅ |
| QEMU monitor `Ctrl-a x` | ⚠️ closes without ACPI — may hang the USB |
| `kill -9` | ⛔ **forbidden** — this is what left the USB hung with `error -71` |

## The evidence record

| Artifact | Minimum evidence |
|---|---|
| ISO | `sha256sum`, date, result of the 15 checks |
| `.img` | `parted print`, result of the 13 checks |
| Payload | healthcheck OK, unit log, installed version |

A failing check means the artifact is **not committed**: fix the cause, rebuild,
and run the whole checklist again.
