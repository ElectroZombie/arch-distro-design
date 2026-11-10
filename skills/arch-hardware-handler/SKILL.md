---
name: arch-hardware-handler
description: 'Handles direct Arch Linux hardware interactions: USB writing, disk partitioning verification, hardware compatibility checks, and safe read/write operations. Prevents the "error -71" and data loss issues that destroyed data in the Lubuntu cycle.'
---

# Arch Hardware Handler — Direct Hardware Interaction

Skill para operaciones de **hardware físico** con distribuciones Arch Linux. Diseñada para evitar los errores que destruyeron datos en el ciclo Lubuntu 📏: escrituras sostenidas que dejan el USB colgado (`error -71`), particionado sobre el disco equivocado, y falta de precauciones de apagado.

## Propósito

Esta skill es el **puente entre los artefactos build (ISO .img) y el hardware real**.
Sirve para:

- Escribir `.iso` y `.img` en USB de forma **segura y validada**.
- Verificar que la particulación es la esperada **antes** de montar.
- Revisar **compatibilidad de hardware** (UEFI/BIOS, firmwares, tablas de partición).
- Automatizar la **validación posterior** a la escritura.
- Documentar el estado del hardware para futuros builds.

## Cuando usar esta skill

- El usuario dice "graba la ISO en el USB", "verifica el .img en el disco", "¿es compatible este hardware con Arch?".
- Antes de escribir en un USB real, se debe pasar por este harness.
- Se necesita validar que la partición `Salvas` (`DATA`) está bien formada.
- Se quiere comprobar que el sistema arrancará en el hardware objetivo (UEFI vs BIOS).

## Flujo de trabajo obligatorio

### 1. Validación previa a la escritura

| Check | Comando | Esperado |
|---|---|---|
| Archivo ISO/img existe y tiene tamaño | `ls -lh <archivo>` | ~1,2 GB (ISO) o ~10 GB (.img) |
| Sums checkSum OK (si hay) | `sha256sum -c SHA256SUMS` | `OK` |
| Espacio en disco destino | `df -h <directorio_destino>` | Sufre espacio |
| No es escritura sobre disco del host | `lsblk -o NAME,SIZE,MODEL` | Diferente al `/dev/sda` host |

### 2. Escritura segura de ISO en USB

```bash
# Identificar el USB correcto (NUNCA /dev/sda ni /dev/nvme0n1 del host)
USB=/dev/sdb   # Ejemplo: verificar con lsblk primero

# 1. Verificar que NO es disco del host
lsblk -o NAME,SIZE,MODEL | grep -i "sdb\|usb"

# 2. Desmontar particiones si ya estaban montadas
umount "${USB}?" 2>/dev/null || true

# 3. Escribir la ISO (método seguro - sin dd bloques ciegos)
sudo dd bs=4M if=<archivo-de-iso> of=$USB conv=fsync status=progress

# 4. Sincronizar FORZADO (lección del ciclo Lubuntu)
sync
sync
sync

# 5. Sincronizar QMP si QEMU está corriendo (apagado gracioso)
#    Nunca usar `kill -9` al QEMU o al proceso de escritura
```

#### ⚠️ Lección crítica (ciclo Lubuntu)

| Acción | Resultado | Recomendación |
|---|---|---|
| `kill -9` a QEMU durante escritura | USB colgado, `error -71` al volver a usarlo | **NUNCA** usar `kill -9` |
| `system_powerdown` por QMP | Apagado gracioso, USB intacto | Usar `echo '{"execute":"system_powerdown"}' | socat - UNIX-CONNECT:/tmp/qmp.sock` |
| `sync` tres veces antes de retirar USB | Datos consistentes | Siempre hacer `sync` antes de `umount` / retirar medio |

### 3. Validación posterior a la escritura

| Check | Comando | Esperado |
|---|---|---|
| Tabla de particiones GPT | `parted -s $USB print` | `gpt`, 3 particiones (EFI+SYS+DATA) |
| Partición EFI etiquetada | `lsblk -o NAME,FSTYPE,LABEL $USB1` | `vfat` |
| Partición SYS (root) | `lsblk -o NAME,FSTYPE,LABEL $USB2` | `ext4` |
| Partición DATA (`Salvas`) | `lsblk -o NAME,FSTYPE,LABEL $USB3` | `ext4`, label `Salvas` |
| El USB arranca en BIOS | `qemu-system-x86_64 -m 512 -cdrom $ISO -boot d -nographic` → prompt |login |
| El USB arranca en UEFI | `qemu ... -drive if=pflash ... -drive file=$ISO` → prompt |login |
| `findmnt / / /data` (después de boot) | `ext4` + `ext4` + `Salvas` | Correcto |

### 4. Particionado de disco nuevo (para appliance .img)

Si el usuario quiere crear un .img desde cero sobre un disco físico o archivo de tamaño fijo:

```bash
# 1. Verificar tamaño mínimo
TAMANO_GB=$(lsblk -d -o SIZE $DESTINO | numfmt --from=iec --suffix=B)
if (( $(echo "$TAMANO_GB < 8" | bc -l) )); then
    echo "❌ Disco < 8 GB: abortar — modelo requiere mínimo 8 GB"
    exit 1
fi

# 2. Table GPT limpia
parted -s $DESTINO mklabel gpt

# 3. Partición EFI (512 MB)
parted -s $DESTINO mkpart primary fat32 1MiB 513MiB
parted -s $DESTINO set 1 esp on

# 4. Partición SYS (~6 GB)
parted -s $DESTINO mkpart primary ext4 513MiB 6513MiB

# 5. Partición DATA (resto, label Salvas)
parted -s $DESTINO mkpart primary ext4 6513MiB -0s
parted -s $DESTINO name 3 "Salvas"
parted -s $DESTINO set 3 lba on   # Flag para datos

# 6. Formatear
mkfs.vfat -F32 "${DESTINO}1"
mkfs.ext4 "${DESTINO}2"
mkfs.ext4 -L Salvas "${DESTINO}3"
```

### 5. Comprobación de compatibilidad de hardware

| Componente | Comando de verificación | Esperado |
|---|---|---|
| Firmware UEFI | `ls /usr/share/edk2/x64/OVMF.*.fd` | `OVMF_CODE.4m.fd` + `OVMF_VARS.4m.fd` |
| Soporte virtio (para .img) | `lspci -nnk | grep -i virtio` | Driver cargado o disponible |
| Consola serie (ttyS0) | `dmesg | grep -i uart` | `16550A` o compatible |
| Espacio mínimo para ISO | `df -h /` | ≥ 5 GB libres en work_dir |
| Espacio mínimo para .img | `df -h /` | ≥ 20 GB libres (para .img de 10 GB + overhead) |

## Errores comunes y prevención

| Error | Sintoma | Prevención |
|---|---|---|
| `error -71` al retirar USB | Escritura sostenida sin `sync` + `kill -9` | Siempre `sync` 3 veces; nunca `kill -9` a QEMU/dd |
| Particionado sobre `/dev/sda` (host) | Destruye el disco del sistema operativo | `lsblk` siempre antes; validar `UUID`/`LABEL` |
| `ffs: bad journal` en DATA | `mkfs.ext4` sin `-L Salvas` o sin `lba` flag | Usar la sintaxis exacta del skill |
| ISO no arranca (pantalla negra) | `community` repo 404 deja systemd en error | Verificar `pacman -Sy` antes de retirar USB |
| `root=UUID=` no encontrado | GRUB viejo, PARTUUID desactualizado | Regenerar `grub-mkconfig` después de particionar |

## Handoff a otras skills del grupo

| Si tocas... | Ve a |
|---|---|
| Escritura de ISO en USB | `arch-iso-builder` (tiene la ISO lista) |
| Particionado .img desde cero | `arch-appliance-img` (tiene la tabla partit. plan) |
| Validación en QEMU después de escribir | `arch-qemu-validation` (harness de checks) |
| Errores de "este hardware no funciona" | `arch-archlinux-pitfalls` (tabla de errores reales) |
| Si el hardware requiere payloads específicos | `arch-payload-manifest` (runtime nativo/nspawn/podman) |

## Checklist de operaciones de hardware (pegar en la zona de trabajo)

```text
=== CHECKLIST HARDWARE ARCH ===
1. ✅ Identificar USB correcto: lsblk -o NAME,SIZE,MODEL | grep -v "sd[a-z]*" 
2. ✅ Confirmar que NO es /dev/sda del host
3. ✅ Umontar particiones previas: umount "${USB}?"
4. ✅ Escribir con `dd bs=4M ... conv=fsync`
5. ✅ `sync` tres veces seguidas
6. ✅ `sha256sum -c SHA256SUMS` (si existe)
7. ✅ `parted -s $USB print` → EFI 512 MB · SYS · DATA (Salvas)
8. ✅ `mount -L Salvas /tmp/test` → legible, sin error
9. ✅ `findmnt / / /data` después de boot → 3 mounts OK
10. ✅ Nunca `kill -9` a QEMU ni a procesos de escritura
11. ✅ Documentar modelo USB y capacidad en bitácora
=== FIN CHECKLIST ===
```

## Versionado y rastro

Cada operación hardware deja registro:

| Dato | Donde se guarda |
|---|---|
| Modelo USB + capacidad | `hardware-log.txt` en el repo del proyecto |
| Checksum ISO/`img` | `SHA256SUMS` (ya commiteado) |
| Éxito/fallo de `sync` | Comentario en `docs/08-LECCIONES-APRENDIDAS.md` |
| Hardware incompatible | Taggeado en `git commit` con mensaje `hardware::incompatible` |

## Metodología (basada en lecciones del ciclo Lubuntu)

1. **Confirmar supuestos** — `lsblk`, `parted`, `df` antes de tocar hardware.
2. **Medir, no suponer** — Tamaños reales, throughput esperado, espacio libre.
3. **Probar en QEMU primero** — `arch-qemu-validation` antes de hardware real.
4. **Documentar todo** — `error -71`, `bad journal`, particiones wrong no vuelven a ocurrir.

## Integración con el grupo de skills

Esta skill cubre el **gapo faltante** que quedaba: la transición de los artefactos build (ISO/.img) al hardware físico. Mientras las demás skills se ocupan de construir los artefactos en software, `arch-hardware-handler` se asegura de que esos artefactos **lleguen vivos al hardware** y de que el hardware sea **compatibles** con lo que se construye.

Se instala automáticamente junto con las otras skills del grupo `arch-distro/`.
