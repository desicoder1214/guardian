# Guardian Review Workflow

**Status:** Active  
**Purpose:** Defines the required review workflow for Guardian implementation.

---

## Workflow

```text
Repository Review
↓
Governance Review
↓
Implementation Contract Review
↓
Milestone Authorization Check
↓
Implementation
↓
Validation
↓
Phase Completion Report
↓
git status
↓
git diff
↓
Independent Architecture Review
↓
Human Commit Approval
↓
Commit
↓
Human Push Approval
↓
Push
```

---

## Authorization Rule

Implementation may begin only when `.governance/MILESTONE_AUTHORIZATION.md` contains the required state and token.

---

## Validation Rule

After implementation, Codex must run the required validation commands or mark them `NOT VERIFIED` with reasons.

---

## Commit Rule

Codex must not commit without explicit human approval.

---

## Push Rule

Codex must not push without explicit human approval.

---

## Failure Handling

If any workflow stage is skipped, Codex must stop and report the skipped stage.

---

## Final Rule

Implementation approval does not equal commit approval.

Commit approval does not equal push approval.
