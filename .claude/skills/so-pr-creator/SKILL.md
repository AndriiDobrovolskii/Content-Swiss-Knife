---
name: so-pr-creator
description: >
  Pushes the Story's branch to origin and opens (or updates) the real GitHub Pull Request,
  using so-pr-preparer's drafted title and body verbatim. Use ONLY when a human gives an
  explicit, separate instruction to open the Pull Request for a Story (e.g. "create the PR for
  US-x.y", "open the PR now") — never in response to a general "advance the story" or a
  /so:next run. Owns the PR_CREATION stage and the pull_request artifact. This is the one
  skill in the workflow permitted to run git push and to call the github MCP server's
  create_pull_request / update_pull_request. It never runs on its own initiative, never
  force-pushes, and never merges.
---

# so-pr-creator

## Purpose

Take the drafted content and make the Pull Request real.

This is the only place in the harness where an action leaves the machine and becomes visible
to other people. Everything about this skill is shaped by that: it does exactly what was
drafted, only when explicitly told, and nothing beyond.

## The trigger — read this before anything else

**This skill never runs on its own initiative.**

- `so-orchestrator`'s continue mode treats reaching `PR_CREATION` as a **stop condition**,
  exactly like `STORY_WRITING`. `/so:next` will not run it.
- Approving `HUMAN_PR_APPROVAL` does **not** carry approval for this.
- Running this does **not** carry approval for `READY_FOR_PR`.

It runs only on a separate, explicit human instruction naming the Story. If you are here
because a pipeline advanced into this stage rather than because a person asked, **stop and
report that**.

## Operational Contract

```
Precondition:     PR_PREPARATION returned PASS; pr_summary exists; a human explicitly asked.
Input Artifacts:  story, pr_summary.
Output Artifacts: pull_request  (docs/pr/{story_id}-pull-request.yaml)
Remote:           origin — github.com/AndriiDobrovolskii/Content-Swiss-Knife
Resolve every artifact path from docs/workflow/artifact-paths.yaml. Never hard-code one.
```

## Steps

### 1. Confirm the instruction and the state

- A human named this Story explicitly, in this turn.
- `pr_summary` exists, is current, and its pre-flight record is complete.
- The working tree is **clean**. Uncommitted changes mean the branch does not represent the
  reviewed work — stop.
- The current branch is the Story's branch, not `main`. Never push from `main`.

### 2. Confirm what will be pushed

Show the user, before pushing:

- the branch name and the target (`main`);
- the commits that will go up — `git log --oneline main..HEAD`;
- the files touched — `git diff --stat main..HEAD`.

If anything in that list was not part of this Story, stop. Pushing is the point of no return
for other people's attention, and an unrelated commit riding along is a §7.8 finding that is
much cheaper to catch now.

### 3. Push

```
git push -u origin <branch>
```

**Never `--force`, never `--force-with-lease`, never `--no-verify`.** If the push is rejected
because the remote has commits you do not, stop and report — do not resolve it by forcing.

### 4. Open or update the Pull Request

Use the `github` MCP server: `create_pull_request`, or `update_pull_request` when one already
exists for this branch.

- Title and body come from `pr_summary` **verbatim**. Do not re-summarise, improve, shorten or
  re-tone them. They were reviewed as written.
- Base `main`, head the Story's branch.
- Never open a draft unless the user asked for a draft.

There is no `.github/pull_request_template.md` in this repository at present; if one is added,
it takes precedence and `so-pr-preparer`'s template is adapted to it rather than ignored here.

### 5. Record it

Write the `pull_request` artifact: the Pull Request number and URL, the branch, the pushed tip
commit SHA, and the timestamp. The tip SHA matters — `COMPLETED`'s approval precondition uses
it to verify the merge against the repository rather than against a human's word
(AGENTS.md §10).

### 6. Stop

Report the URL. Recommend `/so:approve` for `READY_FOR_PR` **only when the human has actually
reviewed the open Pull Request** — opening it is not reviewing it.

## Result Envelope

`stage: PR_CREATION`, `skill: so-pr-creator`. The single key is `changes_required` →
`PR_PREPARATION`, for when the drafted content cannot be used as-is.

## Constraints

- **Never run on your own initiative** — a separate explicit human instruction, every time.
- **Never force-push**, in any form.
- **Never merge** a Pull Request. Merging stays a human action outside the harness.
- Never close, reopen or re-target someone else's Pull Request.
- Never edit the drafted title or body.
- Never push from `main`, and never push a dirty tree.
- Never create the branch or the commits — those exist already, from the build phase.
- Never add a reviewer, label or milestone unless the user asked.
- Never write a secret into the Pull Request body — check the drafted content before posting,
  since posting is publication.
- English in the Pull Request and the artifact; Ukrainian to the user.

## Verification Checklist

- [ ] A human explicitly asked for this Story's Pull Request in this turn.
- [ ] The workflow did not arrive here on its own.
- [ ] Working tree clean; current branch is not `main`.
- [ ] The commit list and file list were shown to the user before pushing.
- [ ] Nothing unrelated to this Story is in the push.
- [ ] Push used no force flag and no `--no-verify`.
- [ ] Title and body are `pr_summary`'s, verbatim.
- [ ] The drafted body contains no secret.
- [ ] `pull_request` records number, URL, branch and **tip commit SHA**.
- [ ] Nothing was merged.
- [ ] The report does not imply `READY_FOR_PR` is satisfied by opening the Pull Request.
