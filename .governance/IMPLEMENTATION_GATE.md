# Guardian Implementation Gate

**Version:** 1.0.0  
**Status:** Active  
**Owner:** Guardian Architecture Authority  
**Applies To:** All implementation agents (Codex, GPT, Claude, human contributors)

---

# Purpose

The Implementation Gate defines the mandatory authorization requirements that must be satisfied before any implementation work begins.

Its purpose is to prevent:

- unauthorized implementation
- architectural drift
- scope expansion
- premature code generation
- undocumented repository modifications

This document governs **when implementation may begin**.

It does **not** govern architecture.

Architecture is governed by the repository documentation.

---

# Repository Authority

Implementation shall follow the repository in the following order of precedence:

1. Repository contracts (`docs/`)
2. Repository governance (`.governance/`)
3. Current implementation state (`IMPLEMENTATION_MANIFEST.md`)
4. Current milestone authorization
5. Human approval

If any conflict exists, implementation shall stop until resolved.

---

# Current Gate Status

The implementation gate has only two states.

## CLOSED

Implementation is prohibited.

Allowed activities:

- repository analysis
- documentation review
- architecture review
- implementation planning
- implementation map generation
- implementation contract generation
- risk analysis
- repository reporting

Prohibited activities:

- create files
- modify files
- delete files
- generate source code
- generate repository patches
- execute build commands
- execute tests
- commit
- push

---

## OPEN

Implementation is permitted only after all authorization requirements have been satisfied.

---

# Opening the Gate

The implementation gate may only be opened when **all** of the following are true.

## Repository Review

Completed.

## Governance Review

Completed.

## Architecture Review

Approved.

## Implementation Map

Approved.

## Implementation Contract

Approved.

## Milestone Authorization

Approved.

## Authorization Token

Present.

---

# Required Authorization Token

Implementation may begin only when the following token exists inside
`.governance/MILESTONE_AUTHORIZATION.md`.

```text
STATE: IMPLEMENTATION_AUTHORIZED

TOKEN:
PHASE1_IMPLEMENTATION_APPROVED
```

No implied approval is valid.

Natural language approval is not valid.

Only the authorization token opens the implementation gate.

---

# Responsibilities

## ChatGPT

Responsible for:

- architecture
- contracts
- governance
- review
- certification

ChatGPT does not authorize implementation automatically.

---

## Codex

Responsible for:

- implementation
- testing
- validation

Codex shall never:

- redesign architecture
- infer approval
- expand milestone scope
- commit automatically
- push automatically

---

## Human Maintainer

Responsible for:

- implementation approval
- commit approval
- merge approval
- release approval

---

# Allowed Output While Closed

When the gate is closed, implementation agents may produce only:

- repository analysis
- implementation map
- implementation contract table
- architecture review
- repository report
- validation report
- risk report

No repository modification is permitted.

---

# Prohibited Actions

While the gate is closed the implementation agent shall never:

- create files
- modify files
- delete files
- rename files
- generate patches
- apply patches
- execute build commands
- execute validation
- commit
- push
- merge

---

# Failure Conditions

The implementation gate is considered violated if an implementation agent:

- generates source code
- creates repository files
- modifies repository files
- generates a repository patch
- commits changes
- pushes changes
- expands milestone scope
- modifies frozen documentation

---

# Failure Response

If a violation occurs the implementation agent shall:

1. Stop immediately.
2. Report the violation.
3. Report modified files.
4. Report whether a patch exists.
5. Wait for further instruction.

---

# Closing the Gate

The implementation gate automatically closes after:

- implementation completion
- validation
- architecture review

The next phase requires a new authorization.

Implementation authorization never carries over to another milestone.

---

# Relationship to Other Governance Documents

This document shall be read together with:

- IMPLEMENTATION_MANIFEST.md
- AGENT_EXECUTION_PROTOCOL.md
- MILESTONE_AUTHORIZATION.md
- REVIEW_WORKFLOW.md
- ARCHITECT_REVIEW_CHECKLIST.md
- PHASE_COMPLETION_TEMPLATE.md

---

# Final Rule

When uncertain:

STOP.

Do not infer approval.

Do not infer authorization.

Do not generate code.

Do not modify the repository.

Wait for explicit human instruction.