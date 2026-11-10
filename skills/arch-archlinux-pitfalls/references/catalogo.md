---
name: arch-archlinux-pitfalls
description: 'Catálogo catalogado de errores reales encontrados al construir ISOs y appliances de Arch Linux. Sirve como memoria empirica del grupo de skills. Actualizado con nuevos errores derivados de cambios en arch-distro-design y las skills interrelacionadas.'
---

# arch-archlinux-pitfalls — Catálogo de Errores Reales

> **Este es el registro empirico** de los errores encontrados durante el
> desarrollo de distribuciones Arch Linux basadas en el skill `arch-distro-design`.
> Cualquier agente o usuario que construya una ISO/appliance Arch debe revisar
> esto antes de iniciar el build.

## Errores de diseño y Brief no completado 🆕

### 1. Brief no completado

### Contexto
El skill `arch-distro-design` establece que **siempre** deben completarse las 7
categorías obligatorias antes de empezar a diseñar. Cuando se omite este paso,
el artefacto final no cumple el objetivo real del usuario.

### Causa
El agente o usuario comienza el diseño de una distribución sin antes responder
las preguntas obligatorias del `Brief`:
- Objetivo, Formato de salida, Hardware, Red, Apps/Payloads, Inmutabilidad,
  Política de updates.

### Solución
**NUNCA** iniciar el diseño de una ISO o appliance sin antes completar el
`Brief` de `arch-distro-design`. Si el `Brief` no está completo, detener el
proceso y pedir al usuario las 7 categorías obligatorias.

### Regla nueva
| Check | Requisito |
|---|---|
| `brief_completado` | Las 7 categorías obligatorias deben estar firmadas en `docs/09` |
| `objetivo_definido` | El objetivo del sistema debe estar claro (kiosco, servidor, etc.) |
| `formato_salida` | ISO live, .img persistente, o ambos deben estar definidos |
| `hardware_identificado` | Hardware objetivo (UEFI/BIOS/USB/SSD/NVMe) debe estar definido |
| `red_politica` | Política de red debe estar decidida (por defecto `inactive`) |
| `apps_payloads` | Apps y payloads deben declararse (nunca vendorizadas) |
| `politica_updates` | Política de updates debe estar definida |

---

## Errores de perfil y `mkarchiso`

### 2. `realpath: '': No such file or directory`

### Contexto
`mkarchiso` aborta en la primera línea útil con este error, que no menciona qué
ruta o variable es la culpable.

### Causa
`mkarchiso` resuelve con `realpath` tres rutas del perfil (`packages`, `bootstrap_packages`, `pacman_conf`). Si alguna está vacía:
- `realpath -- ""` → error inmediato
- `bootstrap_packages.x86_64` **debe existir** (aunque vacío): `mkarchiso` lo ejecuta sin comprobar

### Solución
- Todas las rutas en `profiledef.sh` deben ser **relativas al perfil** (archiso hace `cd` antes de resolverlas)
- Crear `bootstrap_packages.x86_64` aunque esté vacío (touch)
- Nunca dejar variables sin definir en profiledef.sh

---

## 3. Los boot modes de archiso 91-1

### Contexto
`uefi.systemd-boot.esp` y `uefi.systemd-boot.eltorito` → `is not a valid boot mode!`. `bios.syslinux.mbr` → "deprecated".

### Causa
Aquellos sufijos (`.esp`, `.mbr`, `.eltorito`) son **funciones internas** de archiso
(_make_bootmode_uefi-x64.systemd-boot.esp_, etc.), no valores de `bootmodes`. En 91-1 hacen `return 1`.

### Sólo son válidos
| Boot mode | Para qué |
|---|---|
| `bios.syslinux` | BIOS legacy + syslinux |
| `uefi.grub` | UEFI con GRUB |
| `uefi.systemd-boot` | UEFI con systemd-boot |

### Regla
Nunca escribir sufijos `.esp` / `.mbr` / `.eltorito` a mano. Si need UEFI systemd-boot, usar sólo `uefi.systemd-boot`.

---

## 4. `community.db` → **404** en todos los mirrors📏 2026-11-09

### Contexto
El build moría con `error: failed retrieving file 'community.db' from geo.mirror.pkgbuild.com : 404`.

### Causa
**Arch fusionó el repo `community` dentro de `extra`**. `community` ya no existe.
`community.db` responde 404 en *todos* los mirrors y 0 resultados en API archlinux.org.

### Listado raíz del mirror (solo ofrece)
`core`, `extra`, `multilib` (+ testing, staging, *-debug*)

### Solución
`pacman.conf` del perfil con `[core]` + `[extra]` únicamente. Los paquetes del proyecto se verificaron uno a uno: todos caen en esos dos.

### Regla
En una distro rolling, **nunca** des por supuesto que un repo sigue existiendo. Verifica contra la API/mirror antes de escribir el `pacman.conf`.

---

## 5. El host de build es Manjaro: contamina el ISO 📏

### Contexto
Peligro latente: `pacman.conf` con `Include = /etc/pacman.d/mirrorlist` descarga paquetes de **distribución no-Arch**, no de Arch.

### Causa
En distribuciones no-Arch, `/etc/pacman.d/mirrorlist` apunta a sus propios repos.
Con `Include`, el ISO "funciona" pero no es Arch Linux.

### ademas
- `pacstrap -P` (copiar host mirrorlist) no usa archiso
- archiso usa `-M` para no copiar mirrorlist
- Pero el live hereda el `/etc/pacman.conf` del paquete `pacman` que apunta a repos no-Arch

### Solución
`pacman.conf` del perfil con `Server =` **explícito** y mirrors de Arch.
Overlay de `airootfs/etc/pacman.conf` para que el live tambien no herede el config del paquete `pacman`.

### Regla
En un host no-Arch, el `pacman.conf` del perfil **nunca** usa `Include`.

---

## 6. Mirrors geolocalizados / lentos 📏

### Contexto
Operation too slow. Less than 1 bytes/sec transferred the last 10 seconds y el build abortaba.

### Causa
El mirror "geo" resolvió a un nodo lento desde esta red.


### Throughput real

| Mirror | KB/s |
|---|---|
| Mirror |  |
| Mirror |  |
| Mirror |  |
| Mirror |  |

### Solución
Tres `Server =` por repo (fallback automático) con el más rápido primero, y `XferCommand` con curl.

### Regla
Mide el throughput **antes** de construir una ISO. No te fíes del mirror "por defecto".

---

## 7. `DisableDownloadTimeout` no existe en `pacman.conf` (pacman 7)

### Contexto
```warning: config file .../pacman.conf, line 32: directive 'DisableDownloadTimeout' in section 'options' not recognized.
```

### Causa
En pacman 7 es **sólo un flag de CLI** (`--disable-download-timeout`); el parser de `pacman.conf` no lo expone como directiva (aunque el string exista en el binario, junto a `alpm_option_set_disable_dl_timeout`).

### Solución
La equivalente de configuración es `XferCommand` con curl:

```ini
XferCommand = /usr/bin/curl -sSfL --retry 5 --retry-delay 3 --speed-time 120 --speed-limit 10 -o %o %u
```

`--speed-time 120 --speed-limit 10` aborta sólo si baja de 10 B/s durante 120 s (por defecto de pacman: 1 B/s durante 10 s).

### Trampa extra
`curl -C -` (resume) **falla** si el fichero destino no existe:
`curl: option -C: expected a proper numerical parameter`. No usar `-C -` con `XferCommand`.

### Regla
Ante `directive ... not recognized`, comprueba si la opción es de CLI (`pacman --help`) antes de buscar un sustituto.

---

## 8. `pacman --root` NO reubica `GPGDir` 📏

### Contexto
Preocupación: `pacstrap -G` evita copiar el keyring al target, así que `SigLevel = Required` no encontraría claves y el build fallaría.

### Causa probada empíricamente

| Escenario | Resultado |
|---|---|
| `pacman --root R -U pkg` (keyring vacío en R) | ✅ **verifica** → usa `/etc/pacman.d/gnupg` del **host** |
| `pacman --root --gpgdir R/etc/pacman.d/gnupg -U pkg` (vacío) | ❌ `required key missing from keyring` |

`pacman --root` sólo reubica `DBPath`, `CacheDir`, `LogFile` y `RootDir`; `GPGDir` sigue apuntando al host.

### Solución
Nada: el host ya tiene `archlinux-keyring` instalado (📏 `20260909-1`). El target queda con keyring vacío a propósito → `pacman-init.service` lo inicializa en el primer arranque.

### Regla
El host de build necesita `archlinux-keyring` instalado y con las claves maestras de Arch importadas. No confiar en el keyring del target.

---

## 9. `mkinitcpio` + `mkinitcpio-archiso` son obligatorios, y los hooks también

### Contexto
Sin `mkinitcpio-archiso` el initramfs no lleva el hook `archiso` → kernel panic al montar el squashfs. Y sin `airootfs/etc/mkinitcpio.conf.d/archiso.conf` faltan los hooks `archiso`, `archiso_loop_mnt`, `memdisk` y `microcode`.

### Causa
`README.profile.rst` los marca como *mandatory*; el perfil oficial `releng` los trae en `packages.x86_64` y en `airootfs/etc/mkinitcpio.conf.d/archiso.conf`.

### Solución
Ambos paquetes en `packages.x86_64` + el fichero de hooks en el overlay.

### Regla
Sin `mkinitcpio-archiso` no hay live. No es opcional.

---

## 10. El overlay `airootfs` no preserva permisos ni owners

### Contexto
`root/.xinitrc` llega al target con modo **644** → `startx` no lo puede ejecutar → la sesión gráfica no arranca.

### Causa
`mkarchiso` copia con `cp -af --no-preserve=ownership,mode` y todo queda como root:root, 644 (ficheros) / 755 (directorios).

### Solución
`file_permissions` en `profiledef.sh`:

```bash
file_permissions=(
  ["/etc/shadow"]="0:0:400"
  ["/root"]="0:0:750"
  ["/root/.xinitrc"]="0:0:755"
)
```

### Regla
Todo ejecutable del overlay va en `file_permissions`.

---

## 11. `customize_airootfs.sh` está deprecado

### Contexto
El mecanismo antiguo de post-instalación ya no es el camino oficial.

### Causa
El CHANGELOG de archiso 91-1 dice: *"Use pacman hooks for things previously done in `customize_airootfs.sh`"* y *"Remove `customize_airootfs.sh` from the vendored profiles*".

### Solución
El overlay (`airootfs/`) + `file_permissions` cubren lo necesario; para el resto, hooks de pacman en `airootfs/etc/pacman.d/hooks/`.

### Regla
No escribir `customize_airootfs.sh` en perfiles nuevos.

---

## 12. `/etc/shadow` del overlay sobrevive al paquete `filesystem`

### Contexto
Preocupación: si `filesystem` (que trae `/etc/shadow` como *conffile*) se instalase encima, se perdería la password de root del live.

### Causa verificada
El paquete `filesystem` declara `backup = etc/shadow` y `backup = etc/passwd`, y sólo trae la entrada de `root` (las demás cuentas las crea `systemd-sysusers` y los scripts de cada paquete). Pacman trata los conffiles modificados: **conserva** el existente y escribe un `.pacnew`, que archiso borra después (`_cleanup_pacstrap_dir`).

### Solución
Overlay con `/etc/shadow` (hash SHA-512) y `file_permissions` `0:0:400`.

### Regla
Los conffiles del overlay se conservan; pero deben ser **completos**, porque el paquete no rellena lo que falte.

---

## 13. `mkarchiso` exige que `-w` y `-o` ya existan

### Contexto
`realpath -- "$work_dir"` y `realpath -- "$out_dir"` abortan si las rutas no existen.

### Solución
`mkdir -p` antes de invocar a `mkarchiso`.

---

## 14. Lecciones heredadas del ciclo Lubuntu perdido 📏

Varias lecciones vienen del ciclo Lubuntu anterior que destruyó hardware y datos.

| Lección | Aplicación |
|---|---|
| Nunca `--bind=/usr` del host dentro de un rootfs destino | El target se construye con `pacstrap` limpio, sin binds del host |
| GRUB necesita `root=UUID=` (virtio = `/dev/vda`) | `build.sh` genera el UUID y lo inyecta en `grub.cfg` |
| El **último** `console=` recibe `/dev/console` | `console=tty0 console=ttyS0,115200n8` (serie al final) |
| Sintaxis larga de serial en GRUB 2.12 | `serial --unit=0 --speed=115200 --word=8 --parity=no --stop=1` |
| Nunca `mkfs`/`parted` sin revisar el disco destino | `build.sh` con doble confirmación y guardas |
| Siempre `e2fsck` antes de `resize2fs` | Script de resize en docs/04 |
| Apagar QEMU con gracia (`system_powerdown`) o el USB se cuelga (`error -71`) | Script de validación QEMU con apagado limpio |
| SDDM se colgaba → sin display manager | Openbox + tint2 + autologin en tty1 |
| `WorkingDirectory=` de systemd **no** quita comillas | Rutas del proyecto sin espacios (symlink) |
| Prisma CLI vive en `node_modules/.bin/prisma` de la raíz del workspace | Se documenta en el manifiesto del payload |
| `sslmode` explícito en staging/producción | `DATABASE_URL=...&sslmode=disable` en los manifiestos |

---

## 15. Politica de red y updates

### Contexto
Internet desactivada por defecto; solo admin la habilita desde el host.

### Regla
- Red **desactivada** por defecto: `systemctl is-active systemd-networkd` → `inactive`
- Actualizaciones: `pacman -Syu` con networkd temporalmente arriba
- Log de versiones: `versions.txt` commiteado tras cada build
- Solo `appliance-update.service` escribe en root

---

## 16. Display manager = colgado

### Contexto
SDDM se colgaba y el sistema quedaba inutilizable.

### Regla
**Ningún display manager.** La sesión gráfica la levanta `startx` desde un autologin de `getty@tty1`.

---

## 17. Errores derivados de Brief incompleto 🆕

Nuevos errores que surgen cuando se omite la fase de Brief obligatorio en `arch-distro-design`.

| Error | Sintoma | Consecuencia |
|---|---|---|
| Objetivo no definido | El sistema cumple-tecnicamente pero no sirve para el caso de uso real | El usuario no obtiene lo que esperaba |
| Formato de salida desconocido | Se construye ISO cuando el usuario quería .img, o viceversa | desperdicio de tiempo y espacio |
| Hardware no validado | `error -71`, particion sobre disco equivocado, incompatibilidades UEFI/BIOS | Pérdida de datos, USB inutilizable |
| Red no definida | El admin no sabe cómo actualizar, o internet inesperada en kiosco | Falta de conectividad o conectividad no deseada |
| Apps/Payloads no declaradas | El payload no instala, o instala cosas sobrantes/sobrescritas | El sistema no funciona como payload esperado |
| Política de updates sin definir | El admin no puede actualizar el sistema después del build | El sistema se vuelve obsoleto rápidamente |

---

## 18. Metodología corregida (con Brief obligatorio)

### Contexto
La forma correcta de diseñar una distribución Arch, basada en el skill `arch-distro-design`:

1. **Aplicar Brief obligatorio** — completar las 7 categorías antes de escribir una sola línea.
2. **Diseñar con decisiones tomadas** — todas las decisiones vienen del Brief, no se adivinan.
3. **Validar empiricamente** — medir, no suponer (throughput de mirrors, firma, permisos).
4. **Documentar el error** — cada fallo real va a esta tabla con su causa y su arreglo.
5. **Construir el artefacto** — el diseño ya está completo, la construcción es solo ejecución.
6. **Verificar con QEMU** — pasar por `arch-qemu-validation` antes de hardware real.
7. **Validar hardware** — pasar por `arch-hardware-handler` si toca escribir en disco físico.

### Regla
Un diseño de distribución que noComplete el **Brief obligatorio** **no debe** avanzar a la fase de construcción. El skill `arch-distro-design` debe devolver al usuario con una petición de completar las 7 categorías.