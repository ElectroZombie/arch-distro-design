---
name: arch-distro-design
description: 'Router and root skill for designing Arch Linux distributions. Decides which artifact (ISO, .img, or both) to build, defines the B0-B4 build-layer model, and enforces the mandatory 7-category Brief before any construction begins. Use when the user asks for "a distro", "an appliance", "an Arch ISO", or "a self-hosted system" without specifying the output format.'
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

**In scope:** the artifact decision, the build-layer model (B-1..B4), the artifact contract, the network and update policy, and the immutability model.

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

## Layers (B0..B4 model)

Each layer is **cumulative** and can be sold on its own.

> **B = build layers (this model). L = desktop layers.** The two systems are
> separate and must never be mixed: `L0..L6` belong to `arch-desktop-layers`
> (console → GNOME), `B0..B4` belong to this skill (what the system is made
> of). "L1" on its own is ambiguous — always say *desktop L1* or *build B1*.

| Layer | Content | Skill that resolves it |
|---|---|---|
| **B0** | boot + firmware + bootloader (UEFI+BIOS) | `arch-iso-builder`, `arch-appliance-img` |
| **B1** | base: kernel, shell, tools, locales, TZ | `arch-iso-builder` |
| **B2** | services: ssh, network (networkd), update-unit, time | `arch-appliance-img` |
| **B3** | web platform: nginx, nftables, no DB | `arch-appliance-img` |
| **B4** | app payloads | `arch-payload-manifest` |
| **B-1** | DATA: partition portable across machines | `arch-appliance-img` |

Cross-cutting rules:
- **B3 does not include a database.** The database is declared by the payload (`embedded`/`external`).
- **B4 does not touch the rootfs** outside `/opt` + units.
- **B-1 is never touched from the host** except through an explicit admin operation.

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

> **Derived decision — the desktop layer.** The Brief does not ask for it, but
> the ISO build cannot start without it: `arch-desktop-layers` decides which
> packages go into `packages.x86_64` and which session starts in `.xinitrc`.
> So right after the Brief: if the objective needs a graphical interface,
> choose the desktop layer **now** (`L0..L6` in `arch-desktop-layers`) and
> write it into `brief.md`. If it does not, write `L0` (console-only). Never
> let the ISO builder pick it implicitly.

### 2. Artifact contract

Write the "what goes where" table to `artifact-contract.md`. Without this
contract, the ISO starts swallowing things that belong to the .img and vice versa.

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

BRIEF="brief.md"                    # the completed Brief
CONTRACT="artifact-contract.md"      # what goes where

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

## Build sequence

The nine skills are one chain. This is the order, and what each step consumes
and produces — use it to check that no step is missing or inverted.

| # | Step | Skill | Consumes | Produces |
|---|---|---|---|---|
| 1 | Brief + contract | `arch-distro-design` | the request | `brief.md`, `artifact-contract.md` |
| 2 | Desktop layer | `arch-desktop-layers` | `brief.md` | `desktop_layer` + the packages for the profile |
| 3 | Live ISO | `arch-iso-builder` | the profile + the layer's packages | `builder/arch-profile/`, `out/*.iso` |
| 4 | Frozen repo | `arch-frozen-repo` | `builder/repo-packages.txt` | `airootfs/arch-repo/`, `out/versions.txt` |
| 5 | Appliance image | `arch-appliance-img` | the profile + `build.sh` | `out/appliance-*.img` |
| 6 | Payloads | `arch-payload-manifest` | `apps/<slug>/app.conf` | `/data/apps/<slug>` on the appliance |
| 7 | Validation | `arch-qemu-validation` | the ISO and the `.img` | the evidence record |
| 8 | Physical write | `arch-hardware-handler` | the validated artifact | the media + `hardware-log.txt` |
| 9 | Memory | `arch-archlinux-pitfalls` | every real failure | the updated catalog |

**Order constraints that matter:**

- Step 2 **before** step 3 — the desktop layer decides the packages in
  `packages.x86_64` and the session in `.xinitrc`, both baked into the ISO.
- Step 4 **inside** step 3 — the frozen repo is an overlay of the ISO, not a
  separate artifact.
- Step 6 **after** step 5 — payloads are materialized on the appliance, never
  carried inside the ISO.
- Step 7 **before** step 8 — nothing touches a physical disk before the QEMU
  gate passes.
- Step 9 is continuous, not a phase.

## Definition of Done

- [ ] Brief answered by the user (not guessed).
- [ ] Main artifact identified (ISO / .img / both).
- [ ] "What goes where" contract written.
- [ ] Network + update policy decided.
- [ ] Immutability model decided.
- [ ] Desktop layer chosen (L0..L6) or explicitly console-only, written to `brief.md`.
- [ ] Package list with verified repo (see `arch-archlinux-pitfalls`), and the subset to freeze written to `builder/repo-packages.txt`.
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
| The 7-category Brief | `brief.md` |
| Artifact contract ("what goes where") | `artifact-contract.md` |
| Layer decisions (B-1..B4) | `brief.md` |
| Validation plan | `brief.md` |

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
