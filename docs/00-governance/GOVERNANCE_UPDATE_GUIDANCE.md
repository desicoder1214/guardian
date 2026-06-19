# Guardian Governance Update Guidance

**Project:** Guardian  
**Version:** 1.0.0  
**Status:** ACTIVE  
**Purpose:** Integration guidance for the governance hierarchy, source-of-truth matrix, and project lifecycle documents.

---

## What Was Added

The governance layer now includes three enterprise control documents:

1. `docs/00-governance/GOVERNANCE_HIERARCHY.md`
2. `docs/00-governance/SOURCE_OF_TRUTH_MATRIX.md`
3. `docs/00-governance/PROJECT_LIFECYCLE.md`

These documents are supported by this guidance file.

---

## Why These Documents Exist

Guardian is a security-critical, AI-assisted, contract-driven platform.

Without explicit governance precedence, different agents may interpret documentation differently and accidentally:

- Treat planning approval as implementation approval.
- Use an implementation map as a source of truth.
- Override architecture with implementation convenience.
- Start coding before milestone authorization.
- Expand scope beyond the approved security-kernel roadmap.
- Certify incomplete work without evidence.

The new governance documents remove that ambiguity.

---

## Required Operating Model

Guardian must now operate under this model:

Mission  
→ Scope  
→ Architecture  
→ Threat Model  
→ Contracts  
→ Data Model  
→ Security Kernel Contracts  
→ Implementation Contracts  
→ Testing Contracts  
→ Implementation Planning  
→ Milestone Authorization  
→ Implementation  
→ Validation  
→ Live Drills  
→ Certification  
→ Release Authorization

No stage may be skipped.

---

## How To Use The New Governance Files

### 1. Before Reviewing Any Change

Read:

- `docs/00-governance/GOVERNANCE_HIERARCHY.md`
- `docs/00-governance/SOURCE_OF_TRUTH_MATRIX.md`
- `docs/00-governance/PROJECT_LIFECYCLE.md`

Then determine:

- What lifecycle stage the repository is in.
- Which document owns the decision being changed.
- Whether implementation is authorized.
- Whether the change is documentation-only or runtime behavior.

---

### 2. Before Giving Work To Codex, Copilot, Claude, GPT, Or Another Agent

Every prompt should include:

```text
You must follow:
- docs/00-governance/GOVERNANCE_HIERARCHY.md
- docs/00-governance/SOURCE_OF_TRUTH_MATRIX.md
- docs/00-governance/PROJECT_LIFECYCLE.md

If implementation is not explicitly authorized by the milestone authorization and implementation gate, do not generate runtime code.
Planning approval is not implementation approval.
Implementation maps are not authorization documents.
If a needed behavior is missing from contracts, document the gap instead of inventing behavior.
```

---

### 3. Before Implementation Begins

Confirm all of the following:

- Governance hierarchy is approved.
- Source-of-truth matrix is approved.
- Project lifecycle stage permits implementation.
- Architecture is frozen or explicitly approved for the milestone.
- Implementation contract is approved.
- Phase implementation map is approved as a planning artifact.
- Milestone authorization explicitly says implementation is authorized.
- Implementation gate is open.
- Required authorization token is present.
- Allowed files and prohibited files are listed.
- Test requirements are defined before code starts.

If any item is missing, implementation must not begin.

---

### 4. During Implementation

Implementation agents must:

- Work only inside the authorized scope.
- Avoid architecture redesign.
- Preserve security-kernel priority.
- Preserve module boundaries.
- Maintain traceability to source documents.
- Add or update tests required by testing contracts.
- Document any discovered contract gap.
- Stop if required behavior is not defined.

Implementation agents must not:

- Add optional modules that block the kernel.
- Add runtime behavior not tied to contracts.
- Change authorization files without explicit human approval.
- Treat passing tests as certification.
- Treat local success as release readiness.

---

### 5. During Review

Architect review must check:

- Governance hierarchy compliance.
- Source-of-truth compliance.
- Lifecycle-stage compliance.
- Scope compliance.
- Contract traceability.
- Test evidence.
- Security-kernel isolation.
- Risk and open question handling.
- No unauthorized runtime work.
- No silent scope expansion.

---

### 6. During Certification

Certification must prove:

- Required tests passed.
- Security-critical behavior is validated.
- Live drills passed where required.
- Red-team scenarios are covered where required.
- Forensic evidence is complete.
- Recovery behavior is validated.
- Performance SLOs are measured.
- Release checklist is complete.

Certification cannot be replaced by agent claims.

---

## Documents Updated By This Governance Patch

This governance patch adds:

- `docs/00-governance/GOVERNANCE_HIERARCHY.md`
- `docs/00-governance/SOURCE_OF_TRUTH_MATRIX.md`
- `docs/00-governance/PROJECT_LIFECYCLE.md`
- `docs/00-governance/GOVERNANCE_UPDATE_GUIDANCE.md`

This governance patch updates:

- `docs/README.md`
- `docs/00-governance/document-traceability-matrix.md`
- `docs/09-testing-certification/implementation-readiness-checklist.md`
- `docs/09-testing-certification/phase-1-implementation-map.md`

---

## Current Recommended Repository Status After This Patch

```text
Governance hierarchy: PRESENT
Source-of-truth matrix: PRESENT
Project lifecycle: PRESENT
Implementation map: PRESENT
Implementation authorized: NO
Code generated: NO
Runtime drift: NO
Next required action: HUMAN REVIEW OF GOVERNANCE PATCH
```

---

## Recommended Next Human Decision

After reviewing this patch, the architect should decide one of the following:

### Option A — Approve Governance Patch Only

Use when the repository should remain documentation-only.

Result:

```text
Governance patch: APPROVED
Implementation authorized: NO
Next action: architecture freeze or implementation contract review
```

### Option B — Request Corrections

Use when document hierarchy, ownership, or lifecycle stage language needs changes.

Result:

```text
Governance patch: REQUIRES CHANGES
Implementation authorized: NO
Next action: revise governance documents
```

### Option C — Proceed Toward Implementation Authorization

Use only after governance, architecture, contracts, implementation map, and risk review are accepted.

Result:

```text
Governance patch: APPROVED
Implementation map: APPROVED
Implementation authorized: PENDING EXPLICIT MILESTONE AUTHORIZATION
Next action: update implementation manifest and milestone authorization through human approval
```

---

## Final Rule

This governance patch strengthens planning and review.

It does not authorize implementation.

It does not authorize production code.

It does not authorize runtime files.

It does not authorize Discord bot behavior.

Implementation remains blocked until explicit milestone authorization opens the implementation gate.
