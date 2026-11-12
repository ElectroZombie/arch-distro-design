# AGENTS.md — pointer

**The repository harness lives in [`harness/`](./harness/).** This file exists
so agents that auto-load `AGENTS.md` from the repository root find the real
instructions instead of nothing.

| File | Role |
| :--- | :--- |
| [`harness/AGENTS.md`](./harness/AGENTS.md) | Startup workflow, repo invariants, working rules, definition of done |
| [`harness/feature_list.json`](./harness/feature_list.json) | Feature state tracker (source of truth) |
| [`harness/progress.md`](./harness/progress.md) | Session continuity log |
| [`harness/session-handoff.md`](./harness/session-handoff.md) | Handoff template for multi-session work |
| [`harness/init.sh`](./harness/init.sh) | Startup and verification entrypoint |
| [`harness/scripts/validate-pack.mjs`](./harness/scripts/validate-pack.mjs) | Dependency-free structural checks |

**Start here:**

```bash
./harness/init.sh          # verify the pack
cat harness/AGENTS.md      # then read the real instructions
```

This branch is the **free edition** — all nine skills, frozen at the pre-2.0.0
line. Feature work belongs on `official-agensi`, the maintained edition.
