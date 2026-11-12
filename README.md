# arch-distro-design

**A governed harness of nine skills for building Arch Linux ISOs, `.img` appliances, and offline signed pacman repositories — designed for AI agents and disciplined human operators.**

> Where `archiso` gives you bricks, this gives you the architect, the building code, the inspection checklist, and the incident log.

**Author on Agensi:** [`electrozombie`](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness)
**Author on GitHub:** [`ElectroZombie`](https://github.com/ElectroZombie)

**Also available on:**
- **Agensi.io** — the maintained pack, with 12 months of updates. *Creator: `electrozombie`*
- **skills.sh** — indexed from this repository via `skills.sh.json`.

> **This branch is the free edition.** It carries **all nine skills**, frozen at
> the pre-2.0.0 line. It is a complete, working harness — but it is a
> **snapshot**: it will not receive further updates. The maintained edition,
> with every fix and every new pitfall entry, ships on
> [Agensi.io](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness).
> See [`TIERS.md`](./TIERS.md).

---

## What This Is

**arch-distro-design** is an **AI-agent harness** for building robust Arch Linux ISOs and `.img` appliances. It is **not** a replacement for `archiso`, `archuseriso`, or `nixos-generators` — it is the **orchestration, governance, and validation layer** that sits on top of them and makes them usable safely by an autonomous agent or a non-expert operator.

Where a raw build tool gives you bricks, this system gives you the **architect, the building code, the inspection checklist, and the incident log**. It turns "I want a distro" into a structured engineering project with explicit decisions, empirical validation gates, and a memory of real failures.

---

## The Problem

Building an Arch-based distribution is a long sequence of fragile, order-dependent, and silently-failing steps. A language model executing that sequence naively will:

- Build a technically valid ISO that **does not meet the user's real objective**.
- Hit the `community` repo 404, the `realpath: ''` abort, or the `DisableDownloadTimeout` parser error and **burn hours debugging them from scratch**.
- **Repartition the host's `/dev/sda`** because it did not check `lsblk` first.
- **Corrupt a USB stick** by `kill -9`-ing QEMU mid-write.

This harness exists to **prevent exactly those failure modes**. It encodes the decisions, the safety checks, and the hard-won empirical lessons as mandatory gates that an agent must pass before producing an artifact.

---

## Core Design Principles

| Principle | Implementation |
| :--- | :--- |
| **Decide before you build** | Mandatory 7-category Brief. No construction without it. |
| **Separate the artifacts** | ISO ≠ `.img` ≠ payload. Each versioned independently. |
| **Offline by default** | Frozen signed pacman repo embedded in the ISO. Network `inactive` unless the admin enables it. |
| **Validate before hardware** | 15 QEMU checks for ISO, 13 for `.img`, hardware-handler gate before any physical write. |
| **Remember the failures** | `arch-archlinux-pitfalls` is a living catalog of real, dated errors with root causes and fixes. |
| **Never vendorize apps** | Payloads are declared by manifest and materialized from their own repos. |
| **Secure by default** | No `root:root` passwords, no `curl \| sh`, no unguarded `rm -rf`, no `[aur]` in the default flow. |

---

## The Nine Skills

| Phase | Skill | Role |
| :--- | :--- | :--- |
| **Design** | `arch-distro-design` | Mandatory entry point; Brief handler and router. |
| **Construction** | `arch-iso-builder` | Live ISO constructor (uses `archiso 91-1`). |
| **Construction** | `arch-appliance-img` | Persistent `.img` with EFI + SYS + portable DATA. |
| **Construction** | `arch-frozen-repo` | Offline signed pacman repo embedded in the ISO. |
| **Payload & Desktop** | `arch-payload-manifest` | Manifest-driven payload materialization (no vendoring). |
| **Payload & Desktop** | `arch-desktop-layers` | Desktop layers L0 (console) → L6 (GNOME/KDE). |
| **Validation** | `arch-qemu-validation` | QEMU harness (15 ISO / 13 `.img` checks) + graceful shutdown. |
| **Validation** | `arch-hardware-handler` | Safe physical write and hardware compatibility gate. |
| **Documentation** | `arch-archlinux-pitfalls` | Living catalog of real Arch/archiso errors. |

---

## Install

### Option A — From GitHub (this branch)

```bash
git clone --branch github-free https://github.com/ElectroZombie/arch-distro-design.git
cp -r arch-distro-design/skills/* ~/.agents/skills/
```

Or symlink it so `git pull` keeps it current:

```bash
ln -s "$(pwd)/arch-distro-design/skills" ~/.agents/skills/arch-distro-design
ls ~/.agents/skills/arch-*
```

### Option B — Via skills.sh

skills.sh indexes this repository directly from GitHub:

```bash
npx skills add electrozombie/arch-distro-design
```

### Option C — Via Agensi.io *(recommended if you want updates)*

The maintained pack, with 12 months of updates included — **$25**, one-time
(or a single skill for **$5**; the router and the pitfalls catalog are **free**):
[Arch Distro Design — ISO & Appliance Harness](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness).

---

## Compatibility

Any agent that reads the `SKILL.md` convention works:

- **Claude Code** (`~/.claude/skills/` or `~/.agents/skills/`)
- **Cursor** (`.cursor/skills/` or user skills folder)
- **GitHub Copilot** (skills folder)
- **Gemini CLI**
- **Windsurf**
- **Cline**
- **Aider**
- **Continue**
- Any tool that reads `SKILL.md` files with YAML frontmatter (`name`, `description`).

> If your agent has a different skills path, symlink `skills/` into it — the frontmatter format is standard.

---

## Editions

The project ships in two editions. They share one codebase and one contract;
they differ in **which version** you get and what comes with it afterwards.

| Edition | Where | Price | Contents |
| :--- | :--- | :--- | :--- |
| **Free** | GitHub — [`github-free`](https://github.com/ElectroZombie/arch-distro-design/tree/github-free) branch | Free | **All nine skills**, frozen at the pre-2.0.0 snapshot |
| **Free** | [Agensi.io](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness) | Free | `arch-distro-design` (router) + `arch-archlinux-pitfalls` (catalog) |
| **Individual** | [Agensi.io](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness) | **$5** each | Any one of the seven execution skills |
| **Full pack** | [Agensi.io](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness) | **$25**, one-time | All nine skills, current version + 12 months of updates |

The free edition is the **whole harness**, not a teaser: the nine skills are
there and they work. What it does not include is what comes *after* — the
2.0.0 line, and every fix, pitfall entry and archiso-compatibility update
that lands with each release.

On Agensi the harness splits in two: the **advice** half (the router and the
pitfalls catalog) is free, the **execution** half (build, freeze, package,
validate, flash) is $5 a skill — or the whole set for $25.

See [`TIERS.md`](./TIERS.md) for the full comparison of what each edition
includes and what the updates bring.

---

## Mandatory Design Brief (7 Categories)

No artifact is built without the user having explicitly decided:

1. **Objective** — server, kiosk, workstation, appliance…
2. **Output format** — ISO live, persistent `.img`, or both.
3. **Target hardware** — x86_64 UEFI/BIOS, USB, HDD, SSD, NVMe (validated by `arch-hardware-handler`).
4. **Network policy** — `enabled` or `disabled` by default (admin can change later).
5. **Apps/payloads** — declared by manifest, never vendorized.
6. **Immutability** — squashfs ro, rw with rule, or overlay.
7. **Updates policy** — how and when updates apply.

---

## Build Workflow

1. Complete the mandatory Brief (`arch-distro-design`).
2. Design with the decisions taken — never guessed.
3. Validate empirically — mirror throughput, signatures, permissions.
4. Document every real error in `arch-archlinux-pitfalls`.
5. Build the artifact (`arch-iso-builder` / `arch-appliance-img` / `arch-frozen-repo`).
6. Verify in QEMU via `arch-qemu-validation`.
7. Validate physical hardware via `arch-hardware-handler` before touching real disks.

---

## Artifacts Produced

- `out/*.iso` — bootable ISO (BIOS + UEFI) with squashfs rootfs.
- `out/SHA256SUMS` — ISO checksums.
- `out/appliance-*.img` — persistent appliance with EFI+SYS+DATA.
- `builder/arch-profile/` — profile ready for `mkarchiso`.
- `arch-repo/` — offline signed pacman repository (embedded in the ISO).
- `out/versions.txt` — pinned package versions for rollback.

---

## Repository Harness

This repository is itself operated as a harness. Anyone — human or agent — who
changes the pack follows the same five-subsystem contract, so work survives
across sessions and never drifts out of scope. The harness lives in
`harness/`, keeping the repository root a clean product surface.

| Subsystem | Artifact | Purpose |
| :--- | :--- | :--- |
| **Instructions** | [`harness/AGENTS.md`](./harness/AGENTS.md) | Startup path, repo invariants, definition of done. |
| **State** | [`harness/feature_list.json`](./harness/feature_list.json), [`harness/progress.md`](./harness/progress.md) | Current feature, status, evidence, next step. |
| **Verification** | [`harness/init.sh`](./harness/init.sh), [`harness/scripts/validate-pack.mjs`](./harness/scripts/validate-pack.mjs) | Checks that must pass before claiming done. |
| **Scope** | `harness/feature_list.json` dependencies + `harness/AGENTS.md` rules | One feature at a time; no unrequested scope. |
| **Lifecycle** | [`harness/session-handoff.md`](./harness/session-handoff.md) | End-of-session routine that leaves the repo restartable. |

Run the full verification before and after any change:

```bash
./harness/init.sh
```

`harness/init.sh` fails fast (`set -e`) and checks frontmatter, skill naming,
`skills.sh.json` consistency, English-only content, README coverage, and the
skill contract below — 212 assertions, zero external dependencies.

### Skill harness contract

Every one of the nine skills exposes the same six sections, in the same order,
so an agent enters, scopes, verifies, closes and resumes them identically:

| Section | Purpose |
| :--- | :--- |
| `## Startup Workflow` | The entry path, from precondition to handoff. |
| `## Scope` | What the skill owns — and what it delegates. |
| `## Verification` | A runnable, fail-fast gate with a `✅` marker. |
| `## Definition of Done` | The checklist that closes the skill. |
| `## State & Evidence` | Where the state lives and what evidence to record. |
| `## Handoff` | Which skill runs next, and when. |

`./harness/init.sh` fails if a skill is missing one of them, if they are out of
order, or if the `Verification` block is not a fail-fast script.

---

## Project Structure

```
arch-distro-design/
├── skills/
│   ├── arch-distro-design/SKILL.md
│   ├── arch-iso-builder/SKILL.md
│   ├── arch-appliance-img/SKILL.md
│   ├── arch-frozen-repo/SKILL.md
│   ├── arch-payload-manifest/SKILL.md
│   ├── arch-desktop-layers/SKILL.md
│   ├── arch-qemu-validation/SKILL.md
│   ├── arch-hardware-handler/SKILL.md
│   └── arch-archlinux-pitfalls/SKILL.md
├── harness/
│   ├── AGENTS.md               # Agent instructions, invariants, definition of done
│   ├── feature_list.json       # Feature state tracker (source of truth)
│   ├── progress.md             # Session continuity log
│   ├── session-handoff.md      # Handoff template for multi-session work
│   ├── init.sh                 # Startup and verification entrypoint
│   └── scripts/
│       └── validate-pack.mjs   # Dependency-free structural checks
├── skills.sh.json          # Grouping metadata (skills.sh only; ignored by Agensi)
├── AGENTS.md               # Pointer to harness/AGENTS.md for auto-loading agents
├── TIERS.md                # Free vs paid editions
├── CHANGELOG.md
├── README.md
└── LICENSE
```

---

## Versioning & Updates

- **This branch:** frozen at the pre-2.0.0 line. It will not receive further updates.
- **Maintained edition:** 2.0.0 and every release after it, with 12 months of updates included ([Agensi.io](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness)).
- **Semantic versioning:** MAJOR for breaking skill-interface changes (renamed or removed contract sections); MINOR for new skills, new contract sections or new pitfalls entries; PATCH for typos and doc fixes.

See [`CHANGELOG.md`](./CHANGELOG.md) for the full history.

---

## Support

- **Bugs, questions, feature requests:** [open a GitHub issue](https://github.com/ElectroZombie/arch-distro-design/issues).
- **Agensi buyers:** also via the creator profile on Agensi (48h response target).
- **Security disclosures:** please email `daphniphyllum901@gmail.com` instead of opening a public issue.

No SLA for custom builds, but substantive questions usually get answered quickly.

---

## License

**MIT** — see [`LICENSE`](./LICENSE).

**Resale note:** MIT permits use in your own projects, including commercial ones. Redistribution or resale of this skill pack as a standalone product or competing pack is not permitted.

---

## Links

- **Repository:** https://github.com/ElectroZombie/arch-distro-design
- **Free edition:** [`github-free` branch](https://github.com/ElectroZombie/arch-distro-design/tree/github-free)
- **Agensi listing:** [Arch Distro Design — ISO & Appliance Harness](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness) *(creator: `electrozombie`)*
- **skills.sh:** https://skills.sh *(search "arch-distro-design")*
- **Issues:** https://github.com/ElectroZombie/arch-distro-design/issues
- **Author:** ElectroZombie — `daphniphyllum901@gmail.com`
