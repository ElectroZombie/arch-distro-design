---
name: arch-distro-design
description: 'Router y raiz del grupo de skills para disenar distribuciones ArchLinux:{n} soaked in Arch-specific ISO/appliance build knowledge, distro layering, and artifact boundaries.'
---

# Arch Distro Design — Router

Skill **raiz** del grupo. Decide **que artefacto** se construye, **con que capas**
y **en que orden**, y delega la ejecucion concreta a las skills hermanas.

## Cuando usar esta skill

- El usuario pide "una distro", "un appliance", "una ISO de Arch", "un sistema
  autoalojado" sin especificar el formato exacto de salida.
- Hay que decidir la **arquitectura** antes de escribir una sola linea de codigo.
- Hay que fijar el **contrato** entre artefactos (que va dentro de la ISO, que va
  en el .img, que va en el payload).

## Grupo de skills (interrelacionado)

| Skill | Rol | Produce |
|---|---|---|
| `arch-distro-design` | **router** | capas, decisiones, contrato entre artefactos |
| `arch-iso-builder` | constructor de ISO | perfil archiso + ISO arrancable |
| `arch-appliance-img` | constructor de .img | imagen persistente EFI+SYS+DATA |
| `arch-frozen-repo` | repos congelado | repo local firmado, offline, reproducible |
| `arch-payload-manifest` | payloads | manifiesto `KEY=VALUE` + materializacion |
| `arch-kiosk-desktop` | escritorio | sesion grafica minima y panel visible |
| `arch-qemu-validation` | verificacion | harness de pruebas en QEMU |
| `arch-archlinux-pitfalls` | trampas | catalogo de fallos reales de Arch/archiso |

> Todas se leen del mismo contexto: `arch-archlinux-pitfalls` es la memoria
> empirica del grupo; `arch-qemu-validation` es el gate de calidad de todos los
> demas.

## Artefactos y fronteras

Regla de oro: **tres artefactos independientes**, cada uno versionado por
separado.

```
  ISO builder                .img appliance            app payload
  (archiso)                  (pacstrap)                (repo de la app)
      |                          |                          |
      | contiene repo congelado  | contiene el SO base      | NUNCA se
      | + instalador CLI         | + datos en DATA          | vendoriza aqui
      +---- produce ------------>+ se le aplica ----------->+
```

| Artefacto | Contiene | NO contiene |
|---|---|---|
| ISO | live rootfs, repo congelado, instalador CLI | codigo de apps, payloads |
| .img | rootfs instalado, servicios, particion DATA | repo congelado (va en la ISO), codigo de apps |
| payload | codigo + deps + unit + config | nada del SO base |

**Por que separarlos:**
1. La ISO es **reutilizable**: un constructor, N appliances.
2. Actualizar una app **no** obliga a reconstruir la ISO.
3. El payload se versiona en **su propio repo** (el de la app), no en el de la distro.
4. La ISO puede vivir en el repo de la distro; el .img suele ser un artefacto
   de release (binario, checksum), no codigo.

## Capas (modelo L0..L4)

Cada capa es **acumulativa** y se puede vender suelta.

| Capa | Contenido | Skill que la resuelve |
|---|---|---|
| **L0** | boot + firmware + bootloader (UEFI+BIOS) | `arch-iso-builder`, `arch-appliance-img` |
| **L1** | base: kernel, shell, herramientas, locales, TZ | `arch-iso-builder` |
| **L2** | servicios: ssh, red (networkd), update-unit, time | `arch-appliance-img` |
| **L3** | plataforma web: nginx, nftables, sin DB | `arch-appliance-img` |
| **L4** | payloads de apps | `arch-payload-manifest` |
| **L-1** | DATA: particion `Salvas`, portatil entre maquinas | `arch-appliance-img` |

Reglas transversales:
- **L3 no incluye base de datos.** La BD la declara el payload (`embedded`/`external`).
- **L4 no toca el rootfs** fuera de `/opt` + units.
- **L-1 nunca se toca desde el host** salvo por operacion explicita del admin.

## Proceso de diseno (obligatorio, en este orden)

### 1. Brief (preguntas al usuario — NO adivinar)

| Pregunta | Por que importa |
|---|---|
| ¿ISO live, .img persistente, o ambos? | Determina la skill principal |
| ¿Objetivo? (kiosco POS, panel web, panel de control…) | Decide escritorio, red, payload |
| ¿Hardware objetivo? (x86_64 UEFI? ARM? disco USB?) | Decide boot modes y particionado |
| ¿Tamano de disco? | Decide tabla de particiones (ver `arch-appliance-img`) |
| ¿Red? (100% local, LAN DHCP, internet?) | Decide networkd + politica de updates |
| ¿Apps a incluir? | Decide payloads y si hace falta DB |
| ¿Inmutabilidad? | Decide si root es rw o squashfs |
| ¿Politica de updates? | Decide `appliance-update.service` |

### 2. Contrato de artefactos

Escribir (en `docs/`) la tabla "que va en que". Sin este contrato, la ISO
empieza a tragarse cosas del .img y viceversa.

### 3. Politica de red y updates (decision que se paga caro)

Politica por defecto recomendada:

- Red **desactivada** por el admin en el host; el sistema arranca con networkd
  **sin uplink**.
- Actualizaciones **desactivadas** por defecto; las habilita el admin.
- Si se actualiza: `pacman -Syu` con networkd temporalmente arriba, y
  **log de versiones** en `/data/update-log/`.
- La red la levanta **un solo servicio** (`appliance-update.service`), no un
  daemon permanente.

### 4. Modelo de inmutabilidad

| Modelo | Root | Cuando |
|---|---|---|
| `rw` (default) | rw | appliance persistente, con regla "solo el update-unit escribe" |
| `squashfs` | ro | live ISO; escritura via CoW (`cow_spacesize`) |
| `overlayfs` | ro+overlay | solo si hay hardware de sobra |

### 5. Contrato de la ISO

La ISO define el **entorno de construccion** del .img:
- repo congelado (offline, firmado),
- `build.sh` con sus flags,
- perfil de particionado,
- manifestos de payload.

Si la ISO y el .img pueden construirse **por separado**, el contrato esta bien.

### 6. Validacion

Todo artefacto pasa por `arch-qemu-validation` **antes** de tocar hardware real.

## Checklist de diseno (gate)

- [ ] Brief respondido por el usuario (no adivinado).
- [ ] Artefacto principal identificado (ISO / .img / ambos).
- [ ] Contrato "que va en que" escrito.
- [ ] Politica de red + updates decidida.
- [ ] Modelo de inmutabilidad decidido.
- [ ] Lista de paquetes con repo verificado (ver `arch-archlinux-pitfalls`).
- [ ] Tamano de disco y tabla de particiones decididos.
- [ ] Apps -> payloads con runtime y BD declarados.
- [ ] Plan de validacion QEMU definido.

## Metodo de trabajo (heredado de `arch-linux-triage`)

1. **Confirmar supuestos del entorno** — leer el codigo real (`/usr/bin/mkarchiso`,
   `README.profile.rst`), no adivinar.
2. **Comparar con la referencia oficial** — perfiles `releng`/`baseline` del upstream.
3. **Verificar empiricamente** — medir, no suponer (throughput de mirrors, firma, permisos).
4. **Documentar el error** — cada fallo real va a `arch-archlinux-pitfalls`.

## Errores de diseno mas comunes

| Error | Sintoma | Prevencion |
|---|---|---|
| Un solo artefacto gigante | ISO de 4 GB que nadie puede replicar | Separar ISO / .img / payload |
| Repo congelado dentro de DATA | El .img no es portable | Repo **dentro de la ISO** |
| Payload vendorizado | Cada app forkerea el repo | Manifiesto + repo propio |
| BD en la imagen base | appliance de 2 GB con Postgres sin usar | DB la declara el payload |
| Display manager | Pantalla negra tras actualizar | `arch-kiosk-desktop` |
| "Internetoff" no decidido | El admin no sabe como actualizar | Politica escrita + update-unit |

## Handoff

Cuando el diseno este cerrado, delega:

| Si toca... | Ve a |
|---|---|
| perfil archiso, boot, live | `arch-iso-builder` |
| particionado, .img, systemd, updates | `arch-appliance-img` |
| repo local firmado | `arch-frozen-repo` |
| manifiesto de app, runtime, DB | `arch-payload-manifest` |
| sesion grafica, panel, kiosco | `arch-kiosk-desktop` |
| pruebas, arranque, apagado | `arch-qemu-validation` |
| "esto fallo con...", dubios | `arch-archlinux-pitfalls` |
