# Changelog

All notable changes to **arch-distro-design** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.1.0]: https://github.com/ElectroZombie/arch-distro-design/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ElectroZombie/arch-distro-design/releases/tag/v1.0.0
