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

## Startup Workflow

1. **Confirm the request** — the user wants "a distro", "an appliance", "an Arch ISO" or "a self-hosted system" without naming the output format.
2. **Run the Brief** — ask the 7 mandatory questions in the design process below. Never guess an answer.
3. **Fix the artifact boundary** — decide ISO vs .img vs payload and write the "what goes where" contract.
4. **Delegate** — hand the settled decisions to the sibling skills. This skill decides; it does not build.
5. **Verify** — the design gate must be fully checked before any construction starts.

## Scope

**In scope:** the artifact decision, the layer model (L-1..L4), the artifact contract, the network and update policy, and the immutability model.

**Out of scope:** building anything. This skill decides; the siblings execute.

| Out of scope | Delegate to |
|---|---|
| archiso profile, boot modes, live ISO | `arch-iso-builder` |
| Partitioning, `.img`, systemd units | `arch-appliance-img` |
| Signed offline repo | `arch-frozen-repo` |
| App manifest, runtime, database | `arch-payload-manifest` |
| Graphical layer, panel, kiosk | `arch-desktop-layers` |
| Boot tests, shutdown | `arch-qemu-validation` |
| Physical media writes | `arch-hardware-handler` |

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

## Verification

Run before delegating. The script fails fast on the first missing item.

```bash
set -euo pipefail

BRIEF="docs/brief.md"                 # the completed Brief
CONTRACT="docs/artifact-contract.md" # what goes where

# 1. Every mandatory Brief category is answered
for category in "Objective" "Output format" "Target hardware" "Network policy" \
                "Apps/payloads" "Immutability" "Update policy"; do
  grep -qi "$category" "$BRIEF" || { echo "❌ Brief missing: $category" >&2; exit 1; }
done

# 2. The artifact contract exists and names all three artifacts
test -f "$CONTRACT"
grep -q 'ISO'     "$CONTRACT"
grep -q '\.img'   "$CONTRACT"
grep -q 'payload' "$CONTRACT"

# 3. The main artifact and the update policy are decided
grep -qiE 'primary artifact|main artifact' "$BRIEF"
grep -qi 'update policy' "$BRIEF"

echo "✅ Design brief and artifact contract verified"
```

| # | Check | Expected |
|---|---|---|
| 1 | Brief answers all 7 categories | no missing category |
| 2 | Artifact contract exists | ISO, .img and payload rows present |
| 3 | Main artifact decided | ISO, .img, or both |
| 4 | Network + update policy | written, not implied |
| 5 | Immutability model | `rw`, `squashfs` or `overlayfs` |

## Definition of Done

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

## State & Evidence

| State | Where it lives |
|---|---|
| The 7-category Brief | `docs/brief.md` |
| Artifact contract ("what goes where") | `docs/artifact-contract.md` |
| Layer decisions (L-1..L4) | `docs/brief.md` |
| Validation plan | `docs/brief.md` |

Record the evidence before delegating: the **command** you ran and its **output** (for example the `✅ Design brief and artifact contract verified` line). Without that evidence the design is not done.

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
