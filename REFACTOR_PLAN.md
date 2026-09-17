# REFACTOR_PLAN.md — superseded

This file is a stub. It exists because `CLAUDE.md` and `arch-guard.sh` referenced it for a long
time while it did not exist anywhere in the repository — not on `main`, not on any branch — which
sent every new session hunting for a file that was never there.

**Operational rules and migration strategy both live in [`AGENTS.md`](./AGENTS.md).** It is the
authority; nothing here overrides it. (`CLAUDE.md` is now a three-line pointer to the same
file — the content moved there in bootstrap phase P0.)

## Where the migration's live state actually is

The Gemini → provider-independent migration is tracked in the code and in PR history, not in a
planning document:

| Question | Where it is answered |
|---|---|
| Architecture rules, frozen files, acceptance criteria | [`AGENTS.md`](./AGENTS.md) |
| The `ProductDescriptionDoc` migration (PR-1 → PR-4) | [`test/render-reconciliation.report.md`](./test/render-reconciliation.report.md) |
| Which post-processing transforms survive the renderer | that report, §3 |
| What still blocks the next phase | that report, §5 |
| Known accepted tech debt | [`AGENTS.md`](./AGENTS.md) §3, "Known accepted tech debt" |

The PR-1 / PR-2 / PR-3 sequence referenced throughout the reconciliation report is a real, ongoing
numbering — it just never had a plan file behind it.

## If you are about to write a plan here

Don't, unless the team decides to reinstate this file deliberately. A second source of truth that
claims to win on conflict is exactly the failure this stub is cleaning up.
