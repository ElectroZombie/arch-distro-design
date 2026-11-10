---
name: arch-qemu-validation
description: 'Harness de pruebas automatizables en QEMU para ISO y .img appliances. Valida boot, consola serie, SSH, particiones, apagado gracioso y checklist de 15+ items. Integra con Brief de arch-distro-design y validador de hardware arch-hardware-handler.'
---

# Arch QEMU Validation — General Purpose

Skill para validar **automatizablemente** ISOs y `.img` appliances de Arch Linux en QEMU. **No** está limitado a una distribución específica: sirve para cualquier artefacto construido con las skills del grupo. Todo artefacto pasa por este gate **antes** de tocar hardware real.

## Propósito

Evitar que errores de build lleguen a hardware real. QEMU permite:
- Probar arranque, particionado, systemd, consola serie y SSH de forma repetible.
- Verificar la política "internet desactivado por defecto".
- Probar apagado gracioso (lección: nunca `kill -9`).
- Automatizar checks con scripts shell/python.

## Requisitos del host

Los paquetes siguientes son **necesarios** para la validación en el host de desarrollo:

```bash
sudo pacman -S --needed qemu-desktop edk2-ovmf archiso
```

> **Nota:** La instalación de estos paquetes es responsabilidad del usuario o del administrador del sistema. Las versiones pueden variar según la distribución anfitriona.

> **OVMF en Arch usa sufijo `.4m.fd`**: no usar `OVMF_CODE.fd`.
> `OVMF_VARS.4m.fd` es **escribible**: copiar a `/tmp` en cada ejecución.

## Parámetros de validación (decisiones del usuario)

Los siguientes parámetros deben configurarse según el artefacto a validar y el hardware objetivo. **No están codificados por defecto**:

| Parámetro | Descripción | Valor por defecto (sugerido) |
|---|---|---|
| `ISO_SIZE` | Tamaño esperado de la ISO para check #1 | Dejar vacío para autodetectar |
| `IMG_SIZE` | Tamaño esperado del .img para check #1 | Dejar vacío para autodetectar |
| `RAM_ISO` | RAM asignada a la ISO en MB | `2048` |
| `RAM_IMG` | RAM asignada al .img en MB | `1024` |
| `TIMEZONE` | Zona horaria esperada para check #14 | `America/Havana` |
| `DISK_LABEL` | Etiqueta de partición DATA para check #11 | `DATA` |

## A. Validación de ISO live

### A.1 Arranque con `run_archiso`

```bash
run_archiso -i out/<distro>-<fecha>-x86_64.iso
```

- Red: user-mode networking.
- **SSH redirigido**: `localhost:60022` → puerto 22 guest.
- `-c` / `-u` para lanzar con o sin UEFI.

```bash
ssh -p 60022 root@localhost    # password: generic (set by admin)
```

### A.2 Arranque controlado (consola serie + UEFI + apagado limpio)

Para validación automatizable o headless:

```bash
ISO="out/<distro>-<fecha>-x86_64.iso"
OVMF_VARS="/tmp/ovmf-vars-$$.fd"     # nuevo fd por sesión

# Copiar vars fresh (si no, QEMU lo corrompe)
cp /usr/share/edk2/x64/OVMF_VARS.4m.fd "$OVMF_VARS"

qemu-system-x86_64 \
  -m <RAM_ISO> -smp 2 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4m.fd \
  -drive if=pflash,format=raw,file="$OVMF_VARS" \
  -drive file="$ISO",format=raw,if=virtio,readonly=on \
  -netdev user,id=net0,hostfwd=tcp::60022-:22 \
  -device virtio-net-pci,netdev=net0 \
  -serial mon:stdio -nographic \
  -qmp unix:/tmp/qmp.sock,server,nowait &
QMP_PID=$!
```

| Opción | Para qué |
|---|---|
| `-serial mon:stdio -nographic` | Consola serie en terminal + monitor (`Ctrl-a c`) |
| `if=pflash ... OVMF_CODE.4m.fd` | Arranque UEFI (Secure Boot: `.secboot.`) |
| `hostfwd=tcp::60022-:22` | SSH desde el host |
| `-qmp unix:/tmp/qmp.sock` | Apagado **gracioso** (ver §D) |

#### Checklist ISO (15 items) — §A.4 de docs/07

| # | Comprobación | Comando | Esperado |
|---|---|---|---|
| 1 | ISO existe y tiene tamaño razonable | `ls -lh out/*.iso` | Tamaño según decisiones usuario |
| 2 | Checksum OK | `sha256sum -c out/SHA256SUMS` | `OK` |
| 3 | Contiene el repo congelado | `bsdtar -tf out/*.iso | grep arch-repo` | `arch/arch-repo/appliance.db.tar.gz` |
| 4 | Contiene el instalador | `bsdtar -tf out/*.iso | grep installer` | `arch/installer/build.sh` |
| 5 | Arranca y muestra el prompt | consola serie | login en tty1 o ttyS0 |
| 6 | El live monta el repo | `ls /arch-repo/` | `appliance.db.tar.gz` + `.pkg.tar.zst` |
| 7 | **Sincroniza sin 404** | `pacman -Sy` | sin `community.db` 404 |
| 8 | Instala un paquete | `pacman -S --noconfirm --dbpath /tmp/t <paquete>` | OK |
| 9 | sshd activo | `systemctl is-active sshd` | `active` |
| 10 | SSH desde el host | `ssh -p 60022 root@localhost` | login |
| 11 | Consola serie viva | enviar `Enter` en `ttyS0` | prompt |
| 12 | Escritorio arranca | `pgrep -a openbox` / `pgrep -a tint2` | ambos vivos |
| 13 | Locale correcto | `locale` | según configuración usuario |
| 14 | Hora correcta | `timedatectl` | según configuración usuario |
| 15 | Keyring inicializado | `pacman-key --list-keys` | claves de Arch |

> La comprobación **7** detecta el fallo de `community` → `extra`.
> La **8** valida que el repo congelado está bien firmado y es instalable.

### A.3 Arranque BIOS (syslinux)

Quitar las dos líneas `if=pflash` y añadir `-boot order=c`.

```bash
qemu-system-x86_64 \
  -m <RAM_ISO> -smp 2 \
  -drive file="$ISO",format=raw,if=virtio,readonly=on \
  -boot order=c \
  -serial mon:stdio -nographic \
  -netdev user,id=net0,hostfwd=tcp::60022-:22 \
  -device virtio-net-pci,netdev=net0
```

### A.4 Fallos habituales en la validación ISO

| Error | Causa | Solución |
|---|---|---|
| Pantalla negra después de login | `ttf-dejavu` ausente | Incluir en `packages.x86_64` |
| El panel tint2 no aparece | `tint2` sin `strut` | `strut_mode = strut_on_top` en `.config/tint2/tint2rc` |
| SSH no responde | `sshd` no habilitado | `systemctl enable sshd` en overlay |
| `community.db 404` | `[community]` en pacman.conf | Quitar, usar sólo core+extra |
| Consola serie silenciosa | `console=` orden incorrecta | `console=tty0 console=ttyS0,115200n8` (serie al final) |

## B. Validación del .img appliance

### B.1 Levantar el .img como disco

```bash
IMG="out/appliance-<perfil>-<fecha>.img"

qemu-system-x86_64 \
  -m <RAM_IMG> -smp 2 \
  -drive if=pflash,format=raw,readonly=on,file=/usr/share/edk2/x64/OVMF_CODE.4m.fd \
  -drive if=pflash,format=raw,file=/tmp/ovmf-vars.img \
  -drive file="$IMG",format=raw,if=virtio \
  -netdev user,id=net0,hostfwd=tcp::60022-:22 \
  -device virtio-net-pci,netdev=net0 \
  -serial mon:stdio -nographic \
  -qmp unix:/tmp/qmp.sock,server,nowait &
```

> Con `virtio` el root es `/dev/vda`, **no** `/dev/sda`. El GRUB del appliance
> lleva `root=UUID=`, así que funciona en ambos casos (lección del ciclo Lubuntu).

### B.2 Checklist appliance (13 items) — §B.2 de docs/07

| # | Comprobación | Comando | Esperado |
|---|---|---|---|
| 1 | Tabla particiones | `parted -s $IMG print` | EFI 512 MB · SYS · DATA (`DATA`) |
| 2 | Arranca OK | consola serie / SSH | prompt login |
| 3 | Los tres puntos de montaje | `findmnt / / /data` | ext4 + ext4 + DATA |
| 4 | DATA portable | `mount -L DATA /tmp/test` | legible, sin password |
| 5 | Panel kiosco | `pgrep -a openbox; pgrep -a tint2` | ambos |
| 6 | El kiosco sirve la app | `curl -s http://127.0.0.1:3000/health` | `{"status":"ok",...}` |
| 7 | La BD responde | `systemctl is-active postgresql` | `active` |
| 8 | SSH funciona | `ssh -p 60022 root@localhost` | login |
| 9 | Red LAN DHCP | `ip -4 addr show` | IP asignada |
| 10 | Sin red por defecto | `systemctl is-active systemd-networkd` | `inactive` |
| 11 | Partición DATA portable | montar `sda3` en **otra** máquina | legible, etiqueta `DATA` |
| 12 | `appliance-update` existe | `systemctl cat appliance-update.service` | unit presente |
| 13 | Podman NO instalado | `command -v podman` | vacío |

> La **10** valida la política "internet desactivado por defecto".
> La **11** valida el requisito de "DATA montable en otra máquina".

### B.3 Checklist particionado previo

Antes de lanzar QEMU, validar que el .img tiene la estructura correcta:

```bash
# En el host, antes de QEMU
parted -s $IMG print
# Debe ver una tabla GPT con 3 particiones:
# - Partición 1: EFI (vfat, 512 MB)
# - Partición 2: SYS (ext4, root)
# - Partición 3: DATA (ext4, label DATA, resto del disco)
# Los tamaños exactos dependen del stack instalado y decisiones del usuario.
```

### B.4 Apagado SIEMPRE gracioso

📏 **Lección crítica (ciclo Lubuntu)**: `kill -9` a QEMU dejó el USB colgado
con `error -71` bajo escrituras sostenidas.

```bash
# 1. Ver monitor QMP activo
echo '{"execute":"qmp_capabilities"}' | socat - UNIX-CONNECT:/tmp/qmp.sock

# 2. Apagar graciosamente
echo '{"execute":"system_powerdown"}' | socat - UNIX-CONNECT:/tmp/qmp.sock
```

| Método | Comando | ¿Seguro? |
|---|---|---|
| **QMP `system_powerdown`** | `echo '{"execute":"system_powerdown"}' \\| socat - UNIX-CONNECT:/tmp/qmp.sock` | ✅ preferido |
| `systemctl poweroff` por SSH | `ssh -p 60022 root@localhost 'systemctl poweroff'` | ✅ |
| Monitor QEMU | `Ctrl-a x` | ⚠️ cierra sin ACPI → puede colgar USB |
| `kill -9` | ❌ | ⛔ **prohibido** |

Esperar a que QEMU termine antes de tocar el USB:

```bash
wait $QEMU_PID          # o: while kill -0 $QEMU_PID; do sleep 1; done
sync
```

### B.5 Registro de evidencia

Cada artefacto validado deja rastro:

| Artefacto | Evidencia mínima |
|---|---|
| ISO | `sha256sum`, fecha, resultado de los 15 checks §A.4 |
| .img | `parted print`, resultado de los 13 checks §B.2 |
| Payload | healthcheck OK, log de la unit, versión instalada |

Si un check falla, **no se commitea** el artefacto: se corrige, se vuelve a construir y se repite el check completo.

## C. Puente PTY para consola serie automatizable

QEMU con `-serial unix:/tmp/ser.sock,server,nowait` expone la consola en un socket;
para automatizar hace falta un puente PTY (puede reutilizar `serial-bridge.py`):

```python
#!/usr/bin/env python3
"""serial-bridge.py — convierte un socket unix de QEMU en un PTY legible."""
import os, pty, socket, sys

sock_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ser.sock"
master, slave = pty.openpty()
name = os.ttyname(slave)
print(name, flush=True)

s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.connect(sock_path)

def pump(src, dst):
    while True:
        try:
            data = src.recv(4096)
        except OSError:
            break
        if not data:
            break
        os.write(dst, data)

# Bucle select para leer PTY y escribir en socket
while True:
    r, _, _ = select.select([s, master], [], [], 1)
    if s in r:
        pump(s, master)
    if master in r:
        try:
            data = os.read(master, 4096)
        except OSError:
            break
        if not data:
            break
        # Escribir en la salida estándar (para que el script la lea)
        os.write(1, data)
```

> En producción, el puente debe **también enviar** teclas: el bucle `select` tiene
> que leer del PTY maestro y escribirlo al socket. La versión de arriba es la
> estructura; el bucle bidireccional completo va en `test/serial-bridge.py`.

## D. Validación cruzada ISO ↔ .img

| Check | ISO | .img |
|---|---|---|
| Repo congelado presente | ✅ (en ISO) | ❌ (solo SO base) |
| PARTITION DATA portátil | ❌ | ✅ (LABEL=DATA) |
| Escritorio (Openbox+tint2) | ✅ | ✅ (mismo config) |
| SSH activo | ✅ | ✅ |
| Sin internet por defecto | ✅ | ✅ |
| `appliance-update` service | ❌ (solo en ISO build) | ✅ (en .img) |
| `pacman -Sy` sin 404 | ✅ | ❌ (sistema instalado, no live) |

## Handoff a otras skills del grupo

| Si tocas... | Ve a |
|---|---|
| ISO build + perfil | `arch-iso-builder` |
| .img + particionado | `arch-appliance-img` |
| kiosco + panel (L1: Openbox con tint2, L2: LXQT, L3: XFCE, L4: Cinnamon, L5: KDE, L6: GNOME) | `arch-desktop-layers` |
| payloads + runtime | `arch-payload-manifest` |
| "esto falla con..." | `arch-archlinux-pitfalls` |
| repo frozen + pacman | `arch-frozen-repo` |