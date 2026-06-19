# Guardian Implementation Contract

**Project:** Guardian  
**Repository:** https://github.com/desicoder1214/guardian  
**Version:** 1.0.0  
**Status:** Active  
**Owner:** Guardian Architecture Authority

---

# Purpose

The Implementation Contract is the final implementation scope contract for a milestone.

It translates the approved architecture and implementation planning into an explicit execution contract for implementation agents.

This document does **not** define architecture.

This document does **not** replace repository contracts.

This document does **not** independently authorize implementation.

Implementation authorization is governed exclusively by `.governance/MILESTONE_AUTHORIZATION.md`.

---

# Relationship to Repository Governance

Implementation shall follow the repository in the following order of precedence:

1. Repository Contracts (`docs/`)
2. Repository Governance (`.governance/`)
3. `.governance/MILESTONE_AUTHORIZATION.md`
4. `IMPLEMENTATION_MANIFEST.md`
5. Approved Phase Implementation Map
6. This Implementation Contract
7. Human Approval

If any conflict exists, implementation shall stop until resolved.

---

# Current Milestone

```text
Milestone:
v0.2.0-security-kernel-foundation
```

---

# Implementation Authorization

This document defines authorized scope only.

Implementation may begin only when `.governance/MILESTONE_AUTHORIZATION.md` contains:

```text
STATE: IMPLEMENTATION_AUTHORIZED

TOKEN:
PHASE1_IMPLEMENTATION_APPROVED
```

If that state/token is absent, implementation is not authorized.

---

# Milestone Objective

Implement the Security Kernel Foundation required for future Guardian capabilities.

The goal is to establish foundational infrastructure only.

No Discord runtime functionality shall be implemented during Phase 1A.

---

# Authorized Deliverables

The following implementation artifacts are authorized for Phase 1A when implementation is authorized by `.governance/MILESTONE_AUTHORIZATION.md`.

## Project Foundation

- project bootstrap
- package configuration
- TypeScript configuration
- build configuration
- lint configuration
- format configuration
- test configuration

---

## Kernel Foundation

- Event Bus contracts and minimal implementation
- dependency injection skeleton
- configuration abstractions

---

## Shared Infrastructure

- shared types
- shared interfaces
- shared errors
- telemetry interfaces
- metrics interfaces
- health interfaces

---

## Quality Infrastructure

- unit tests
- contract tests where applicable
- validation scripts
- implementation traceability

---

# Explicitly Prohibited

Implementation shall **not** introduce:

- Discord client
- Discord gateway
- bot login
- slash commands
- prefix commands
- event listeners
- AntiNuke detectors
- moderation logic
- AntiSpam logic
- dashboard
- database persistence
- HTTP APIs
- web services
- recovery execution
- containment execution
- punishment execution
- SaaS features
- premium modules
- AI modules

---

# Approved Module Dependencies

The Security Kernel shall be implemented from the lowest-level foundational components upward.

Each component may depend only on components that appear before it in the approved dependency hierarchy.

The dependency hierarchy for **v0.2.0-security-kernel-foundation** is:

```text
Configuration
        ↓
Shared Types
        ↓
Shared Interfaces
        ↓
Shared Errors
        ↓
Dependency Injection
        ↓
Event Bus
        ↓
Telemetry
        ↓
Metrics
        ↓
Health
        ↓
Authority Engine
        ↓
Trust Registry
        ↓
FakePerms Engine
        ↓
Policy Engine
        ↓
Kernel Integration Tests
```

## Dependency Rules

Implementation shall comply with the following architectural rules.

### General Rules

- Components may depend only on preceding layers.
- Circular dependencies are prohibited.
- Reverse dependencies are prohibited.
- Cross-layer shortcuts are prohibited.
- Every dependency shall have a documented architectural purpose.

---

### Configuration

Configuration is the lowest architectural layer.

It shall have no dependency on any Guardian module.

---

### Shared Layer

Shared Types, Shared Interfaces, and Shared Errors form the common language of the Security Kernel.

These modules:

- shall remain framework independent;
- shall remain Discord independent;
- shall remain database independent;
- shall remain networking independent;
- shall expose only reusable contracts and common abstractions.

---

### Dependency Injection

Dependency Injection shall:

- construct object graphs;
- manage service registration;
- remain implementation independent;
- avoid third-party frameworks unless explicitly approved.

Dependency Injection shall never contain business logic.

---

### Event Bus

The Event Bus is the communication backbone of the Security Kernel.

It shall:

- remain framework independent;
- remain Discord independent;
- remain database independent;
- remain networking independent;
- remain logging independent;
- expose contracts separately from implementation.

The Event Bus shall not depend on Telemetry, Metrics, or Health implementations.

---

### Telemetry, Metrics, and Health

Telemetry, Metrics, and Health are observational components.

They may:

- observe kernel behavior;
- consume Event Bus notifications;
- expose interfaces and abstractions.

They shall not:

- alter decision logic;
- influence authorization;
- perform enforcement;
- introduce runtime side effects.

---

### Authority Engine

The Authority Engine shall:

- evaluate Guardian authority;
- remain deterministic;
- remain deny-by-default;
- depend only on approved kernel abstractions.

It shall not perform Discord actions.

---

### Trust Registry

The Trust Registry shall:

- manage trust relationships;
- expose trust contracts;
- consume Authority Engine contracts only where explicitly required.

Trust decisions shall never imply runtime enforcement.

---

### FakePerms Engine

The FakePerms Engine shall:

- evaluate Guardian permissions;
- consume Authority and Trust Registry contracts;
- remain independent from Discord permission evaluation.

It shall not:

- punish;
- contain;
- modify Discord state.

---

### Policy Engine

The Policy Engine is the highest decision layer of the Security Kernel.

It shall:

- evaluate Guardian policy;
- produce deterministic policy decisions;
- expose decision results.

It shall never:

- execute punishment;
- execute containment;
- call Discord APIs;
- modify runtime state.

---

### Kernel Integration Tests

Kernel Integration Tests are the highest validation layer.

They shall validate:

- component interaction;
- dependency integrity;
- contract compliance;
- architectural boundaries.

Integration Tests shall not require Discord runtime infrastructure.

---

## Architectural Principle

The dependency hierarchy defined in this document is normative.

Implementation shall not introduce dependencies that violate this hierarchy without:

1. documented architectural justification;
2. architecture review;
3. explicit approval;
4. an updated implementation contract.

Any unauthorized dependency constitutes architectural drift and shall be treated as a governance violation.

---

# Required Deliverables Per Module

Every implementation module shall include:

- interfaces
- domain models where applicable
- implementation
- unit tests
- integration tests where applicable
- validation evidence
- traceability update

No module is complete until all required deliverables are present.

---

# Validation Requirements

Implementation shall successfully execute:

```bash
npm install
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
```

If execution is impossible, the result must be recorded as:

```text
NOT VERIFIED
```

Validation results shall never be fabricated.

---

# Exit Criteria

A milestone slice is complete only when:

- approved scope has been implemented;
- no out-of-scope work exists;
- validation passes or is honestly marked `NOT VERIFIED` with reasons;
- traceability is complete;
- architecture review is approved;
- phase completion report is approved;
- `git status` and `git diff` have been reviewed;
- commit approval has been granted.

---

# Traceability Requirements

Every implementation artifact shall be recorded in:

```text
IMPLEMENTATION_TRACEABILITY.md
```

Minimum fields:

| File | Repository Document | Contract | Milestone | Tests | Validation | Status |
|---|---|---|---|---|---|---|

Traceability updates shall occur in the same change set as implementation.

---

# Implementation Restrictions

Implementation agents shall never:

- redesign architecture;
- modify frozen documentation without explicit approval;
- expand milestone scope;
- infer approval;
- commit automatically;
- push automatically;
- bypass governance.

When uncertain:

**STOP.**

---

# Phase Approval Workflow

```text
Repository Review
        ↓
Implementation Map
        ↓
Implementation Contract
        ↓
Architecture Approval
        ↓
Implementation Authorization
        ↓
Implementation
        ↓
Validation
        ↓
Phase Completion Report
        ↓
Architecture Review
        ↓
Commit Approval
        ↓
Commit
        ↓
Push
```

No stage may be skipped.

---

# Certification

This document certifies only the implementation scope for the current milestone.

It does **not** certify:

- production readiness;
- security readiness;
- implementation quality;
- runtime behavior.

Those certifications require successful implementation, validation, and review.

---

# Final Principle

Guardian is a contract-driven, architecture-first security platform.

Implementation shall conform to approved architecture.

Implementation shall never redefine architecture.

If authorization is absent:

**STOP.**

Do not generate code.

Do not modify the repository.

Await explicit human approval.
