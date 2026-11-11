---
name: arch-distro-design
description: 'Router and root skill for designing Arch Linux distributions. Decides which artifact (ISO, .img, or both) to build, defines the L0-L4 layer model, and enforces the mandatory 7-category Brief before any construction begins. Use when the user asks for "a distro", "an appliance", "an Arch ISO", or "a self-hosted system" without specifying the output format.'
---

# Arch Distro Design — Router

**Root** skill of the group. It decides **which artifact** is built, **with which layers**, and **in what order**, and delegates the actual execution to the sibling skills.

## When to use this skill

- The user asks for "a distro", "an appliance", "an Arch ISO", or "a self-hosted system" without specifying the exact output format.
- The **architecture** must be decided before writing a single line of code.
- The **contract** between artifacts must be fixed (what goes inside the ISO, what goes in the .img, what goes in the payload).

## Skill group (interrelated)

| Skill | Role | Produces |
|---|---|---|
| `arch-distro-design` | **router** | layers, decisions, contract between artifacts |
| `arch-iso-builder` | ISO builder | archiso profile + bootable ISO |
| `arch-appliance-img` | .img builder | persistent EFI+SYS+DATA image |
| `arch-frozen-repo` | frozen repo | local signed, offline, reproducible repo |
| `arch-payload-manifest` | payloads | `KEY=VALUE` manifest + materialization |
| `arch-desktop-layers` | desktop | layers L0-L6 (console → GNOME/KDE) |
| `arch-qemu-validation` | verification | QEMU test harness |
| `arch-hardware-handler` | hardware | safe write + compatibility gate |
| `arch-archlinux-pitfalls` | pitfalls | catalog of real Arch/archiso failures |

> All skills read from the same context: `arch-archlinux-pitfalls` is the group's
> empirical memory; `arch-qemu-validation` is the quality gate for all the others.

## Artifacts and boundaries

Golden rule: **three independent artifacts**, each versioned separately.

```
  ISO builder                .img appliance            app payload
  (archiso)                  (pacstrap)                (the app's repo)
      |                          |                          |
      | contains frozen repo     | contains the base OS     | NEVER
      | + CLI installer          | + data in DATA           | vendored here
      +---- produces ------------>+ is applied to ---------->+
```

| Artifact | Contains | Does NOT contain |
|---|---|---|
| ISO | live rootfs, frozen repo, CLI installer | app code, payloads |
| .img | installed rootfs, services, DATA partition | frozen repo (lives in the ISO), app code |
| payload | code + deps + unit + config | anything from the base OS |

**Why separate them:**
1. The ISO is **reusable**: one builder, N appliances.
2. Updating an app does **not** force a rebuild of the ISO.
3. The payload is versioned in **its own repo** (the app's repo), not the distro's.
4. The ISO can live in the distro repo; the .img is usually a release
   artifact (binary, checksum), not source code.

## Layers (L0..L4 model)

Each layer is **cumulative** and can be sold on its own.

| Layer | Content | Skill that resolves it |
|---|---|---|
| **L0** | boot + firmware + bootloader (UEFI+BIOS) | `arch-iso-builder`, `arch-appliance-img` |
| **L1** | base: kernel, shell, tools, locales, TZ | `arch-iso-builder` |
| **L2** | services: ssh, network (networkd), update-unit, time | `arch-appliance-img` |
| **L3** | web platform: nginx, nftables, no DB | `arch-appliance-img` |
| **L4** | app payloads | `arch-payload-manifest` |
| **L-1** | DATA: partition portable across machines | `arch-appliance-img` |

Cross-cutting rules:
- **L3 does not include a database.** The database is declared by the payload (`embedded`/`external`).
- **L4 does not touch the rootfs** outside `/opt` + units.
- **L-1 is never touched from the host** except through an explicit admin operation.

## Design process (mandatory, in this order)

### 1. Brief (questions for the user — do NOT guess)

| Question | Why it matters |
|---|---|
| Live ISO, persistent .img, or both? | Determines the main skill |
| Objective? (POS kiosk, web panel, control panel…) | Decides desktop, network, payload |
| Target hardware? (x86_64 UEFI? ARM? USB disk?) | Decides boot modes and partitioning |
| Disk size? | Decides the partition table (see `arch-appliance-img`) |
| Network? (100% local, LAN DHCP, internet?) | Decides networkd + update policy |
| Apps to include? | Decides payloads and whether a DB is needed |
| Immutability? | Decides whether root is rw or squashfs |
| Update policy? | Decides `appliance-update.service` |

### 2. Artifact contract

Write (in `docs/`) the "what goes where" table. Without this contract, the ISO
starts swallowing things that belong to the .img and vice versa.

### 3. Network and update policy (a decision that is expensive to get wrong)

Recommended default policy:

- Network **disabled** by the admin on the host; the system boots with networkd
  **without an uplink**.
- Updates **disabled** by default; the admin enables them.
- If updating: `pacman -Syu` with networkd temporarily up, and a
  **version log** in `/data/update-log/`.
- The network is brought up by **a single service** (`appliance-update.service`),
  not a permanent daemon.

### 4. Immutability model

| Model | Root | When |
|---|---|---|
| `rw` (default) | rw | persistent appliance, with the rule "only the update unit writes" |
| `squashfs` | ro | live ISO; writes via CoW (`cow_spacesize`) |
| `overlayfs` | ro+overlay | only if there is hardware to spare |

### 5. ISO contract

The ISO defines the **build environment** for the .img:
- frozen repo (offline, signed),
- `build.sh` with its flags,
- partitioning profile,
- payload manifests.

If the ISO and the .img can be built **separately**, the contract is correct.

### 6. Validation

Every artifact goes through `arch-qemu-validation` **before** touching real hardware.

## Design checklist (gate)

- [ ] Brief answered by the user (not guessed).
- [ ] Main artifact identified (ISO / .img / both).
- [ ] "What goes where" contract written.
- [ ] Network + update policy decided.
- [ ] Immutability model decided.
- [ ] Package list with verified repo (see `arch-archlinux-pitfalls`).
- [ ] Disk size and partition table decided.
- [ ] Apps → payloads with runtime and DB declared.
- [ ] QEMU validation plan defined.

## Working method

1. **Confirm environment assumptions** — read the actual code (`/usr/bin/mkarchiso`,
   `README.profile.rst`); do not guess.
2. **Compare against the official reference** — upstream `releng`/`baseline` profiles.
3. **Verify empirically** — measure, do not assume (mirror throughput, signatures, permissions).
4. **Document the error** — every real failure goes to `arch-archlinux-pitfalls`.

## Most common design errors

| Error | Symptom | Prevention |
|---|---|---|
| One giant artifact | 4 GB ISO that nobody can replicate | Separate ISO / .img / payload |
| Frozen repo inside DATA | The .img is not portable | Repo **inside the ISO** |
| Vendored payload | Every app forks the repo | Manifest + own repo |
| DB in the base image | 2 GB appliance with unused Postgres | The payload declares the DB |
| Display manager | Black screen after an update | `arch-desktop-layers` (no DM) |
| "Internet off" undecided | The admin does not know how to update | Written policy + update unit |

## Handoff

Once the design is settled, delegate:

| If you are touching... | Go to |
|---|---|
| archiso profile, boot, live | `arch-iso-builder` |
| partitioning, .img, systemd, updates | `arch-appliance-img` |
| local signed repo | `arch-frozen-repo` |
| app manifest, runtime, DB | `arch-payload-manifest` |
| graphical session, panel, kiosk | `arch-desktop-layers` |
| tests, boot, shutdown | `arch-qemu-validation` |
| "this failed with...", questions | `arch-archlinux-pitfalls` |
| validate hardware before writing | `arch-hardware-handler` |
