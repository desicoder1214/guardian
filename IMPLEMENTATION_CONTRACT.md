# Guardian Implementation Contract

**Project:** Guardian  
**Repository:** https://github.com/desicoder1214/guardian  
**Version:** 4.0.0  
**Status:** Active  
**Owner:** Guardian Architecture Authority  
**Current Milestone:** v0.2.0-phase1D-discord-event-pipeline  
**Current Milestone ID:** PHASE_1D_DISCORD_EVENT_PIPELINE

---

# Purpose

The Implementation Contract is the active execution contract for the current milestone.

It translates the approved architecture and milestone authorization into explicit implementation boundaries for implementation agents.

This document does **not** define architecture.

This document does **not** replace repository contracts.

This document does **not** independently authorize implementation.

Implementation authorization is governed exclusively by:

```text
.governance/MILESTONE_AUTHORIZATION.md
```

---

# Relationship to Repository Governance

Implementation shall follow repository authority in the following order of precedence:

1. Repository Contracts (`docs/`)
2. Repository Governance (`.governance/`)
3. `.governance/MILESTONE_AUTHORIZATION.md`
4. `IMPLEMENTATION_MANIFEST.md`
5. Approved Phase Implementation Map
6. This Implementation Contract
7. Human Approval

If any conflict exists:

**STOP**

Do not infer intent.

Await clarification.

---

# Current Milestone

```text
Milestone:
v0.2.0-phase1D-discord-event-pipeline

Milestone ID:
PHASE_1D_DISCORD_EVENT_PIPELINE
```

---

# Implementation Authorization

This document defines implementation scope only.

Implementation may begin only when `.governance/MILESTONE_AUTHORIZATION.md` contains:

```text
STATE:
IMPLEMENTATION_AUTHORIZED

TOKEN:
PHASE1D_DISCORD_EVENT_PIPELINE_APPROVED
```

If that state or token is absent:

**STOP**

Implementation is not authorized.

---

# Milestone Objective

Implement the Guardian Discord Event Pipeline.

The objective is to connect the Phase 1C Discord Runtime Foundation to Guardian's internal Event Bus through a clean, testable, isolated event pipeline.

This milestone may normalize, wrap, dispatch, route, and publish Discord gateway events as internal runtime events.

The event pipeline shall transport and normalize events only.

No event shall trigger a security decision, moderation decision, punishment action, containment action, recovery action, Discord REST enforcement action, or guild mutation during this milestone.

---

# Phase Dependencies

Phase 1D depends on successful completion and certification of:

* Phase 1A — Project Foundation
* Phase 1B — Runtime Foundation
* Phase 1C — Discord Runtime Foundation

If Phase 1C runtime interfaces are missing, incomplete, unstable, or contradictory:

**STOP**

Do not redesign Phase 1C.

Do not bypass the runtime abstraction.

Await clarification.

---

# Authorized Deliverables

The following implementation artifacts are authorized for Phase 1D when implementation is authorized by `.governance/MILESTONE_AUTHORIZATION.md`.

## Discord Event Pipeline

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

---

## Gateway Event Abstractions

Implement abstractions only for gateway events.

Authorized event abstractions include:

* raw gateway event envelope
* normalized gateway event envelope
* gateway event name
* gateway event source
* gateway event timestamp
* gateway event correlation identifier
* gateway event payload reference
* gateway event routing metadata

The event payload shall not be interpreted for security decisions during this milestone.

---

## Event Normalization

Implement event normalization only.

Normalization may include:

* wrapping raw gateway events
* assigning event metadata
* assigning event type names
* assigning timestamps
* assigning correlation identifiers
* preserving raw payload references
* validating structural event shape

Normalization shall not include:

* threat scoring
* moderation classification
* punishment decisions
* trust decisions
* guild policy evaluation
* audit-log correlation
* detector execution

---

## Event Routing

Implement routing infrastructure only.

Routing may include:

* route registration
* route lookup
* route dispatch
* subscription registration
* subscription removal
* fan-out to registered handlers
* publishing normalized events to the internal Event Bus

Routing shall not execute security behavior.

Routing shall not mutate Discord state.

Routing shall not perform Discord REST actions.

---

## Runtime Event Integration

Integrate the Discord Event Pipeline with the existing runtime and Event Bus.

Authorized runtime pipeline events include:

* DiscordEventPipelineStarting
* DiscordEventPipelineStarted
* DiscordEventPipelineStopping
* DiscordEventPipelineStopped
* DiscordGatewayEventReceived
* DiscordGatewayEventNormalized
* DiscordGatewayEventDispatched
* DiscordGatewayEventDispatchFailed
* DiscordEventSubscriptionRegistered
* DiscordEventSubscriptionRemoved
* DiscordEventPipelineError

---

## Dependency Injection

Register Discord Event Pipeline services through the existing DI container.

Authorized DI work includes:

* event pipeline dispatcher registration
* event normalizer registration
* event router registration
* event subscription registry registration
* runtime-to-EventBus bridge registration
* event pipeline health registration

The existing DI container shall not be redesigned.

---

## Testing

Implement tests for:

* gateway event dispatcher
* gateway event normalization
* event routing
* subscription registry
* Event Bus bridge
* DI registration
* pipeline lifecycle
* error handling

Tests shall not require a live Discord connection.

Tests shall not require a real bot token.

Tests shall not connect to Discord.

Tests shall use mocks, fakes, or in-memory adapters only.

---

# Explicitly Prohibited

Implementation shall **not** introduce:

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

Implementation shall not redesign existing architecture.

Implementation shall not expand milestone scope.

---

# Dependency Rules

Implementation shall comply with the following architectural rules:

* Event pipeline depends on Phase 1C Discord Runtime abstractions.
* Event pipeline may publish to the internal Event Bus.
* Event pipeline may depend on runtime health and logging interfaces.
* Event pipeline may use the existing DI container.
* Event pipeline shall not depend on future Security Kernel modules.
* Event pipeline shall not depend on detector modules.
* Event pipeline shall not depend on persistence.
* Event pipeline shall not perform Discord REST mutation.
* Event pipeline shall not execute security decisions.

---

# Authorized File Areas

Implementation should remain within the existing source and test structure.

Authorized source areas include:

```text
src/core/runtime/discord/
src/core/runtime/
src/core/event/
src/infra/di/
tests/unit/
```

New files should be narrowly named around event pipeline concerns.

Implementation shall not create dashboard, API, database, command, detector, AntiNuke, AntiSpam, moderation, SaaS, or AI directories during this milestone.

---

# Traceability Requirements

Every created or modified implementation file must be recorded in:

```text
IMPLEMENTATION_TRACEABILITY.md
```

Each entry must include:

* file path
* repository document
* contract
* milestone
* tests
* validation status
* implementation status

---

# Validation Requirements

Implementation shall successfully execute:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
```

If a coverage pipeline exists within the repository, the implementation agent shall also execute:

```bash
npm run coverage
```

If validation cannot execute:

```text
NOT VERIFIED
```

shall be reported.

Validation shall never be fabricated.

---

# Required Final Report

After completing Phase 1D, the implementation agent shall stop.

The final report shall include:

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

# Completion Rule

Phase 1D is complete only when:

* authorized scope is implemented
* no unauthorized implementation exists
* validation passes
* tests pass
* traceability is updated
* Architecture Review is approved
* Phase Completion Review is approved
* git status is clean after approved commit
* git diff has been reviewed

---

# Final Rule

Implementation authorization does not imply:

* commit approval
* push approval
* merge approval
* production approval

Those require separate explicit human authorization.

If authorization is absent or ambiguous:

**STOP.**
