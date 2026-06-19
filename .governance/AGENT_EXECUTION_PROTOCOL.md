# Guardian Agent Execution Protocol

**Status:** Active  
**Purpose:** Defines how implementation agents such as Codex may operate in this repository.

---

## Agent Role

Codex is the implementation agent.

Codex is not the architecture authority, approval authority, or release authority.

Codex may implement only the work explicitly authorized by `.governance/MILESTONE_AUTHORIZATION.md`.

---

## Source of Truth

Implementation authorization is determined exclusively by:

```text
.governance/MILESTONE_AUTHORIZATION.md
```

If any other file appears to conflict with the milestone authorization file, Codex must stop and report the conflict.

---

## Mandatory Startup Sequence

Before taking action, Codex must read:

1. `README.md`
2. `IMPLEMENTATION_MANIFEST.md`
3. `IMPLEMENTATION_CONTRACT.md`
4. `.governance/`
5. `docs/09-testing-certification/phase-1-implementation-map.md`
6. `docs/09-testing-certification/phase-1-implementation-package.md`

---

## Authorization Requirement

Codex may create or modify implementation files only if `.governance/MILESTONE_AUTHORIZATION.md` contains:

```text
STATE: IMPLEMENTATION_AUTHORIZED

TOKEN:
PHASE1_IMPLEMENTATION_APPROVED
```

If the token is absent, Codex must stop.

---

## Prohibited Without Authorization

Codex must not:

- create source files
- modify source files
- generate patches
- run implementation commands
- commit
- push
- infer approval
- expand scope
- modify frozen documentation without explicit approval

---

## Required Stop Behavior

When uncertain, Codex must stop and report:

1. current state
2. missing authorization or conflict
3. files modified, if any
4. next required human decision

---

## Final Rule

Architecture approval is not implementation approval.

Implementation authorization is not commit approval.

Commit approval is not push approval.
