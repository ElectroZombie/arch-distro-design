# arch-distro-design

## GitHub Repository
**https://github.com/ElectroZombie/arch-distro-design**

## Project Creator
**ElectroZombie** (daphniphyllum901@gmail.com)

## What This Is
**arch-distro-design is an AI-agent harness for building robust Arch Linux ISOs and .img appliances.** It is not a replacement for `archiso`, `archuseriso`, or `nixos-generators` — it is the **orchestration, governance, and validation layer** that sits on top of them and makes them usable safely by an autonomous agent or a non-expert operator.

Where a raw build tool gives you bricks, this system gives you the **architect, the building code, the inspection checklist, and the incident log**. It turns "I want a distro" into a structured engineering project with explicit decisions, empirical validation gates, and a memory of real failures.

## Why an AI Harness?

Building an Arch-based distribution is a long sequence of fragile, order-dependent, and silently-failing steps. A language model executing that sequence naively will:

- Build a technically valid ISO that does not meet the user's real objective.
- Hit the `community` repo 404, the `realpath: ''` abort, or the `DisableDownloadTimeout` parser error and burn hours debugging them from scratch.
- Repartition the host's `/dev/sda` because it did not check `lsblk` first.
- Corrupt a USB stick by `kill -9`-ing QEMU mid-write.

This harness exists to **prevent exactly those failure modes**. It encodes the decisions, the safety checks, and the hard-won empirical lessons as mandatory gates that an agent must pass before producing an artifact.

## Core Design Principles

| Principle | Implementation |
| :--- | :--- |
| **Decide before you build** | Mandatory 7-category Brief. No construction without it. |
| **Separate the artifacts** | ISO ≠ .img ≠ payload. Each versioned independently. |
| **Offline by default** | Frozen signed pacman repo embedded in the ISO. Network `inactive` unless the admin enables it. |
| **Validate before hardware** | 15 QEMU checks for ISO, 13 for .img, hardware-handler gate before any physical write. |
| **Remember the failures** | `arch-archlinux-pitfalls` is a living catalog of real, dated errors with root causes and fixes. |
| **Never vendorize apps** | Payloads are declared by manifest and materialized from their own repos. |

## Benefits

1. **Agent safety.** The Brief and the validation gates make it very hard for an autonomous agent to produce a dangerous or useless artifact.
2. **Reproducibility.** Frozen repo + `versions.txt` + `SHA256SUMS` give you a rollback-capable, verifiable build.
3. **Institutional memory.** The pitfalls catalog means the same error is never debugged twice.
4. **Lower barrier to entry.** A non-expert can execute a robust distro build by following the structured workflow.
5. **Offline-first security posture.** No accidental internet dependency in a kiosk, POS, or edge appliance.
6. **Clean artifact boundaries.** Updating an app never forces an ISO rebuild; one ISO serves N appliances.

## Who This Is For

- **AI agents** that must build Arch appliances without supervision.
- **Engineers** who want a governed, reproducible process rather than ad-hoc `archiso` invocations.
- **Operators** deploying single-purpose offline appliances (kiosks, self-hosted app servers, edge devices).

It is **not** aimed at users who just want a quick custom Arch ISO (use `archiso` or `archuseriso` directly) or at general-purpose desktop distros (Manjaro, EndeavourOS).

## Importing the Skills

```bash
cp -r skills/ ~/.agents/skills/
# or symlink for easy updates
ln -s /path/to/arch-distro-design/skills ~/.agents/skills/arch-distro-design
ls ~/.agents/skills/arch-*
```

## Mandatory Design Brief (7 Categories)

1. **Objective** — server, kiosk, workstation, appliance…
2. **Output format** — ISO live, persistent `.img`, or both.
3. **Target hardware** — x86_64 UEFI/BIOS, USB, HDD, SSD, NVMe (validated by `arch-hardware-handler`).
4. **Network policy** — `enabled` or `disabled` by default (admin can change later).
5. **Apps/payloads** — declared by manifest, never vendorized.
6. **Immutability** — squashfs ro, rw with rule, or overlay.
7. **Updates policy** — how and when updates apply.

## The 9 Skills

| Phase | Skill | Role |
| :--- | :--- | :--- |
| Design | `arch-distro-design` | Mandatory entry point; Brief handler and router. |
| Construction | `arch-iso-builder` | Live ISO constructor (uses `archiso`). |
| Construction | `arch-appliance-img` | Persistent `.img` with EFI+SYS+DATA. |
| Construction | `arch-frozen-repo` | Offline signed pacman repo. |
| Payload & Desktop | `arch-payload-manifest` | Manifest-driven payload materialization. |
| Payload & Desktop | `arch-desktop-layers` | Desktop layers L0–L6 (console → GNOME/KDE). |
| Validation | `arch-qemu-validation` | QEMU harness (15 ISO / 13 .img checks). |
| Validation | `arch-hardware-handler` | Safe physical write and compatibility checks. |
| Documentation | `arch-archlinux-pitfalls` | Living catalog of real errors. |

## Build Workflow

1. Complete the mandatory Brief.
2. Design with the decisions taken (never guessed).
3. Validate empirically (mirror throughput, signatures, permissions).
4. Document every real error in `arch-archlinux-pitfalls`.
5. Build the artifact (execution only — design is done).
6. Verify in QEMU via `arch-qemu-validation`.
7. Validate physical hardware via `arch-hardware-handler`.

## Artifacts Produced

- `out/*.iso` — bootable ISO (BIOS + UEFI) with squashfs rootfs.
- `out/SHA256SUMS` — ISO checksums.
- `out/appliance-*.img` — persistent appliance with EFI+SYS+DATA.
- `builder/arch-profile/` — profile ready for `mkarchiso`.

## Project Structure

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
│   └── arch-archlinux-pitfalls/references/catalogo.md
├── README.md
└── .git/

# About

**arch-distro-design** is an open AI-agent harness for building Arch Linux ISOs and persistent `.img` appliances with the discipline of a real engineering process. It consists of nine interconnected skills that cover the full lifecycle: a mandatory design Brief, ISO and `.img` construction, an offline frozen package repository, manifest-driven app payloads, seven desktop layers from console-only to GNOME/KDE, QEMU and hardware validation gates, and a living catalog of real Arch pitfalls.

The project's thesis is simple. Building an Arch-based distribution is a long chain of fragile, order-dependent steps that fail silently and expensively. A naive agent — or a hurried human — will produce a technically valid artifact that misses the real objective, hit the `community` 404 or the `DisableDownloadTimeout` parser error, repartition the wrong disk, or corrupt a USB stick by force-killing QEMU mid-write. This harness exists to prevent exactly those failures by encoding decisions, safety checks, and hard-won empirical lessons as mandatory gates.

It is **not** a replacement for `archiso`, `archuseriso`, or `nixos-generators`. It is the orchestration and governance layer that sits on top of them: where those tools give you bricks, this gives you the architect, the building code, the inspection checklist, and the incident log. The closest functional competitor is `archuseriso`; the closest paradigm competitor is `nixos-generators`. Neither governs the design and validation process the way this system does.

The benefits are concrete: agent safety, reproducibility through a frozen repo and versioned checksums, institutional memory of real errors, a lower barrier to entry for robust distro builds, an offline-first security posture, and clean artifact boundaries so that updating an app never forces an ISO rebuild.

It is built for AI agents that must build Arch appliances without supervision, for engineers who want a governed reproducible process, and for operators deploying single-purpose offline devices. It is not for users who just want a quick custom ISO — for that, `archiso` and `archuseriso` are more direct.

**Repository:** https://github.com/ElectroZombie/arch-distro-design
