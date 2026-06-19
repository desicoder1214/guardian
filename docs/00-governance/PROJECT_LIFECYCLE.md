# Guardian Project Lifecycle

**Project:** Guardian  
**Version:** 1.0.0  
**Status:** ACTIVE  
**Owner:** Guardian Architecture Authority

---

## Purpose

This document defines the mandatory lifecycle for Guardian development from mission definition through release certification.

Guardian is a security-critical, contract-driven, AI-assisted platform. Development must follow formal stage gates to prevent scope drift, unsafe implementation, missing test evidence, and premature release.

---

## Lifecycle Principle

No stage may begin until the previous required stage is complete and approved.

No AI agent, implementation agent, contributor, prompt, or planning artifact may skip stages.

No implementation may begin until implementation authorization is explicitly granted.

No release may occur until certification is complete.

---

## Stage 0 — Vision

### Purpose

Define the product mission and long-term strategic objective.

### Required Deliverables

- Repository README
- `docs/00-governance/north-star.md`
- `docs/00-governance/executive-principles.md`

### Exit Criteria

- Mission is clear.
- Security-first objective is explicit.
- Out-of-scope product direction is not mixed into the mission.

### Allowed Work

- Mission documentation
- Executive principles
- Product scope framing

### Prohibited Work

- Runtime implementation
- Production code
- Feature implementation

---

## Stage 1 — Scope and Governance Foundation

### Purpose

Define what Guardian is allowed to become and how governance controls future work.

### Required Deliverables

- `docs/00-governance/scope-boundaries.md`
- `docs/00-governance/GOVERNANCE_HIERARCHY.md`
- `docs/00-governance/SOURCE_OF_TRUTH_MATRIX.md`
- `docs/00-governance/PROJECT_LIFECYCLE.md`
- `docs/00-governance/document-traceability-matrix.md`
- `docs/03-contracts/anti-drift-feature-ledger.md`

### Exit Criteria

- Governance hierarchy is defined.
- Source-of-truth ownership is defined.
- Lifecycle stage gates are defined.
- Scope boundaries are clear.
- Anti-drift controls exist.

### Allowed Work

- Governance documentation
- Scope documentation
- Traceability planning

### Prohibited Work

- Runtime implementation
- Product module implementation
- Authorization bypasses

---

## Stage 2 — Architecture

### Purpose

Define the enterprise architecture and system design before implementation planning.

### Required Deliverables

- `docs/01-architecture/executive-architecture-contract.md`
- `docs/01-architecture/high-level-architecture.md`
- `docs/01-architecture/module-boundary-contract.md`

### Exit Criteria

- Security kernel architecture is clear.
- Module boundaries are clear.
- Optional modules cannot block security-critical work.
- Multi-guild SaaS direction is documented.
- Architecture aligns with mission and scope boundaries.

### Allowed Work

- Architecture documentation
- Architecture diagrams in document form
- Boundary definitions

### Prohibited Work

- Runtime source code
- Scaffolding disguised as architecture
- Implementation shortcuts

---

## Stage 3 — Threat Model

### Purpose

Define the adversary model, abuse paths, trust boundaries, and security assumptions.

### Required Deliverables

- `docs/02-threat-model/threat-model.md`

### Exit Criteria

- Rogue admin scenarios are covered.
- Unauthorized bot scenarios are covered.
- Webhook and integration compromise paths are covered.
- Dangerous role and escalation paths are covered.
- Recovery and forensic assumptions are clear.

### Allowed Work

- Threat modeling
- Attack-path documentation
- Risk classification

### Prohibited Work

- Detector implementation
- Punishment implementation
- Runtime mitigation code

---

## Stage 4 — Contract Definition

### Purpose

Translate architecture and threat model into authoritative system contracts.

### Required Deliverables

- `docs/03-contracts/system-contract-register.md`
- `docs/04-data-model/`
- `docs/05-security-kernel/`
- `docs/06-implementation/`
- `docs/07-testing/`

### Exit Criteria

- All major security systems have contracts.
- Data model expectations are defined.
- Implementation boundaries are defined.
- Testing expectations are defined.
- Contract register maps the major systems.

### Allowed Work

- Contract writing
- Data model planning
- Test contract planning
- Validation requirement definition

### Prohibited Work

- Runtime implementation
- Production source files
- Placeholder code

---

## Stage 5 — Architecture Freeze

### Purpose

Stabilize architecture and contracts before implementation planning.

### Required Deliverables

- Architecture review decision
- Contract review decision
- Open-risk list
- Explicit freeze status

### Exit Criteria

- Architecture is approved.
- Threat model is approved.
- System contracts are approved.
- Security-kernel contracts are approved.
- Testing contracts are approved.
- Known gaps are documented.

### Allowed Work

- Final documentation corrections
- Risk documentation
- Gap documentation

### Prohibited Work

- Runtime implementation
- New feature expansion
- Silent contract changes

---

## Stage 6 — Implementation Planning

### Purpose

Create a strict implementation plan without writing production code.

### Required Deliverables

- `docs/08-build-execution/implementation-roadmap.md`
- `docs/08-build-execution/milestone-plan.md`
- `docs/09-testing-certification/phase-1-implementation-map.md`
- Traceability matrix
- Validation gates before code

### Exit Criteria

- Phase scope is clear.
- Future file tree is planned.
- Required tests are planned.
- Contract references are mapped.
- Open questions are listed.
- Implementation remains unauthorized unless a later milestone explicitly opens the gate.

### Allowed Work

- Documentation-only planning
- File-by-file implementation mapping
- Test planning
- Risk planning

### Prohibited Work

- Runtime code
- Source tree creation for production modules
- Discord client code
- Services, workers, handlers, database code, commands, or detectors

---

## Stage 7 — Human Architect Review

### Purpose

Review implementation planning and decide whether it is ready for authorization.

### Required Deliverables

- Architect review result
- Risk review result
- Gap review result
- Approval or rejection decision

### Exit Criteria

- Planning map is approved or rejected.
- Gaps are accepted, rejected, or converted into required contract updates.
- No ambiguity remains for the next milestone.

### Allowed Work

- Review
- Documentation correction
- Risk classification

### Prohibited Work

- Implementation without authorization
- Gate modification without explicit approval

---

## Stage 8 — Implementation Authorization

### Purpose

Explicitly open implementation for a defined milestone and scope.

### Required Deliverables

- Updated `IMPLEMENTATION_MANIFEST.md` when present
- Updated `.governance/MILESTONE_AUTHORIZATION.md` when present
- Updated `.governance/IMPLEMENTATION_GATE.md` when present
- Approved `IMPLEMENTATION_CONTRACT.md` when present
- Required authorization token

### Exit Criteria

- Implementation state explicitly says implementation is authorized.
- Authorized files and directories are defined.
- Prohibited work is defined.
- Patch generation permission is defined.
- Commit permission is defined.
- Validation gates are defined.

### Allowed Work

- Authorization document updates by approved human/architect process

### Prohibited Work

- Agent self-authorization
- Broad unrestricted implementation
- Silent scope expansion

---

## Stage 9 — Implementation

### Purpose

Build only the authorized milestone scope.

### Required Deliverables

- Authorized production source code
- Authorized tests
- Traceability updates
- Implementation evidence
- Validation output

### Exit Criteria

- All authorized deliverables are complete.
- All required tests pass.
- No out-of-scope implementation exists.
- No governance drift exists.
- Security-kernel priority is preserved.

### Allowed Work

- Production code within authorized scope
- Tests within authorized scope
- Required documentation updates driven by implementation

### Prohibited Work

- Architecture redesign
- Unauthorized features
- Optional modules blocking the kernel
- Missing tests for security-critical behavior
- Runtime behavior not tied to contracts

---

## Stage 10 — Validation

### Purpose

Prove the implementation satisfies contracts.

### Required Deliverables

- Unit test results
- Integration test results
- Simulator test results
- Regression test results
- Performance test results
- Security test results
- Traceability evidence

### Exit Criteria

- Required tests pass.
- Known failures are documented.
- Security-critical behavior is validated.
- Performance SLOs are measured.
- Evidence is reproducible.

### Allowed Work

- Test execution
- Test fixes within authorized scope
- Evidence collection

### Prohibited Work

- Certifying untested behavior
- Ignoring failed tests
- Replacing live-drill requirements with ordinary unit tests

---

## Stage 11 — Live Drill and Red-Team Certification

### Purpose

Validate Guardian against destructive, adversarial, and abuse-driven scenarios.

### Required Deliverables

- Live drill evidence
- Red-team evidence
- Unauthorized bot drill evidence
- Webhook compromise drill evidence
- Recovery drill evidence
- Forensic review evidence

### Exit Criteria

- Live-drill scenarios pass or failures are documented.
- Evidence is reviewable.
- Failures create follow-up work.
- Certification decision is made.

### Allowed Work

- Controlled destructive testing
- Evidence capture
- Drill review

### Prohibited Work

- Running unapproved destructive tests in production
- Claiming certification without evidence

---

## Stage 12 — Phase Review

### Purpose

Determine whether the milestone is complete.

### Required Deliverables

- Phase completion report
- Scope compliance review
- Test evidence summary
- Risk review
- Architect decision

### Exit Criteria

- Completed work matches authorized scope.
- Out-of-scope work is absent or remediated.
- Required evidence exists.
- Open risks are accepted or blocked.

### Allowed Work

- Review
- Documentation updates
- Remediation planning

### Prohibited Work

- Proceeding to release without certification

---

## Stage 13 — Release Authorization

### Purpose

Approve production release or version tagging.

### Required Deliverables

- Release certification checklist
- Enterprise readiness decision
- Security certification decision
- Release notes
- Version tag plan
- Deployment approval

### Exit Criteria

- Production readiness is certified.
- Security certification is complete.
- Release risks are accepted.
- Version and deployment are approved.

### Allowed Work

- Release packaging
- Version tagging
- Deployment preparation

### Prohibited Work

- Release without certification
- Release with unresolved critical security failures

---

## Stage 14 — Operations and Continuous Governance

### Purpose

Operate Guardian safely and feed production evidence back into governance.

### Required Deliverables

- Incident reports
- Runbook updates
- Regression tickets
- Contract updates when behavior changes
- Post-release certification evidence

### Exit Criteria

- Incidents are reviewed.
- Lessons learned are integrated.
- Contracts remain current.
- Regression tests protect fixed issues.

### Allowed Work

- Maintenance
- Incident response
- Documentation updates
- Approved patches

### Prohibited Work

- Silent production behavior changes
- Unreviewed security changes
- Drift from certified behavior

---

## Lifecycle State Definitions

| State | Meaning |
|---|---|
| `PLANNING_ONLY` | Documentation and planning may continue. Runtime implementation is not allowed. |
| `ARCHITECTURE_FROZEN` | Architecture and contracts are approved for implementation planning. |
| `IMPLEMENTATION_NOT_AUTHORIZED` | Code generation, production source files, and runtime implementation are prohibited. |
| `IMPLEMENTATION_AUTHORIZED` | A specific milestone scope is authorized for implementation. |
| `VALIDATION_REQUIRED` | Implementation exists but certification evidence is incomplete. |
| `CERTIFIED` | Required validation and review evidence have passed. |
| `RELEASE_AUTHORIZED` | Certified build is approved for release. |

---

## AI Agent Lifecycle Rules

AI agents must:

- Identify the current lifecycle stage before acting.
- Refuse to implement if the lifecycle stage does not permit implementation.
- Preserve the exact authorized milestone scope.
- Document missing prerequisites instead of inventing them.
- Stop when authorization state is unclear.
- Never self-promote the project to a later lifecycle stage.

---

## Final Lifecycle Rule

Guardian may only move forward by explicit human or architect approval.

Progression must be documented.

Implementation without authorization is invalid.

Certification without evidence is invalid.

Release without certification is invalid.
