# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] — 2026-11-11

Security audit and marketplace readiness release.

### Security

- Removed the default `root:root` password from `arch-appliance-img`; the
  chroot now uses `passwd -e root` to force a password change on first login.
- Moved the AUR repository instructions to an explicitly warned "advanced"
  section in `arch-frozen-repo`; `arch-iso-builder` now ships the `[aur]` block
  commented out. `SigLevel = Optional` is no longer part of the default flow.
- Guarded the `rm -rf` work-directory cleanup in `arch-iso-builder` against `/`,
  `/tmp`, `/var/tmp`, and empty `$WORKDIR`.
- Added device validation before `dd` in `arch-hardware-handler`: the target
  must be a block device, must not be the host root disk, and must not be
  mounted.
- Rewrote the bash manifest parser in `arch-payload-manifest` with `sed`-based
  trimming and strict `KEY` validation.
- Added the missing `import select` to the Python PTY bridge in
  `arch-qemu-validation`.

### Fixed

- Corrected invalid YAML frontmatter in `arch-distro-design` (the literal
  `{n}` placeholder).
- Replaced all broken references to the non-existent `arch-kiosk-desktop` skill
  with `arch-desktop-layers`.
- Renamed `arch-archlinux-pitfalls/references/catalogo.md` to
  `arch-archlinux-pitfalls/SKILL.md` so the skill is discoverable by Agensi and
  other `SKILL.md`-based agents.
- Corrected the `DisableDownloadTimeout` example block in the pitfalls catalog.
- Fixed typos and inconsistent language across the nine skills.

### Documentation

- Rewrote `README.md` for GitHub, Agensi and skills.sh.
- Added install instructions for Agensi, skills.sh and manual/symlink setups.
- Added the agent compatibility matrix and the security audit table.
- Added the project structure, migration note, support and license sections.
- Added `docs/AGENSI-LISTING.md` (public listing copy) and
  `docs/AGENSI-STRATEGY.md` (internal pricing and launch notes).
- Added `LICENSE` and this `CHANGELOG.md`.

## [1.0.0] — 2026-11-09

### Added

- Initial public release of the nine-skill harness:
  `arch-distro-design`, `arch-iso-builder`, `arch-appliance-img`,
  `arch-frozen-repo`, `arch-payload-manifest`, `arch-desktop-layers`,
  `arch-qemu-validation`, `arch-hardware-handler` and
  `arch-archlinux-pitfalls`.
- `skills.sh.json` grouping metadata for the skills.sh catalog.

[1.1.0]: https://github.com/ElectroZombie/arch-distro-design/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/ElectroZombie/arch-distro-design/releases/tag/v1.0.0
