# Guardian Implementation Manifest

## Project

Guardian is an architecture-first, contract-driven Discord security platform.

This manifest defines the current implementation state and execution controls for the repository.

---

## Current Milestone

**Milestone:** `v0.2.0-security-kernel-foundation`

**Goal:** Move Guardian from documentation-only to a working TypeScript Security Kernel foundation.

---

## Current Implementation State

**State:** `IMPLEMENTATION_NOT_AUTHORIZED`

No source-code implementation may begin until the current milestone is explicitly authorized through `.governance/MILESTONE_AUTHORIZATION.md`.

---

## Approved Technology

- Language: TypeScript
- Runtime: Node.js
- Dependency Injection: Lightweight internal container only
- Third-party DI framework: Not authorized

---

## Approved Scope

Phase 1 may include only:

- Project foundation
- TypeScript configuration
- Bootstrap
- Configuration abstractions
- Internal dependency injection
- Shared types
- Shared interfaces
- Error/result model
- Telemetry interfaces
- Metrics interfaces
- Health interfaces
- Event Bus abstraction
- Authority Engine contracts
- Trust Registry contracts
- FakePerms contracts
- Policy Engine contracts
- Foundation tests
- Implementation traceability

---

## Out of Scope

The following are not authorized in this milestone:

- Discord runtime integration
- Discord commands
- Detectors
- Enforcement actions
- Containment
- Punishment
- Recovery execution
- Persistence/database layer
- Dashboard
- SaaS billing
- Premium modules
- External telemetry exporters
- Monitoring backends
- HTTP health endpoints
- Background workers
- Git commits without human approval
- Git pushes without human approval

---

## Frozen Documentation

The `docs/` tree is frozen during implementation.

Documentation may not be modified unless:

1. A verified implementation-discovered contract gap exists.
2. The discrepancy is documented.
3. The proposed documentation update is explicitly approved.

Implementation decisions must be recorded in:

```text
IMPLEMENTATION_DECISIONS.md