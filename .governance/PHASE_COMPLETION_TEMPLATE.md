# Guardian Milestone Authorization

**Milestone:** v0.2.0-phase1D-discord-event-pipeline
**Milestone ID:** PHASE_1D_DISCORD_EVENT_PIPELINE
**Authorization Owner:** Guardian Architecture Authority
**Status:** Active
**Version:** 4.0

---

# Purpose

This document is the sole authorization artifact for implementation of the current milestone.

It authorizes implementation agents to implement **only** the approved scope defined for this milestone.

Implementation outside this scope constitutes architectural drift and shall immediately stop.

This document authorizes implementation only.

It does **not** authorize:

* architecture redesign
* repository restructuring
* milestone expansion
* commit
* push
* merge
* production release

---

# Current State

```text
STATE:
IMPLEMENTATION_AUTHORIZED

TOKEN:
PHASE1D_DISCORD_EVENT_PIPELINE_APPROVED
```

---

# Authorized Milestone

```text
Milestone:
Phase 1D — Discord Event Pipeline
```

---

# Milestone Objective

Implement the Guardian Discord Event Pipeline.

The objective is to connect the Phase 1C Discord Runtime Foundation to Guardian's internal Event Bus through a clean, testable, isolated event pipeline.

This milestone may normalize, wrap, classify structurally, dispatch, route, and publish Discord gateway events as internal runtime events.

No AntiNuke, AntiSpam, moderation, punishment, containment, recovery, detector, command, persistence, dashboard, SaaS, or AI behavior shall be implemented during this milestone.

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

# Repository Authority

Implementation shall follow repository authority in the following order:

1. Repository Contracts
2. Repository Governance
3. IMPLEMENTATION_MANIFEST.md
4. IMPLEMENTATION_CONTRACT.md
5. Approved Phase Implementation Map
6. This Milestone Authorization
7. Human Approval

If any conflict exists:

**STOP**

Do not infer intent.

Await clarification.

---

# Entry Criteria

Implementation may begin only if:

* Architecture Review = APPROVED
* Repository Governance = APPROVED
* IMPLEMENTATION_CONTRACT.md = APPROVED
* IMPLEMENTATION_MANIFEST.md = APPROVED
* Phase Implementation Map = APPROVED
* Implementation Gate = OPEN
* STATE = IMPLEMENTATION_AUTHORIZED
* Phase 1C = CERTIFIED
* Phase 1C tag exists or Phase 1C commit is identifiable

---

# Authorized Scope

Implementation is limited to the Discord Event Pipeline only.

## Discord Event Pipeline

* Gateway event dispatcher
* Gateway event adapter layer
* Gateway event normalization
* Gateway event routing
* Gateway event subscription registry
* Runtime-to-EventBus bridge
* Event pipeline lifecycle integration
* Event pipeline health reporting
* Event pipeline error reporting
* Mock gateway event ingestion
* Event metadata envelope

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

---

## Testing

Implement:

* gateway event dispatcher tests
* gateway event normalization tests
* event routing tests
* subscription registry tests
* Event Bus bridge tests
* DI registration tests
* pipeline lifecycle tests
* error handling tests

Tests shall not require a live Discord connection.

Tests shall not require a real bot token.

Tests shall not connect to Discord.

Tests shall use mocks, fakes, or in-memory adapters only.

---

## Documentation

Update only:

* IMPLEMENTATION_TRACEABILITY.md

Documentation updates shall be implementation-driven.

Documentation shall not expand architectural scope.

---

# Explicitly Prohibited

The following are outside the authorized milestone:

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

# Required Deliverables

The milestone shall deliver:

* Discord Event Pipeline implementation
* gateway event dispatcher
* gateway event adapter layer
* event normalization
* event routing
* event subscription registry
* runtime-to-EventBus bridge
* event pipeline lifecycle integration
* event pipeline health reporting
* event pipeline error reporting
* DI registration for event pipeline services
* mock gateway event tests
* unit tests
* integration tests without live Discord
* validation results
* traceability updates

Implementation-driven documentation only.

No deliverable is complete without associated tests.

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

If no coverage pipeline exists, this requirement does not apply.

If validation cannot execute:

```text
NOT VERIFIED
```

shall be reported.

Validation shall never be fabricated.

---

# Exit Criteria

Phase 1D is complete only when:

* authorized scope implemented
* no unauthorized implementation exists
* no AntiNuke implementation exists
* no AntiSpam implementation exists
* no moderation implementation exists
* no detector implementation exists
* no punishment implementation exists
* no containment implementation exists
* no recovery implementation exists
* no Discord REST enforcement implementation exists
* no guild mutation implementation exists
* no bot token exists in the repository
* tests require no live Discord connection
* validation passes
* tests pass
* traceability updated
* Architecture Review approved
* Phase Completion Review approved
* git status clean
* git diff reviewed

---

# Required Stop Gate

After completing Phase 1D, the implementation agent shall stop.

The final report shall include:

1. Implementation summary
2. Files created
3. Files modified
4. Tests added
5. Validation results
6. git status
7. git diff
8. Risks
9. Known limitations
10. Recommended implementation plan for Phase 2A

No additional implementation shall occur without further authorization.

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
