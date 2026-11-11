---
name: arch-appliance-img
description: 'Build persistent Arch .img appliances with EFI+SYS+DATA partitions. Handles GPT partitioning, pacstrap installation, systemd services, and makes the DATA partition portable across machines. Use when the user wants a persistent .img (not a live ISO) or needs a portable DATA partition.'
---

# Arch Appliance Image Builder — General Purpose

Skill para crear imágenes `.img` persistentes de Arch Linux con particiones
EFI (512 MB), SYS (root) y DATA (label `DATA`). Sirve para **cualquier**
appliance Arch. El .img es auto-suficiente: contiene todo el SO y los datos, y
la partición DATA se puede montar en otra máquina sin tocar el SO.

## ⚠️ OBLIGATORIO: Brief previo

> **Directiva desde `arch-distro-design`:** Esta skill **NUNCA** debe invocarse
> sin antes haber completado el `Brief` de diseño (7 categorías obligatorias).

| Categoría | Qué define para esta skill |
|---|---|
| **Objetivo** | Si es .img persistente, define particionado y tamaño de DATA |
| **Formato de salida** | Determina si construimos .img o ISO+.img |
| **Hardware objetivo** | Disco tamaño mínimo 8 GB, tipo (HDD/SSD/NVMe/USB). Valida con `arch-hardware-handler` |
| **Red** | Política de networkd: por defecto `inactive`, admin lo habilita |
| **Apps / Payloads** | Si van en .img o se materializan después en el appliance |
| **Inmutabilidad** | Si root es rw con regla de update-unit o squashfs |
| **Política de updates** | Cómo se actualiza (por defecto `pacman -Syu` con networkd temporal) |

> **Si el `Brief` no está completado, detener la invocación y pedir al usuario
> las 7 categorías obligatorias.**

## Cuándo usar esta skill

- El usuario quiere una imagen `.img` en lugar de (o después de) una ISO.
- El `arch-distro-design` ya tomó decisiones sobre particionado y objetivos.
- Se necesita una partición DATA portátil (`DATA`) montable en otra máquina.
- Se quiere un sistema persistente con servicios systemd, ssh, y particionado
  EFI+SYS+DATA.
- Se quiere validar el appliance en QEMU antes de grabar en USB real.

## ⚠️ OBLIGATORIO: Validación con `arch-hardware-handler`

Antes de escribir en cualquier disco físico o crear .imgs, pasar por el
checklist de `arch-hardware-handler`:

1. ✅ Identificar disco correcto: `lsblk -o NAME,SIZE,MODEL` - NO es `/dev/sda` del host
2. ✅ Confirmar tamaño mínimo: ≥ 8 GB
3. ✅ Particionado GPT limpio: `parted -s "$DESTINO" mklabel gpt`
4. ✅ Particiones EFI (512 MB), SYS, DATA con label `DATA`
5. ✅ Formateo: `mkfs.vfat -F32 "${DESTINO}1"`, `mkfs.ext4 "${DESTINO}2"`,
   `mkfs.ext4 -L DATA "${DESTINO}3"`
6. ✅ `sync` tres veces después de escribir

## Parámetros de particionado (regla de tamaños)

| Tamaño disco | Partición | Tamaño | Tipo | Montaje |
|---|---|---|---|---|
| **< 8 GB** | ❌ Rechazar | Disco muy pequeño para el modelo | | |
| **8–10 GB** | EFI | 512 MB | vfat | `/boot` |
| | SYS | 3 GB | ext4 | `/` |
| | DATA | 2 GB | ext4 | `/data` (label `DATA`) |
| **10–20 GB** | EFI | 512 MB | vfat | `/boot` |
| | SYS | 6 GB | ext4 | `/` |
| | DATA | 5 GB | ext4 | `/data` (label `DATA`) |
| **> 20 GB** | EFI | 512 MB | vfat | `/boot` |
| | SYS | 20 GB | ext4 | `/` |
| | DATA | Resto GB | ext4 | `/data` (label `DATA`) |

> **Reglas obligatorias:**
> - Disco < 8 GB → abortar
> - SYS < 6 GB → abortar
> - EFI FIJA a 512 MB
> - DATA label = `DATA`
> - El SO de la partición DATA debe ser **montable en otra máquina** sin reformatear

## Flujo de trabajo obligatorio

### 1. `build.sh` CLI (parámetros obligatorios)

```
Usage: build.sh --disk <PATH> --profile <PROFILE> --yes --dry-run
```

Flags:
- `--disk <PATH>`: Ruta al disco/archivo .img objetivo
- `--profile <PROFILE>`: Ruta al perfil archiso (builder/arch-profile)
- `--yes`: Saltar confirmaciones (solo para scripts automatizados)
- `--dry-run`: Simular TODO pero NO escribir disco
- `--no-ask`: Igual que `--yes` (compatibilidad)

**Validaciones previas obligatorias:**
- `--disk` existe y tiene tamaño >= 8 GB (sino abortar)
- `--disk` no es disco del host `/dev/sda` ni `/dev/nvme0n1`
- Verificar que `--disk` no es ninguna partición principal del host
- `--profile` existe y tiene `profiledef.sh`, `packages.x86_64`, `pacman.conf`
- `--yes` o interacción doble: "Escribir .img de <tamaño>? Escribir S/N"

### 2. Particionado `parted`

| Paso | Comando | Resultado |
|---|---|---|
| Limpiar tabla | `parted -s "$DISK" mklabel gpt` | Nueva tabla GPT |
| EFI | `parted -s "$DISK" mkpart primary fat32 1MiB 513MiB` | EFI 512 MB |
| Set EFI boot | `parted -s "$DISK" set 1 esp on` | Marcar boot |
| SYS | `parted -s "$DISK" mkpart primary ext4 513MiB 6513MiB` | SYS ~6 GB |
| DATA | `parted -s "$DISK" mkpart primary ext4 6513MiB -0s` | Resto → DATA |
| Sincronizar | `partprobe` / `sync` | Refrescar kernel |

> **Nombres de particiones:** No fijos a `sda1`/`sda2`/`sda3`. El esquema
> estándar es EFI+SYS+DATA, pero el usuario puede solicitar otro.

### 3. Formatear y etiquetas

```bash
set -euo pipefail

# EFI
mkfs.vfat -F32 "${DISK}1"

# SYS (root)
mkfs.ext4 -L SYS "${DISK}2"

# DATA
mkfs.ext4 -L DATA "${DISK}3"
```

### 4. `pacstrap` del target

```bash
set -euo pipefail

mount "${DISK}2" /mnt
mount "${DISK}1" /mnt/boot
mkdir -p /mnt/data
mount "${DISK}3" /mnt/data

pacstrap -C <pacman.conf> -c -G -M -K /mnt \
  base linux linux-firmware grub efibootmgr \
  openssh sudo tmux htop nano vim less usbutils pciutils nftables \
  xorg-server xorg-xinit xf86-video-fbdev openbox tint2 falkon \
  qterminal featherpad pcmanfm-qt lximage-qt feh ttf-dejavu \
  shared-mime-info hicolor-icon-theme breeze-icons xdg-user-dirs \
  udisks2 polkit gvfs ntfs-3g zip unzip

# GRUB (UEFI)
grub-install --target=x86_64-efi --efi-directory="/mnt/boot" --bootloader-id=grub
grub-mkconfig -o "/mnt/boot/grub/grub.cfg"

# fstab
genfstab -U /mnt >> /mnt/etc/fstab
echo "LABEL=DATA /data ext4 defaults 0 2" >> /mnt/etc/fstab
```

### 5. Configuración post-instalación (dentro del chroot)

> 🔴 **CRÍTICO — contraseña de root:** NUNCA uses `root:root` ni `toor` en
> producción. Este placeholder debe reemplazarse por una contraseña fuerte
> generada por el usuario o por `passwd` interactivo. El administrador debe
> cambiarla en el primer arranque.

```bash
arch-chroot /mnt <<'CHROOT'
set -euo pipefail

# 🔴 Contraseña de root — REEMPLAZAR por valor seguro antes del build.
# Opción A (recomendada): forzar cambio en primer login.
passwd -e root   # marca la contraseña como expirada → pide cambiarla al entrar
# Opción B: contraseña generada por el usuario (nunca "root"/"toor"):
#   echo "root:${ROOT_PASSWORD_HASH}" | chpasswd -e

# locale + TZ
ln -sf /usr/share/zoneinfo/America/Havana /etc/localtime
printf 'es_CU.UTF-8 UTF-8\n' >> /etc/locale.gen
# locale-gen se deja pendiente: el usuario elige en el login

# ssh
systemctl enable sshd

# networkd (por defecto DESACTIVADO, solo admin lo habilita)
systemctl disable systemd-networkd

# user wheel para polkit/udisks2
usermod -aG wheel root

# DATA dir
mkdir -p /data
chown root:root /data
chmod 0755 /data
CHROOT
```

### 6. Systemd services incluidos

| Service | Propósito |
|---|---|
| `getty@tty1.service` | Autologin root en tty1 |
| `sshd.service` | SSH en puerto 22 (hostfwd 60022) |
| `appliance-update.service` | **Único** servicio que escribe en root (`pacman -Syu`) |
| `systemd-networkd` | **Desactivado** por defecto (red solo si admin lo permite) |

### 7. Partición DATA portable (clave)

| Requisito | Cómo se cumple |
|---|---|
| Montable en **otra** máquina | `LABEL=DATA` + `ext4` |
| Sin necesidad de reformatear | `mkfs.ext4 -L DATA` |
| No toca el SO de la máquina destino | Solo monta `/data` |
| Tamaño conocido | Según regla: <10 GB→2 GB · 10-20 GB→5 GB · >20 GB→SYS 20 GB+resto |

**Comprobación después del build:**

```bash
mkdir -p /mnt/data
mount -L DATA /mnt/data
ls /mnt/data/
```

### 8. Validación (checklist)

| # | Comprobación | Comando | Esperado |
|---|---|---|---|
| 1 | Tabla de particiones | `parted -s $DISK print` | EFI + SYS + DATA (`DATA`) |
| 2 | El appliance arranca | consola serie / SSH | prompt de login |
| 3 | Los tres puntos de montaje | `findmnt / / /data` | ext4 + ext4 + DATA |
| 4 | DATA sobrevive al reboot | escribir fichero → reiniciar → leer | presente |
| 5 | El panel kiosco arranca | `pgrep -a openbox; pgrep -a tint2` | ambos |
| 6 | El kiosco sirve la app | `curl -s http://127.0.0.1:3000/health` | `{"status":"ok",...}` |
| 7 | La BD responde | `systemctl is-active postgresql` | `active` |
| 8 | SSH funciona | `ssh -p 60022 root@localhost` | login |
| 9 | Red por LAN (DHCP) | `ip -4 addr show` | IP asignada |
| 10 | **Sin red por defecto** | `systemctl is-active systemd-networkd` | `inactive` |
| 11 | Partición DATA portable | montar `sda3` en **otra** máquina | legible, etiqueta `DATA` |
| 12 | `appliance-update` existe | `systemctl cat appliance-update.service` | unit presente |
| 13 | Podman **no** instalado | `command -v podman` | vacío |

> La **10** valida la política "internet desactivado por defecto".
> La **11** valida el requisito de "DATA montable en otra máquina".

### 9. Handoff a otras skills del grupo

| Si tocas... | Ve a |
|---|---|
| perfil de paquetes | `arch-iso-builder` |
| repo frozen + pacman config | `arch-frozen-repo` |
| manifiesto KEY=VALUE + runtime | `arch-payload-manifest` |
| escritorio, panel, kiosco | `arch-desktop-layers` |
| pruebas QEMU, boot, apagado | `arch-qemu-validation` |
| "esto falló con..." | `arch-archlinux-pitfalls` |
| validar hardware antes de escribir | `arch-hardware-handler` |

### 10. Errores comunes

| Error | Síntoma | Prevención |
|---|---|---|
| `error -71` al retirar USB | Escritura sostenida sin `sync` + `kill -9` | Siempre `sync` 3 veces; nunca `kill -9` |
| Particionado sobre `/dev/sda` (host) | Destruye el disco del sistema | `lsblk` siempre antes; validar que no es partición principal host |
| `ffs: bad journal` en DATA | `mkfs.ext4` sin etiqueta o flags incorrectos | Usar sintaxis exacta del skill |
| `appliance-update` no arranca | Falta `systemctl enable appliance-update` | Añadir al chroot o unit file |
| Sin red después de boot | `systemctl start systemd-networkd` no hace nada | Recordar: por defecto `inactive`, admin lo habilita |
| Contraseña de root débil | `root:root` por defecto | Usar `passwd -e root` (fuerza cambio) o hash seguro |
| `locale` no configurado | El sistema no tiene locale activo por defecto | Dejar `locale-gen` pendiente y elegir en login |
