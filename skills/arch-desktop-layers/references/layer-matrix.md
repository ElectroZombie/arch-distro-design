# The desktop layer matrix

> Supporting file for `arch-desktop-layers`. The package matrix of every layer.

## Which layer

| Layer | Desktop | Feel | ISO size | RAM |
|---|---|---|---|---|
| **L0** | none | console only | ~300 MB | ~0 |
| **L1** | Openbox + tint2 | minimal, kiosk-shaped | ~400 MB | low |
| **L2** | LXQT | light but complete | ~600 MB | low |
| **L3** | XFCE | light with a full GUI | ~800 MB | medium |
| **L4** | Cinnamon | "GNOME 2" with modern features | ~1.2 GB | medium |
| **L5** | KDE Plasma | full desktop | ~1.4 GB | high |
| **L6** | GNOME | modern GNOME | ~1.5 GB | high |

> **L0..L6 are the *desktop* layers.** The system's own layers are `B0..B4`
> and live in `arch-distro-design`. Always write *desktop L1* or *build B1*.

## The package matrix

| Package | L0 | L1 | L2 | L3 | L4 | L5 | L6 |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| `xorg-server` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `xorg-xinit` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `openbox` | — | ✅ | — | — | — | — | — |
| `tint2` | — | ✅ | — | — | — | — | — |
| `lxqt` | — | — | ✅ | — | — | — | — |
| `lxqt-panel` | — | — | ✅ | — | — | — | — |
| `lxpolkit` | — | — | ✅ | — | — | — | — |
| `xfce4` | — | — | — | ✅ | — | — | — |
| `xfce4-panel` | — | — | — | ✅ | — | — | — |
| `thunar` | — | — | — | ✅ | — | — | — |
| `cinnamon` | — | — | — | — | ✅ | — | — |
| `muffin` | — | — | — | — | ✅ | — | — |
| `nemo` | — | — | — | — | ✅ | — | — |
| `plasma-desktop` | — | — | — | — | — | ✅ | — |
| `kwin` | — | — | — | — | — | ✅ | — |
| `sddm` | — | — | — | — | — | ⚠️ | — |
| `gnome` | — | — | — | — | — | — | ✅ |
| `mutter` | — | — | — | — | — | — | ✅ |
| `falkon` | — | ✅ | — | — | ✅ | ✅ | — |
| `firefox` | — | — | — | — | ✅ | — | ✅ |
| `pcmanfm-qt` | — | ✅ | ✅ | — | — | — | — |
| `qterminal` | — | ✅ | ✅ | — | — | — | — |
| `featherpad` | — | ✅ | ✅ | — | — | — | — |
| `gedit` | — | — | — | — | ✅ | — | ✅ |
| `gnome-terminal` | — | — | — | — | ✅ | — | ✅ |
| `ttf-dejavu` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `breeze-icons` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `xdg-user-dirs` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `shared-mime-info` | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

⚠️ **SDDM may hang** on some hardware (see the pitfalls catalog). The default
flow uses no display manager: `startx` from a tty1 autologin.

## The session starter

| Layer | `.xinitrc` | `.xprofile` | Panel |
|---|---|---|---|
| L0 | not applicable (TTY) | defaults | none |
| L1 | `tint2 &` + `openbox-session` | Qt variables | `tint2` |
| L2 | `startlxqt` | LXQT variables | `lxqt-panel` |
| L3 | `startxfce4` | XFCE variables | `xfce4-panel` |
| L4 | `startcinnamon` | Cinnamon variables | `systemtray` |
| L5 | `startplasma-x11` | Qt/KDE variables | `systemtray` |
| L6 | `gnome-session` | GNOME variables | GNOME Shell |

## The panel configuration

| Layer | Panel | Key setting |
|---|---|---|
| L1 | `tint2` | `strut_mode = strut_on_top` — reserves space instead of overlapping windows |
| L2 | `lxqt-panel` | automatic, minimalist |
| L3 | `xfce4-panel` | automatic |
| L4 | `systemtray` | included in the default Cinnamon panel |
| L5 | `systemtray` | included in the default Plasma panel |
| L6 | GNOME Shell | automatic |

## Wiring it into the profile

```bash
# profiledef.sh
desktop_layer="L1-openbox"
```

Then uncomment that layer's block in `packages.x86_64`, and configure the
overlay's `.xinitrc`, `.xprofile` and panel config.

Two environment variables keep the session coherent:

```bash
export QT_QPA_PLATFORM=xcb
export XDG_CURRENT_DESKTOP=Openbox
```
