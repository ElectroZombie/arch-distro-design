# Session Handoff

**Last Updated:** 2026-11-11
**Current Objective:** Keep the free edition healthy and frozen at the pre-2.0.0 line.
**Recommended Next Step:** Run `./harness/init.sh`, confirm every check passes, then commit any documentation fix.

## Blockers

- None.

## Files

- `harness/AGENTS.md` — agent instructions, invariants, definition of done.
- `harness/feature_list.json` — feature state tracker (source of truth).
- `harness/progress.md` — session continuity log.
- `harness/init.sh` — startup and verification entrypoint.
- `harness/scripts/validate-pack.mjs` — structural checks for the skill pack.

## Next Session

1. Run `pwd` and confirm you are at the repository root.
2. Run `./harness/init.sh` and confirm a clean pass.
3. Read `harness/feature_list.json`; this branch is frozen — take only
   documentation or bug fixes here.
4. Feature work belongs on `official-agensi`, the maintained edition.
5. Update this file and `harness/progress.md` before ending.
