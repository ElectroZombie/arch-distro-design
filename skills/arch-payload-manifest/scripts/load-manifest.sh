#!/usr/bin/env bash
# load-manifest.sh — read a KEY=VALUE payload manifest into an associative array.
#
# Part of the arch-distro-design skill `arch-payload-manifest`.
# Pure bash: no jq, no yq, no python.
#
# Usage:
#   source ./load-manifest.sh
#   load_manifest apps/mail/app.conf
#   echo "${MANIFEST[NAME]}"
#
# Rules:
#   - one KEY=VALUE per line, `#` starts a comment, empty lines are ignored
#   - keys must match ^[A-Z_][A-Z0-9_]*$
#   - surrounding spaces and quotes are stripped from the value
#   - an unknown key is ignored, never fatal

# shellcheck disable=SC2034
declare -gA MANIFEST=()

load_manifest() {
    local file="${1:-}" key value line

    [[ -n "$file" ]] || { echo "❌ usage: load_manifest <file>" >&2; return 1; }
    [[ -f "$file" ]] || { echo "❌ does not exist: $file" >&2; return 1; }

    MANIFEST=()

    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*(#|$) ]] && continue

        # Must contain '='
        [[ "$line" == *=* ]] || continue

        key="${line%%=*}"
        value="${line#*=}"

        # Trim spaces on both sides
        key="$(printf '%s' "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
        value="$(printf '%s' "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

        # Remove surrounding single or double quotes
        value="${value%\"}"; value="${value#\"}"
        value="${value%\'}"; value="${value#\'}"

        # Validate key
        [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue

        MANIFEST["$key"]="$value"
    done < "$file"

    return 0
}

# Print one key, or the whole manifest with `manifest_dump`.
manifest_get() {
    printf '%s' "${MANIFEST[${1:-}]:-}"
}

manifest_dump() {
    local key
    for key in "${!MANIFEST[@]}"; do
        printf '%s=%s\n' "$key" "${MANIFEST[$key]}"
    done | sort
}
