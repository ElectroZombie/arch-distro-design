# The archiso profile — layout and variables

> Supporting file for `arch-iso-builder`. The complete map of
> `builder/arch-profile/`.

## Directory tree

```text
builder/arch-profile/
├── profiledef.sh              # the profile variables
├── packages.x86_64            # packages in the live system
├── bootstrap_packages.x86_64  # must exist, even if empty
├── pacman.conf                # mirrors, signature policy
├── airootfs/                  # overlay -> the live system's /
│   ├── etc/
│   │   ├── shadow
│   │   ├── pacman.conf
│   │   ├── mkinitcpio.conf.d/archiso.conf
│   │   └── systemd/system/getty@tty1.service.d/autologin.conf
│   ├── root/
│   │   ├── .bash_profile
│   │   ├── .xinitrc
│   │   └── .xprofile
│   └── installer/             # the assets, copied in
│       ├── build.sh
│       ├── payload.sh
│       └── load-manifest.sh
├── boot/                      # BIOS + UEFI boot payloads
├── efiboot/loader/            # systemd-boot
└── syslinux/                  # BIOS
```

## `profiledef.sh` — every variable that must be declared

| Variable | Value | Note |
|---|---|---|
| `iso_name` | slug | lowercase, no spaces |
| `iso_label` | uppercase | filesystem label |
| `iso_publisher` | text | |
| `iso_application` | text | |
| `install_dir` | `arch` | **relative**, ≤ 30 chars, `[a-z0-9]` |
| `buildmodes` | `('iso')` | |
| `bootmodes` | `('bios.syslinux' 'uefi.systemd-boot')` | only the three documented names |
| `pacman_conf` | `pacman.conf` | relative to the profile |
| `packages` | `packages.x86_64` | relative to the profile |
| `bootstrap_packages` | `bootstrap_packages.x86_64` | **must exist** even if empty |
| `airootfs_image_type` | `squashfs` | |
| `kernel_params` | `console=tty0 console=ttyS0,115200n8` | serial **last** |

> `realpath: ''` is the classic failure: every path must be **relative to the
> profile**, because archiso `cd`s into it before resolving.

## The overlay map — what goes where

| File in `airootfs/` | Why it exists |
|---|---|
| `etc/shadow` | the live root password (never `root:root`) |
| `etc/pacman.conf` | overrides the `pacman` package config: `[appliance]` → `file:///arch-repo` |
| `etc/mkinitcpio.conf.d/archiso.conf` | **mandatory** hooks: `base udev archiso archiso_loop_mnt memdisk microcode` |
| `etc/systemd/system/getty@tty1.service.d/autologin.conf` | autologin on tty1 |
| `root/.bash_profile` | starts the session when `tty = /dev/tty1` |
| `root/.xinitrc` | `tint2 &` + `exec openbox-session` (or the WM the Brief chose) |
| `root/.xprofile` | Qt/X environment variables |
| `installer/*.sh` | the assets, so the live system can build an appliance or install a payload |

## `pacman.conf` — the shape that works

```ini
[options]
HoldPkg = pacman glibc
Architecture = auto
SigLevel = Required DatabaseOptional
LocalFileSigLevel = Optional
ParallelDownloads = 5

[core]
Server = https://mirror.example.org/archlinux/$repo/os/$arch
...  (at least 5 servers per repo, fastest first)

[extra]
Server = https://mirror.example.org/archlinux/$repo/os/$arch
...
```

Rules that are not optional:

- **No `[community]`** — Arch merged it into `extra` on 2026-11-09; the repo
  404s on every mirror.
- **No `Include = /etc/pacman.d/mirrorlist`** — on a non-Arch host that pulls
  the wrong distribution's packages.
- **`XferCommand`** with curl for tolerant downloads:
  `XferCommand = /usr/bin/curl -sSfL --retry 5 --retry-delay 3 --speed-time 120 --speed-limit 10 -o %o %u`
- The `[aur]` block stays **commented out** unless the Brief authorizes it in
  writing — `SigLevel = Optional` disables signature verification.

## Package selection

`packages.x86_64` holds the live system's packages, grouped by category. Two
rules decide what goes in:

1. **The desktop layer decides the graphics block.** Uncomment only the block
   of the layer the Brief chose (`arch-desktop-layers`).
2. **The offline requirement decides the frozen list.** The subset that must
   be installable without internet goes to `builder/repo-packages.txt`, which
   `arch-frozen-repo` consumes.
