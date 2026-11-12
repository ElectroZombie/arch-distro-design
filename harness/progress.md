# Progress Log

**Last Updated:** 2026-11-11
**Current Objective:** Keep the free edition healthy and frozen at the pre-2.0.0 line.

## Current State

- **This branch is the free edition.** All nine skills are here, in English,
  frozen at the pre-2.0.0 line, with the broken-reference corrections.
- The free edition is the **method**: no `references/` and no `scripts/`.
  Those twelve files ship with the maintained pack, and every skill says so.
- The maintained edition lives on `official-agensi` and ships through Agensi.
- The repository harness lives in `harness/`; the repository root is a clean
  product surface (`skills/`, `skills.sh.json`, `TIERS.md`, `README.md`,
  `CHANGELOG.md`, `LICENSE`).
- The live Agensi listing is
  https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness
  (set $25; router + pitfalls free; other seven $5 each).
- All nine skills carry the same harness contract: `## Startup Workflow`,
  `## Scope`, `## Verification`, `## Definition of Done`, `## State & Evidence`
  and `## Handoff`, in that order.
- Harness audit score: **100/100** across all five subsystems (was 20/100).

## What Changed

- Translated the whole pack into English and applied the six-section harness
  contract to all nine skills.
- Introduced the five-subsystem repository harness — instructions, state,
  verification, scope, lifecycle — and a dependency-free validator that
  enforces frontmatter, naming, manifest consistency, English-only content,
  README coverage, the skill contract, and **asset + cross-skill reference
  resolution**.
- Moved the harness into `harness/`, leaving the root a clean product surface.
- **Fixed the cross-skill seams** without changing what the skills do:
  the installer now has a producer (three assets shipped, copied into the ISO
  overlay at `/installer/`); QEMU checks #3 and #4 now test what they claim
  and can actually pass; the layer names no longer collide (router `B0..B4`,
  desktop `L0..L6`); the desktop layer is an explicit Brief decision; the
  router carries the ordered build runbook; `builder/repo-packages.txt` has a
  producer.
- **Added the two editions** — free and paid — with the Agensi price ladder
  (router + pitfalls free, seven skills at $5, the set at $25).
- Cleaned stale references: `docs/09`, `docs/04` and
  `docs/08-LECCIONES-APRENDIDAS.md` pointed at files that do not exist; the
  canonical state files are now `brief.md` and `artifact-contract.md` at the
  project root, and the hardware trail is `hardware-log.txt`.
- Replaced the listing placeholders with the real Agensi URL and added the
  GitHub handle.
- **Checked the pack against the Agensi protocols** (SKILL.md format spec,
  creator checklist, 8-point security scan) and fixed what it found:
  every description now carries 3-5 trigger phrases, every skill states its
  output format, the six skills that touch the system declare their
  permissions, credentials moved to environment variables, every skill ships a
  supporting file, and `harness/scripts/build-packages.mjs` builds the ten
  upload packages with the structure the scan requires. The stale root zip is
  gone; `dist/` is gitignored and regenerated.

## Next

- This branch is **frozen**: it takes no further feature work. The maintained
  line continues on `official-agensi` (CI workflow, release zip, per-skill
  reference material).
- New issues are still welcome in the public tracker.

## Verification Evidence

- `./harness/init.sh` → `OK — all 212 checks passed.`
- `node ~/.agents/skills/harness-creator/scripts/validate-harness.mjs --target harness`
  → `Overall: 100/100`, bottleneck `none`.
