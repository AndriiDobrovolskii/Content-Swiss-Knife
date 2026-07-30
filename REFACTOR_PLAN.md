# REFACTOR_PLAN.md — superseded

This file is a stub. It exists because `CLAUDE.md` and `arch-guard.sh` referenced it for a long
time while it did not exist anywhere in the repository — not on `main`, not on any branch — which
sent every new session hunting for a file that was never there.

**Operational rules and migration strategy both live in [`CLAUDE.md`](./CLAUDE.md).** It is the
authority; nothing here overrides it.

## Where the migration's live state actually is

The Gemini → provider-independent migration is tracked in the code and in PR history, not in a
planning document:

| Question | Where it is answered |
|---|---|
| Architecture rules, frozen files, acceptance criteria | [`CLAUDE.md`](./CLAUDE.md) |
| The `ProductDescriptionDoc` migration (PR-1 → PR-4) | [`test/render-reconciliation.report.md`](./test/render-reconciliation.report.md) |
| Which post-processing transforms survive the renderer | that report, §3 |
| What still blocks the next phase | that report, §5 |
| Known accepted tech debt | [`CLAUDE.md`](./CLAUDE.md), "Known accepted tech debt" |

The PR-1 / PR-2 / PR-3 sequence referenced throughout the reconciliation report is a real, ongoing
numbering — it just never had a plan file behind it.

## If you are about to write a plan here

Don't, unless the team decides to reinstate this file deliberately. A second source of truth that
claims to win on conflict is exactly the failure this stub is cleaning up.
