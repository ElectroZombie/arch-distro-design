---
name: arch-frozen-repo
description: 'Create and maintain a frozen (offline, signed) pacman repository inside the ISO or appliance. Handles repo creation with repo-add, version pinning, and offline consumption. Use when the appliance must work 100% offline and pacman -Syu must resolve against a local signed repo instead of the internet.'
---

# Arch Frozen Repo — General Purpose

Skill para crear y mantener un repositorio pacman **congelado** (offline,
firmado, reproducible) que vive dentro de la ISO o del appliance `.img`. Este
repositorio es el que el live/appliance usa para sincronizar paquetes **sin
internet**, y es la fuente segura para `pacman -Syu`.

## ⚠️ Integra con el Brief de `arch-distro-design`

> **Directiva desde `arch-distro-design`:** Las decisiones sobre repos y
> actualizaciones se toman aquí. El `Brief` determina:

| Categoría desde Brief | Decisión en `arch-frozen-repo` |
|---|---|
| **Objetivo** | Si el repo sirve para ISO live, .img, o ambos. Define `versions.txt` y política. |
| **Red** | Si internet está desactivada por defecto (`inactive` networkd). El repo frozen es la única fuente. |
| **Apps / Payloads** | Quién materializa los payloads: el repo frozen provee paquetes, pero la materialización es desde repo propio de la app. |
| **Inmutabilidad** | El repo frozen es **offline** por diseño; actualizaciones solo con `appliance-update.service`. |
| **Política de updates** | `versions.txt` commiteado tras cada build. El usuario puede cambiar la política de red (§3). |

> **Si el `Brief` no está completado, la generación del repo frozen se pausa y
> se pide al usuario las 7 categorías obligatorias.**

## Propósito

- Permite que la ISO o .img funcionen **100% offline** después de construirse.
- Evita que el admin dependa de internet para actualizaciones (política del proyecto).
- Sirve como fuente de paquetes para la instalación de payloads (apps).
- Se versiona junto con la ISO/appliance (archivos `versions.txt` + `SHA256SUMS`).

## Artefactos producidos

| Archivo | Contenido |
|---|---|
| `arch-repo/appliance.db.tar.gz` | Base de datos de pacman firmada |
| `arch-repo/*.pkg.tar.zst` | Paquetes binarios (congelados) |
| `versions.txt` | Lista `paquete version` (para rollback/verificación) |
| `x86_64/` | Estructura de directorios del repo |

## Flujo de trabajo obligatorio

### 1. Construir el repo congelado (después de ISO build)

```bash
set -euo pipefail

# 1. Directorio temporal con los .pkg a instalar (SIN instalarlos)
mkdir -p "$WORKDIR/pkg"
sudo pacman -Sw --cachedir "$WORKDIR/pkg" \
  --config builder/arch-profile/pacman.conf \
  $(cat builder/repo-packages.txt)

# 2. Empaquetar el repo dentro del overlay airootfs
mkdir -p "$ISODIR/builder/arch-profile/airootfs/arch-repo"
cp "$WORKDIR/pkg"/*.pkg.tar.zst "$ISODIR/builder/arch-profile/airootfs/arch-repo/"
repo-add "$ISODIR/builder/arch-profile/airootfs/arch-repo/appliance.db.tar.gz" \
  "$ISODIR/builder/arch-profile/airootfs/arch-repo"/*.pkg.tar.zst

# 3. Congelar versiones documentadas
pacman -Sp --print-format '%n %v' --config builder/arch-profile/pacman.conf \
  $(cat builder/repo-packages.txt) > out/versions.txt
```

### 2. Estructura del repo `arch-repo/`

```
arch-repo/
├── appliance.db.tar.gz   # DB firmada (SigLevel PackageRequired en el live)
├── pkg1.pkg.tar.zst
├── pkg2.pkg.tar.zst
└── ... (todos los paquetes LIVE + REPO extras)
```

### 3. Consumo desde el live (`/etc/pacman.conf` del live)

```ini
[appliance]
SigLevel = PackageRequired
Server = file:///arch-repo
```

El live monta este repo al root (`/arch-repo`) porque hace `switch_root` sobre
el squashfs, así que `/arch-repo` es una ruta absoluta dentro de la sesión live.

### 4. Consumo desde el appliance (después de `pacstrap`)

El appliance ya tiene los paquetes instalados. Si se quiere actualizar:

```bash
# Usar el repo congelado que ya está en el .img
pacman -Sy --root / --config /etc/pacman.conf
# O actualizar solo los paquetes del repo appliance
pacman -Su --noconfirm --ignore glibc
```

### 5. Actualizaciones controladas (política del proyecto)

| Escenario | Acción |
|---|---|
| Actualización normal | `pacman -Syu` con networkd temporalmente arriba |
| Solo repo appliance | `pacman -Sy --root / --config /etc/pacman.conf` (usa `file:///arch-repo`) |
| Evitar actualizar glibc | `pacman -Su --noconfirm --ignore glibc` |
| Log de versiones | `versions.txt` commiteado tras cada build |

### 6. Validación

| Check | Comando | Esperado |
|---|---|---|
| DB firmada existe | `ls arch-repo/appliance.db.tar.gz` | presente |
| Paquetes .pkg existen | `ls arch-repo/*.pkg.tar.zst` | lista no vacía |
| versions.txt existe | `cat versions.txt` | `linux 6.6.8-1-etc` etc |
| SigLevel correcto | `grep 'PackageRequired' etc/pacman.conf` | encontrado |
| Repo consumible | `pacman -Sy --root / -c /etc/pacman.conf` | sync sin error |

## ⚠️ Sección AVANZADA: gestores de paquetes alternativos (AUR)

> 🔴 **ADVERTENCIA DE SEGURIDAD — NO USAR POR DEFECTO.**
> Los paquetes AUR **no están firmados** por el keyring oficial de Arch. Incluir
> un repo AUR en el live **rompe el modelo de confianza** del repo frozen y
> requiere `SigLevel = Optional` (verificación de firma desactivada). Esto es
> exactamente el tipo de patrón que un escáner de seguridad marca como riesgo.
> **Solo úsalo si el `Brief` lo autoriza explícitamente y el usuario acepta el
> riesgo por escrito.**

Si el Brief lo autoriza, el flujo es:

### A.1 Inyección de repos AUR en el overlay `airootfs/`

```bash
set -euo pipefail

mkdir -p "$ISODIR/builder/arch-profile/airootfs/aur-repo"

# Opción A: copiar .pkg.tar.zst ya compilados (PREFERIDO — sin red en build)
cp "$WORKDIR/pkg-aur"/*.pkg.tar.zst \
   "$ISODIR/builder/arch-profile/airootfs/aur-repo/"

# Opción B: clonar y compilar (requiere red y revisión manual del PKGBUILD)
# ⚠️ Revisa el PKGBUILD antes de ejecutar makepkg. Nunca `makepkg -si` a ciegas.
```

### A.2 `/etc/pacman.conf` del live con repo AUR

```ini
[appliance]
SigLevel = PackageRequired
Server = file:///arch-repo

# 🔴 Solo si el Brief lo autoriza. SigLevel=Optional desactiva la verificación
# de firma para estos paquetes. Aísla este repo del resto.
[aur]
SigLevel = Optional
Server = file:///aur-repo
```

### A.3 Consumo desde el appliance

```bash
# Desde el appliance, usando yay sobre el repo frozen (si está instalado)
yay -Sy --noconfirm

# O usando pamac con el config del sistema
pamac update --force-refresh
```

## Handoff a otras skills del grupo

| Si tocas... | Ve a |
|---|---|
| perfil + packages | `arch-iso-builder` |
| particionado + .img | `arch-appliance-img` |
| manifiesto KEY=VALUE + runtime | `arch-payload-manifest` |
| escritorio, panel, kiosco | `arch-desktop-layers` |
| pruebas QEMU, boot, apagado | `arch-qemu-validation` |
| "esto falló con..." | `arch-archlinux-pitfalls` |
| validar hardware antes de escribir | `arch-hardware-handler` |
