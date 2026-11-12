# Changelog

> **This branch (`github-free`) is the free edition**, frozen at **1.3.0**.
> It carries all nine skills and will not receive further updates. The
> maintained edition starts at **2.0.0** and ships through
> [Agensi.io](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness).

All notable changes to **arch-distro-design** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] — 2026-11-11

The last release of the 1.x line, and what the free edition ships: the nine
skills with the shared harness contract, plus the repository harness.

### Added
- **Repository harness** — the project now carries the same five-subsystem
  contract it teaches: instructions (`harness/AGENTS.md`), state
  (`harness/feature_list.json`, `harness/progress.md`), verification
  (`harness/init.sh`, `harness/scripts/validate-pack.mjs`), scope (one feature
  at a time, dependencies tracked), and lifecycle
  (`harness/session-handoff.md`).
- `harness/scripts/validate-pack.mjs` — dependency-free structural verification:
  frontmatter validity, frontmatter `name` matching its directory, `skills.sh.json`
  ↔ disk consistency in both directions, English-only content, level-1 headings,
  and README coverage.
- `harness/init.sh` — single startup and verification entrypoint that fails fast
  (`set -e`) and prints the next steps.
- `README.md` — new **Repository Harness** section documenting the five
  subsystems, and an updated project structure tree.
- `TIERS.md` — the free vs paid edition comparison, including the Agensi
  price ladder: the router and the pitfalls catalog are **free**, the other
  seven skills are **$5** each, and the complete set is **$25**.

### Changed
- **All nine skills now follow the same harness contract.** Each `SKILL.md` gained
  a `## Startup Workflow`, a `## Scope` (in scope / out of scope plus a
  delegation table), a fail-fast `## Verification` script, a
  `## Definition of Done` checklist, and a `## State & Evidence` table; the
  existing validation and handoff sections were renamed and folded into the
  contract so the order is identical across the pack.
- `arch-iso-builder`: `## Pre-build validation` → `## Verification`.
- `arch-appliance-img`: `### 8. Validation` → `## Verification`;
  `### 9. Handoff` → `## Handoff`; `### 10. Common errors` → `## Common errors`.
- `arch-frozen-repo`: `### 6. Validation` → `## Verification`.
- `arch-payload-manifest`, `arch-desktop-layers`: `## Validation` → `## Verification`.
- `arch-desktop-layers`: `## Desktop selection checklist` → `## Definition of Done`.
- `arch-hardware-handler`: `## Versioning and traceability` → `## State & Evidence`.
- `arch-archlinux-pitfalls`: gained the full contract plus a verification
  script that checks the catalog is complete and still carries the classic
  failures.
- `harness/scripts/validate-pack.mjs` now enforces the skill contract: the six
  sections must be present, ordered, and the `Verification` block must be a
  fail-fast bash script with a success marker. Assertions grew from 95 to 212.
- The `Project Structure` tree in `README.md` now lists the harness files.
- The author line carries both handles: Agensi and GitHub.

### Fixed
- Removed references to files that do not exist in the pack: `docs/09`,
  `docs/04` and `docs/08-LECCIONES-APRENDIDAS.md`. The canonical state files
  are now `brief.md` and `artifact-contract.md` at the project root, and the
  hardware trail lives in `hardware-log.txt`.
- Replaced the `replace with your listing URL` placeholders in `README.md` with
  the real Agensi listing.

### Moved
- **The repository harness left the repository root** and now lives in
  `harness/`. The root is now a clean product surface — `skills/`,
  `skills.sh.json`, `TIERS.md`, `README.md`, `CHANGELOG.md`, `LICENSE`.
- `harness/init.sh` now resolves the repository root itself, so it runs the
  same from any working directory.

## [1.2.0] — 2026-11-11

English edition and repository hygiene release.

### Changed
- Translated all nine `SKILL.md` files from Spanish into correct English.
  Code blocks, commands, paths, tables, warnings, and YAML frontmatter were
  preserved; only prose and code comments were translated.
- Normalized terminology across the pack (`Brief`, `payload`, `frozen repo`,
  `layer`, `artifact`, `handoff`) so the skills read consistently.
- Added `arch-hardware-handler` to the router's skill-group table, matching the
  nine skills listed in the README and in `skills.sh.json`.
- Corrected the `arch-payload-manifest` handoff table: the frozen-repo row now
  points to `arch-frozen-repo` instead of duplicating the manifest row.
- Renamed the Spanish checklist identifiers in `arch-archlinux-pitfalls` to
  English (`brief_completed`, `objective_defined`, `output_format`,
  `hardware_identified`, `network_policy`, `apps_payloads`, `update_policy`).

### Repository hygiene
- Added a `.gitignore` that excludes `docs/` and `.DS_Store`.
- Removed `docs/` from git tracking with `git rm -r --cached docs`.
  `docs/AGENSI-LISTING.md` and `docs/AGENSI-STRATEGY.md` remain on disk for
  local use, but they are no longer committed.
- Rebuilt the Agensi `.zip` from `skills/` only. It contains the nine
  `SKILL.md` files and excludes `docs/`, `skills.sh.json`, `.git/`, and
  `.DS_Store`.

## [1.1.0] — 2026-11-10

### Added
- **Agensi.io packaging**: the nine skills are now structured as a drop-in
  `.zip` (`skills/<name>/SKILL.md`) ready to extract into `~/.agents/skills/`.
  The pack is auto-detected by Agensi as a "skill pack" (2+ `SKILL.md` files).
- **Security & Audit section** in `README.md`: documents the 9 patterns
  that were fixed (see "Security" below).
- **Compatibility table**: Claude Code, Cursor, Copilot, Gemini CLI, Windsurf,
  Cline, Aider, Continue, and any agent that reads `SKILL.md` frontmatter.
- **Install instructions** for three channels: Agensi, skills.sh (`npx skills add`),
  and manual (symlink from GitHub).
- **`LICENSE`** (MIT) and this `CHANGELOG.md`.
- **`skills.sh.json`** remains in the repo for skills.sh grouping only;
  it is explicitly excluded from the Agensi `.zip`.

### Security
- **`arch-appliance-img`**: removed `echo 'root:root' | chpasswd`. Root password
  is now set via `passwd -e root` (forces a change on first login). The old
  pattern was a known-weak default and a guaranteed scanner flag.
- **`arch-frozen-repo`** and **`arch-iso-builder`**: the `[aur]` repo block
  (`SigLevel = Optional`) is now commented out by default and moved to an
  "advanced" section with an explicit risk warning. The default flow no longer
  weakens signature verification.
- **`arch-iso-builder`**: the `rm -rf /var/tmp/archiso-work` cleanup is now
  guarded against `/`, `/tmp`, `/var/tmp`, and empty `$WORKDIR`.
- **`arch-hardware-handler`**: `dd` is now preceded by a guard that refuses
  to write to the host's root disk (`findmnt -n -o SOURCE /`) or to a mounted
  device. Added `set -euo pipefail` to all snippets.
- **`arch-payload-manifest`**: the bash `load_manifest` parser was rewritten.
  The previous trim logic was broken; the new version uses `sed`-based trim and
  strict key validation (`^[A-Z_][A-Z0-9_]*$`). Added `set -euo pipefail`.
- **`arch-qemu-validation`**: added the missing `import select` to the Python
  `serial-bridge.py` snippet. Without it, the snippet failed at runtime.
- **All skills**: added `set -euo pipefail` to bash snippets where missing.
- **`arch-archlinux-pitfalls`**: renamed from `references/catalogo.md` to
  `SKILL.md` so that Agensi (and any `SKILL.md`-based agent) can discover it
  as a first-class skill. Content is preserved in full.

### Fixed
- **Frontmatter bug**: `arch-distro-design/SKILL.md` had a literal `{n}` in
  its `description` field (leftover from a template). Removed.
- **Broken cross-reference**: `arch-distro-design/SKILL.md` referenced
  `arch-kiosk-desktop`, which does not exist in this pack. Replaced with
  `arch-desktop-layers`.
- **`arch-payload-manifest/SKILL.md`**: handoff table pointed to a non-existent
  `arch-kiosk-desktop` entry; corrected to `arch-desktop-layers` (the actual
  skill name).
- **Typos** in `arch-hardware-handler` (`particulación` → `partición`,
  `Sufre` → `Suficiente`) and `arch-frozen-repo` (`recognizadas` →
  `reconocidas`).
- **`arch-qemu-validation`**: clarified that checks 12–13 of the ISO checklist
  assume desktop layer **L1** (Openbox + tint2). Add a note to adjust per the
  Brief's chosen layer.
- **`arch-desktop-layers`**: the handoff table listed `arch-kiosk-desktop`
  as a destination; corrected to a note that L1-with-tweaks is configured
  *within the same skill*.

### Changed
- **`README.md`** completely rewritten for the Agensi + skills.sh dual
  distribution:
  - Fixed mojibake (`‚ÄĒ` → `—`, `‚Č†` → `≠`, `‚Üí` → `→`).
  - Corrected project structure: `arch-archlinux-pitfalls/SKILL.md` (was
    `references/catalogo.md`).
  - Added "Install" section with the three channels.
  - Added "Security & Audit" table.
  - Added "Compatibility" table.
  - Added "License" and "Support" sections.
  - Removed the outdated `arch-kiosk-desktop` reference in the skill table.
- **`skills.sh.json`**: kept as-is for skills.sh grouping. Added a note in the
  README that it is **not** included in the Agensi `.zip`.

### Removed
- No skills were removed. All nine are present and independent.
- The `[aur]` active block in the default `pacman.conf` template (moved to
  commented-out "advanced" section).

### Migration notes (v1.0 → v1.1)

1. **Path change**: `skills/arch-archlinux-pitfalls/references/catalogo.md`
   → `skills/arch-archlinux-pitfalls/SKILL.md`. If you had a symlink or a
   script pointing to the old path, update it.
2. **Agensi pack**: if you are packaging for Agensi, **exclude**
   `skills.sh.json` from the `.zip`. Agensi does not use it.
3. **Root password**: if you were relying on `root:root` in the appliance
   build, you must now either set a secure hash via `chpasswd -e` or accept
   the forced-change flow (`passwd -e root`).

---

## [1.0.0] — 2026-10-15

### Added
- Initial public release of the nine-skill harness:
  `arch-distro-design`, `arch-iso-builder`, `arch-appliance-img`,
  `arch-frozen-repo`, `arch-payload-manifest`, `arch-desktop-layers`,
  `arch-qemu-validation`, `arch-hardware-handler`, `arch-archlinux-pitfalls`.
- Mandatory 7-category Brief.
- L0–L6 desktop layer model.
- Frozen signed pacman repo embedded in the ISO.
- 15 ISO checks + 13 `.img` checks in QEMU.
- Hardware-handler gate before physical writes.
- Living pitfalls catalog (dated entries: `community` 404,
  `DisableDownloadTimeout`, `error -71`, SDDM hangs, etc.).

---

[1.2.0]: https://github.com/ElectroZombie/arch-distro-design/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ElectroZombie/arch-distro-design/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ElectroZombie/arch-distro-design/releases/tag/v1.0.0
