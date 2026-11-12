# The frozen repo — layout, config and pinning

> Supporting file for `arch-frozen-repo`.

## What the repo is

A **frozen** pacman repository: the packages the appliance needs, downloaded
once, signed with `repo-add`, and served from `file:///arch-repo` so the live
system and the appliance can update **without internet**.

It lives **inside the ISO** (`airootfs/arch-repo/`), never inside DATA: a
repo in DATA would make the `.img` non-portable and the ISO non-reusable.

## Layout

```text
builder/arch-profile/airootfs/arch-repo/
├── appliance.db.tar.gz   # the signed pacman database
├── pkg1.pkg.tar.zst
├── pkg2.pkg.tar.zst
└── ...                   # every frozen package
```

In the live session the repo is at `/arch-repo` — the live system `switch_root`s
onto the squashfs, so `/arch-repo` is an absolute path inside the session.

## Building it

```bash
set -euo pipefail

PROFILE="builder/arch-profile"
WORKDIR="${WORKDIR:-/var/tmp/frozen-work}"

# 1. Download without installing
mkdir -p "$WORKDIR/pkg"
sudo pacman -Sw --cachedir "$WORKDIR/pkg" \
  --config "$PROFILE/pacman.conf" \
  $(cat builder/repo-packages.txt)

# 2. Sign the database into the overlay
mkdir -p "$PROFILE/airootfs/arch-repo"
cp "$WORKDIR/pkg"/*.pkg.tar.zst "$PROFILE/airootfs/arch-repo/"
repo-add "$PROFILE/airootfs/arch-repo/appliance.db.tar.gz" \
  "$PROFILE/airootfs/arch-repo"/*.pkg.tar.zst

# 3. Freeze the versions
pacman -Sp --print-format '%n %v' --config "$PROFILE/pacman.conf" \
  $(cat builder/repo-packages.txt) > out/versions.txt
```

`out/versions.txt` is the rollback record:

```text
linux 6.6.8-1-etc
base 1-1
systemd 255-1
```

Commit it after every build — it is what makes a rebuild reproducible.

## The consumer configuration

The live system's `/etc/pacman.conf` (in the overlay):

```ini
[appliance]
SigLevel = PackageRequired
Server = file:///arch-repo
```

`SigLevel = PackageRequired` is **not optional**: it is what makes the frozen
repo a trust anchor instead of a pile of files.

The appliance updates with:

```bash
pacman -Sy --root / --config /etc/pacman.conf
pacman -Su --noconfirm --ignore glibc
```

## Controlled updates

| Scenario | Action |
|---|---|
| Normal update | `pacman -Syu` with networkd temporarily up |
| Appliance repo only | `pacman -Sy --root / --config /etc/pacman.conf` |
| Avoid updating glibc | `pacman -Su --noconfirm --ignore glibc` |
| Version log | `out/versions.txt` committed after every build |

## The AUR trap

An `[aur]` repo needs `SigLevel = Optional`, which **disables signature
verification for those packages** and breaks the trust model of the frozen
repo. It stays commented out in the default flow and is only enabled when the
Brief authorizes it in writing — see the "ADVANCED" section of the skill.

## The package list

`builder/repo-packages.txt` is produced by `arch-iso-builder`: the subset of
the profile's packages that must be installable **offline**.

```text
base
linux
linux-firmware
openssh
sudo
```

Keep it small. Every package in it is downloaded, signed, copied into the ISO
and shipped in the image — it is disk space in every artifact.
