# Phase 1 Implementation Package

This package documents the pre-coding deliverables for the Phase 1 milestone. It is a planning artifact and does not independently authorize implementation. Implementation authorization is governed exclusively by `.governance/MILESTONE_AUTHORIZATION.md`.

**Scope**
- Milestone: v0.2.0-security-kernel-foundation
- Authorization token: PHASE1_IMPLEMENTATION_APPROVED
- Permitted work: foundational kernel contracts, shared infrastructure, CI/test scaffolding (see `IMPLEMENTATION_MANIFEST.md` and `IMPLEMENTATION_CONTRACT.md`).

## 1. Implementation Plan

Objective: produce an architecture-first, contract-aligned foundation that enables later kernel implementation while preserving governance and traceability.

Phases (documentation outputs only):
- Phase 1A — Design artifacts (this package)
  - Implementation plan (this file)
  - File tree proposal
  - File-by-file contract table
  - Dependency graph
  - Test plan
  - Risk register
- Phase 1B — Human review & approval
  - Architecture review
  - Implementation contract approval
  - Milestone authorization token insertion
- Phase 1C — Phase 1A implementation (authorized only when `.governance/MILESTONE_AUTHORIZATION.md` contains the required state and token)

Deliverables (this step):
- `docs/09-testing-certification/phase-1-implementation-package.md` (this file)
- Implementation contract table (section 3)
- Proposed source file tree (section 2)
- Dependency graph (section 4)
- Test plan (section 5)
- Risk list (section 6)

Constraints:
- No runtime or production code.
- All artifacts must reference existing repository contracts.
- Traceability updates required at time of implementation.

Acceptance criteria for package:
- Aligns with `IMPLEMENTATION_MANIFEST.md`, `IMPLEMENTATION_CONTRACT.md`, and kernel contracts.
- Clearly separates in-scope vs out-of-scope.
- Provides actionable file-by-file contract mapping for Phase 1 implementers.

## 2. Proposed File Tree (documentation-only)

```
src/
  core/
    config/
      index.ts (contract)
      schema.ts (contract)
    event/
      index.ts (contract)
      types.ts (contract)
    authority/
      index.ts (contract)
      registry.ts (contract)
    fakeperms/
      index.ts (contract)
      capability-catalog.ts (contract)
    decision/
      index.ts (contract)
      policy.ts (contract)
    logging/
      index.ts (contract)
      schema.ts (contract)
    recovery/
      snapshot-model.ts (contract)
      orchestrator-contract.ts (contract)
    plugin/
      registry.ts (contract)
  shared/
    types/
      index.ts (contract)
    interfaces/
      index.ts (contract)
    errors/
      index.ts (contract)
    telemetry/
      index.ts (contract)
    metrics/
      index.ts (contract)
    health/
      index.ts (contract)
  infra/
    di/
      container.ts (contract)
    persistence/
      interfaces.ts (contract)
    audit/
      interface.ts (contract)
  tests/
    unit/
    integration/
    contract/
  implementation-traceability/
    IMPLEMENTATION_TRACEABILITY.md

docs/
  contracts/ (references only)
  design/
    phase-1-architecture.md (optional contract clarifications)

```

Notes: Files above are planned contract/interface files. Phase 1A implementation may create only the authorized foundation subset when milestone authorization is present. Runtime Discord bindings remain prohibited.

## 3. File-by-file Contract Table (Phase 1)

- `src/core/config/index.ts` — Purpose: configuration schema and abstraction contract. Governing doc: `docs/06-implementation/configuration-contract.md`. Dependencies: none. Planned tests: config validation tests. Status: Planned.

- `src/core/event/index.ts` — Purpose: event bus contract and normalized event types. Governing doc: `docs/01-architecture/high-level-architecture.md` and `docs/06-implementation/api-contract.md`. Dependencies: `shared/types`. Planned tests: event normalization unit tests, contract tests. Status: Planned.

- `src/core/authority/registry.ts` — Purpose: trust registry contract (API shape, persistence contract). Governing doc: `docs/06-implementation/authority-capability-catalog.md` and `docs/03-contracts/system-contract-register.md`. Dependencies: `src/core/config`, `shared/types`. Planned tests: registry contract tests. Status: Planned.

- `src/core/fakeperms/capability-catalog.ts` — Purpose: capability definitions and decision model. Governing doc: `docs/05-security-kernel/fakeperms-authority.md`. Dependencies: `shared/types`. Planned tests: FakePerms unit tests. Status: Planned.

- `src/core/decision/policy.ts` — Purpose: policy/decision engine interface and score model contract. Governing doc: `docs/05-security-kernel/antinuke-core.md`, `docs/06-implementation/punishment-catalog.md`. Dependencies: `fakeperms`, `event`. Planned tests: policy reasoning unit tests. Status: Planned.

- `src/core/logging/schema.ts` — Purpose: structured log schema and forensic fields. Governing doc: `docs/06-implementation/logging-forensics-contract.md`. Dependencies: `shared/types`. Planned tests: structured logging schema and correlation tests. Status: Planned.

- `src/core/recovery/snapshot-model.ts` — Purpose: snapshot data model contract and validation rules. Governing doc: `docs/05-security-kernel/recovery-snapshot.md`, `docs/06-implementation/recovery-orchestrator-contract.md`. Dependencies: `shared/types`. Planned tests: snapshot validation tests. Status: Planned.

- `src/infra/di/container.ts` — Purpose: DI container contract and registration API (no runtime DI implementation). Governing doc: `IMPLEMENTATION_MANIFEST.md` (Dependency Injection). Dependencies: `shared/interfaces`. Planned tests: DI registration contract tests. Status: Planned.

- `implementation-traceability/IMPLEMENTATION_TRACEABILITY.md` — Purpose: traceability table for Phase 1 artifacts. Governing doc: `IMPLEMENTATION_MANIFEST.md`. Dependencies: N/A. Planned tests: N/A. Status: Planned.

(Additional files follow the same pattern: all planned as contract/interface artifacts. Full table to be expanded on request.)

## 4. Dependency Graph (high level)

- Configuration → DI → Shared Types → Shared Interfaces → Shared Errors → Telemetry → Metrics → Health → Event Bus → Authority Engine → Trust Registry → FakePerms → Policy Engine

Representation (component -> depends-on):
- `event` -> `shared/types`
- `authority` -> `config`, `shared/types`
- `fakeperms` -> `authority`, `shared/types`
- `decision` -> `fakeperms`, `event`
- `logging` -> `shared/types`
- `recovery` -> `logging`, `shared/types`
- `infra/di` -> `shared/interfaces`, `config`

Notes: The graph must be enforced in code (no bypass) when implementation begins.

## 5. Test Plan

Principles:
- No tests may require live Discord.
- Tests must be deterministic and fast.
- Every contract/interface file must have unit tests validating inputs, outputs, and failure paths.

Test types:
- Unit tests: validate serialization, validation, decision logic (policy interfaces), and registry semantics.
- Contract tests: ensure modules honor interface contracts and forward-compatible JSON schemas.
- Integration tests (local, lightweight): validate DI wiring and cross-component contracts without runtime Discord integration.
- Traceability tests: ensure every file is listed in `IMPLEMENTATION_TRACEABILITY.md`.

Minimum required tests for Phase 1 artifacts:
- Config validation tests (default values, invalid values)
- FakePerms decision tests (allow/deny semantics)
- Event normalization tests (expected normalized event shape)
- Logging schema tests (presence of required forensic fields)
- Snapshot validation tests (schema and version checks)
- DI contract test (container registers and exposes expected interfaces)

Validation harness:
- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`
- `npm test`

Note: Execution of the harness is permitted after Phase 1A implementation files are created under milestone authorization.

## 6. Risk Register (Phase 1)

- Authorization risk: Misalignment between human approvals and token state. Mitigation: Require explicit milestone token insertion and sign-off checklist.
- Scope drift: Developers implementing runtime features prematurely. Mitigation: Enforce pre-commit checks and architecture review gates; maintain documentation-only artifacts until token present.
- Traceability gap: Missing `IMPLEMENTATION_TRACEABILITY.md` entries. Mitigation: Create and require traceability file before code changes.
- Documentation freeze violation: Unapproved contract changes being promoted. Mitigation: Any contract gap must be documented and approved via governance.
- Integration assumptions: Interfaces that assume persistence or Discord runtime. Mitigation: Keep interfaces abstract; require persistence adapters to be optionally pluggable.
- Test coverage shortfall: Missing required unit/contract tests. Mitigation: Define required test templates and CI gating rules.

## 7. Next Steps (human actions required)

1. Human reviewers confirm architecture and implementation contract approval.
2. Human maintainer updates `.governance/MILESTONE_AUTHORIZATION.md` with `STATE: IMPLEMENTATION_AUTHORIZED` and the token `PHASE1_IMPLEMENTATION_APPROVED`, if not already done.
3. Architecture review sign-off recorded per `.governance/ARCHITECT_REVIEW_CHECKLIST.md`.
4. On authorization, produce code scaffolding patches referencing this package and update `IMPLEMENTATION_TRACEABILITY.md` in the same change set.

---

Document created as a pre-coding package. After human review and milestone authorization, Codex may proceed only with Phase 1A implementation and must stop before commit or push.