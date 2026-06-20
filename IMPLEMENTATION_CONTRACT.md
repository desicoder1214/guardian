# Guardian Implementation Contract

**Project:** Guardian  
**Repository:** https://github.com/desicoder1214/guardian  
**Version:** 5.0.0  
**Status:** Active  
**Owner:** Guardian Architecture Authority  
**Current Milestone:** v0.3.0-phase2A-discord-gateway-adapter  
**Current Milestone ID:** PHASE_2A_DISCORD_GATEWAY_ADAPTER

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
v0.3.0-phase2A-discord-gateway-adapter

Milestone ID:
PHASE_2A_DISCORD_GATEWAY_ADAPTER
```

---

# Implementation Authorization

This document defines implementation scope only.

Implementation may begin only when `.governance/MILESTONE_AUTHORIZATION.md` contains:

```text
STATE:
IMPLEMENTATION_AUTHORIZED

TOKEN:
PHASE2A_DISCORD_GATEWAY_ADAPTER_APPROVED
```

If that state or token is absent:

**STOP**

Implementation is not authorized.

---

# Milestone Objective

Implement the Guardian Discord Gateway Adapter.

The objective is to connect Discord gateway event sources to the existing Phase 1D Discord Event Pipeline through a clean, testable, isolated adapter layer.

This milestone may subscribe to Discord gateway events, wrap gateway payloads into raw gateway event envelopes, and pass those envelopes into the existing Discord Event Pipeline.

The gateway adapter shall transport gateway events only.

No event shall trigger a security decision, moderation decision, punishment action, containment action, recovery action, Discord REST enforcement action, audit-log correlation, detector execution, FakePerms evaluation, or guild mutation during this milestone.

---

# Phase Dependencies

Phase 2A depends on successful completion and certification of:

* Phase 1A — Project Foundation
* Phase 1B — Runtime Foundation
* Phase 1C — Discord Runtime Foundation
* Phase 1D — Discord Event Pipeline

If Phase 1D event pipeline interfaces are missing, incomplete, unstable, or contradictory:

**STOP**

Do not redesign Phase 1D.

Do not bypass the event pipeline abstraction.

Await clarification.

---

# Repository Integrity Gate

Startup verification is strictly read-only.

Before implementation begins, the implementation agent shall execute:

```bash
git status --short
git diff --stat
git diff --name-only
```

If any unexpected modification exists:

**STOP**

Do not implement.

Do not repair automatically.

Report the unexpected files and await Architecture Review.

During startup, the implementation agent shall not create, modify, delete, rename, format, normalize, or update any repository file.

No write operation is authorized until authorization and repository integrity have both been verified.

---

# Authorized Deliverables

The following implementation artifacts are authorized for Phase 2A when implementation is authorized by `.governance/MILESTONE_AUTHORIZATION.md`.

## Discord Gateway Adapter

* gateway adapter interface
* gateway adapter implementation
* Discord gateway event source abstraction
* Discord gateway subscription wrapper
* Discord gateway lifecycle hooks
* gateway connect abstraction
* gateway disconnect abstraction
* gateway reconnect abstraction
* gateway shutdown abstraction
* gateway event listener registration
* gateway event listener removal
* gateway-to-pipeline bridge
* mapping Discord gateway payloads to raw gateway event envelopes
* passing raw gateway event envelopes into the existing Discord Event Pipeline
* adapter health reporting
* adapter error reporting
* adapter lifecycle events
* mock gateway adapter for tests
* fake gateway event source for tests

---

## Gateway Event Mapping

The adapter may map Discord gateway events into the Phase 1D raw gateway event envelope.

Authorized mapping includes:

* event name
* sequence number if available
* op code if available
* raw payload reference
* source metadata
* timestamp
* adapter correlation identifier if required by the existing pipeline contract

The adapter shall not interpret payloads for security, moderation, punishment, containment, recovery, trust, FakePerms, or policy decisions.

The adapter shall not perform guild state mutation.

---

## Gateway Lifecycle Integration

The adapter may expose and test gateway lifecycle behavior.

Authorized lifecycle behavior includes:

* start
* stop
* connect
* disconnect
* reconnect
* shutdown
* subscription registration
* subscription removal
* error reporting
* health reporting

Lifecycle integration shall not perform security behavior.

Lifecycle integration shall not mutate guild state.

Lifecycle integration shall not perform Discord REST enforcement.

---

## Runtime Event Integration

Integrate the Discord Gateway Adapter with the existing runtime and Event Bus.

Authorized runtime adapter events include:

* DiscordGatewayAdapterStarting
* DiscordGatewayAdapterStarted
* DiscordGatewayAdapterStopping
* DiscordGatewayAdapterStopped
* DiscordGatewayAdapterConnected
* DiscordGatewayAdapterDisconnected
* DiscordGatewayAdapterReconnecting
* DiscordGatewayAdapterError
* DiscordGatewayAdapterEventReceived
* DiscordGatewayAdapterEventForwarded
* DiscordGatewayAdapterEventForwardFailed

If the existing runtime event enum requires extension, add only these Phase 2A events.

---

## Dependency Injection

Register Discord Gateway Adapter services through the existing DI container.

Authorized DI work includes:

* gateway adapter registration
* gateway event source registration
* gateway-to-pipeline bridge registration
* mock gateway adapter registration for tests
* adapter health registration

The existing DI container shall not be redesigned.

---

## Dependency Policy

If a Discord gateway library dependency is required, the implementation agent may add a minimal, pinned dependency only for gateway adapter integration.

Dependency changes shall be reported explicitly in the final implementation report.

No dependency may be added for AntiNuke, moderation, persistence, dashboard, SaaS, AI, or unrelated functionality.

---

## Testing

Implement tests for:

* gateway adapter lifecycle
* gateway event mapping
* gateway-to-pipeline bridge
* mock gateway event source
* adapter error handling
* DI registration
* no-live-Discord execution

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
* audit-log correlation
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
* guild cache mutation beyond gateway event transport requirements
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

* Gateway adapter depends on Phase 1C Discord Runtime abstractions.
* Gateway adapter depends on Phase 1D Discord Event Pipeline abstractions.
* Gateway adapter may publish to the internal Event Bus only through existing runtime/event abstractions.
* Gateway adapter may depend on runtime health and logging interfaces.
* Gateway adapter may use the existing DI container.
* Gateway adapter shall not depend on future Security Kernel modules.
* Gateway adapter shall not depend on detector modules.
* Gateway adapter shall not depend on persistence.
* Gateway adapter shall not perform Discord REST mutation.
* Gateway adapter shall not execute security decisions.

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

New files should be narrowly named around gateway adapter concerns.

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

After completing Phase 2A, the implementation agent shall stop.

The final report shall include:

1. Implementation summary
2. Files created
3. Files modified
4. Tests added
5. Validation results
6. `git status`
7. `git diff`
8. Dependencies added or changed
9. Risks
10. Known limitations
11. Recommended implementation plan for Phase 2B

No additional implementation shall occur without further authorization.

---

# Completion Rule

Phase 2A is complete only when:

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
