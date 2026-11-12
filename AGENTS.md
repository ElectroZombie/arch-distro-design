# AGENTS.md — arch-distro-design

This repository is a **skill pack**: nine `SKILL.md` files that teach an AI
agent how to design, build and validate Arch Linux ISOs and persistent `.img`
appliances. This file tells you what is here and how to use it.

## What is here

```text
skills/
├── arch-distro-design/SKILL.md      # the router — START HERE
├── arch-iso-builder/SKILL.md        # live ISO with archiso
├── arch-appliance-img/SKILL.md      # persistent .img appliance
├── arch-frozen-repo/SKILL.md        # offline signed pacman repo
├── arch-payload-manifest/SKILL.md   # app payloads, declared not vendored
├── arch-desktop-layers/SKILL.md     # desktop layers L0 → L6
├── arch-qemu-validation/SKILL.md    # the QEMU gate
├── arch-hardware-handler/SKILL.md   # safe physical writes
└── arch-archlinux-pitfalls/SKILL.md # the empirical memory
```

`skills.sh.json` holds the grouping metadata for skills.sh. `TIERS.md` explains
the free and paid editions. `CHANGELOG.md` is the history.

## How to use it

1. **Install** the skills into your agent's skills directory:

   ```bash
   cp -r skills/* ~/.agents/skills/          # or symlink the folder
   npx skills add electrozombie/arch-distro-design   # via skills.sh
   ```

2. **Start with `arch-distro-design`.** It is the router: it asks the
   mandatory 7-category Brief, decides whether you are building a live ISO, a
   persistent `.img`, or both, and delegates the rest. Skipping it is the
   #1 documented cause of "I built the wrong thing".

3. **Follow the handoffs.** Every skill ends with a `## Handoff` table saying
   which skill runs next and when. The nine form one chain:

   ```text
   router → desktop layer → live ISO → frozen repo → appliance
          → payloads → QEMU gate → physical write
   ```

4. **Respect the gates.** Each skill has a `## Verification` section with a
   fail-fast bash script. Run it before claiming the step is done, and record
   the **command and its output** as evidence.

5. **Record what breaks.** `arch-archlinux-pitfalls` is the group's memory: a
   dated catalog of real failures with their cause and their fix. When you hit
   a new one, add it there.

## The contract

Every skill exposes the same six sections, in the same order, so you enter,
scope, verify, close and resume them all the same way:

| Section | Purpose |
| :--- | :--- |
| `## Startup Workflow` | The entry path, from precondition to handoff. |
| `## Scope` | What the skill owns — and what it delegates. |
| `## Verification` | A runnable, fail-fast gate with a `✅` marker. |
| `## Definition of Done` | The checklist that closes the skill. |
| `## State & Evidence` | Where the state lives and what evidence to record. |
| `## Handoff` | Which skill runs next, and when. |

## The free edition

This branch ships the **method**: the nine `SKILL.md` files with their
decisions, gates, checklists and scope boundaries — frozen, with no further
updates. The long-form reference material and the helper scripts ship with the
maintained pack on
[Agensi.io](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness)
($25 for the set, $5 per skill; the router and the pitfalls catalog are free).
Each skill names exactly what it is missing and where to get it.

## Rules

- **English only.** Do not reintroduce accented characters into `skills/`.
- **One skill per directory**, `skills/<name>/SKILL.md`, with the frontmatter
  `name` equal to the directory name.
- **Never vendorize app code.** Payloads are declared by manifest and
  materialized from their own repositories.
- **Secure by default.** No `root:root` passwords, no `curl | sh`, no
  unguarded `rm -rf`, no `[aur]` repo in the default flow.
- **Never write to the host's root disk.** The hardware gate refuses it.
