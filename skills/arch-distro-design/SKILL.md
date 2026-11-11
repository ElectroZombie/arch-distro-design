---
name: arch-distro-design
description: 'Router and root skill for designing Arch Linux distributions. Decides which artifact (ISO, .img, or both) to build, defines the L0-L4 layer model, and enforces the mandatory 7-category Brief before any construction begins. Use when the user asks for "a distro", "an appliance", "an Arch ISO", or "a self-hosted system" without specifying the output format.'
---

# Arch Distro Design — Router

Skill **raíz** del grupo. Decide **qué artefacto** se construye, **con qué capas**
y **en qué orden**, y delega la ejecución concreta a las skills hermanas.

## Cuándo usar esta skill

- El usuario pide "una distro", "un appliance", "una ISO de Arch", "un sistema
  autoalojado" sin especificar el formato exacto de salida.
- Hay que decidir la **arquitectura** antes de escribir una sola línea de código.
- Hay que fijar el **contrato** entre artefactos (qué va dentro de la ISO, qué va
  en el .img, qué va en el payload).

## Grupo de skills (interrelacionado)

| Skill | Rol | Produce |
|---|---|---|
| `arch-distro-design` | **router** | capas, decisiones, contrato entre artefactos |
| `arch-iso-builder` | constructor de ISO | perfil archiso + ISO arrancable |
| `arch-appliance-img` | constructor de .img | imagen persistente EFI+SYS+DATA |
| `arch-frozen-repo` | repos congelado | repo local firmado, offline, reproducible |
| `arch-payload-manifest` | payloads | manifiesto `KEY=VALUE` + materialización |
| `arch-desktop-layers` | escritorio | capas L0-L6 (console → GNOME/KDE) |
| `arch-qemu-validation` | verificación | harness de pruebas en QEMU |
| `arch-archlinux-pitfalls` | trampas | catálogo de fallos reales de Arch/archiso |

> Todas se leen del mismo contexto: `arch-archlinux-pitfalls` es la memoria
> empírica del grupo; `arch-qemu-validation` es el gate de calidad de todos los
> demás.

## Artefactos y fronteras

Regla de oro: **tres artefactos independientes**, cada uno versionado por
separado.

```
  ISO builder                .img appliance            app payload
  (archiso)                  (pacstrap)                (repo de la app)
      |                          |                          |
      | contiene repo congelado  | contiene el SO base      | NUNCA se
      | + instalador CLI         | + datos en DATA          | vendoriza aquí
      +---- produce ------------>+ se le aplica ----------->+
```

| Artefacto | Contiene | NO contiene |
|---|---|---|
| ISO | live rootfs, repo congelado, instalador CLI | código de apps, payloads |
| .img | rootfs instalado, servicios, partición DATA | repo congelado (va en la ISO), código de apps |
| payload | código + deps + unit + config | nada del SO base |

**Por qué separarlos:**
1. La ISO es **reutilizable**: un constructor, N appliances.
2. Actualizar una app **no** obliga a reconstruir la ISO.
3. El payload se versiona en **su propio repo** (el de la app), no en el de la distro.
4. La ISO puede vivir en el repo de la distro; el .img suele ser un artefacto
   de release (binario, checksum), no código.

## Capas (modelo L0..L4)

Cada capa es **acumulativa** y se puede vender suelta.

| Capa | Contenido | Skill que la resuelve |
|---|---|---|
| **L0** | boot + firmware + bootloader (UEFI+BIOS) | `arch-iso-builder`, `arch-appliance-img` |
| **L1** | base: kernel, shell, herramientas, locales, TZ | `arch-iso-builder` |
| **L2** | servicios: ssh, red (networkd), update-unit, time | `arch-appliance-img` |
| **L3** | plataforma web: nginx, nftables, sin DB | `arch-appliance-img` |
| **L4** | payloads de apps | `arch-payload-manifest` |
| **L-1** | DATA: partición portable entre máquinas | `arch-appliance-img` |

Reglas transversales:
- **L3 no incluye base de datos.** La BD la declara el payload (`embedded`/`external`).
- **L4 no toca el rootfs** fuera de `/opt` + units.
- **L-1 nunca se toca desde el host** salvo por operación explícita del admin.

## Proceso de diseño (obligatorio, en este orden)

### 1. Brief (preguntas al usuario — NO adivinar)

| Pregunta | Por qué importa |
|---|---|
| ¿ISO live, .img persistente, o ambos? | Determina la skill principal |
| ¿Objetivo? (kiosco POS, panel web, panel de control…) | Decide escritorio, red, payload |
| ¿Hardware objetivo? (x86_64 UEFI? ARM? disco USB?) | Decide boot modes y particionado |
| ¿Tamaño de disco? | Decide tabla de particiones (ver `arch-appliance-img`) |
| ¿Red? (100% local, LAN DHCP, internet?) | Decide networkd + política de updates |
| ¿Apps a incluir? | Decide payloads y si hace falta DB |
| ¿Inmutabilidad? | Decide si root es rw o squashfs |
| ¿Política de updates? | Decide `appliance-update.service` |

### 2. Contrato de artefactos

Escribir (en `docs/`) la tabla "qué va en qué". Sin este contrato, la ISO
empieza a tragarse cosas del .img y viceversa.

### 3. Política de red y updates (decisión que se paga caro)

Política por defecto recomendada:

- Red **desactivada** por el admin en el host; el sistema arranca con networkd
  **sin uplink**.
- Actualizaciones **desactivadas** por defecto; las habilita el admin.
- Si se actualiza: `pacman -Syu` con networkd temporalmente arriba, y
  **log de versiones** en `/data/update-log/`.
- La red la levanta **un solo servicio** (`appliance-update.service`), no un
  daemon permanente.

### 4. Modelo de inmutabilidad

| Modelo | Root | Cuándo |
|---|---|---|
| `rw` (default) | rw | appliance persistente, con regla "solo el update-unit escribe" |
| `squashfs` | ro | live ISO; escritura via CoW (`cow_spacesize`) |
| `overlayfs` | ro+overlay | solo si hay hardware de sobra |

### 5. Contrato de la ISO

La ISO define el **entorno de construcción** del .img:
- repo congelado (offline, firmado),
- `build.sh` con sus flags,
- perfil de particionado,
- manifiestos de payload.

Si la ISO y el .img pueden construirse **por separado**, el contrato está bien.

### 6. Validación

Todo artefacto pasa por `arch-qemu-validation` **antes** de tocar hardware real.

## Checklist de diseño (gate)

- [ ] Brief respondido por el usuario (no adivinado).
- [ ] Artefacto principal identificado (ISO / .img / ambos).
- [ ] Contrato "qué va en qué" escrito.
- [ ] Política de red + updates decidida.
- [ ] Modelo de inmutabilidad decidido.
- [ ] Lista de paquetes con repo verificado (ver `arch-archlinux-pitfalls`).
- [ ] Tamaño de disco y tabla de particiones decididos.
- [ ] Apps → payloads con runtime y BD declarados.
- [ ] Plan de validación QEMU definido.

## Método de trabajo

1. **Confirmar supuestos del entorno** — leer el código real (`/usr/bin/mkarchiso`,
   `README.profile.rst`), no adivinar.
2. **Comparar con la referencia oficial** — perfiles `releng`/`baseline` del upstream.
3. **Verificar empíricamente** — medir, no suponer (throughput de mirrors, firma, permisos).
4. **Documentar el error** — cada fallo real va a `arch-archlinux-pitfalls`.

## Errores de diseño más comunes

| Error | Síntoma | Prevención |
|---|---|---|
| Un solo artefacto gigante | ISO de 4 GB que nadie puede replicar | Separar ISO / .img / payload |
| Repo congelado dentro de DATA | El .img no es portable | Repo **dentro de la ISO** |
| Payload vendorizado | Cada app forkea el repo | Manifiesto + repo propio |
| BD en la imagen base | appliance de 2 GB con Postgres sin usar | DB la declara el payload |
| Display manager | Pantalla negra tras actualizar | `arch-desktop-layers` (sin DM) |
| "Internet off" no decidido | El admin no sabe cómo actualizar | Política escrita + update-unit |

## Handoff

Cuando el diseño esté cerrado, delega:

| Si toca... | Ve a |
|---|---|
| perfil archiso, boot, live | `arch-iso-builder` |
| particionado, .img, systemd, updates | `arch-appliance-img` |
| repo local firmado | `arch-frozen-repo` |
| manifiesto de app, runtime, DB | `arch-payload-manifest` |
| sesión gráfica, panel, kiosco | `arch-desktop-layers` |
| pruebas, arranque, apagado | `arch-qemu-validation` |
| "esto falló con...", dudas | `arch-archlinux-pitfalls` |
| validar hardware antes de escribir | `arch-hardware-handler` |
