# AGENTS.md — arch-distro-design

## Project Purpose

This repository is a **governed harness of nine skills** for building Arch Linux
ISOs, `.img` appliances, and offline signed pacman repositories. It is a
documentation and skill-pack repository, **not** an application: there is no
compiled binary and no runtime to boot. The deliverables are the `SKILL.md`
files under `skills/`, the `skills.sh.json` grouping manifest, and the
project documentation.

The harness has two layers:

1. **The product** — the nine skills an end user installs into an AI agent to
   build distros safely (design Brief, ISO/.img construction, frozen repo,
   payloads, validation, pitfalls catalog).
2. **The repository harness** — the files in this directory that make *this repo*
   reliable for coding agents: instructions, state, verification, scope, and
   lifecycle.

## Repo Invariants (do not violate)

- **English only.** All prose, comments, and table headers are English. The
  Spanish edition lives on the `github-free` branch history; do not reintroduce
  accented characters into `skills/` on this branch.
- **One skill per directory.** Every skill is `skills/<name>/SKILL.md` with YAML
  frontmatter. The frontmatter `name` **must** equal the directory name.
- **Every skill carries the same harness contract.** See below — the sections
  are mandatory and their order is enforced by `scripts/validate-pack.mjs`.
- **The router is `skills/arch-distro-design/SKILL.md`.** It owns the
  artifact boundaries (ISO vs `.img` vs payload) and the L0–L4 layer model.
- **Never vendorize app code.** Payloads are declared by manifest and
  materialized from their own repositories.
- **Secure by default.** No `root:root` passwords, no `curl | sh`, no unguarded
  `rm -rf`, no `[aur]` repo in the default flow.
- **`docs/` is gitignored local working notes.** Do not commit it and do not
  treat it as a source of truth for the pack.
- **Do not hand-edit `.git/`** or the release `.zip` at the repo root; the zip is
  a build artifact.

## Startup Workflow

Before writing code:

1. **Confirm working directory** with `pwd`.
2. **Read this file** completely.
3. **Read the project docs** — `README.md` and `skills.sh.json`.
4. **Run `./init.sh`** to verify the environment is healthy.
5. **Read `feature_list.json`** to see the current feature state.
6. **Review recent commits** with `git log --oneline -5`.

If baseline verification is failing, repair that first before adding new scope.

## Working Rules

- **One feature at a time**: pick exactly one unfinished feature from
  `feature_list.json`.
- **Stay in scope**: do not modify skills or files unrelated to the current
  feature.
- **Verification required**: do not claim done without running `./init.sh` and
  recording the **Evidence** (command and output summary).
- **Update the state artifacts**: before ending a session, update `progress.md`
  and `feature_list.json`.
- **Leave a clean state**: the next session must be able to run `./init.sh`
  immediately and get a restartable baseline.

## Skill Harness Contract

Every `skills/<name>/SKILL.md` exposes the same six sections, in this order, so
an agent can enter, scope, verify, close and resume any skill the same way.
`scripts/validate-pack.mjs` enforces the presence **and** the order.

| Section | Purpose | Required content |
| :--- | :--- | :--- |
| `## Startup Workflow` | The entry path | Numbered steps from precondition to handoff |
| `## Scope` | The boundary | `**In scope:**` and `**Out of scope:**` plus a delegation table |
| `## Verification` | The gate | A runnable `bash` block with `set -euo pipefail` and a `✅` marker |
| `## Definition of Done` | The completion rule | A `- [ ]` checklist |
| `## State & Evidence` | The memory | Where the state lives + what evidence to record |
| `## Handoff` | The next skill | A trigger → destination table |

Adding, renaming or removing one of these sections in a skill is a **breaking
change** to that skill's interface: bump the MAJOR version and note it in
`CHANGELOG.md`.

## Required Artifacts

- `feature_list.json` — feature state tracker (source of truth).
- `progress.md` — session continuity log.
- `init.sh` — standard startup and verification path.
- `session-handoff.md` — handoff template for multi-session work.
- `scripts/validate-pack.mjs` — dependency-free structural checks.

## Definition of Done

A feature is done only when ALL of the following are true:

- [ ] The target behavior is implemented.
- [ ] `./init.sh` ran and passed, and the **Evidence** is recorded in
      `feature_list.json` or `progress.md`.
- [ ] The change stays within the feature's declared scope.
- [ ] The repository remains restartable from the standard startup path.

## Verification Commands

```bash
# Full verification (recommended)
./init.sh

# Structural checks only
node scripts/validate-pack.mjs
```

Required checks:

- `node scripts/validate-pack.mjs` — frontmatter, naming, manifest consistency,
  English-only, README coverage.
- `git diff --check` — whitespace and conflict-marker lint.

## End of Session

Before ending:

1. Update `progress.md` with the current state.
2. Update `feature_list.json` with the new feature status.
3. Record any unresolved risks or blockers in `session-handoff.md`.
4. Commit with a descriptive message once the work is in a safe state.
5. Leave the repo clean enough for the next session to run `./init.sh`
   immediately.

## Escalation

- **Architecture / artifact boundaries**: consult
  `skills/arch-distro-design/SKILL.md` first, otherwise ask the user.
- **Unclear requirements**: re-read the Brief categories in `README.md`, then ask.
- **Repeated verification failures**: record them in `progress.md` and flag for
  human review.
- **Scope ambiguity**: re-read `feature_list.json` for the definition of done.