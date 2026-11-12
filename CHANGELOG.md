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

## [1.4.0] — 2026-11-12

The free edition becomes **strictly below** the paid one: the method, without
the toolkit.

### Removed
- **The reference material** (`references/`, 9 files) and **the helper
  scripts** (`scripts/`, 3 files) — the long-form Brief template, the profile
  layout, the partition scheme, the repo layout, the manifest keys, the package
  matrix, the full checklists, the symptom index, the `.img` builder CLI, the
  payload installer and the manifest parser. They ship with the maintained
  pack.

### Changed
- Every skill now names exactly what it is missing and points at the
  maintained pack, instead of referring to a file it no longer carries.
- `arch-iso-builder`: the verification no longer fails when the installer is
  absent — it warns, because the installer now ships with the paid pack.
- `arch-payload-manifest`: the verification is self-contained (it checks the
  manifest format directly instead of sourcing the parser), and the parser
  source is no longer inlined in the skill.
- `README.md` and `TIERS.md` describe the free edition as *the method*, not as
  the whole product.
- The validator now **asserts the free-edition shape**: no skill may ship a
  `references/` or `scripts/` folder, and every skill must point at the
  maintained pack.

## [1.3.3] — 2026-11-12

### Fixed
- **The pack zip now has one top-level folder.** It put the nine skill folders
  at the root, so it failed the zip-structure check that every other package
  passes. It now wraps them in one folder named after the pack, exactly like
  the single-skill packages.

### Added
- `dist/SHA256SUMS` — the manifest of the built packages, so an upload can be
  verified later with `sha256sum -c SHA256SUMS`.

## [1.3.2] — 2026-11-12

Protocol compliance: the pack is checked against the published Agensi
protocols — the SKILL.md format reference, the creator checklist and the
8-point security scan.

### Added
- **Reference material inside every skill** — nine `references/` files, so the
  pack is self-contained and the long-form detail leaves `SKILL.md`:
  `brief-template.md`, `profile-layout.md`, `partition-table.md`,
  `repo-layout.md`, `manifest-keys.md`, `layer-matrix.md`, `checklists.md`,
  `hardware-checklist.md`, `symptom-index.md`.
- `harness/scripts/build-packages.mjs` — builds the ten Agensi upload packages
  (one per skill plus the pack) with the structure the security scan requires:
  a single top-level folder, `SKILL.md` at its root, no symlinks, no binaries,
  no OS junk. Store-only and deterministic: the same input always produces
  byte-identical output, and the Unix mode is preserved so the extracted
  scripts are executable.
- **Permissions and safety** tables in the six skills that touch the system:
  what each one reads, writes, refuses, and which network it may reach.
- An **Output:** line in every Definition of Done, so the agent reports the
  same shape every time.

### Changed
- **All nine descriptions now carry 3-5 trigger phrases**, as the Agensi
  creator checklist requires. Before, only the router did — which is why the
  other eight rarely activated on their own.
- The supporting files moved from `assets/` to `scripts/`: the SKILL.md
  convention puts executable code in `scripts/` and templates in `assets/`.
- The database URL example now uses environment variables
  (`${DB_USER}`/`${DB_PASSWORD}`) and the systemd unit reads them from an
  `EnvironmentFile` — no credential-shaped string in the pack.
- `harness/scripts/validate-pack.mjs` grew to 343 assertions: it now checks
  the frontmatter slug, the description length, the trigger phrases, the
  supporting-file references and the cross-skill references.

### Removed
- The stale `arch-distro-design-agensi.zip` at the repository root — it was
  built before the skill contract and had the wrong structure for the Agensi
  scan. `dist/` is now gitignored and rebuilt with
  `node harness/scripts/build-packages.mjs`.

## [1.3.1] — 2026-11-11

Integration fixes: the seams **between** the skills, closed without changing
what any skill does.

### Added
- **Scripts that ship with the skills** — the pack documented a CLI and an
  artifact it did not ship:
  - `skills/arch-appliance-img/assets/build.sh` — the `.img` builder CLI
    (`--disk`, `--profile`, `--yes`, `--dry-run`) with the documented guards.
  - `skills/arch-payload-manifest/assets/payload.sh` — materializes a payload,
    writes its unit, enables the service, waits for the healthcheck.
  - `skills/arch-payload-manifest/assets/load-manifest.sh` — the pure-bash
    manifest parser.
  - `arch-iso-builder` copies all three into the ISO overlay at `/installer/`.

### Fixed
- **The installer finally has a producer.** `arch-qemu-validation` check #4
  asserted that the ISO carries the installer, and `arch-payload-manifest`
  expected `installer/payload.sh` — but no skill created either, so an agent
  following the pack had nothing to run and failed the gate. The three assets
  above close the loop.
- **QEMU checks #3 and #4 now test what they claim.** Both grepped the ISO
  file listing for content that lives *inside* the squashfs, so they could
  never pass. #3 now asserts the ISO carries `airootfs.sfs`; #4 checks
  `/installer/` in the live session, where the overlay actually lives.
- **The layer names no longer collide.** The router's system layers are
  `B0..B4` (*build* layers); `L0..L6` belong to `arch-desktop-layers`
  (*desktop* layers). Both skills carry a disambiguation note, and the router
  says to always write *desktop L1* or *build B1*.
- **The desktop layer is now a design decision.** The Brief derives it
  explicitly and the router's Definition of Done requires it in `brief.md` —
  it could not be guessed silently by the ISO builder.
- **The build sequence is documented.** The router carries the ordered runbook
  (step → skill → consumes → produces) and the order constraints that matter
  (desktop before ISO, payload after the appliance, QEMU before hardware).
- `builder/repo-packages.txt` now has a producer: `arch-iso-builder` writes
  it and `arch-frozen-repo` consumes it.

### Changed
- `harness/scripts/validate-pack.mjs` now also resolves **asset references**
  and **cross-skill references**, so a skill can no longer point at a sibling
  or a script that does not exist. Assertions grew from 212 to 292.

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
