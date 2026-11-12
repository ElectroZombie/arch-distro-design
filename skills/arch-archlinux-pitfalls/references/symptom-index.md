# Symptom index — find the entry fast

> Supporting file for `arch-archlinux-pitfalls`. The catalog by symptom, so
> you can jump straight to the entry instead of reading 18 of them.

## Build aborts before doing anything

| Symptom | Entry | Cause in one line |
|---|---|---|
| `realpath: '': No such file or directory` | #2 | a path in `profiledef.sh` is empty |
| `bootstrap_packages.x86_64` missing | #2 | the file must exist even if empty |
| `is not a valid boot mode!` | #3 | `.esp` / `.mbr` / `.eltorito` are internal names |
| `community.db` → **404** | #4 | `community` was merged into `extra` |
| `DisableDownloadTimeout` → *not recognized* | #7 | it is a CLI flag, not a `pacman.conf` directive |

## The build succeeds but the ISO is wrong

| Symptom | Entry | Cause in one line |
|---|---|---|
| The host is Manjaro / another distro | #5 | `Include =` inherited the host mirrorlist |
| `pacman --root` fails with `required key missing` | #8 | `GPGDir` is not relocated by `--root` |
| Kernel panic while mounting the squashfs | #9 | `mkinitcpio-archiso` is missing |
| The live system has the wrong packages | #5 | the host's mirrorlist leaked in |
| `/etc/shadow` reverted to the package default | #12 | the `filesystem` package overwrote it |

## The live system boots but the desktop is broken

| Symptom | Entry | Cause in one line |
|---|---|---|
| `startx` does not exist | desktop-layers | `xorg-xinit` is missing from the layer |
| Black screen after login | #16 | a display manager that hangs — use `startx` |
| The tint2 panel overlaps the windows | desktop-layers | `tint2` without `strut` |
| Text rendered as boxes | desktop-layers | `ttf-dejavu` missing |
| `.xinitrc` arrives with mode 644 | #10 | the overlay does not preserve permissions |

## The appliance behaves differently than expected

| Symptom | Entry | Cause in one line |
|---|---|---|
| `error -71` when removing the USB | #14 | sustained write without `sync` + `kill -9` |
| `ffs: bad journal` on DATA | #14 | `mkfs.ext4` without the label or the `lba` flag |
| The disk was partitioned by mistake | #14 | `lsblk` was not checked first |
| The network is up when it should be down | #15 | networkd was not disabled |
| `appliance-update.service` does not start | — | the unit was never enabled |
| `root=UUID=` not found | #14 | stale GRUB after repartitioning |

## The design is wrong before any of it

| Symptom | Entry | Cause in one line |
|---|---|---|
| The artifact does not match the objective | #1 | the Brief was skipped |
| The ISO is 4 GB and nobody can replicate it | — | the artifacts were not separated |
| The `.img` is not portable | — | the frozen repo was placed in DATA |
| The app code was forked into the repo | — | the payload was vendored instead of declared |

## How to use an entry

Every entry has the same three parts:

1. **Context** — what you were doing when it broke.
2. **Cause** — the actual mechanism, not the symptom.
3. **Solution** — the fix, with the command.

Read the cause, not just the fix: the fix is specific to that error, the cause
tells you whether the next build will hit it again.

## Adding a new entry

1. Number it (the next free number).
2. Date it: `📏 YYYY-MM-DD`.
3. Give it context, cause and solution.
4. Say **which skill** must now check it.
5. Add the symptom to the table above.
6. Update the "Common errors" index of the affected skill.
