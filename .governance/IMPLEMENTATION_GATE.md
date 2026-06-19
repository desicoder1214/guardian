# Guardian Implementation Gate

**Status:** Active  
**Purpose:** Defines the gate that controls when implementation may start.

---

## Authorization Source of Truth

The current implementation gate state is determined exclusively by:

```text
.governance/MILESTONE_AUTHORIZATION.md
```

This file defines gate rules. It does not independently authorize implementation.

---

## Gate Open Condition

The implementation gate is open only when `.governance/MILESTONE_AUTHORIZATION.md` contains:

```text
STATE: IMPLEMENTATION_AUTHORIZED

TOKEN:
PHASE1_IMPLEMENTATION_APPROVED
```

---

## Gate Closed Behavior

When the required token is absent, Codex may only produce:

- repository analysis
- implementation map
- implementation contract table
- risk list
- validation plan
- status report

Codex must not create runtime or source files.

---

## Gate Open Behavior

When the required token is present, Codex may implement only the explicitly authorized milestone scope.

For the current milestone, this means **Phase 1A — Project Foundation Implementation only**.

---

## Prohibited Actions Unless Separately Approved

Even when implementation is authorized, Codex must not:

- commit
- push
- merge
- release
- deploy
- implement out-of-scope features
- introduce Discord runtime unless authorized by a later milestone
- introduce database persistence unless authorized by a later milestone

---

## Failure Handling

If Codex performs unauthorized work:

1. stop immediately
2. report the governance violation
3. list modified files
4. do not continue
5. wait for human instruction

---

## Final Rule

No approval may be inferred.

Every state transition requires explicit authorization.
