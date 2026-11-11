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
2. **The repository harness** — the files under `harness/` that make *this repo*
   reliable for coding agents: instructions, state, verification, scope, and
   lifecycle. They are kept out of the repository root so the root stays a
   clean product surface (`skills/`, `skills.sh.json`, `README.md`,
   `TIERS.md`, `CHANGELOG.md`, `LICENSE`).

## Repo Invariants (do not violate)

- **English only.** All prose, comments, and table headers are English. The
  Spanish edition lives further back in this branch's history; do not
  reintroduce accented characters into `skills/`.
- **One skill per directory.** Every skill is `skills/<name>/SKILL.md` with YAML
  frontmatter. The frontmatter `name` **must** equal the directory name.
- **Every skill carries the same harness contract.** See below — the sections
  are mandatory and their order is enforced by `harness/scripts/validate-pack.mjs`.
- **The router is `skills/arch-distro-design/SKILL.md`.** It owns the
  artifact boundaries (ISO vs `.img` vs payload) and the L0–L4 layer model.
- **Never vendorize app code.** Payloads are declared by manifest and
  materialized from their own repositories.
- **Secure by default.** No `root:root` passwords, no `curl | sh`, no unguarded
  `rm -rf`, no `[aur]` repo in the default flow.
- **`docs/` is gitignored local working notes.** Do not commit it and do not
  treat it as a source of truth for the pack. The skills' canonical state
  files are `brief.md` and `artifact-contract.md` at the project root.
- **Two editions, two branches.** This branch (`github-free`) is the **free
  edition**: all nine skills, frozen at the pre-2.0.0 line. It is the only
  branch published to GitHub. `official-agensi` carries the maintained, paid
  edition and is never pushed — it ships through Agensi. Never mix the two.
- **Do not hand-edit `.git/`** or the release `.zip` at the repo root; the zip is
  a build artifact (`*.zip` is gitignored).

## Startup Workflow

Before writing code:

1. **Confirm working directory** with `pwd`.
2. **Read this file** completely.
3. **Read the project docs** — `README.md` and `skills.sh.json`.
4. **Run `./harness/init.sh`** to verify the environment is healthy.
5. **Read `harness/feature_list.json`** to see the current feature state.
6. **Review recent commits** with `git log --oneline -5`.

If baseline verification is failing, repair that first before adding new scope.

## Working Rules

- **One feature at a time**: pick exactly one unfinished feature from
  `harness/feature_list.json`.
- **Stay in scope**: do not modify skills or files unrelated to the current
  feature.
- **Verification required**: do not claim done without running `./harness/init.sh` and
  recording the **Evidence** (command and output summary).
- **Update the state artifacts**: before ending a session, update `harness/progress.md`
  and `harness/feature_list.json`.
- **Leave a clean state**: the next session must be able to run `./harness/init.sh`
  immediately and get a restartable baseline.
- **Publish only this branch.** `github-free` is the free edition and the only
  branch on GitHub. The maintained edition (`official-agensi`) stays local and
  ships through Agensi.

## Skill Harness Contract

Every `skills/<name>/SKILL.md` exposes the same six sections, in this order, so
an agent can enter, scope, verify, close and resume any skill the same way.
`harness/scripts/validate-pack.mjs` enforces the presence **and** the order.

| Section | Purpose | Required content |
| :--- | :--- | :--- |
| `## Startup Workflow` | The entry path | Numbered steps from precondition to handoff |
| `## Scope` | The boundary | `**In scope:**` and `**Out of scope:**` plus a delegation table |
| `## Verification` | The gate | A runnable `bash` block with `set -euo pipefail` and a `✅` marker |
| `## Definition of Done` | The completion rule | A `- [ ]` checklist |
| `## State & Evidence` | The memory | Where the state lives + what evidence to record |
| `## Handoff` | The next skill | A trigger → destination table |

Renaming or removing one of these sections is a **breaking change** to that
skill's interface: bump the MAJOR version. Adding a new section is MINOR.
Either way, note it in `CHANGELOG.md`.

## Required Artifacts

All of them live in `harness/`:

- `harness/feature_list.json` — feature state tracker (source of truth).
- `harness/progress.md` — session continuity log.
- `harness/init.sh` — standard startup and verification path.
- `harness/session-handoff.md` — handoff template for multi-session work.
- `harness/scripts/validate-pack.mjs` — dependency-free structural checks.

## Definition of Done

A feature is done only when ALL of the following are true:

- [ ] The target behavior is implemented.
- [ ] `./harness/init.sh` ran and passed, and the **Evidence** is recorded in
      `harness/feature_list.json` or `harness/progress.md`.
- [ ] The change stays within the feature's declared scope.
- [ ] The repository remains restartable from the standard startup path.

## Verification Commands

```bash
# Full verification (recommended)
./harness/init.sh

# Structural checks only
node harness/scripts/validate-pack.mjs

# Validate another checkout (e.g. the free edition branch)
node harness/scripts/validate-pack.mjs --target /path/to/other/checkout
```

Required checks:

- `node harness/scripts/validate-pack.mjs` — frontmatter, naming, manifest consistency,
  English-only, README coverage.
- `git diff --check` — whitespace and conflict-marker lint.

## End of Session

Before ending:

1. Update `harness/progress.md` with the current state.
2. Update `harness/feature_list.json` with the new feature status.
3. Record any unresolved risks or blockers in `harness/session-handoff.md`.
4. Commit with a descriptive message once the work is in a safe state.
5. Leave the repo clean enough for the next session to run `./harness/init.sh`
   immediately.

## Escalation

- **Architecture / artifact boundaries**: consult
  `skills/arch-distro-design/SKILL.md` first, otherwise ask the user.
- **Unclear requirements**: re-read the Brief categories in `README.md`, then ask.
- **Repeated verification failures**: record them in `harness/progress.md` and flag for
  human review.
- **Scope ambiguity**: re-read `harness/feature_list.json` for the definition of done.