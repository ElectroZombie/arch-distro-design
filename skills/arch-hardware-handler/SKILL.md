---
name: arch-hardware-handler
description: 'Handles direct Arch Linux hardware interactions: USB writing, disk partitioning verification, hardware compatibility checks, and safe read/write operations. Prevents the "error -71" and data-loss issues from the Lubuntu cycle. Use before writing any .iso/.img to physical media.'
---

# Arch Hardware Handler — Direct Hardware Interaction

Skill para operaciones de **hardware físico** con distribuciones Arch Linux.
Diseñada para evitar los errores que destruyeron datos en el ciclo Lubuntu 📏:
escrituras sostenidas que dejan el USB colgado (`error -71`), particionado sobre
el disco equivocado, y falta de precauciones de apagado.

## Propósito

Esta skill es el **puente entre los artefactos build (ISO/.img) y el hardware
real**. Sirve para:

- Escribir `.iso` y `.img` en USB de forma **segura y validada**.
- Verificar que la partición es la esperada **antes** de montar.
- Revisar **compatibilidad de hardware** (UEFI/BIOS, firmwares, tablas de partición).
- Automatizar la **validación posterior** a la escritura.
- Documentar el estado del hardware para futuros builds.

## Cuándo usar esta skill

- El usuario dice "graba la ISO en el USB", "verifica el .img en el disco",
  "¿es compatible este hardware con Arch?".
- Antes de escribir en un USB real, se debe pasar por este harness.
- Se necesita validar que la partición `DATA` está bien formada.
- Se quiere comprobar que el sistema arrancará en el hardware objetivo.

## Flujo de trabajo obligatorio

### 1. Validación previa a la escritura

| Check | Comando | Esperado |
|---|---|---|
| Archivo ISO/img existe y tamaño | `ls -lh <archivo>` | ~1,2 GB (ISO) o ~10 GB (.img) |
| Checksum OK (si hay) | `sha256sum -c SHA256SUMS` | `OK` |
| Espacio en disco destino | `df -h <directorio_destino>` | Suficiente espacio |
| No es escritura sobre disco del host | `lsblk -o NAME,SIZE,MODEL` | Diferente a `/dev/sda` host |

### 2. Escritura segura de ISO en USB

```bash
set -euo pipefail

# 🔴 Identificar el USB correcto (NUNCA /dev/sda ni /dev/nvme0n1 del host)
USB=/dev/sdb   # Ejemplo: verificar con lsblk primero

# Guarda: el dispositivo debe existir y ser de bloque
[[ -b "$USB" ]] || { echo "❌ $USB no es dispositivo de bloque" >&2; exit 1; }

# Guarda: nunca escribir en el disco raíz del host
ROOT_DISK="$(findmnt -n -o SOURCE / | sed 's/[0-9]*$//')"
[[ "$USB" != "$ROOT_DISK" ]] || { echo "❌ $USB es el disco raíz del host" >&2; exit 1; }

# Guarda: no debe estar montado
if mount | grep -q "^$USB"; then
  echo "❌ $USB está montado. Desmontar antes." >&2; exit 1
fi

# 1. Desmontar particiones si estaban montadas
umount "${USB}"? 2>/dev/null || true

# 2. Escribir la ISO (dd con fsync, sin bloques ciegos)
sudo dd bs=4M if="$ISO" of="$USB" conv=fsync status=progress

# 3. Sincronizar FORZADO (lección del ciclo Lubuntu)
sync
sync
sync
```

#### ⚠️ Lección crítica (ciclo Lubuntu)

| Acción | Resultado | Recomendación |
|---|---|---|
| `kill -9` a QEMU durante escritura | USB colgado, `error -71` | **NUNCA** usar `kill -9` |
| `system_powerdown` por QMP | Apagado gracioso, USB intacto | `echo '{"execute":"system_powerdown"}' \| socat - UNIX-CONNECT:/tmp/qmp.sock` |
| `sync` tres veces antes de retirar USB | Datos consistentes | Siempre `sync` antes de `umount` |

### 3. Validación posterior a la escritura

| Check | Comando | Esperado |
|---|---|---|
| Tabla de particiones GPT | `parted -s $USB print` | `gpt`, 3 particiones (EFI+SYS+DATA) |
| Partición EFI etiquetada | `lsblk -o NAME,FSTYPE,LABEL $USB` | `vfat` |
| Partición SYS (root) | `lsblk -o NAME,FSTYPE,LABEL $USB` | `ext4` |
| Partición DATA | `lsblk -o NAME,FSTYPE,LABEL $USB` | `ext4`, label `DATA` |
| El USB arranca en BIOS | QEMU `-cdrom $ISO -boot d` → prompt | login |
| El USB arranca en UEFI | QEMU `-drive if=pflash ...` → prompt | login |
| `findmnt / / /data` (después de boot) | `ext4` + `ext4` + `DATA` | correcto |

### 4. Particionado de disco nuevo (para appliance .img)

```bash
set -euo pipefail

# 1. Verificar tamaño mínimo
TAMANO_GB=$(lsblk -d -o SIZE "$DESTINO" | tail -1 | numfmt --from=iec --suffix=B)
if (( $(echo "$TAMANO_GB < 8" | bc -l) )); then
    echo "❌ Disco < 8 GB: abortar — modelo requiere mínimo 8 GB"
    exit 1
fi

# 2. Guarda: no es disco del host
ROOT_DISK="$(findmnt -n -o SOURCE / | sed 's/[0-9]*$//')"
[[ "$DESTINO" != "$ROOT_DISK" ]] || { echo "❌ $DESTINO es el disco raíz" >&2; exit 1; }

# 3. Table GPT limpia
parted -s "$DESTINO" mklabel gpt

# 4. Partición EFI (512 MB)
parted -s "$DESTINO" mkpart primary fat32 1MiB 513MiB
parted -s "$DESTINO" set 1 esp on

# 5. Partición SYS (~6 GB)
parted -s "$DESTINO" mkpart primary ext4 513MiB 6513MiB

# 6. Partición DATA (resto, label DATA)
parted -s "$DESTINO" mkpart primary ext4 6513MiB -0s
parted -s "$DESTINO" name 3 "DATA"
parted -s "$DESTINO" set 3 lba on

# 7. Formatear
mkfs.vfat -F32 "${DESTINO}1"
mkfs.ext4 "${DESTINO}2"
mkfs.ext4 -L DATA "${DESTINO}3"
```

### 5. Comprobación de compatibilidad de hardware

| Componente | Comando de verificación | Esperado |
|---|---|---|
| Firmware UEFI | `ls /usr/share/edk2/x64/OVMF.*.fd` | `OVMF_CODE.4m.fd` + `OVMF_VARS.4m.fd` |
| Soporte virtio (para .img) | `lspci -nnk \| grep -i virtio` | Driver cargado o disponible |
| Consola serie (ttyS0) | `dmesg \| grep -i uart` | `16550A` o compatible |
| Espacio mínimo para ISO | `df -h /` | ≥ 5 GB libres en work_dir |
| Espacio mínimo para .img | `df -h /` | ≥ 20 GB libres |

## Errores comunes y prevención

| Error | Síntoma | Prevención |
|---|---|---|
| `error -71` al retirar USB | Escritura sostenida sin `sync` + `kill -9` | `sync` 3 veces; nunca `kill -9` |
| Particionado sobre `/dev/sda` (host) | Destruye el disco del sistema | `lsblk` siempre antes; guarda `ROOT_DISK` |
| `ffs: bad journal` en DATA | `mkfs.ext4` sin `-L DATA` o sin flag `lba` | Sintaxis exacta del skill |
| ISO no arranca (pantalla negra) | repo `community` 404 deja systemd en error | Verificar `pacman -Sy` antes de retirar USB |
| `root=UUID=` no encontrado | GRUB viejo, PARTUUID desactualizado | `grub-mkconfig` después de particionar |

## Handoff a otras skills del grupo

| Si tocas... | Ve a |
|---|---|
| Escritura de ISO en USB | `arch-iso-builder` |
| Particionado .img desde cero | `arch-appliance-img` |
| Validación en QEMU después de escribir | `arch-qemu-validation` |
| Errores de "este hardware no funciona" | `arch-archlinux-pitfalls` |
| Payloads específicos | `arch-payload-manifest` |

## Checklist de operaciones de hardware (pegar en la zona de trabajo)

```text
=== CHECKLIST HARDWARE ARCH ===
1. ✅ Identificar USB correcto: lsblk -o NAME,SIZE,MODEL
2. ✅ Confirmar que NO es el disco raíz del host
3. ✅ Desmontar particiones previas: umount "${USB}"?
4. ✅ Escribir con `dd bs=4M ... conv=fsync`
5. ✅ `sync` tres veces seguidas
6. ✅ `sha256sum -c SHA256SUMS` (si existe)
7. ✅ `parted -s $USB print` → EFI 512 MB · SYS · DATA
8. ✅ `mount -L DATA /tmp/test` → legible, sin error
9. ✅ `findmnt / / /data` después de boot → 3 mounts OK
10. ✅ Nunca `kill -9` a QEMU ni a procesos de escritura
11. ✅ Documentar modelo USB y capacidad en bitácora
=== FIN CHECKLIST ===
```

## Versionado y rastro

| Dato | Dónde se guarda |
|---|---|
| Modelo USB + capacidad | `hardware-log.txt` en el repo del proyecto |
| Checksum ISO/.img | `SHA256SUMS` (ya commiteado) |
| Éxito/fallo de `sync` | Comentario en `docs/08-LECCIONES-APRENDIDAS.md` |
| Hardware incompatible | Tag en `git commit`: `hardware::incompatible` |

## Metodología

1. **Confirmar supuestos** — `lsblk`, `parted`, `df` antes de tocar hardware.
2. **Medir, no suponer** — tamaños reales, throughput esperado, espacio libre.
3. **Probar en QEMU primero** — `arch-qemu-validation` antes de hardware real.
4. **Documentar todo** — `error -71`, `bad journal`, particiones erróneas no vuelven a ocurrir.

## Integración con el grupo de skills

Esta skill cubre el **gap** entre los artefactos build (ISO/.img) y el hardware
físico. Mientras las demás skills construyen los artefactos en software,
`arch-hardware-handler` asegura que lleguen vivos al hardware y que el hardware
sea compatible.
