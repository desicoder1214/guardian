# Guardian Governance Hierarchy

**Project:** Guardian  
**Version:** 1.0.0  
**Status:** ACTIVE  
**Owner:** Guardian Architecture Authority

---

## Purpose

This document defines the official hierarchy for Guardian governance, architecture, contracts, implementation planning, implementation authorization, testing, certification, and release documentation.

If two documents conflict, the document higher in this hierarchy prevails.

No AI agent, implementation agent, contributor, automation, planning document, implementation map, or generated artifact may override this hierarchy.

---

## Mandatory Rule

Guardian is a contract-driven security platform.

Implementation is permitted only when the repository governance chain explicitly authorizes implementation.

Planning approval is not implementation approval.

Documentation approval is not implementation approval.

Architecture approval is not implementation approval.

Implementation may begin only when the controlling milestone authorization and implementation gate explicitly state that implementation is authorized.

---

## Governance Order of Precedence

### Level 1 — Repository Mission

**Authoritative documents:**

- `README.md`
- `docs/00-governance/north-star.md`
- `docs/00-governance/executive-principles.md`

**Owns:**

- Mission
- Vision
- Product identity
- Strategic objectives
- Security-first operating principles

**Rule:**

Lower-level documents may clarify the mission, but may not redefine, weaken, or expand it beyond approved scope.

---

### Level 2 — Scope Boundaries

**Authoritative documents:**

- `docs/00-governance/scope-boundaries.md`
- `docs/03-contracts/anti-drift-feature-ledger.md`

**Owns:**

- In-scope features
- Out-of-scope features
- Anti-drift controls
- Security-kernel priority
- Optional-module boundaries

**Rule:**

No implementation map, roadmap, prompt, or AI-generated change may introduce features outside approved scope.

---

### Level 3 — Executive Architecture

**Authoritative documents:**

- `docs/01-architecture/executive-architecture-contract.md`
- `docs/01-architecture/high-level-architecture.md`
- `docs/01-architecture/module-boundary-contract.md`

**Owns:**

- System architecture
- Security architecture
- Platform boundaries
- Kernel isolation
- Module relationships
- Enterprise design intent

**Rule:**

Implementation contracts must conform to the approved architecture. They may not redesign Guardian.

---

### Level 4 — Threat Model

**Authoritative documents:**

- `docs/02-threat-model/threat-model.md`

**Owns:**

- Adversary model
- Attack surfaces
- Trust boundaries
- Abuse scenarios
- Security assumptions
- Required defensive posture

**Rule:**

Any implementation that ignores or weakens the threat model is invalid, even if it passes ordinary functional tests.

---

### Level 5 — System Contracts

**Authoritative documents:**

- `docs/03-contracts/system-contract-register.md`

**Owns:**

- Cross-system contracts
- Required subsystem behavior
- Contract registration
- Contract traceability

**Rule:**

All implementation plans must trace back to registered contracts. Unregistered behavior must be documented as a gap before implementation.

---

### Level 6 — Data Model Contracts

**Authoritative documents:**

- `docs/04-data-model/database-schema.md`
- `docs/04-data-model/entity-relationships.md`
- `docs/04-data-model/authority-model.md`
- `docs/04-data-model/audit-forensics-model.md`
- `docs/04-data-model/snapshot-model.md`
- `docs/04-data-model/multi-tenant-saas-model.md`

**Owns:**

- Persistent entities
- Relationships
- Authority data
- Audit data
- Forensic evidence model
- Snapshot and restore data
- Multi-guild isolation model

**Rule:**

Implementation must not invent storage behavior outside the approved data model contract.

---

### Level 7 — Security Kernel Contracts

**Authoritative documents:**

- `docs/05-security-kernel/antinuke-core.md`
- `docs/05-security-kernel/bot-authorization.md`
- `docs/05-security-kernel/fakeperms-authority.md`
- `docs/05-security-kernel/lockdown-beast-panic.md`
- `docs/05-security-kernel/recovery-snapshot.md`
- `docs/05-security-kernel/webhook-integration-security.md`

**Owns:**

- AntiNuke behavior
- Unauthorized bot containment
- FakePerms and trust authority
- Emergency lockdown
- Beast panic mode
- Recovery snapshot safety
- Webhook and integration defense

**Rule:**

The security kernel is the highest-priority runtime layer. Optional modules may never block, weaken, delay, or bypass security-kernel decisions.

---

### Level 8 — Implementation Contracts

**Authoritative documents:**

- `docs/06-implementation/api-contract.md`
- `docs/06-implementation/authority-capability-catalog.md`
- `docs/06-implementation/configuration-contract.md`
- `docs/06-implementation/database-migration-contract.md`
- `docs/06-implementation/detector-catalog.md`
- `docs/06-implementation/event-catalog.md`
- `docs/06-implementation/logging-forensics-contract.md`
- `docs/06-implementation/module-registry-contract.md`
- `docs/06-implementation/performance-slo-contract.md`
- `docs/06-implementation/plugin-sdk-contract.md`
- `docs/06-implementation/punishment-catalog.md`
- `docs/06-implementation/recovery-orchestrator-contract.md`
- `IMPLEMENTATION_CONTRACT.md` when present at repository root

**Owns:**

- Implementation boundaries
- Runtime interface contracts
- Module registry rules
- API behavior
- Configuration behavior
- Event and detector behavior
- Punishment catalog behavior
- Logging and forensic implementation requirements
- Recovery orchestration requirements

**Rule:**

Implementation contracts translate approved architecture into buildable constraints. They do not authorize implementation by themselves.

---

### Level 9 — Testing Contracts

**Authoritative documents:**

- `docs/07-testing/unit-test-contract.md`
- `docs/07-testing/integration-test-contract.md`
- `docs/07-testing/performance-test-contract.md`
- `docs/07-testing/live-drill-contract.md`
- `docs/07-testing/red-team-contract.md`
- `docs/07-testing/regression-contract.md`
- `docs/07-testing/simulator-contract.md`

**Owns:**

- Required test evidence
- Unit test requirements
- Integration test requirements
- Simulator requirements
- Regression requirements
- Red-team and live-drill requirements
- Performance validation requirements

**Rule:**

A feature is not complete until its required test evidence exists and is traceable to contracts.

---

### Level 10 — Build Execution and Implementation Planning

**Authoritative documents:**

- `docs/08-build-execution/implementation-roadmap.md`
- `docs/08-build-execution/milestone-plan.md`
- `docs/08-build-execution/acceptance-criteria.md`
- `docs/08-build-execution/change-management-contract.md`
- `docs/08-build-execution/production-readiness-gate.md`
- `docs/08-build-execution/release-plan.md`
- `docs/09-testing-certification/phase-1-implementation-map.md`

**Owns:**

- Implementation roadmap
- Milestone planning
- Acceptance criteria
- Change control
- Readiness planning
- Phase implementation maps

**Rule:**

Implementation maps and roadmaps are planning artifacts. They may never override contracts, authorization files, or the implementation gate.

---

### Level 11 — Milestone Authorization and Implementation Gate

**Authoritative documents:**

- `IMPLEMENTATION_MANIFEST.md` when present at repository root
- `.governance/MILESTONE_AUTHORIZATION.md` when present
- `.governance/IMPLEMENTATION_GATE.md` when present
- `.governance/AGENT_EXECUTION_PROTOCOL.md` when present

**Owns:**

- Whether implementation is allowed
- Which milestone is authorized
- Which files may be modified
- Whether patch generation is allowed
- Whether commits are allowed
- Required authorization token
- Agent execution limits

**Rule:**

This level controls permission to act. If this level says implementation is not authorized, no lower-level planning or contract document may permit code generation.

---

### Level 12 — Execution Review Governance

**Authoritative documents:**

- `.governance/REVIEW_WORKFLOW.md` when present
- `.governance/ARCHITECT_REVIEW_CHECKLIST.md` when present
- `.governance/PHASE_COMPLETION_TEMPLATE.md` when present

**Owns:**

- Review workflow
- Architect review requirements
- Phase completion evidence
- Human approval workflow
- Failure handling

**Rule:**

No milestone is complete until review evidence satisfies the review workflow and architect checklist.

---

### Level 13 — Certification and Release

**Authoritative documents:**

- `docs/09-testing-certification/certification-matrix.md`
- `docs/09-testing-certification/documentation-quality-gate.md`
- `docs/09-testing-certification/implementation-readiness-checklist.md`
- `docs/09-testing-certification/live-drill-plan.md`
- `docs/10-runbooks/`
- `docs/11-certification/`

**Owns:**

- Certification standards
- Evidence review
- Live drill certification
- Production readiness
- Release certification
- Operational runbooks

**Rule:**

No release is valid without certification evidence and approved release authorization.

---

## Conflict Resolution

When documents conflict:

1. Identify the topic being decided.
2. Locate the authoritative owner in the governance hierarchy.
3. Apply the higher-precedence document.
4. Mark the lower-precedence conflict as a governance issue.
5. Stop implementation if the conflict affects scope, security, testing, authorization, or release readiness.

---

## AI Agent Rules

AI agents must:

- Read governance before implementation planning.
- Read authorization before writing files.
- Treat missing contracts as gaps, not permission to invent behavior.
- Treat ambiguity as a stop condition.
- Preserve security-kernel priority.
- Preserve out-of-scope boundaries.
- Preserve milestone authorization.
- Never treat planning approval as implementation approval.
- Never unlock implementation without explicit human authorization.

---

## Required Stop Conditions

Agents and contributors must stop when:

- Implementation authorization is missing.
- The implementation gate is closed.
- The authorization token is absent.
- A requested change conflicts with this hierarchy.
- A lower-level document attempts to override a higher-level document.
- A security behavior is missing from contracts.
- A test requirement is missing for a security-critical feature.
- A release is requested without certification evidence.

---

## Final Rule

Guardian must be built in this order:

Mission → Scope → Architecture → Threat Model → Contracts → Data Model → Security Kernel Contracts → Implementation Contracts → Testing Contracts → Planning → Authorization → Implementation → Review → Certification → Release.

Any work outside this order is governance drift.
