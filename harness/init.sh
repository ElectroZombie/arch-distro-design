#!/bin/bash
# init.sh — standard startup and verification path for the arch-distro-design repo.
# It lives in harness/ but validates the whole pack, so it always runs from the
# repository root. Exits non-zero on the first failure.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== Harness Initialization ==="

echo ""
echo "=== Test: skill pack structure and frontmatter ==="
node harness/scripts/validate-pack.mjs --target "$ROOT"

echo ""
echo "=== Lint: JSON manifest and whitespace ==="
node -e "JSON.parse(require('fs').readFileSync('skills.sh.json','utf8')); console.log('skills.sh.json is valid JSON')"
git diff --check

echo ""
echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read harness/feature_list.json to see the current feature state"
echo "2. Pick ONE unfinished feature to work on"
echo "3. Implement only that feature"
echo "4. Re-run ./harness/init.sh and record the Evidence before claiming done"