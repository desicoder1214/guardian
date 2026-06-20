# Guardian Implementation Manifest

**Project:** Guardian  
**Repository:** https://github.com/desicoder1214/guardian  
**Status:** Active  
**Document Owner:** Guardian Architecture Authority  
**Current Milestone:** v0.2.0-phase1D-discord-event-pipeline  
**Current Milestone ID:** PHASE_1D_DISCORD_EVENT_PIPELINE

---

# Purpose

The Implementation Manifest defines the operational implementation state for the Guardian repository.

This document is not an architecture contract and does not independently authorize implementation. It summarizes the active milestone intent, approved boundaries, required startup behavior, validation gates, and traceability requirements.

Implementation authorization is governed exclusively by:

```text
.governance/MILESTONE_AUTHORIZATION.md
```

If this manifest conflicts with `.governance/MILESTONE_AUTHORIZATION.md`, implementation agents must stop and report the conflict.

---

# Repository Authority

Implementation shall follow repository authority in this order of precedence:

1. Repository Contracts under `docs/`
2. Repository Governance under `.governance/`
3. `.governance/MILESTONE_AUTHORIZATION.md`
4. `IMPLEMENTATION_CONTRACT.md`
5. `IMPLEMENTATION_MANIFEST.md`
6. Approved Phase Implementation Map
7. Human Approval

If any conflict exists:

**STOP**

Do not infer intent.

Await clarification.

---

# Repository Status

| Item | Status |
|---|---|
| Architecture | Complete |
| Threat Model | Complete |
| Repository Contracts | Complete |
| Governance | Active |
| Documentation | Frozen except implementation-driven traceability |
| Implementation | Governed by `.governance/MILESTONE_AUTHORIZATION.md` |
| Active Phase | Phase 1D — Discord Event Pipeline |

---

# Current Milestone

```text
Milestone:
v0.2.0-phase1D-discord-event-pipeline

Milestone ID:
PHASE_1D_DISCORD_EVENT_PIPELINE

Required Token:
PHASE1D_DISCORD_EVENT_PIPELINE_APPROVED
```

## Objective

Implement the Guardian Discord Event Pipeline.

The objective is to connect the Phase 1C Discord Runtime Foundation to Guardian's internal Event Bus through a clean, testable, isolated event pipeline.

This milestone may normalize, wrap, dispatch, route, and publish Discord gateway events as internal runtime events.

This milestone shall not implement security behavior, moderation behavior, AntiNuke behavior, detector behavior, punishment behavior, containment behavior, recovery behavior, Discord REST enforcement, persistence, dashboard behavior, SaaS behavior, or AI behavior.

---

# Phase Dependencies

Phase 1D depends on completion of:

* Phase 1A — Project Foundation
* Phase 1B — Runtime Foundation
* Phase 1C — Discord Runtime Foundation

If the Phase 1C runtime abstractions are missing, incomplete, unstable, or contradictory:

**STOP**

Do not redesign earlier phases.

Await clarification.

---

# Approved Phase 1D Scope

Implementation is limited to the Discord Event Pipeline only.

Approved work includes:

* gateway event dispatcher
* gateway event adapter layer
* gateway event normalization
* gateway event routing
* gateway event subscription registry
* runtime-to-EventBus bridge
* event pipeline lifecycle integration
* event pipeline health reporting
* event pipeline error reporting
* mock gateway event ingestion
* event metadata envelope
* unit tests
* integration tests without live Discord
* `IMPLEMENTATION_TRACEABILITY.md` updates

---

# Explicitly Out of Scope

The following work is prohibited during Phase 1D:

* AntiNuke
* AntiSpam
* moderation
* punishment
* containment
* recovery
* detector framework
* threat scoring
* raid detection
* spam detection
* security policy evaluation
* trust evaluation
* FakePerms logic
* whitelist logic
* role protection
* channel protection
* webhook protection
* invite protection
* guild protection logic
* guild security policy execution
* guild moderation actions
* guild cache mutation
* Discord Audit Log correlation
* Discord REST enforcement
* Discord REST mutation
* ban actions
* kick actions
* timeout actions
* role removal
* role assignment
* channel lock
* channel delete
* channel restore
* slash commands
* prefix commands
* command framework
* database persistence
* HTTP APIs
* dashboard
* SaaS features
* premium modules
* AI modules
* bot token commits
* secret commits
* live Discord connection during tests
* production deployment

---

# Documentation Freeze

The `docs/` tree is frozen during implementation.

Documentation may not be modified unless:

1. a verified implementation-discovered contract gap exists;
2. the discrepancy is documented;
3. the Architecture Authority approves the update.

The only routine documentation update authorized during Phase 1D is:

```text
IMPLEMENTATION_TRACEABILITY.md
```

Documentation updates shall be implementation-driven and shall not expand architectural scope.

---

# Required Startup Behavior

Before implementation, agents must read:

1. `README.md`
2. `IMPLEMENTATION_MANIFEST.md`
3. `IMPLEMENTATION_CONTRACT.md`
4. `IMPLEMENTATION_TRACEABILITY.md`
5. `.governance/MILESTONE_AUTHORIZATION.md`
6. `.governance/IMPLEMENTATION_GATE.md`
7. `.governance/AGENT_EXECUTION_PROTOCOL.md`
8. `.governance/REVIEW_WORKFLOW.md`
9. `docs/09-testing-certification/phase-1-implementation-map.md`
10. `docs/09-testing-certification/phase-1-implementation-package.md`

Agents must confirm `.governance/MILESTONE_AUTHORIZATION.md` contains:

```text
STATE:
IMPLEMENTATION_AUTHORIZED

TOKEN:
PHASE1D_DISCORD_EVENT_PIPELINE_APPROVED
```

If the state or token is absent:

**STOP**

---

# Validation Requirements

Implementation must successfully execute:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
```

If a coverage pipeline exists, the implementation agent shall also execute:

```bash
npm run coverage
```

If validation cannot execute, report:

```text
NOT VERIFIED
```

Validation results shall never be fabricated.

---

# Traceability Requirements

Every created or modified implementation file must be recorded in:

```text
IMPLEMENTATION_TRACEABILITY.md
```

Traceability entries must include:

* file path
* governing repository document
* contract or scope reference
* milestone
* associated tests
* validation status
* implementation status

---

# Stop Gate

After completing Phase 1D, the implementation agent shall stop.

The final implementation report must include:

1. Implementation summary
2. Files created
3. Files modified
4. Tests added
5. Validation results
6. `git status`
7. `git diff`
8. Risks
9. Known limitations
10. Recommended implementation plan for Phase 2A

No additional implementation shall occur without further authorization.

---

# Current Risks

| Risk | Status | Handling |
|---|---|---|
| Scope drift into security behavior | Active | Prohibited by milestone authorization |
| Event pipeline accidentally mutates Discord state | Active | REST enforcement and guild mutation prohibited |
| Event payload interpreted as detector input | Active | Detector framework prohibited |
| Live Discord dependency in tests | Active | Tests must use mocks, fakes, or in-memory adapters |

---

# Final Rule

The active implementation authority is `.governance/MILESTONE_AUTHORIZATION.md`.

If authorization is absent, ambiguous, stale, or contradictory:

**STOP.**
