---
name: arch-iso-builder
description: 'Build Arch Linux live ISOs with archiso. Handles profile configuration, package selection, boot modes (BIOS syslinux + UEFI systemd-boot), and ISO generation. The main orchestration skill for the group, driven by the design brief from arch-distro-design. Use when the user needs a bootable live ISO.'
---

# Arch ISO Builder — General Purpose

Skill para construir ISOs live de Arch Linux usando `archiso 91-1`. Sirve para
**cualquier** distribución basada en Arch. Decide la estructura del perfil, qué
paquetes van en el live vs el repo congelado, y lanza `mkarchiso`.

## ⚠️ OBLIGATORIO: Brief previo

> **Directiva desde `arch-distro-design`:** Esta skill **NUNCA** debe invocarse
> sin antes haber completado el `Brief` de diseño.

| Categoría | Qué define para esta skill |
|---|---|
| **Objetivo** | Si es ISO live, .img persistente, o ambos. |
| **Formato de salida** | Determina si construimos ISO, .img, o ambos. |
| **Hardware objetivo** | x86_64 UEFI, BIOS, disco USB, HDD, SSD, NVMe. |
| **Red** | 100% local, LAN DHCP, internet esperado, o completamente offline. |
| **Apps / Payloads** | Qué aplicaciones se incluyen, runtimes, BD. |
| **Inmutabilidad** | Root squashfs ro, rw con regla, o overlay? |
| **Política de updates** | Cómo y cuándo se actualiza. |

> **Si el `Brief` no está completado, detener la invocación y pedir las 7
> categorías obligatorias.**

## Cuándo usar esta skill

- El usuario quiere crear una ISO live de Arch con un propósito específico.
- El `arch-distro-design` ya tomó las decisiones de diseño y las transmitió.
- Se necesita un perfil archiso válido (boot modes, variables, overlay).
- Se quiere validar que el perfil pasa `mkarchiso --validate` antes de construir.
- Se necesita inyectar overlay `airootfs/` personalizado.

## Artefactos producidos

| Salida | Descripción |
|---|---|
| `out/*.iso` | ISO bootable (BIOS + UEFI) con rootfs squashfs |
| `out/SHA256SUMS` | Checksums de la ISO (para versionado) |
| `builder/arch-profile/` | Perfil listo para `mkarchiso` |

## Flujo de trabajo obligatorio

### 1. Recibir el `Brief` de `arch-distro-design`

El `arch-distro-design` debe haber definido ya las 7 categorías.

### 2. Definir perfil (`profiledef.sh`)

Variables críticas que **siempre** deben declararse:

```bash
iso_name="distro-name"
iso_label="LABEL"
iso_publisher="publisher"
iso_application="Descripción"
install_dir="arch"          # relativo, máximo 30 chars [a-z0-9]
buildmodes=('iso')         # válidos: bios.syslinux, uefi.systemd-boot
bootmodes=('bios.syslinux' 'uefi.systemd-boot') # SOLO estos 3 en archiso 91-1
pacman_conf="pacman.conf"
packages="packages.x86_64"
bootstrap_packages="bootstrap_packages.x86_64" # DEBE EXISTIR aunque esté vacío
airootfs_image_type="squashfs"
kernel_params="console=tty0 console=ttyS0,115200n8"
```

### 3. Lista de paquetes (`packages.x86_64`)

| Categoría | Paquetes (ejemplos — seleccionar según objetivo del Brief) |
|---|---|
| **base del sistema** | `base`, `linux`, `linux-firmware`, `grub`, `efibootmgr` |
| **archiso obligatorios** | `mkinitcpio`, `mkinitcpio-archiso`, `syslinux` |
| **herramientas del builder** | `e2fsprogs`, `dosfstools`, `parted`, `arch-install-scripts` |
| **acceso y mantenimiento** | `openssh`, `sudo`, `tmux`, `curl`, `rsync`, `wget`, `htop`, `nano`, `vim`, `less`, `usbutils`, `pciutils`, `nftables` |
| **gestores de ventana** (elegir) | `openbox`, `i3`, `bspwm`, `awesome`, `herbstluftwm`, `jwm`, `fluxbox`, `windowmaker` |
| **gestores de archivos** (elegir) | `pcmanfm-qt`, `thunar`, `nemo`, `caja`, `rox-filer`, `spacefm`, `ranger`, `nnn`, `lf` |
| **entorno de escritorio** (opcional) | `xorg-server`, `xorg-xinit`, `falkon`, `plasma-desktop`, `xfce4`, `gnome`, `mate-desktop` |
| **visor de imágenes** | `feh`, `sxiv`, `imagemagick` |
| **editor de texto** | `vim`, `nano`, `neovim`, `leafpad`, `mousepad` |
| **NUNCA en live** | `base-devel` (~1 GB sin uso), `calamares` (salvo pedido explícito) |

> **⚠️ `community` fue fusionado en `extra`** (2026-11-09). Nunca declarar
> `[community]`: rompe el build con 404.

### 4. `pacman.conf` del perfil

**⚠️ OBLIGATORIO:** El host de build debe ser siempre **Arch**. No usar
`Include = /etc/pacman.d/mirrorlist` (el host puede ser Manjaro/otros y
contaminaría el ISO con paquetes no-Arch).

```ini
[options]
HoldPkg = pacman glibc
Architecture = auto
SigLevel = Required DatabaseOptional
LocalFileSigLevel = Optional
ParallelDownloads = 5

[core]
Server = https://mirror.raiolanetworks.com/archlinux/$repo/os/$arch
Server = https://mirror.dkm.cz/archlinux/$repo/os/$arch
Server = https://mirror.rackspace.com/archlinux/$repo/os/$arch
Server = https://mirrors.dotsrc.org/archlinux/$repo/os/$arch
Server = https://mirror.garr.it/archlinux/$repo/os/$arch

[extra]
Server = https://mirror.raiolanetworks.com/archlinux/$repo/os/$arch
Server = https://mirror.dkm.cz/archlinux/$repo/os/$arch
Server = https://mirror.rackspace.com/archlinux/$repo/os/$arch
Server = https://mirrors.dotsrc.org/archlinux/$repo/os/$arch
Server = https://mirror.garr.it/archlinux/$repo/os/$arch

# 🔴 Repositorio AUR — NO INCLUIR POR DEFECTO.
# Los paquetes AUR no están firmados por el keyring de Arch. SigLevel=Optional
# desactiva la verificación de firma. Solo incluir si el Brief lo autoriza
# explícitamente y el usuario acepta el riesgo por escrito.
# [aur]
# SigLevel = Optional
# Server = file:///aur-repo
```

> **Mínimo 5 servers por repo** (core y extra) para tolerar fallos de mirrors.

> **XferCommand** (flag CLI, no directiva config): `--speed-time 120 --speed-limit 10`
> para tolerar mirrors intermitentes.

### 5. Overlay `airootfs/`

`mkarchiso` copia `airootfs/.` **con modo 644/755**, por eso `file_permissions`
en `profiledef.sh` es obligatorio para ejecutables.

| Fichero | Motivo |
|---|---|
| `etc/shadow` | password root del live |
| `etc/pacman.conf` | override: repo `community` 404 → own config con `[appliance]` |
| `etc/mkinitcpio.conf.d/archiso.conf` | hooks OBLIGATORIOS: `base udev archiso archiso_loop_mnt memdisk microcode` |
| `etc/systemd/system/getty@tty1.service.d/autologin.conf` | autologin tty1 |
| `root/.bash_profile` | `startx` si `tty = /dev/tty1` |
| `root/.xinitrc` | `tint2 &` + `exec openbox-session` (o el WM que elija el Brief) |
| `root/.xprofile` | variables de entorno Qt/X |

### 6. Boot modes válidos (archiso 91-1)

| Boot mode | Arranque | Requiere |
|---|---|---|
| `bios.syslinux` | BIOS legacy | `syslinux/` con `.cfg` |
| `uefi.systemd-boot` | UEFI systemd-boot | `efiboot/loader/loader.conf` + `.conf` |
| `uefi.grub` | UEFI con GRUB | `grub/` |

> Los sufijos `.esp` / `.mbr` / `.eltorito` son **internos** de archiso y fallan
> `return 1`. No usarlos.

### 7. Llamada a `mkarchiso`

```bash
set -euo pipefail

mkdir -p /var/tmp/archiso-work "$PWD/out"
sudo mkarchiso -v -w /var/tmp/archiso-work -o "$PWD/out" "$PWD/builder/arch-profile"
```

Checks previos obligatorios:
- `work_dir` y `out_dir` existen (`mkdir -p`)
- `bootstrap_packages.x86_64` existe (aunque esté vacío)
- Rutas **relativas** al perfil (archiso hace `cd` al perfil)

### 8. Post-build

```bash
set -euo pipefail

# Limpieza del work dir — protegida contra rutas vacías
: "${WORKDIR:=/var/tmp/archiso-work}"
case "$WORKDIR" in
  /|""|/var/tmp|/tmp) echo "❌ WORKDIR inseguro: $WORKDIR" >&2; exit 1 ;;
esac
rm -rf -- "$WORKDIR"

sha256sum out/*.iso > out/SHA256SUMS
```

## Validación previa

| Check | Comando | Esperado |
|---|---|---|
| Perfil válido | `mkarchiso -v ... 2>&1 | head -10` | Sin ERROR, sólo INFO |
| No community | `grep -R 'community' builder/arch-profile/` | ausente |
| Syslinux existe | `ls builder/arch-profile/syslinux/` | `.cfg` presente |
| UEFI existe | `ls builder/arch-profile/efiboot/loader/` | `loader.conf` presente |
| XferCommand ok | `grep XferCommand builder/arch-profile/pacman.conf` | tiene `curl` |

## Handoff a otras skills del grupo

| Si tocas... | Ve a |
|---|---|
| particionado, .img, DATA | `arch-appliance-img` |
| repo local firmado offline | `arch-frozen-repo` |
| manifiesto KEY=VALUE + runtime | `arch-payload-manifest` |
| escritorio, panel, kiosco | `arch-desktop-layers` |
| pruebas, arranque, apagado | `arch-qemu-validation` |
| "esto falló con..." | `arch-archlinux-pitfalls` |
| validar hardware antes de escribir | `arch-hardware-handler` |

## Errores comunes

| Error | Causa | Prevención |
|---|---|---|
| `realpath: ''` | Variable vacía en profiledef.sh | Rutas relativas + fichero vacío creado |
| `bootmode invalid` | `uefi.systemd-boot.esp` escrito a mano | Sólo los 3 nombres documentados |
| `community.db` → **404** | `[community]` en pacman.conf | Quitar, usar sólo core+extra |
| `DisableDownloadTimeout not recognized` | Flag de config, no CLI | Usar `XferCommand` con curl |
| `pacman --root` reubica `GPGDir` | No es cierto | Keyring del host, target vacío |
| `overlay` no preserva permisos | `cp -af` sin `--no-preserve` | `file_permissions` en profiledef.sh |
| Build sin haber hecho Brief | Objetivo real no cumplido | **OBLIGATORIO**: Brief con 7 categorías |
| `base-devel` en live sin necesidad | ~1 GB instalados sin uso | Revisar lista de paquetes |
| `calamares` sin solicitud explícita | Instalador GUI no pedido | No incluir salvo que el Brief lo pida |
