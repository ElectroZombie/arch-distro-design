#!/usr/bin/env bash
# payload.sh — materialize and start one app payload on an appliance.
#
# Part of the arch-distro-design skill `arch-payload-manifest`.
# Runs **on the appliance** (never on the build host). The ISO ships it as
# `/installer/payload.sh`.
#
# Usage:
#   payload.sh <app.conf>
#
# It reads the KEY=VALUE manifest, materializes SOURCE@SOURCE_REF under
# /data, writes the systemd unit, enables the service and waits for the
# healthcheck. It never vendors app code into this repository: the code is
# pulled from the app's own repo at install time.
set -euo pipefail

MANIFEST_FILE="${1:-}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=./load-manifest.sh
source "$HERE/load-manifest.sh"

die() {
    echo "❌ $*" >&2
    exit 1
}

[[ -n "$MANIFEST_FILE" ]] || die "usage: payload.sh <app.conf>"
load_manifest "$MANIFEST_FILE"

# --- validate ----------------------------------------------------------------
for key in NAME VERSION SOURCE; do
    [[ -n "${MANIFEST[$key]:-}" ]] || die "manifest is missing the mandatory key: $key"
done

RUNTIME="${MANIFEST[RUNTIME]:-native}"
case "$RUNTIME" in
    native|nspawn|podman) ;;
    *) die "unsupported RUNTIME: $RUNTIME" ;;
esac

DATABASE="${MANIFEST[DATABASE]:-none}"
if [[ "$DATABASE" == "external" ]]; then
    [[ -n "${MANIFEST[DATABASE_URL]:-}" ]] || die "DATABASE=external requires DATABASE_URL"
fi

SLUG="$(printf '%s' "${MANIFEST[NAME]}" | tr '[:upper:] ' '[:lower:]-' | sed 's/[^a-z0-9-]//g; s/--*/-/g; s/^-//; s/-$//')"
[[ -n "$SLUG" ]] || die "could not derive a slug from NAME"

DATA_DIR="${MANIFEST[DATA_DIR]:-/data/apps/$SLUG}"
[[ "$DATA_DIR" == /data/* ]] || die "DATA_DIR must live under /data (got: $DATA_DIR)"

SRC_DIR="$DATA_DIR/src"
APP_DIR="/opt/$SLUG"
UNIT="app-$SLUG.service"

# --- materialize -------------------------------------------------------------
echo "==> Materializing ${MANIFEST[NAME]} (${MANIFEST[VERSION]})"
mkdir -p "$DATA_DIR" "$APP_DIR"

if [[ -d "$SRC_DIR/.git" ]]; then
    echo "    updating the existing checkout"
    git -C "$SRC_DIR" fetch --depth 1 origin "${MANIFEST[SOURCE_REF]:-main}"
    git -C "$SRC_DIR" reset --hard "origin/${MANIFEST[SOURCE_REF]:-main}"
else
    git clone --depth 1 --branch "${MANIFEST[SOURCE_REF]:-main}" "${MANIFEST[SOURCE]}" "$SRC_DIR"
fi

# --- runtime -----------------------------------------------------------------
case "$RUNTIME" in
    podman)
        command -v podman >/dev/null 2>&1 || die "RUNTIME=podman but podman is not installed"
        ;;
    nspawn)
        [[ -d "${MANIFEST[ROOTFS]:-/var/lib/machines/$SLUG}" ]] \
            || die "RUNTIME=nspawn needs a prepared rootfs (set ROOTFS= in the manifest)"
        ;;
esac

# --- unit --------------------------------------------------------------------
echo "==> Writing $UNIT"
cat > "/etc/systemd/system/$UNIT" <<UNIT
[Unit]
Description=${MANIFEST[NAME]}
RequiresMountsFor=/data
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=DATABASE_URL=${MANIFEST[DATABASE_URL]:-}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

# The WorkingDirectory must not carry quotes: systemd does not strip them.
if grep -q '"' "/etc/systemd/system/$UNIT"; then
    die "the generated unit contains quotes — systemd does not strip them"
fi

systemctl daemon-reload
systemctl enable --now "$UNIT"

# --- healthcheck -------------------------------------------------------------
HEALTHCHECK="${MANIFEST[HEALTHCHECK]:-}"
if [[ -n "$HEALTHCHECK" ]]; then
    echo "==> Waiting for the healthcheck"
    for _ in $(seq 1 30); do
        if curl -fsS "$HEALTHCHECK" >/dev/null 2>&1; then
            echo "✅ ${MANIFEST[NAME]} is up (${HEALTHCHECK})"
            exit 0
        fi
        sleep 2
    done
    die "healthcheck did not pass within 60s: $HEALTHCHECK"
fi

echo "✅ ${MANIFEST[NAME]} installed as $UNIT"
echo "   Version: ${MANIFEST[VERSION]}  ·  Data: $DATA_DIR  ·  Runtime: $RUNTIME"
