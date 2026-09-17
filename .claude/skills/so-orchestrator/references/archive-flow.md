# Archive Flow (`/so:archive`)

Consolidate a completed delivery and release the active slot.

## Preconditions — all required

- `workflow-state.yaml.current_stage` is `COMPLETED`.
- That `COMPLETED` gate was approved, and its `approval_precondition` was genuinely satisfied
  — the Pull Request was **verified merged against the repository**, not accepted on a
  human's statement.
- This command was invoked explicitly by a human.

**Never infer archiving from a merged Pull Request.** A merge is evidence for the `COMPLETED`
gate, not authority to archive. If any precondition fails, refuse and report which one.

## Steps

1. **Write the delivery summary** at the `delivery_summary` path resolved from
   `artifact-paths.yaml`. It records what was delivered, the acceptance criteria and how each
   was proven, the gate results, and any Open Decisions that were resolved along the way (and
   any that were deferred, with why).

2. **Update `project-state.md`** (`project_state` in the registry) with the capability this
   delivery added.

3. **Propose, do not apply,** any update this delivery implies to `AGENTS.md` or to the
   repository's other standing documents. Present the proposed wording and wait.
   **Never edit `AGENTS.md`** — `AGENTS.md` §7.8 forbids it without explicit human sign-off,
   and that includes this skill.

4. **Set the catalog state** to `ARCHIVED` in `docs/catalog/stories.yaml`.

5. **Preserve every historical artifact in place.** Do not move, rename or delete anything.
   Archived is a status, not a directory. Set `status: ARCHIVED` in the front matter of the
   Story's artifacts.

6. **Clear `active-story.yaml`** (back to the idle shape) and set
   `workflow-state.yaml.current_stage` to `ARCHIVED` with `status: ARCHIVED` — **only after**
   the delivery summary is written. If step 1 failed, nothing else happens.

7. **Append exactly one** `history.jsonl` event for the transition to `ARCHIVED`.

## Constraints

- Never merge a Pull Request.
- Never write to a remote. Any GitHub write needs separate, explicit human approval.
- Never delete or rewrite history, artifacts, or `history.jsonl`.
- Never edit `AGENTS.md` (step 3).

## The Archive Result

```
Archived:   US-1.2 — Dark mode for the editor
Summary:    docs/knowledge/US-1.2-delivery-summary.md
Updated:    docs/knowledge/project-state.md
            docs/catalog/stories.yaml         → ARCHIVED

Proposed for your approval (NOT applied):
  - AGENTS.md §5: note the new component-test helper convention

Active slot: released. No Story is active.
Next:  /so:new  or  /so:start <StoryId>
```
