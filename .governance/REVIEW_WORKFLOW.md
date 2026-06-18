# Guardian Review Workflow

**Version:** 1.0.0
**Status:** Active
**Owner:** Guardian Architecture Authority

---

# Purpose

This document defines the mandatory review workflow for all Guardian implementation activities.

Its purpose is to ensure implementation follows the approved repository contracts, governance model, and milestone boundaries.

No implementation may bypass this workflow.

---

# Workflow Principles

Guardian follows a contract-driven, architecture-first implementation process.

The workflow separates:

* Architecture
* Planning
* Authorization
* Implementation
* Validation
* Review
* Git Operations

Each stage requires explicit completion before proceeding.

---

# Standard Workflow

```text
Repository Review
        │
        ▼
Governance Review
        │
        ▼
Repository Analysis
        │
        ▼
Implementation Planning
        │
        ▼
Implementation Map
        │
        ▼
Implementation Contract Table
        │
        ▼
Architecture Review
        │
        ▼
Implementation Authorization
        │
        ▼
Patch Generation
        │
        ▼
Patch Review
        │
        ▼
Patch Application
        │
        ▼
Validation
        │
        ▼
Phase Completion Report
        │
        ▼
git status
        │
        ▼
git diff
        │
        ▼
Independent Architecture Review
        │
        ▼
Commit Approval
        │
        ▼
Commit
        │
        ▼
Push
        │
        ▼
Next Milestone
```

---

# Stage 1 — Repository Review

The implementation agent shall read:

* README.md
* IMPLEMENTATION_MANIFEST.md
* `.governance/`
* `docs/`

Required output:

* Repository summary
* Current milestone
* Active governance version
* Current authorization state
* Current implementation state

No repository changes are permitted.

---

# Stage 2 — Governance Review

The implementation agent shall verify:

* execution protocol
* implementation gate
* milestone authorization
* review workflow
* architect checklist
* phase completion template

If governance documents conflict:

STOP.

Report the conflict.

---

# Stage 3 — Repository Analysis

Required deliverables:

* repository inventory
* contracts discovered
* implementation readiness
* implementation risks
* contract traceability strategy

---

# Stage 4 — Implementation Planning

Deliverables:

* implementation scope
* implementation phases
* build order
* dependency graph
* validation strategy

No files may be created.

---

# Stage 5 — Implementation Map

Deliverables:

* folder tree
* file tree
* module boundaries
* dependency relationships

No implementation is permitted.

---

# Stage 6 — Implementation Contract Table

For every planned file provide:

* file path
* purpose
* repository document
* governing contract
* dependencies
* planned tests
* validation strategy

Wait for approval.

---

# Stage 7 — Architecture Review

Architecture reviewer verifies:

* repository alignment
* milestone alignment
* contract alignment
* implementation boundaries
* traceability
* risks

Possible outcomes:

* APPROVED
* APPROVED WITH CONDITIONS
* REJECTED
* NOT VERIFIED

Architecture approval alone does not authorize implementation.

---

# Stage 8 — Implementation Authorization

Implementation begins only when:

* milestone is authorized
* implementation gate is open
* authorization token exists

Required token:

```text
STATE: IMPLEMENTATION_AUTHORIZED

TOKEN:
PHASE1_IMPLEMENTATION_APPROVED
```

Without the token:

STOP.

---

# Stage 9 — Patch Generation

Permitted activities:

* source code generation
* test generation
* implementation patch generation

Not permitted:

* automatic patch application
* automatic commit
* automatic push

---

# Stage 10 — Patch Review

Reviewer verifies:

* scope
* contracts
* dependencies
* code organization
* architectural consistency

Only approved patches may be applied.

---

# Stage 11 — Validation

Execute:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
```

If execution is impossible:

Mark:

```text
NOT VERIFIED
```

Explain why.

Never fabricate validation.

---

# Stage 12 — Phase Completion Report

Generate the Phase Completion Report.

Include:

* completed scope
* files created
* files modified
* contracts satisfied
* tests
* validation
* risks
* deferred work

---

# Stage 13 — Git Review

Provide:

```bash
git status

git diff
```

Reviewer confirms:

* expected files only
* no unrelated changes
* no frozen documentation modified
* traceability updated

---

# Stage 14 — Commit Approval

Commit requires explicit human approval.

Architecture approval is insufficient.

Implementation approval is insufficient.

Validation completion is insufficient.

---

# Stage 15 — Push Approval

Push requires explicit human approval.

Codex shall never infer push authorization.

---

# Failure Handling

If any stage is skipped:

1. Stop.
2. Report the skipped stage.
3. Report repository status.
4. Report modified files.
5. Wait for instruction.

---

# Repository Rules

Implementation shall never:

* redesign architecture
* expand milestone scope
* modify frozen documentation
* bypass contracts
* bypass governance
* bypass review

---

# Final Rule

Every implementation phase shall begin at Repository Review.

Every implementation phase shall end at Push.

No stage may be skipped.

No approval may be inferred.

When uncertain:

STOP.
