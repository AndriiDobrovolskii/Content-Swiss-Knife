## {{T1}} — {{imperative one-line title}}

| | |
|---|---|
| **Track** | {{angular \| server \| prompt}} |
| **Depends on** | {{none \| T0, T2}} |
| **FROZEN (AGENTS.md §9)** | {{no \| src/prompts/task-a.ts — this task MUST stop and request approval before editing it}} |

### What changes

{{Two or three sentences. What this task does, in terms of behaviour, not of edits.}}

### Files

| File | Change |
|---|---|
| `{{src/domain/description-doc.schema.ts}}` | {{create \| modify — one line on what}} |
| `{{…}}` | {{…}} |

### Tests to turn green

These already exist and are **failing** when this task starts — `TEST_WRITING` wrote them.
Turn them green without weakening them (AGENTS.md §7.7).

| Test file | Runner | Covers |
|---|---|---|
| `{{src/render/render-description.spec.ts}}` | `test:logic` | {{AC-1, FR-2}} |
| `{{src/app/components/x/x.component.spec.ts}}` | `test:components` | {{AC-3}} |

{{or: no test — this task changes no behaviour, because {{reason}}}}

### Acceptance check

{{Observable. What a person or a gate sees that proves this task is done. Not "the code
compiles" and not "the Story works".}}

### Notes

{{Anything the builder needs that is not obvious from the plan — an ordering trap, a fixture
that must move with this change, a §4 criterion this must not disturb.}}
