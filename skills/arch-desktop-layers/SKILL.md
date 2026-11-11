---
name: arch-desktop-layers
description: 'General desktop layer definitions for Arch Linux live ISOs and appliances. Covers window managers, desktop environments (L0 console-only through L6 GNOME), panel configurations, and display manager options. Use when choosing the graphical stack for an ISO or appliance.'
---

# Arch Desktop Layers — General Purpose

Skill para definir capas de escritorio en distribuciones Arch Linux. **No está
limitado** al setup kiosco canónico. Sirve para que cualquier usuario o agente
pueda construir una ISO o appliance con el escritorio que necesite: Openbox, i3,
KDE, GNOME, XFCE, Cinnamon, LXQT, o ninguno (console-only). Integra con el
Brief de `arch-distro-design`.

## Propósito

Permitir al usuario elegir el entorno gráfico o su ausencia, sin que el
constructor quede anclado a un solo caso de uso. Cada "capa" es independiente y
se puede combinar con las otras skills del grupo. Las capas están ordenadas de
**más ligera a más completa**: cada capa subsiguiente es más completa pero
también más pesada.

## Capas de escritorio disponibles

### L0 — Console-only (sin interfaz gráfica)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ❌ No incluido |
| `xorg-xinit` | ❌ No incluido |
| `openbox` / `tint2` / `falkon` | ❌ No incluido |
| `framebuffer` | `console=tty0` en kernel params |
| Ventaja | Tamaño ISO mínimo (~300 MB) |
| Uso | Servidores, headless, dispositivos embebidos |

### L1 — Openbox + tint2 (escritorio minimalista)

| Elemento | Decisión |
|---|---|
| `xorg-server` + `xorg-xinit` | ✅ incluido |
| `openbox` + `tint2` | ✅ incluido (`strut_on_top`) |
| `falkon` + `qterminal` + `featherpad` | ✅ incluido |
| `pcmanfm-qt` + `shared-mime-info` | ✅ incluido |
| `breeze-icons` + `hicolor-icon-theme` | ✅ incluido |
| `xdg-user-dirs` | ✅ incluido |
| Panel visible | ✅ por defecto (`strut_mode = strut_on_top`) |
| Fullscreen | ⚠️ Solo con `Super+F` |
| Uso | Escritorio minimalista, válido para cualquier distribución |
| Peso estimado | ~400 MB |

### L2 — LXQT (entorno ligero pero completo)

| Elemento | Decisión |
|---|---|
| `xorg-server` + `xorg-xinit` | ✅ incluido |
| `lxqt` (meta-package) | ✅ incluido |
| `pcmanfm-qt` + `qterminal` + `featherpad` | ✅ incluido |
| `lxpolkit` | ✅ incluido |
| Panel | `lxqt-panel` (incluido con LXQT) |
| Uso | Entorno ligero con funcionalidades modernas |
| Peso estimado | ~600 MB |
| Observación | **Más completa que L1 (Openbox) pero más ligera que XFCE**. |

### L3 — XFCE (entorno ligero pero completo)

| Elemento | Decisión |
|---|---|
| `xorg-server` + `xorg-xinit` | ✅ incluido |
| `xfce4` + `xfce4-panel` | ✅ incluido |
| `thunar` + `terminal` (xfce4-terminal) | ✅ incluido |
| `mousepad` + `garcon` + `xfce4-settings` | ✅ incluido |
| Uso | Ligereza con GUI completa |
| Ventaja sobre LXQT | Mejor madurez de aplicaciones |
| Peso estimado | ~800 MB |

### L4 — Cinnamon (experiencia moderna)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ✅ incluido |
| `cinnamon` (meta) + `muffin` | ✅ incluido |
| `nemo` + `firefox` + `gedit` + `gnome-terminal` | ✅ incluido |
| `cinnamon-control-center` | ✅ incluido |
| Uso | Experiencia tipo "GNOME 2" con funcionalidades modernas |
| Peso estimado | ~1.2 GB |
| Observación | **Más completa que XFCE** pero con uso de RAM superior. |

### L5 — KDE Plasma (experiencia completa)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ✅ incluido |
| `plasma-desktop` + `sddm` | ✅ incluido |
| `falkon` + `kwin` + `qt6-style-breeze` | ✅ incluido |
| `oxygen-icons` + `powerdevil` + `drkonqi` | ✅ incluido |
| `systemsettings` | ✅ incluido |
| Uso | Experiencia "de escritorio completa" |
| ⚠️ Nota | SDDM puede colgar en algunos hardware (ver lección) |
| Peso estimado | ~1.4 GB |

### L6 — GNOME (experiencia moderna)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ✅ incluido |
| `gnome` (meta) + `mutter` | ✅ incluido |
| `gedit` + `firefox` + `gnome-terminal` | ✅ incluido |
| `gnome-control-center` | ✅ incluido |
| Uso | Experiencia "standard" de GNOME |
| ⚠️ Nota | Requiere más RAM y disco |
| Peso estimado | ~1.5 GB |

## Configuración de panel por capa

| Capa | Panel | Configuración clave |
|---|---|---|
| L0 (Console) | Ninguno | Sin X, solo TTY/serial |
| L1 (Openbox) | `tint2` | `strut_mode = strut_on_top` |
| L2 (LXQT) | `lxqt-panel` | Automático, minimalista |
| L3 (XFCE) | `xfce4-panel` | Automático |
| L4 (Cinnamon) | `systemtray` | Incluido en panel por defecto |
| L5 (KDE) | `systemtray` | Incluido en panel de Plasma |
| L6 (GNOME) | GNOME Shell | Automático |

## Flujo de trabajo para elegir una capa

### 1. En `profiledef.sh` del ISO

```bash
desktop_layer="L1-openbox"   # o L0, L2, L3, L4, L5, L6
```

### 2. En `packages.x86_64` del ISO

Descomentar la sección correspondiente según la capa elegida.

### 3. Overlay `airootfs/` personalizado

| Layer | `.xinitrc` | `.xprofile` | Panel |
|---|---|---|---|
| L0 | `startx` no aplica (TTY) | Variables por defecto | Ninguno |
| L1 | `tint2 &` + `openbox-session` | Variables Qt | `tint2` |
| L2 | `startlxqt` | Variables LXQT | `lxqt-panel` |
| L3 | `startxfce4` | Variables XFCE | `xfce4-panel` |
| L4 | `startcinnamon` (o `gnome-session --session=cinnamon`) | Variables cinnamon | `systemtray` |
| L5 | `startplasma-x11` | Variables Qt/KDE | `systemtray` |
| L6 | `gnome-session` | Variables gnome | GNOME Shell |

## Validación

```bash
# Ver cuál capa está activa
locale                                    # LANG/DESKTOP
pgrep -a openbox                          # L1
pgrep -a lxqt-session                     # L2
pgrep -a xfce4-panel                      # L3
pgrep -a cinnamon-session                 # L4
pgrep -a kwin                             # L5
pgrep -a mutter                           # L6
```

## Handoff a otras skills del grupo

| Si tocas... | Ve a |
|---|---|
| perfil + packages | `arch-iso-builder` |
| boot, console, serie | `arch-qemu-validation` |
| "esto falló con..." | `arch-archlinux-pitfalls` |
| payloads + runtime | `arch-payload-manifest` |
| .img + DATA partition | `arch-appliance-img` |
| kiosco específico (L1 con tweaks) | Misma skill, configuración distinta |

## Errores comunes al cambiar de capa

| Error | Síntoma | Prevención |
|---|---|---|
| `forgot xorg-xinit` | `startx` no existe | Siempre incluir `xorg-xinit` en la capa |
| `tint2 sin strut` | Panel se superpone con ventanas | `strut_mode = strut_on_top` |
| `i3 sin mod Mod4` | Atajos no funcionan | `Mod4` es la Windows key por defecto |
| `sddm no arranca` | Pantalla negra | Usar `startx` desde autologin (sin DM) |
| `missing fonts` | Texto como cuadros □□□ | Incluir `ttf-dejavu` + `breeze-icons` |

## Checklist de elección de escritorio

- [ ] Capa elegida (L0..L6) y escrita en `profiledef.sh:desktop_layer`
- [ ] Paquetes de la capa descomentados en `packages.x86_64`
- [ ] Overlay `airootfs/` configurado (`.xinitrc`, `.xprofile`)
- [ ] Variables de entorno coherentes (`QT_QPA_PLATFORM`, `XDG_CURRENT_DESKTOP`)
- [ ] Boot validado en QEMU con la capa elegida (`arch-qemu-validation`)
- [ ] Peso estimado ISO según capa:
  - L0: ~300 MB · L1: ~400 MB · L2: ~600 MB · L3: ~800 MB
  - L4: ~1.2 GB · L5: ~1.4 GB · L6: ~1.5 GB
- [ ] Si es L0/Console: verificar que no se necesita interfaz gráfica
