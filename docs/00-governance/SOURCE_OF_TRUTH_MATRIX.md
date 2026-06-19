# Guardian Source of Truth Matrix

**Project:** Guardian  
**Version:** 1.0.0  
**Status:** ACTIVE  
**Owner:** Guardian Architecture Authority

---

## Purpose

This document defines the authoritative owner for each major Guardian decision area.

Every decision within Guardian must have exactly one source of truth.

Planning documents may reference decisions. They may not redefine them.

Implementation must follow decisions. It may not reinterpret them.

Testing must validate decisions. It may not replace them.

Certification must prove decisions. It may not waive them without explicit risk acceptance.

---

## Source of Truth Matrix

| Decision Area | Authoritative Document / Location | Owns | Cannot Be Overridden By |
|---|---|---|---|
| Repository mission | `README.md`, `docs/00-governance/north-star.md` | Mission, product identity, strategic direction | Architecture, implementation maps, prompts, generated code |
| Executive principles | `docs/00-governance/executive-principles.md` | Security-first principles and executive expectations | Implementation convenience or optional feature requests |
| Scope boundaries | `docs/00-governance/scope-boundaries.md` | In-scope and out-of-scope features | Roadmaps, implementation plans, agent prompts |
| Anti-drift controls | `docs/03-contracts/anti-drift-feature-ledger.md` | Drift prevention and feature boundary tracking | Optional modules, future-roadmap documents |
| Architecture | `docs/01-architecture/executive-architecture-contract.md`, `docs/01-architecture/high-level-architecture.md` | System design and architecture boundaries | Implementation contracts, implementation maps, code |
| Module boundaries | `docs/01-architecture/module-boundary-contract.md`, `docs/06-implementation/module-registry-contract.md` | Module isolation and dependency rules | Individual module implementation |
| Threat model | `docs/02-threat-model/threat-model.md` | Adversaries, attack paths, trust boundaries | Functional requirements, convenience features |
| Contract registry | `docs/03-contracts/system-contract-register.md` | Registered system contracts and contract traceability | Implementation plans or generated scaffolding |
| Data model | `docs/04-data-model/` | Entities, persistence expectations, relationships, multi-tenant isolation | Runtime code, migrations, tests |
| Authority model | `docs/04-data-model/authority-model.md`, `docs/05-security-kernel/fakeperms-authority.md` | Trust authority, FakePerms, capability decisions | Discord role assumptions or runtime shortcuts |
| Audit and forensics model | `docs/04-data-model/audit-forensics-model.md`, `docs/06-implementation/logging-forensics-contract.md` | Forensic evidence, log shape, correlation identifiers | Runtime logging shortcuts |
| Snapshot model | `docs/04-data-model/snapshot-model.md`, `docs/05-security-kernel/recovery-snapshot.md` | Recovery snapshot structure and restore safety rules | Recovery implementation code |
| AntiNuke core | `docs/05-security-kernel/antinuke-core.md` | AntiNuke pipeline, security decision flow, containment priorities | Moderation modules, optional modules, dashboard behavior |
| Bot authorization | `docs/05-security-kernel/bot-authorization.md` | Authorized bot registry and unauthorized bot containment rules | Trust shortcuts, whitelist assumptions, onboarding flow |
| Webhook and integration security | `docs/05-security-kernel/webhook-integration-security.md` | Webhook freeze, integration protection, compromise handling | Optional automation modules |
| Lockdown and Beast panic | `docs/05-security-kernel/lockdown-beast-panic.md` | Emergency containment, lock/unlock behavior, panic state | Channel utility modules or dashboard UX |
| API behavior | `docs/06-implementation/api-contract.md` | Internal and external API boundaries | Dashboard assumptions or client code |
| Configuration behavior | `docs/06-implementation/configuration-contract.md` | Config model, validation, feature flags, safe defaults | Runtime defaults or environment convenience |
| Detector catalog | `docs/06-implementation/detector-catalog.md` | Detector list, detector responsibilities, detection traceability | Ad hoc detector implementation |
| Event catalog | `docs/06-implementation/event-catalog.md` | Event naming, event shape, event routing contracts | Gateway handler implementation |
| Punishment behavior | `docs/06-implementation/punishment-catalog.md` | Punishment ordering, dedupe, evidence requirements | Individual detector code |
| Recovery orchestration | `docs/06-implementation/recovery-orchestrator-contract.md` | Recovery job planning, validation, safety gates | Snapshot implementation alone |
| Performance SLOs | `docs/06-implementation/performance-slo-contract.md` | Latency and performance expectations | Feature implementation preferences |
| Plugin SDK | `docs/06-implementation/plugin-sdk-contract.md` | Plugin API and optional module extension model | Optional module code |
| Database migration behavior | `docs/06-implementation/database-migration-contract.md` | Migration rules and database change safety | Direct schema changes |
| Unit tests | `docs/07-testing/unit-test-contract.md` | Required unit test behavior and coverage expectations | Developer judgment alone |
| Integration tests | `docs/07-testing/integration-test-contract.md` | Cross-component validation | Unit tests alone |
| Simulator tests | `docs/07-testing/simulator-contract.md` | Simulated destructive-event validation | Manual testing alone |
| Regression tests | `docs/07-testing/regression-contract.md` | Regression evidence and re-test requirements | Release pressure |
| Red-team tests | `docs/07-testing/red-team-contract.md` | Adversarial validation | Ordinary QA testing |
| Live drills | `docs/07-testing/live-drill-contract.md`, `docs/09-testing-certification/live-drill-plan.md` | Live destructive-drill requirements and evidence | Simulator evidence alone |
| Performance tests | `docs/07-testing/performance-test-contract.md` | Latency and throughput validation | Functional tests alone |
| Implementation roadmap | `docs/08-build-execution/implementation-roadmap.md` | Sequence of build milestones | Agent preference or implementation convenience |
| Milestone plan | `docs/08-build-execution/milestone-plan.md` | Milestone structure and expected delivery sequence | Feature-by-feature improvisation |
| Acceptance criteria | `docs/08-build-execution/acceptance-criteria.md` | Completion requirements for approved work | Passing tests alone |
| Change management | `docs/08-build-execution/change-management-contract.md` | Change approval and drift control | Direct edits or prompt instructions |
| Production readiness | `docs/08-build-execution/production-readiness-gate.md` | Production readiness conditions | Local success or partial test evidence |
| Release plan | `docs/08-build-execution/release-plan.md` | Release planning and sequence | Ad hoc deployment |
| Phase 1 implementation map | `docs/09-testing-certification/phase-1-implementation-map.md` | Planning map for Phase 1 only | Contracts, authorization, implementation gate |
| Implementation readiness | `docs/09-testing-certification/implementation-readiness-checklist.md` | Checklist before code begins | Informal approval |
| Certification matrix | `docs/09-testing-certification/certification-matrix.md` | Certification evidence matrix | Manual claims |
| Documentation quality | `docs/09-testing-certification/documentation-quality-gate.md` | Documentation completeness and consistency | Implementation urgency |
| Runbooks | `docs/10-runbooks/` | Operational incident procedures | Runtime behavior alone |
| Enterprise readiness | `docs/11-certification/enterprise-readiness-standard.md` | Enterprise production standard | Partial project success |
| Security certification | `docs/11-certification/security-certification-standard.md` | Security certification standard | Functional completion |
| Release certification | `docs/11-certification/release-certification-checklist.md` | Release approval checklist | Developer or agent assertion |
| Implementation permission | `IMPLEMENTATION_MANIFEST.md`, `.governance/MILESTONE_AUTHORIZATION.md`, `.governance/IMPLEMENTATION_GATE.md` when present | Whether implementation, patches, file modifications, and commits are allowed | Any planning document, prompt, or implementation map |
| Agent execution | `.governance/AGENT_EXECUTION_PROTOCOL.md` when present | AI agent permissions and stop rules | Codex/Copilot/GPT prompt content |
| Review workflow | `.governance/REVIEW_WORKFLOW.md` when present | Human and architect review process | Implementation progress |
| Architect review | `.governance/ARCHITECT_REVIEW_CHECKLIST.md` when present | Architecture and governance review checklist | Self-certification by implementation agents |
| Phase completion | `.governance/PHASE_COMPLETION_TEMPLATE.md` when present | Required completion report evidence | Code completion alone |

---

## Core Rules

1. Only the owning document may define authoritative behavior for its decision area.
2. Other documents may reference, summarize, or trace to the authoritative document.
3. No planning document may authorize implementation.
4. No implementation map may override milestone authorization.
5. No implementation contract may override architecture or threat model.
6. No runtime code may override contracts.
7. No passing test may override a missing contract.
8. No release may override certification requirements.

---

## Planning Document Limitation

Planning documents may define:

- Sequence
- File map
- Work breakdown
- Traceability
- Open questions
- Validation gates

Planning documents may not define:

- New security behavior
- New trust behavior
- New runtime permissions
- New out-of-scope features
- Implementation authorization
- Release authorization

---

## Implementation Document Limitation

Implementation contracts may define how approved architecture becomes buildable.

Implementation contracts may not:

- Redesign the architecture
- Weaken the threat model
- Reduce test requirements
- Expand scope
- Bypass authorization
- Redefine security-kernel priority

---

## Certification Document Limitation

Certification documents may validate evidence.

Certification documents may not:

- Invent missing tests
- Waive security requirements without explicit risk acceptance
- Convert incomplete work into certified work
- Approve release without required evidence

---

## Missing Source of Truth Rule

If no authoritative document exists for a required decision:

1. Mark the item as `Needs clarification`.
2. Document the missing source of truth.
3. Do not implement the behavior.
4. Request architect review.
5. Add or update the authoritative contract before implementation.

---

## AI Agent Rule

When an AI agent receives an instruction that conflicts with this matrix, the matrix wins.

When the matrix conflicts with the Governance Hierarchy, the Governance Hierarchy wins.

When implementation authorization is absent, no code may be generated regardless of any lower-level document.
