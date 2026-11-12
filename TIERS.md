# Editions — Free vs Paid

> You are on **`github-free`**, the free edition: all nine skills, frozen at the
> pre-2.0.0 line. The maintained edition lives on the `official-agensi` branch
> and ships through
> [Agensi.io](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness).

This project ships in two editions. They share one codebase and one contract;
they differ in **which version** you get and what comes with it afterwards.

| | **Free** | **Full pack** |
| :--- | :--- | :--- |
| **Where** | GitHub — [`github-free`](https://github.com/ElectroZombie/arch-distro-design/tree/github-free) branch | Agensi.io — [listing](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness) |
| **Price** | Free | **$25** one-time (or $5 per skill) |
| **Skills included** | **All nine** | **All nine** |
| **Version** | The nine skills frozen at the **pre-2.0.0** snapshot (with the broken-reference corrections applied) | **2.0.0** and every release after it |
| **Updates** | None — the snapshot is final | 12 months included; renewal from month 13 |
| **Pitfalls catalog** | As of the snapshot | Grows with every real failure |
| **Security & compatibility fixes** | As of the snapshot | Land with every update |
| **License** | MIT | MIT, no redistribution of the pack as a standalone or competing product |

## The price ladder on Agensi

The harness splits into an **advice** half and an **execution** half. The
advice half is free; the execution half is what you pay for.

| You want | You pay | You get |
| :--- | :--- | :--- |
| The design discipline | **Free** | `arch-distro-design` (router) + `arch-archlinux-pitfalls` (catalog) |
| One execution skill | **$5** | ISO builder, `.img` builder, frozen repo, payload manifest, desktop layers, QEMU gate or hardware gate |
| Everything | **$25** | All nine skills, the current version, and 12 months of updates |

The seven paid skills cost **$35** bought one at a time, so the set is the
better deal the moment you need three of them.

## What the free edition includes

Everything needed to design, build, validate and deploy an Arch ISO or a
persistent `.img` appliance:

| Phase | Skills |
| :--- | :--- |
| Design | `arch-distro-design` |
| Construction | `arch-iso-builder`, `arch-appliance-img`, `arch-frozen-repo` |
| Payload & Desktop | `arch-payload-manifest`, `arch-desktop-layers` |
| Validation | `arch-qemu-validation`, `arch-hardware-handler` |
| Memory | `arch-archlinux-pitfalls` |

Plus the repository harness: `harness/AGENTS.md`, the feature tracker, the
fail-fast validator and `harness/init.sh`.

## What only the paid edition adds

- **Updates.** The free branch is a **snapshot**: it is frozen and will not
  change. The paid edition receives every release — the pitfalls catalog as
  it grows, the security fixes as they land, and archiso compatibility fixes.
- **The 2.0.0 line and beyond** — the editions model, the harness contract
  renames, and every later change.
- **12 months of support** through the creator profile and public issues.

## The shared contract

Both editions use the same six-section skill contract, so an agent that
learns one edition knows the other:

| Section | Purpose |
| :--- | :--- |
| `## Startup Workflow` | The entry path, from precondition to handoff. |
| `## Scope` | What the skill owns — and what it delegates. |
| `## Verification` | A runnable, fail-fast gate with a `✅` marker. |
| `## Definition of Done` | The checklist that closes the skill. |
| `## State & Evidence` | Where the state lives and what evidence to record. |
| `## Handoff` | Which skill runs next, and when. |

## License

MIT for use in your own projects, including commercial use. Redistribution or
resale of the paid pack as a standalone or competing product is not permitted.

**Author:** ElectroZombie — `daphniphyllum901@gmail.com`
· [GitHub](https://github.com/ElectroZombie) ·
[Agensi](https://www.agensi.io/skills/arch-distro-design-iso-appliance-harness)
