---
name: arch-desktop-layers
description: 'Define the desktop layer for an Arch ISO or appliance: L0 console-only through L6 GNOME, with the window managers, desktop environments, panel configurations and display-manager options of each layer. Use when the user asks to "choose a desktop", "add a GUI to the ISO", "set up Openbox, KDE, GNOME or XFCE", "configure a kiosk desktop" or "make it console-only".'
---

# Arch Desktop Layers — General Purpose

Skill for defining desktop layers in Arch Linux distributions. It is **not
limited** to the canonical kiosk setup. It lets any user or agent build an ISO
or appliance with the desktop they need: Openbox, i3, KDE, GNOME, XFCE,
Cinnamon, LXQT, or none at all (console-only). It integrates with the
`arch-distro-design` Brief.

> **`L0..L6` are the *desktop* layers.** The system layers of the design are
> `B0..B4` and belong to `arch-distro-design`. Always say *desktop L1* or
> *build B1* — a bare "L1" is ambiguous across the pack.

## Purpose

Allow the user to choose the graphical environment or its absence, without
locking the builder into a single use case. Each "layer" is independent and can
be combined with the other skills in the group. Layers are ordered from
**lightest to fullest**: each subsequent layer is more complete but also
heavier.

## Startup Workflow

1. **Choose the layer** — pick L0..L6 from the table below, based on the Brief's objective and the target hardware.
2. **Declare it** — write `desktop_layer="L<n>-<name>"` in `profiledef.sh`.
3. **Select the packages** — uncomment that layer's block in `packages.x86_64`.
4. **Configure the overlay** — `.xinitrc`, `.xprofile` and the panel config for that layer.
5. **Verify** — run the checks in [Verification](#verification), then boot-test in QEMU.

## Scope

**In scope:** the L0–L6 layer definitions, the package set per layer, the panel configuration, and the session starter for each layer.

**Out of scope:** the ISO profile itself, the appliance image, the payload, and the boot tests.

| Out of scope | Delegate to |
|---|---|
| archiso profile and live ISO | `arch-iso-builder` |
| Partitioning, `.img`, systemd units | `arch-appliance-img` |
| App manifest, runtime, database | `arch-payload-manifest` |
| Boot tests in QEMU | `arch-qemu-validation` |

## Available desktop layers

> The full package matrix of every layer, with the session starter and the
> panel configuration, ships with the maintained pack:
> <https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness>

### L0 — Console-only (no graphical interface)

| Element | Decision |
|---|---|
| `xorg-server` | ❌ Not included |
| `xorg-xinit` | ❌ Not included |
| `openbox` / `tint2` / `falkon` | ❌ Not included |
| `framebuffer` | `console=tty0` in kernel params |
| Advantage | Minimum ISO size (~300 MB) |
| Use | Servers, headless, embedded devices |

### L1 — Openbox + tint2 (minimalist desktop)

| Element | Decision |
|---|---|
| `xorg-server` + `xorg-xinit` | ✅ included |
| `openbox` + `tint2` | ✅ included (`strut_on_top`) |
| `falkon` + `qterminal` + `featherpad` | ✅ included |
| `pcmanfm-qt` + `shared-mime-info` | ✅ included |
| `breeze-icons` + `hicolor-icon-theme` | ✅ included |
| `xdg-user-dirs` | ✅ included |
| Panel visible | ✅ by default (`strut_mode = strut_on_top`) |
| Fullscreen | ⚠️ Only with `Super+F` |
| Use | Minimalist desktop, valid for any distribution |
| Estimated size | ~400 MB |

### L2 — LXQT (lightweight but complete environment)

| Element | Decision |
|---|---|
| `xorg-server` + `xorg-xinit` | ✅ included |
| `lxqt` (meta-package) | ✅ included |
| `pcmanfm-qt` + `qterminal` + `featherpad` | ✅ included |
| `lxpolkit` | ✅ included |
| Panel | `lxqt-panel` (included with LXQT) |
| Use | Lightweight environment with modern features |
| Estimated size | ~600 MB |
| Note | **More complete than L1 (Openbox) but lighter than XFCE**. |

### L3 — XFCE (lightweight but complete environment)

| Element | Decision |
|---|---|
| `xorg-server` + `xorg-xinit` | ✅ included |
| `xfce4` + `xfce4-panel` | ✅ included |
| `thunar` + `terminal` (xfce4-terminal) | ✅ included |
| `mousepad` + `garcon` + `xfce4-settings` | ✅ included |
| Use | Lightweight with a full GUI |
| Advantage over LXQT | Better application maturity |
| Estimated size | ~800 MB |

### L4 — Cinnamon (modern experience)

| Element | Decision |
|---|---|
| `xorg-server` | ✅ included |
| `cinnamon` (meta) + `muffin` | ✅ included |
| `nemo` + `firefox` + `gedit` + `gnome-terminal` | ✅ included |
| `cinnamon-control-center` | ✅ included |
| Use | "GNOME 2"-style experience with modern features |
| Estimated size | ~1.2 GB |
| Note | **More complete than XFCE** but with higher RAM usage. |

### L5 — KDE Plasma (full experience)

| Element | Decision |
|---|---|
| `xorg-server` | ✅ included |
| `plasma-desktop` + `sddm` | ✅ included |
| `falkon` + `kwin` + `qt6-style-breeze` | ✅ included |
| `oxygen-icons` + `powerdevil` + `drkonqi` | ✅ included |
| `systemsettings` | ✅ included |
| Use | "Full desktop" experience |
| ⚠️ Note | SDDM may hang on some hardware (see pitfalls) |
| Estimated size | ~1.4 GB |

### L6 — GNOME (modern experience)

| Element | Decision |
|---|---|
| `xorg-server` | ✅ included |
| `gnome` (meta) + `mutter` | ✅ included |
| `gedit` + `firefox` + `gnome-terminal` | ✅ included |
| `gnome-control-center` | ✅ included |
| Use | GNOME "standard" experience |
| ⚠️ Note | Requires more RAM and disk |
| Estimated size | ~1.5 GB |

## Panel configuration per layer

| Layer | Panel | Key configuration |
|---|---|---|
| L0 (Console) | None | No X, only TTY/serial |
| L1 (Openbox) | `tint2` | `strut_mode = strut_on_top` |
| L2 (LXQT) | `lxqt-panel` | Automatic, minimalist |
| L3 (XFCE) | `xfce4-panel` | Automatic |
| L4 (Cinnamon) | `systemtray` | Included in the default panel |
| L5 (KDE) | `systemtray` | Included in the Plasma panel |
| L6 (GNOME) | GNOME Shell | Automatic |

## Workflow for choosing a layer

### 1. In the ISO `profiledef.sh`

```bash
desktop_layer="L1-openbox"   # or L0, L2, L3, L4, L5, L6
```

### 2. In the ISO `packages.x86_64`

Uncomment the corresponding section for the chosen layer.

### 3. Custom `airootfs/` overlay

| Layer | `.xinitrc` | `.xprofile` | Panel |
|---|---|---|---|
| L0 | `startx` does not apply (TTY) | Default variables | None |
| L1 | `tint2 &` + `openbox-session` | Qt variables | `tint2` |
| L2 | `startlxqt` | LXQT variables | `lxqt-panel` |
| L3 | `startxfce4` | XFCE variables | `xfce4-panel` |
| L4 | `startcinnamon` (or `gnome-session --session=cinnamon`) | Cinnamon variables | `systemtray` |
| L5 | `startplasma-x11` | Qt/KDE variables | `systemtray` |
| L6 | `gnome-session` | GNOME variables | GNOME Shell |

## Verification

Run on the profile and the overlay. The script fails fast on the first problem.

```bash
set -euo pipefail

PROFILE="builder/arch-profile"

# 1. The layer is declared
grep -q '^desktop_layer=' "$PROFILE/profiledef.sh"

# 2. A graphical layer always needs xorg-server and xorg-xinit
LAYER="$(sed -n 's/^desktop_layer="\(L[0-9]\).*/\1/p' "$PROFILE/profiledef.sh")"
if [[ "$LAYER" != "L0" ]]; then
  grep -qx 'xorg-server' "$PROFILE/packages.x86_64"
  grep -qx 'xorg-xinit'  "$PROFILE/packages.x86_64"
fi

# 3. The overlay ships the session starter
test -f "$PROFILE/airootfs/root/.xinitrc"

# 4. No display manager in the default flow (SDDM may hang on some hardware)
! grep -qsE '^\s*(sddm|gdm|lightdm)\s*$' "$PROFILE/packages.x86_64"

echo "✅ Desktop layer configured"
```

Inside the booted image, confirm which layer is actually running:

```bash
# See which layer is active
locale                                    # LANG/DESKTOP
pgrep -a openbox                          # L1
pgrep -a lxqt-session                     # L2
pgrep -a xfce4-panel                      # L3
pgrep -a cinnamon-session                 # L4
pgrep -a kwin                             # L5
pgrep -a mutter                           # L6
```

## Definition of Done

**Output:** the chosen `desktop_layer`, the layer's package set in `packages.x86_64`, and the session starter in `.xinitrc`.

- [ ] Layer chosen (L0..L6) and written in `profiledef.sh:desktop_layer`
- [ ] Layer packages uncommented in `packages.x86_64`
- [ ] `airootfs/` overlay configured (`.xinitrc`, `.xprofile`)
- [ ] Consistent environment variables (`QT_QPA_PLATFORM`, `XDG_CURRENT_DESKTOP`)
- [ ] Boot validated in QEMU with the chosen layer (`arch-qemu-validation`)
- [ ] Estimated ISO size per layer:
  - L0: ~300 MB · L1: ~400 MB · L2: ~600 MB · L3: ~800 MB
  - L4: ~1.2 GB · L5: ~1.4 GB · L6: ~1.5 GB
- [ ] If L0/Console: verify that no graphical interface is needed

## State & Evidence

| State | Where it lives |
|---|---|
| Chosen layer | `builder/arch-profile/profiledef.sh:desktop_layer` |
| Layer packages | `builder/arch-profile/packages.x86_64` |
| Session starter and environment | `airootfs/root/.xinitrc`, `airootfs/root/.xprofile` |
| Panel configuration | `airootfs/root/.config/tint2/tint2rc` (L1) |
| Runtime proof | `pgrep -a <wm>` output from the booted image |

Record the evidence: the **command** you ran and its **output** — the `✅ Desktop layer configured` line, the `pgrep` output showing the window manager, and the actual ISO size versus the estimate.

## Handoff

| If you touch... | Go to |
|---|---|
| profile + packages | `arch-iso-builder` |
| boot, console, serial | `arch-qemu-validation` |
| "this failed with..." | `arch-archlinux-pitfalls` |
| payloads + runtime | `arch-payload-manifest` |
| .img + DATA partition | `arch-appliance-img` |
| specific kiosk (L1 with tweaks) | Same skill, different configuration |

## Common errors when changing layers

> The catalog is the canonical source: `arch-archlinux-pitfalls` holds every
> entry with its context, cause and fix. This table is the short index.

| Error | Symptom | Prevention |
|---|---|---|
| `forgot xorg-xinit` | `startx` does not exist | Always include `xorg-xinit` in the layer |
| `tint2 without strut` | Panel overlaps windows | `strut_mode = strut_on_top` |
| `i3 without Mod4` | Shortcuts do not work | `Mod4` is the Windows key by default |
| `sddm does not start` | Black screen | Use `startx` from autologin (no DM) |
| `missing fonts` | Text rendered as boxes □□□ | Include `ttf-dejavu` + `breeze-icons` |
