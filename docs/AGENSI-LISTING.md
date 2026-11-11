# Agensi Listing — Public Copy

> Copy-paste source for the Agensi marketplace listing.
> Internal pricing, revenue and launch notes live in [`AGENSI-STRATEGY.md`](AGENSI-STRATEGY.md) — **do not publish that file**.

## Listing title (recommended)

```text
Arch Distro Design — ISO & Appliance Harness
```

49 characters. Combines the project name with the three strongest keywords:
**ISO**, **Appliance**, **Harness**.

## Tagline

```text
Nine governed skills to design, build, and validate Arch Linux ISOs, .img appliances, and offline signed pacman repos — without burning hours on the same silent failures.
```

Short alternative for mobile cards:

```text
Design, build, and validate Arch ISOs and appliances with mandatory Brief, offline repos, and QEMU/hardware gates.
```

## Short description (~150 chars)

```text
A governed 9-skill harness for Arch Linux: mandatory design Brief, offline signed pacman repos, three independent artifacts (ISO / .img / payload), QEMU + hardware validation gates, and a living catalog of real Arch failures.
```

## Full description

```markdown
## What this is

**Arch Distro Design** is a governed harness of **nine interconnected skills** that turns "I want a custom Arch distro" into a structured engineering project. It sits **on top of** `archiso` and `archuseriso` — it is not a replacement. Where those give you bricks, this gives you the architect, the building code, the inspection checklist, and the incident log.

It covers the full lifecycle:

- **Design** — a mandatory 7-category Brief that prevents you from building a technically valid artifact that misses the real objective.
- **Construction** — live ISO (archiso), persistent `.img` (EFI+SYS+DATA), and an offline signed pacman repo embedded inside the ISO.
- **Payloads & Desktop** — manifest-driven app materialization (never vendored), and seven desktop layers from console-only to GNOME/KDE.
- **Validation** — 15 QEMU checks for ISO, 13 for `.img`, and a hardware-write gate that refuses to touch the host's root disk.
- **Memory** — a living catalog of real, dated Arch failures (`community` 404, `DisableDownloadTimeout`, `error -71`, SDDM hangs) that you consult *before* the next build.

## Why an AI harness instead of just archiso?

Building an Arch-based distribution is a long chain of fragile, order-dependent steps that fail silently and expensively. A naive agent — or a hurried human — will:

- Build a technically valid ISO that does not meet the user's real objective.
- Hit the `community` repo 404, the `realpath: ''` abort, or the `DisableDownloadTimeout` parser error and burn hours debugging from scratch.
- Repartition the host's `/dev/sda` because it did not check `lsblk` first.
- Corrupt a USB stick by `kill -9`-ing QEMU mid-write.

This harness prevents **exactly those failure modes** by encoding decisions, safety checks, and hard-won empirical lessons as **mandatory gates** that must pass before an artifact reaches real hardware.

## The nine skills

| Phase | Skill | Role |
|---|---|---|
| Design | `arch-distro-design` | Mandatory entry point; 7-category Brief handler and router. |
| Build | `arch-iso-builder` | Live ISO constructor (archiso 91-1). |
| Build | `arch-appliance-img` | Persistent `.img` with EFI + SYS + portable DATA. |
| Build | `arch-frozen-repo` | Offline signed pacman repo embedded in the ISO. |
| Extend | `arch-payload-manifest` | Manifest-driven payload materialization (no vendoring). |
| Extend | `arch-desktop-layers` | Desktop layers L0 (console) → L6 (GNOME/KDE). |
| Validate | `arch-qemu-validation` | 15 ISO checks + 13 `.img` checks + graceful shutdown. |
| Validate | `arch-hardware-handler` | Safe physical write and compatibility gate. |
| Remember | `arch-archlinux-pitfalls` | Living catalog of real failures. |

## Who this is for

- **AI agents** (Claude Code, Cursor, Copilot, Gemini CLI, Windsurf, Cline, Aider…) that must build Arch appliances without supervision.
- **Engineers** who want a governed, reproducible process rather than ad-hoc `archiso` invocations.
- **Operators** deploying single-purpose offline appliances — kiosks, POS, self-hosted app servers, edge devices.

It is **not** for users who just want a quick custom Arch ISO (use `archiso` or `archuseriso` directly), or for general-purpose desktop distros.

## What makes it different from free skill directories

The free ecosystem indexes millions of skills automatically. It does not curate, does not gate, and does not pay maintainers. This pack is different in three concrete ways:

1. **Curated and versioned.** Nine skills that are designed to work *together*, with explicit handoffs between them. No orphan skills, no conflicting assumptions.
2. **Security-first.** No `root:root` defaults, no `curl | sh`, no unguarded `rm -rf`, no `[aur]` with `SigLevel = Optional` in the default flow. Every script is audited for the patterns that Agensi's scanner flags.
3. **Maintained.** This is not a weekend experiment. The pitfalls catalog is dated and updated with every real failure encountered in production builds. Your purchase includes updates for 12 months.

## What you get

- **9 `SKILL.md` files**, drop-in ready for any agent that reads the `SKILL.md` convention (`~/.agents/skills/` or equivalent).
- **Compatibility:** Claude Code, Cursor, Copilot, Gemini CLI, Windsurf, Cline, Aider, Continue, and any agent that reads `SKILL.md` files.
- **Format:** a single `.zip`, structured as `skills/<skill-name>/SKILL.md`, ready to extract into your agent's skill directory.
- **Updates:** 12 months of updates via Agensi (new pitfalls, archiso compatibility fixes, new desktop layers).
- **No lock-in:** every skill is plain Markdown + bash. If you leave Agensi, the skills still work.

## Frequently asked questions

**Q: Is this just a wrapper around archiso?**
A: No. `archiso` builds the ISO. This harness decides *what to build, why, and how to validate it before touching hardware*. It is the governance layer, not the build tool.

**Q: Can I use only one skill?**
A: Yes. Each skill is independently usable. But the design assumes you start with `arch-distro-design` (the Brief router), because skipping it is the #1 documented cause of "I built the wrong thing."

**Q: Does it work with [my agent]?**
A: If your agent reads `SKILL.md` files, yes. That includes Claude Code, Cursor, Copilot, Gemini CLI, Windsurf, Cline, Aider, and Continue.

**Q: What about NixOS or Debian?**
A: This pack is Arch-specific. The pitfalls catalog is Arch-specific. For NixOS, use `nixos-generators`; for Debian, use `live-build`.

**Q: Do you offer support?**
A: Yes, via the creator profile on Agensi and through public GitHub Issues. Response within 48h for questions about the skills; no SLA for custom builds.

**Q: What is the refund policy?**
A: Digital goods are generally non-refundable. If something is broken, contact me and I'll fix it. See Agensi's standard policy for the formal terms.

**Q: What is the license?**
A: MIT for use in your own projects, including commercial use. Redistribution or resale of this skill pack as a standalone product or competing pack is not permitted.

## License

MIT for use in your own projects, including commercial use. Redistribution or resale of this skill pack as a standalone product or competing pack is not permitted.

## Author

Built by **ElectroZombie** — an AI-agent harness author who has rebuilt Arch appliances from scratch after real data-loss incidents (documented in the pitfalls catalog). Repository: `github.com/ElectroZombie/arch-distro-design`.
```

## Categories

Primary (choose 1–2):

- `DevOps & Infrastructure`
- `System Administration`

Secondary (if Agensi allows more):

- `Build & Deployment`
- `AI Agents`

## Tags / keywords

```text
arch linux, archiso, mkarchiso, arch appliance, arch iso builder,
linux distro builder, linux appliance, systemd, pacman, offline linux,
kiosk appliance, edge device, qemu validation, arch linux iso,
arch distro design, arch linux harness, linux iso, ai agent skills
```

## Before publishing — required decisions

Replace these placeholders before submitting the listing:

- [ ] License: MIT for use in your own projects, including commercial use; redistribution/resale as a standalone or competing pack is not permitted. **Publish the exact wording in the listing description.**
- [ ] Updates: 12 months included; annual renewal at $14.99 from month 13.
- [ ] Support: Agensi creator profile + public GitHub Issues; 48h response for skill questions.
- [ ] Author name: `ElectroZombie`.
- [ ] Listing language: English (recommended for Agensi search reach).
- [ ] Refund policy: confirm Agensi's standard policy; if none, use "no refunds on digital goods, but contact me if something is broken and I'll fix it."
- [ ] Replace `AGENSI_LISTING_URL` and `AGENSI_AFFILIATE_URL` placeholders in the repository `README.md`.
