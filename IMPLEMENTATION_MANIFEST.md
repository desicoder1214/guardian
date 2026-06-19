# Guardian Implementation Manifest

**Project:** Guardian  
**Repository:** https://github.com/desicoder1214/guardian  
**Status:** Active  
**Document Owner:** Guardian Architecture Authority

---

# Purpose

The Implementation Manifest defines the operational implementation state for the Guardian repository.

This document is not an architecture contract and does not independently authorize implementation. It summarizes milestone intent, approved boundaries, required startup behavior, validation gates, and traceability requirements.

---

# Authorization Source of Truth

Implementation authorization is governed exclusively by:

```text
.governance/MILESTONE_AUTHORIZATION.md
```

If any document appears to conflict with `.governance/MILESTONE_AUTHORIZATION.md`, implementation agents must stop and report the conflict.

This manifest does not duplicate the current implementation state.

---

# Repository Authority

Implementation shall follow the repository in this order of precedence:

1. Repository contracts under `docs/`
2. Repository governance under `.governance/`
3. `.governance/MILESTONE_AUTHORIZATION.md`
4. `IMPLEMENTATION_CONTRACT.md`
5. Approved phase implementation artifacts
6. Human approval

If any conflict exists, implementation must stop until the conflict is resolved.

---

# Repository Status

| Item | Status |
|---|---|
| Architecture | Complete |
| Threat Model | Complete |
| Repository Contracts | Complete |
| Governance | Active |
| Documentation | Frozen |
| Implementation | Governed by `.governance/MILESTONE_AUTHORIZATION.md` |

---

# Current Milestone

```text
v0.2.0-security-kernel-foundation
```

## Objective

Establish the Security Kernel foundation that future Guardian modules will build upon.

This milestone is limited to foundational infrastructure only.

---

# Approved Phase 1A Scope

The current authorized implementation slice is **Phase 1A — Project Foundation Implementation**, if and only if `.governance/MILESTONE_AUTHORIZATION.md` contains the required authorization token.

Approved Phase 1A work includes:

- project foundation
- TypeScript configuration
- lint configuration
- format configuration
- test configuration
- bootstrap entry
- configuration abstractions
- shared types
- shared interfaces
- shared errors
- internal dependency injection skeleton
- Event Bus contracts and minimal implementation
- initial unit tests proving the build and test pipeline works
- `IMPLEMENTATION_TRACEABILITY.md`

---

# Out of Scope

The following work is prohibited during Phase 1A:

- Discord runtime integration
- Discord gateway
- Discord bot login
- Discord commands
- Discord event handlers
- AntiNuke detector runtime
- AntiSpam implementation
- Moderation implementation
- Dashboard implementation
- database persistence
- SaaS infrastructure
- premium modules
- recovery execution
- containment execution
- punishment execution
- webhook freeze runtime
- HTTP services
- monitoring infrastructure
- background workers

---

# Documentation Freeze

The `docs/` tree is frozen during implementation.

Documentation may not be modified unless:

1. a verified implementation-discovered contract gap exists;
2. the discrepancy is documented;
3. the proposed documentation change is explicitly approved.

Implementation decisions must be recorded outside the frozen documentation tree unless a documentation synchronization milestone is explicitly authorized.

---

# Mandatory Governance Documents

Implementation agents must read and follow:

```text
.governance/AGENT_EXECUTION_PROTOCOL.md
.governance/IMPLEMENTATION_GATE.md
.governance/MILESTONE_AUTHORIZATION.md
.governance/ARCHITECT_REVIEW_CHECKLIST.md
.governance/REVIEW_WORKFLOW.md
.governance/PHASE_COMPLETION_TEMPLATE.md
```

---

# Mandatory Startup Sequence

Every implementation session must begin with:

1. read `README.md`
2. read `IMPLEMENTATION_MANIFEST.md`
3. read `IMPLEMENTATION_CONTRACT.md`
4. read `.governance/`
5. read relevant `docs/` contracts
6. check `.governance/MILESTONE_AUTHORIZATION.md`
7. report whether implementation is authorized

---

# Required Validation Gates

After implementation, Codex must run or honestly report:

```bash
npm install
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
```

If any command cannot execute, the result must be marked:

```text
NOT VERIFIED
```

No fake validation results are permitted.

---

# Traceability Requirement

Every implementation artifact must be recorded in:

```text
IMPLEMENTATION_TRACEABILITY.md
```

Minimum columns:

| File | Repository Document | Contract | Milestone | Tests | Validation | Status |
|---|---|---|---|---|---|---|

Traceability must be updated in the same change set as implementation.

---

# Review Workflow

Implementation follows this sequence:

```text
Repository Review
↓
Governance Review
↓
Authorization Check
↓
Implementation
↓
Validation
↓
Phase Completion Report
↓
git status
↓
git diff
↓
Architecture Review
↓
Human Commit Approval
↓
Commit
↓
Human Push Approval
↓
Push
```

No step may be skipped.

---

# Current Risks

- No production implementation exists yet.
- Phase 1A must remain limited to project foundation and kernel-independent infrastructure.
- Governance documents must remain synchronized.
- Traceability must be maintained from the first implementation change.

---

# Final Rule

Guardian is a contract-driven, architecture-first security platform.

Implementation shall always follow architecture.

When uncertain:

**STOP.**

Do not infer approval.

Do not modify the repository without explicit authorization.
