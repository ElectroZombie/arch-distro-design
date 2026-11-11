# arch-distro-design

**A governed harness of nine skills for building Arch Linux ISOs, `.img` appliances, and offline signed pacman repositories — designed for AI agents and disciplined human operators.**

> Where `archiso` gives you bricks, this gives you the architect, the building code, the inspection checklist, and the incident log.

**Author on Agensi:** `electrozombie`

**Also available on:**
- **Agensi.io** — packaged skill pack, ready to drop into any agent. *Creator: `electrozombie`*
- **skills.sh** — indexed from this repository via `skills.sh.json`.

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

### Option A — Via Agensi.io *(recommended for AI agents)*

Agensi packages the nine skills as a single `.zip` you drop into your agent's skills directory.

1. Visit the listing on [Agensi.io](https://agensi.io) — *Creator: `electrozombie`, replace with your listing URL*.
2. Purchase the pack (or grab the free `arch-distro-design` router skill to try it out).
3. Download the `.zip` and extract:

   ```bash
   unzip arch-distro-design-agensi.zip -d /tmp/arch-distro-design
   cp -r /tmp/arch-distro-design/skills/ ~/.agents/skills/
   ```

4. Restart your agent. The skills are now available.

> **Note:** The Agensi pack does **not** include `skills.sh.json` — that file is only used by skills.sh for grouping. Agensi auto-detects a "skill pack" when it sees 2+ `SKILL.md` files.

### Option B — Via skills.sh

skills.sh indexes this repository directly from GitHub:

```bash
npx skills add ElectroZombie/arch-distro-design
```

Or add individual skills by name from the [skills.sh catalog](https://skills.sh).

The `skills.sh.json` file at the repo root defines the 5-phase grouping (Design → Construction → Payload & Desktop → Validation → Knowledge Base) shown in the skills.sh UI.

### Option C — Manual (from GitHub)

Clone the repo and symlink the `skills/` folder:

```bash
git clone https://github.com/ElectroZombie/arch-distro-design.git
ln -s "$(pwd)/arch-distro-design/skills" ~/.agents/skills/arch-distro-design
ls ~/.agents/skills/arch-*
```

Symlinking (rather than copying) lets you pull updates with `git pull` without re-copying.

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

## Repository Harness

This repository is itself operated as a harness. Anyone — human or agent — who
changes the pack follows the same five-subsystem contract, so work survives
across sessions and never drifts out of scope.

| Subsystem | Artifact | Purpose |
| :--- | :--- | :--- |
| **Instructions** | [`AGENTS.md`](./AGENTS.md) | Startup path, repo invariants, definition of done. |
| **State** | [`feature_list.json`](./feature_list.json), [`progress.md`](./progress.md) | Current feature, status, evidence, next step. |
| **Verification** | [`init.sh`](./init.sh), [`scripts/validate-pack.mjs`](./scripts/validate-pack.mjs) | Checks that must pass before claiming done. |
| **Scope** | `feature_list.json` dependencies + `AGENTS.md` rules | One feature at a time; no unrequested scope. |
| **Lifecycle** | [`session-handoff.md`](./session-handoff.md) | End-of-session routine that leaves the repo restartable. |

Run the full verification before and after any change:

```bash
./init.sh
```

`init.sh` fails fast (`set -e`) and checks frontmatter, skill naming,
`skills.sh.json` consistency, English-only content, and README coverage — 95
assertions, zero external dependencies.

---

## Mandatory Design Brief (7 Categories)

No artifact is built without the user having explicitly decided:

1. **Objective** — server, kiosk, workstation, appliance…
2. **Output format** — live ISO, persistent `.img`, or both.
3. **Target hardware** — x86_64 UEFI/BIOS, USB, HDD, SSD, NVMe (validated by `arch-hardware-handler`).
4. **Network policy** — `enabled` or `disabled` by default (admin can change later).
5. **Apps/payloads** — declared by manifest, never vendorized.
6. **Immutability** — squashfs ro, rw with rule, or overlay.
7. **Updates policy** — how and when updates apply.

---

## Build Workflow

1. **Complete the mandatory Brief** (`arch-distro-design`).
2. **Design** with the decisions taken — never guessed.
3. **Validate empirically** — mirror throughput, signatures, permissions.
4. **Document every real error** in `arch-archlinux-pitfalls`.
5. **Build the artifact** (`arch-iso-builder` / `arch-appliance-img` / `arch-frozen-repo`).
6. **Verify in QEMU** via `arch-qemu-validation`.
7. **Validate physical hardware** via `arch-hardware-handler` before touching real disks.

---

## Artifacts Produced

- `out/*.iso` — bootable ISO (BIOS + UEFI) with squashfs rootfs.
- `out/SHA256SUMS` — ISO checksums.
- `out/appliance-*.img` — persistent appliance with EFI + SYS + DATA.
- `builder/arch-profile/` — profile ready for `mkarchiso`.
- `arch-repo/` — offline signed pacman repository (embedded in the ISO).
- `out/versions.txt` — pinned package versions for rollback.

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
├── scripts/
│   └── validate-pack.mjs   # Dependency-free structural checks
├── AGENTS.md               # Agent instructions, invariants, definition of done
├── feature_list.json       # Feature state tracker (source of truth)
├── progress.md             # Session continuity log
├── session-handoff.md      # Handoff template for multi-session work
├── init.sh                 # Startup and verification entrypoint
├── skills.sh.json          # Grouping metadata (skills.sh only; ignored by Agensi)
├── CHANGELOG.md
├── README.md
└── LICENSE
```

---

## Versioning & Updates

- **Current version:** `1.2.0` (English edition, security-audited).
- **Semantic versioning:** MAJOR for breaking skill-interface changes; MINOR for new skills or new pitfalls entries; PATCH for typos and doc fixes.
- **Agensi buyers:** 12 months of updates included from purchase date. Updates are delivered automatically through the Agensi platform.
- **skills.sh / GitHub users:** `git pull` gets you everything.

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

## About

**arch-distro-design** is an open AI-agent harness for building Arch Linux ISOs and persistent `.img` appliances with the discipline of a real engineering process. It consists of nine interconnected skills that cover the full lifecycle: a mandatory design Brief, ISO and `.img` construction, an offline frozen package repository, manifest-driven app payloads, seven desktop layers from console-only to GNOME/KDE, QEMU and hardware validation gates, and a living catalog of real Arch pitfalls.

The project's thesis is simple. Building an Arch-based distribution is a long chain of fragile, order-dependent steps that fail silently and expensively. A naive agent — or a hurried human — will produce a technically valid artifact that misses the real objective, hit the `community` 404 or the `DisableDownloadTimeout` parser error, repartition the wrong disk, or corrupt a USB stick by force-killing QEMU mid-write. This harness exists to prevent exactly those failures by encoding decisions, safety checks, and hard-won empirical lessons as mandatory gates.

It is **not** a replacement for `archiso`, `archuseriso`, or `nixos-generators`. It is the orchestration and governance layer that sits on top of them. The closest functional competitor is `archuseriso`; the closest paradigm competitor is `nixos-generators`. Neither governs the design and validation process the way this system does.

**Built for:** AI agents that must build Arch appliances without supervision, engineers who want a governed reproducible process, and operators deploying single-purpose offline devices.

**Not for:** users who just want a quick custom ISO — for that, `archiso` and `archuseriso` are more direct.

---

## Links

- **Repository:** https://github.com/ElectroZombie/arch-distro-design
- **Agensi listing:** *Creator: `electrozombie`, replace with your listing URL*
- **skills.sh:** https://skills.sh *(search "arch-distro-design")*
- **Issues:** https://github.com/ElectroZombie/arch-distro-design/issues
- **Author:** ElectroZombie — `daphniphyllum901@gmail.com`
