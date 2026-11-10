---
name: arch-payload-manifest
description: 'Parse and materialize app payloads from their own repositories. KEY=VALUE manifest format, bash-only parsing (no jq/yq/python). Handles runtime selection (native/nspawn/podman), embedded/external databases, and volume mappings. Integrates with the design brief from arch-distro-design.'
---

# Arch Payload Manifest — General Purpose

Skill para leer, validar y materializar **payloads** (sistemas autoalojados completos) desde **el propio repositorio de cada app**. Este repo **no vendoriza** código de apps: cada payload vive en su propio repo y se materializa en el appliance cuando se instala.

## Principio innegociable

> ❌ **Nunca** se vendoriza el código de una app en el repo del proyecto.

> ✅ El payload se declara por **manifiesto** y se materializa desde el repo propio
> de la app, en el momento de la instalación.

Esto mantiene el constructor genérico: una ISO sirve para N apps distintas, y actualizar
una app no obliga a reconstruir la ISO.

## Formato del manifiesto

`KEY=VALUE`, una clave por línea, parseable con **bash puro** (sin `jq`, `yq`
ni `python`). Comentarios con `#`. Líneas vacías se ignoran.

```bash
# Ejemplo: apps/mail/app.conf
NAME=Mail System
VERSION=1.0.0
SOURCE=https://github.com/<owner>/mail-system.git
SOURCE_REF=main

# --- red ---
PORT=8080
BIND=127.0.0.1

# --- datos ---
DATABASE=embedded
DATA_DIR=/data/apps/mail

# --- proceso ---
COMMAND=/usr/local/bin/mail-system
AUTOSTART=true
RESTART=always
HEALTHCHECK=http://127.0.0.1:8080/health
```

## Clave riconosciadas

| Clave | Obligatoria | Valores | Significado |
|---|---|---|---|
| `NAME` | ✅ | texto | Nombre de la app (para logs y UI) |
| `VERSION` | ✅ | texto | Versión del payload (queda en log de updates) |
| `SOURCE` | ✅ | URL | Repo/artefacto de origen (⚠️ **no** se vendoriza) |
| `SOURCE_REF` | | ref git | Rama, tag o commit a materializar (default: `main`) |
| `RUNTIME` | | `native`·`nspawn`·`podman` | Modelo de aislamiento (default `native`) |
| `PORT` | | entero | Puerto local que sirve la app |
| `BIND` | | IP | Dirección de escucha (default `127.0.0.1`) |
| `DATABASE` | | `embedded`·`external`·`none` | Motor de datos |
| `DATABASE_URL` | | URL | Obligatorio si `DATABASE=external` |
| `DATA_DIR` | | ruta | Directorio persistente bajo `/data` |
| `COMMAND` | | cmd | Comando de arranque (runtime `native`) |
| `ENV` | | `K=V` | Variable de entorno (repetible) |
| `AUTOSTART` | | `true`·`false` | Si arranca con el sistema |
| `RESTART` | | `always`·`on-failure`·`never` | Política de reinicio |
| `HEALTHCHECK` | | URL/cmd | Sonda de salud (opcional) |
| `VOLUMES` | | `host:cont` | Solo `podman`: mapeos (⚠️ ver reglas) |

## Parseo en bash (sin dependencias)

```bash
#!/usr/bin/env bash
# load-manifest.sh — lee un manifiesto KEY=VALUE y exporta associative array

load_manifest() {
    local file="$1" key value
    # shellcheck disable=SC2034
    declare -gA MANIFEST=()
    while IFS='=' read -r key value; do
        key="${key%%[[:space:]]*}"                 # trim left
        key="${key%[[:space:]]}"                    # trim right
        [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
        # Quitar posible comilla simple inicial/Final
        value="${value#*=}"
        value="${value%${value##*[![:space:]]}}"
        value="${value%"$value"}"; value="$value"  # trim both sides
        MANIFEST["$key"]="$value"
    done < <(grep -vE '^\s*(#|$)' "$file")
}
```

## Uso

```bash
load_manifest apps/mail/app.conf
echo "NAME: ${MANIFEST[NAME]}"
echo "VERSION: ${MANIFEST[VERSION]}"
echo "SOURCE: ${MANIFEST[SOURCE]}"
echo "RUNTIME: ${MANIFEST[RUNTIME]:-native}"
```

## Runtimes

| Runtime | Overhead | Cuándo usar | Aislamiento |
|---|---|---|---|
| `native` | **0** | Apps propias, ya validadas | Ninguno (proceso del sistema) |
| `nspawn` | +35–65 MB RAM | La app pide otro userspace | Contenedor systemd con rootfs propio |
| `podman` | +20–50 MB/contenedor | App de terceros **sólo** OCI | Contenedor OCI |

### ⚠️ Reglas de `podman`

1. **Nunca** datos de BD en la capa rw (overlay COW). El COW se pierde al
   reiniciar y en flash USB castiga las escrituras.
2. Los datos van a `/data` con **mapeo directo**:
   ```bash
   VOLUMES=/data/apps/mail:/var/lib/mail:Z
   ```
3. Podman **sólo** se instala si el manifiesta declara `RUNTIME=podman`. Vive en
   el repo congelado de la ISO, no en el live base.
4. En flash USB, un contenedor con COW rw es inviable: usar `--read-only` + volúmenes.

## Sistemas de bases de datos soportados

### `DATABASE=embedded` (default)

| Componente | Descripción |
|---|---|
| Motor | SQLite integrada o motor embebido sin servicio separado |
| Uso | Aplicaciones ligeras, sin necesidad de servicio DB separado |
| Ejemplo | `DATA_DIR=/data/app/db`, comando `sqlite3 /data/app/db/app.db` |
| Autonomía | ✅ los datos viajan dentro del appliance |
| RAM | +0 MB (usando SQLite nativo) |

### `DATABASE=external`

| Componente | Descripción |
|---|---|
| Motor | PostgreSQL, MySQL, MariaDB, o cualquier servidor DB externo |
| Requisito | `DATABASE_URL` debe contener la URL de conexión |
| Red | Requiere LAN o acceso al server DB |
| Autonomía | ❌ depende de su server externo |
| RAM | +30–80 MB (dependiendo del motor) |
| URL example | `postgresql://user:pass@db.host:5432/dbname?sslmode=disable` |

### `DATABASE=none`

| Componente | Descripción |
|---|---|
| Motor | Ninguno. La app no usa base de datos local. |
| Uso | Aplicaciones frontend-only, APIs sin BD propia, gestores de archivos |
| Ejemplo | Aplicaciones SPA (Single Page Application) con API externa |
| Autonomía | ✅ totale, sin dependencias de BD |

## Flujo de instalación de un payload

```text
ADMIN (host)                          APPLIANCE
───────────                           ─────────
1. build.sh crea el appliance         ──────────
2. payload install app.conf           1. ssh root@appliance
   ├─ valida el manifiesto            2. payload-install app.conf
   ├─ materializa SOURCE@SOURCE_REF ─→ /data/apps/<slug>/src
   ├─ instala runtime si hace falta   3. systemctl enable --now app-<slug>.service
   ├─ prepara BD (embedded/external)   4. Verificar healthcheck
   └─ escribe la unit systemd          5. Disfrutar la app
3. systemctl enable --now app-<slug>.service
```

La materialización del código ocurre **en el appliance**, desde el repo de la
app, en el momento de la instalación. La ISO no lleva el código.

## Unidades systemd del payload (ejemplo genérico)

```ini
[Unit]
Description=Sistema autoalojado
RequiresMountsFor=/data
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/<app-slug>
Environment=NODE_ENV=production
Environment=DATABASE_URL=<URL-de-conexión>
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

> ⚠️ `WorkingDirectory=/opt/<app-slug>` (symlink sin espacios) — nunca la ruta original
> con comillas: systemd no las quita y el servicio no arranca.

## Repositorio de payloads en este proyecto

```text
apps/
└── mail-system/
    └── app.conf        # SOLO el manifiesto — el código NO está aquí
```

El instalador (`installer/build.sh` y `installer/payload.sh`) lee el manifiesto,
valida las claves y delega la materialización en el appliance.

## Validación

| Check | Comando | Esperado |
|---|---|---|
| Manifiesto válido | `load-manifest.sh app.conf` | `MANIFEST[NAME]` set |
| SOURCE es URL válida | `curl -I ${MANIFEST[SOURCE]}` | 200 OK |
| RUNTIME soportado | `${MANIFEST[RUNTIME]:-native}` in `native nspawn podman` | válido |
| DATA_DIR bajo /data | `${MANIFEST[DATA_DIR]}` empieza con `/data` | true |
| Healthcheck define | `${MANIFEST[HEALTHCHECK]}` no vacío | URL o cmd |

## Handoff a otras skills del grupo

| Si tocas... | Ve a |
|---|---|
| manifiesto + runtime + BD | `arch-frozen-repo` (para repos de packages frozen) |
| materialización payload | `arch-appliance-img` (instalación en .img) |
| runtime podman/nspawn | `arch-qemu-validation` (pruebas de arranque) |
| integración desktop (L0-L6: Openbox/LXQT/XFCE/Cinnamon/KDE/GNOME) | `arch-desktop-layers` (capas gráficas) |
| perfil + packages | `arch-iso-builder` (constructor de ISO) |
| validación hardware | `arch-hardware-handler` (antes de escribir en disco) |