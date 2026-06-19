# Guardian Document Traceability Matrix

## Purpose

Maps every implementation artifact to governance, architecture, threat model, contracts, tests, certification evidence, and release authorization.

This document supports, but does not override:

- `docs/00-governance/GOVERNANCE_HIERARCHY.md`
- `docs/00-governance/SOURCE_OF_TRUTH_MATRIX.md`
- `docs/00-governance/PROJECT_LIFECYCLE.md`

## Traceability Chain

Governance Hierarchy
→ Source of Truth Matrix
→ Project Lifecycle
→ Mission
→ Scope Boundaries
→ Architecture
→ Threat Model
→ System Contract
→ Data Model
→ Security Kernel Contract
→ Implementation Contract
→ Testing Contract
→ Implementation Map
→ Milestone Authorization
→ Implementation
→ Tests
→ Live Drills
→ Certification
→ Release Authorization

## Required Traceability Columns

Every planned or implemented feature must trace through:

| Trace Item | Required Evidence |
|---|---|
| Mission alignment | Link to mission, north star, or executive principle |
| Scope authorization | Link to scope boundary or anti-drift ledger entry |
| Architecture source | Link to architecture document |
| Threat model source | Link to threat model scenario or risk |
| Contract source | Link to system/security/implementation contract |
| Data model source | Link to data model when persistence is involved |
| Test requirement | Link to test contract |
| Implementation authorization | Link to milestone authorization/gate when present |
| Certification evidence | Link to certification matrix, live drill, or release checklist |

## Rule

No feature may be implemented without full traceability.

No missing traceability item may be filled by assumption.

If traceability is incomplete, mark the item as `Needs clarification` or `Blocked` and request architect review.
