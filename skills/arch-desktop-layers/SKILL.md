---
name: arch-desktop-layers
description: 'General desktop layer definitions for Arch Linux live ISOs and appliances. Covers window managers, desktop environments, panel configurations, and display manager options. NOT limited to the canonical kiosk setup.'
---

# Arch Desktop Layers — General Purpose

Skill para definir capas de escritorio en distribuciones Arch Linux. **No está limitado** al setup kiosco canonical. Sirve para que cualquier usuario o agente pueda construir una ISO o appliance con el escritorio que necesice: Openbox, i3, KDE, GNOME, XFCE, Cinnamon, LXQT, o ninguno (console-only). Integra con el diseño Brief de `arch-distro-design`.

## Propósito

Permitir al usuario elegir el entorno gráfico o su ausencia, sin que el constructor quede anclado a un solo caso de uso. Cada "capa" es independiente y se puede combinar con las otras skills del grupo. Las capas están ordenadas de manera organica de **más ligera a más completa**, considerando pesos, costos de espacio y tiempo de descarga: cada capa subsiguiente es más completa pero también más pesada que la anterior.

## Capas de escritorio disponibles

Cada capa incluye: paquete(s), configuración mínima, y qué **no** incluye. El orden refleja el incremento natural de recursos.

### L0 — Console-only (sin interfaz gráfica)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ❌ No incluido |
| `xorg-xinit` | ❌ No incluido |
| `openbox` | ❌ No incluido |
| `tint2` | ❌ No incluido |
| `falkon` | ❌ No incluido |
| `framebuffer` | `console=tty0` en kernel params |
| Ventaja | Tamaño ISO mínimo (~300 MB) |
| Uso | Servidores, headless, dispositivos embebidos |

### L1 — Openbox + tint2 (escritorio minimalista)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ✅ incluido |
| `xorg-xinit` | ✅ incluido |
| `openbox` | ✅ incluido |
| `tint2` | ✅ incluido (strut_on_top) |
| `falkon` | ✅ incluido (navegador kiosco) |
| `qterminal` | ✅ incluido |
| `featherpad` | ✅ incluido |
| `pcmanfm-qt` | ✅ incluido |
| `shared-mime-info` | ✅ incluido |
| `breeze-icons` + `hicolor-icon-theme` | ✅ incluido |
| `xdg-user-dirs` | ✅ incluido |
| Panel visible | ✅ por defecto (`strut_mode = strut_on_top`) |
| Fullscreen | ⚠️ Solo con `Super+F` |
| Uso | Escritorio minimalista, válido para cualquier distribución |
| Peso estimado | ~400 MB |

### L2 — LXQT (entorno ligero pero completo)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ✅ incluido |
| `xorg-xinit` | ✅ incluido |
| `lxqt` | ✅ incluido (meta-package) |
| `pcmanfm-qt` | ✅ incluido (file manager) |
| `qterminal` | ✅ incluido |
| `featherpad` | ✅ incluido (editor de texto) |
| `shared-mime-info` | ✅ incluido |
| `breeze-icons` + `hicolor-icon-theme` | ✅ incluido |
| `lxpolkit` | ✅ incluido (polkit para LXQT) |
| Panel | `lxqt-panel` (incluido con LXQT) |
| Uso | Usuarios que desean un entorno ligero pero con todas las funcionalidades de un escritorio moderno |
| Peso estimado | ~600 MB |
| Observación | **Más completa que L1 (Openbox) pero más ligera que XFCE**. Aprovecha las bibliotecas Qt y el diseño modular de LXQT. |

### L3 — XFCE (entorno ligero pero completo)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ✅ incluido |
| `xorg-xinit` | ✅ incluido |
| `xfce4` | ✅ incluido |
| `xfce4-panel` | ✅ incluido |
| `thunar` | ✅ incluido (file manager) |
| `leafpad` | ✅ incluido (editor de texto) |
| `mousepad` | ✅ incluido (alternative editor) |
| `terminal` (xfce4-terminal) | ✅ incluido |
| `garcon` | ✅ incluido (menú) |
| `xfce4-settings` | ✅ incluido |
| Uso | Usuarios que quieren ligereza pero con GUI completa |
| Ventaja sobre LXQT | Mejor madurez de aplicaciones y configuración |
| Peso estimado | ~800 MB |

### L4 — Cinnamon (experiencia de usuario moderna)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ✅ incluido |
| `cinnamon` | ✅ incluido (meta-package) |
| `muffin` | ✅ incluido (window manager, fork de compiz) |
| `nemo` | ✅ incluido (file manager, fork de Nautilus) |
| `firefox` | ✅ incluido (navegador) |
| `gedit` | ✅ incluido (editor de texto) |
| `gnome-terminal` | ✅ incluido |
| `cinnamon-control-center` | ✅ incluido (configuración) |
| `shared-mime-info` | ✅ incluido |
| `breeze-icons` + `hicolor-icon-theme` | ✅ incluido |
| Uso | Usuarios que desean una experiencia tipo "GNOME 2" con funcionalidades modernas |
| Peso estimado | ~1.2 GB |
| Observación | **Más completa que XFCE** pero con un uso de RAM ligeramente superior. El entorno Cinnamon ofrece un menú de aplicaciones clásico con un panel moderno, ideales para usuarios que migran de Windows 7 u entornos GNOME 2. |

### L5 — KDE Plasma (experiencia de escritorio completa)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ✅ incluido |
| `plasma-desktop` | ✅ incluido |
| `sddm` (display manager) | ✅ incluido |
| `falkon` | ✅ incluido (navegador) |
| `kwin` | ✅ incluido (gestor de ventanas) |
| `qt6-style-breeze` | ✅ incluido |
| `oxygen-icons` | ✅ incluido |
| `powerdevil` | ✅ incluido (gestor de energía) |
| `drkonqi` | ✅ incluido (gestor de errores) |
| `systemsettings` | ✅ incluido (configuración) |
| Uso | Usuarios que quieren una experiencia "de escritorio completa" |
| ⚠️ Nota | SDDM puede colgar en algunos hardware (ver lección 11) |
| Peso estimado | ~1.4 GB |
| Observación | **Más completa que Cinnamon** en cuanto a funcionalidades nativas, configuración de sistema y efectos visuales. Requiere más recursos pero ofrece la experiencia más pulida y integrada. |

### L6 — GNOME (experiencia moderna)

| Elemento | Decisión |
|---|---|
| `xorg-server` | ✅ incluido |
| `gnome` | ✅ incluido (meta-package) |
| `mutter` | ✅ incluido (window manager) |
| `gedit` | ✅ incluido (editor de texto) |
| `firefox` | ✅ incluido (navegador) |
| `gnome-terminal` | ✅ incluido |
| `gnome-control-center` | ✅ incluido |
| `shared-mime-info` | ✅ incluido |
| Uso | Usuarios que quieren la experiencia "standard" de GNOME |
| ⚠️ Nota | Requiere más RAM y disk space |
| Peso estimado | ~1.5 GB |

## Configuración de panel por capa

| Capa | Panel | Configuración clave |
|---|---|---|
| L0 (Console) | Ninguno | Sin X, solo TTY/serial |
| L1 (Openbox) | `tint2` | `strut_mode = strut_on_top` (reserva espacio, no superpone) |
| L2 (LXQT) | `lxqt-panel` | Automático, diseño minimalista |
| L3 (XFCE) | `xfce4-panel` | `xfce4-panel` automático |
| L4 (Cinnamon) | `systemtray` | Incluido en panel por defecto (Cinnamon panel) |
| L5 (KDE) | `systemtray` | Incluido en panel por defecto (panel de Plasma) |
| L6 (GNOME) | Ninguno (gestión por GNOME Shell) | Automático, gestiona su propio panel |

## Flujo de trabajo para elegir una capa

### 1. En `profiledef.sh` del ISO

```bash
# Ejemplo: elegir capa L4 (Cinnamon)
desktop_layer="L4-cinnamon"
```

### 2. En `packages.x86_64` del ISO

Descomentar la sección correspondiente según la capa elegida.

### 3. Overlay `airootfs/` personalizado

Cada capa tiene su propio `.xinitrc`, `.xprofile`, y config de panel.

| Layer | `.xinitrc` | `.xprofile` | Panel |
|---|---|---|---|
| L0 | `startx` no aplica (TTY) | Variables por defecto | Ninguno |
| L1 | `tint2 &` + `openbox-session` | Variables Qt | `tint2` |
| L2 | `startlxqt` | Variables LXQT | `lxqt-panel` |
| L3 | `startxfce4` | Variables XFCE | `xfce4-panel` |
| L4 | `startcinnamon` (o `gnome-session --session=cinnamon`) | Variables cinnamon | `systemtray` |
| L5 | `startplasma-x11` | Variables Qt/KDE | `systemtray` |
| L6 | `gnome-session` | Variables gnome | Ninguno (Shell gestiona) |

## Validación

```bash
# Ver cual capa esta activa
locale                                    # LANG/DESKTOP
pgrep -a openbox                          # L1 solo
pgrep -a lxqt-session                       # L2 solo
pgrep -a xfce4-panel                       # L3 solo
pgrep -a cinnamon-session-c                 # L4 solo
pgrep -a kwin                             # L5 solo
pgrep -a mutter                           # L6 solo
```

## Handoff a otras skills del grupo

| Si tocas... | Ve a |
|---|---|
| perfil + packages | `arch-iso-builder` |
| boot, console, serie | `arch-qemu-validation` |
| "esto fallo con..." | `arch-archlinux-pitfalls` |
| payloads + runtime | `arch-payload-manifest` |
| .img + DATA partition | `arch-appliance-img` |
| kiosco específicco (L1 con tweaks) | Misma skill, configuración distinta |

## Errores comunes al cambiar de capa

| Error | Sintoma | Prevención |
|---|---|---|
| `forgot xorg-xinit` | `startx` no existe | Siempre incluir `xorg-xinit` en la capa |
| `tint2 sin strut` | Panel se superpone con ventanas | Usar `strut_mode = strut_on_top` |
| `i3 sin mod Mod4` | Atajos no funcionan | `Mod4` es el Windows key por defecto |
| `sddm no arranca` | Pantalla negra | Probar con `lightdm` o ir sin DM |
| `missing fonts` | Texto como cuadros □□□ | Incluir `ttf-dejavu` + `breeze-icons` |

## Checklist de elección de escritorio

- [ ] Capa elegida (L0..L6) y escrita en `profiledef.sh:desktop_layer`
- [ ] Paquetes de la capa descomentados en `packages.x86_64`
- [ ] Overlay `airootfs/` configurado para la capa (`.xinitrc`, `.xprofile`)
- [ ] Variables de entorno coherentes (`QT_QPA_PLATFORM`, `XDG_CURRENT_DESKTOP`)
- [ ] Boot validado en QEMU con la capa elegida (`arch-qemu-validation`)
- [ ] Peso estimado ISO según capa elegida:
  - L0: ~300 MB
  - L1: ~400 MB
  - L2: ~600 MB
  - L3: ~800 MB
  - L4: ~1.2 GB
  - L5: ~1.4 GB
  - L6: ~1.5 GB
- [ ] Si es L3/KDE/L4/Cinnamon/L5/GNOME: aceptar posible tamaño ISO mayor
- [ ] Si es L0/Console: verificar que no se necesita interfaz gráfica

## Handoff table (resumen rápido)

| Destination Skill | Trigger |
|---|---|
| `arch-iso-builder` | Cambiar perfil/packages para la nueva capa |
| `arch-qemu-validation` | Probar el nuevo ISO con el escritorio elegido |
| `arch-archlinux-pitfalls` | Documentar errores nuevos al cambiar de capa |
| `arch-payload-manifest` | Si el nuevo escritorio necesita algún payload |
| `arch-appliance-img` | Si se quiere el nuevo escritorio también en .img |

## Peso y descarga estimada por capa

| Capa | Tamaño ISO estimado | Tiempo download (a ~250 KB/s) | Comentario |
|---|---|---|---|
| L0 | ~300 MB | ~20 min | Sin GUI, ISO más pequeña |
| L1 | ~400 MB | ~25 min | Openbox + tint2, ligera |
| L2 | ~600 MB | ~40 min | LXQT, añade DE completo pero ligero |
| L3 | ~800 MB | ~50 min | XFCE, equilibrio peso/funcionalidad |
| L4 | ~1.2 GB | ~1 h 20 min | Cinnamon, experiencia moderna |
| L5 | ~1.4 GB | ~1 h 30 min | KDE Plasma, máxima funcionalidad |
| L6 | ~1.5 GB | ~1 h 45 min | GNOME, experiencia "standard" |

> **Nota sobre pesos:** Estos son valores estimados para el rootfs squashfs de la ISO live. El tamaño real variará según los paquetes adicionales inyectados en el overlay `airootfs/` y la selección de lenguajes/locales. Cada capa subsiguiente incluye todo lo de la anterior más paquetes adicionales, por lo que el incremento de tamaño es progresivo pero notable.

> **Flexibilidad:** El usuario puede modificar los elementos internos de cualquier capa sustituyendo paquetes o añadiendo/quitando funcionalidades, siempre que no rompa la ergonomía y funcionamiento del escritorio. Por ejemplo, en L4 (Cinnamon) pueden reemplazar `nemo` por `thunar` o `firefox` por `firefox-esr` sin cambiar la esencia del escritorio.