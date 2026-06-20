# Guardian Milestone Authorization

**Milestone:** v0.3.0-phase2A-discord-gateway-adapter
**Milestone ID:** PHASE_2A_DISCORD_GATEWAY_ADAPTER
**Authorization Owner:** Guardian Architecture Authority
**Status:** Active
**Version:** 5.0

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
PHASE2A_DISCORD_GATEWAY_ADAPTER_APPROVED
```

---

# Authorized Milestone

```text
Milestone:
Phase 2A — Discord Gateway Adapter
```

---

# Milestone Objective

Implement the Guardian Discord Gateway Adapter.

The objective is to connect Discord gateway event sources to the existing Phase 1D Discord Event Pipeline through a clean, testable, isolated adapter layer.

This milestone may subscribe to Discord gateway events, wrap gateway payloads into raw gateway event envelopes, and pass them into the existing Discord Event Pipeline.

This milestone may implement gateway connection lifecycle integration behind existing Discord runtime abstractions.

No AntiNuke, AntiSpam, moderation, punishment, containment, recovery, detector, audit-log correlation, command, persistence, dashboard, SaaS, AI, FakePerms, security policy, trust evaluation, or Discord REST enforcement behavior shall be implemented during this milestone.

The gateway adapter shall transport gateway events only.

No gateway event shall trigger a security decision, moderation decision, punishment action, containment action, recovery action, Discord REST enforcement action, or guild mutation during this milestone.

---

# Phase Dependencies

Phase 2A depends on successful completion and certification of:

* Phase 1A — Project Foundation
* Phase 1B — Runtime Foundation
* Phase 1C — Discord Runtime Foundation
* Phase 1D — Discord Event Pipeline

If the Phase 1D event pipeline interfaces are missing, incomplete, unstable, or contradictory:

**STOP**

Do not redesign Phase 1D.

Do not bypass the event pipeline abstraction.

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
* Phase 1D = CERTIFIED
* Phase 1D commit is identifiable
* git working tree is clean before implementation

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

During startup, the implementation agent shall not:

* create files
* modify files
* delete files
* rename files
* format files
* normalize whitespace
* normalize line endings
* update traceability
* update documentation
* update package metadata
* touch placeholders

No write operation is authorized until authorization and repository integrity have both been verified.

---

# Authorized Scope

Implementation is limited to the Discord Gateway Adapter only.

## Discord Gateway Adapter

Authorized work includes:

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

Implement:

* gateway adapter lifecycle tests
* gateway event mapping tests
* gateway-to-pipeline bridge tests
* mock gateway event source tests
* adapter error handling tests
* DI registration tests
* no-live-Discord tests

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

# Required Deliverables

The milestone shall deliver:

* Discord Gateway Adapter interface
* Discord Gateway Adapter implementation
* gateway event source abstraction
* gateway lifecycle integration
* gateway event listener registration
* gateway event listener removal
* gateway-to-pipeline bridge
* raw gateway event envelope mapping
* adapter health reporting
* adapter error reporting
* DI registration for gateway adapter services
* mock/fake gateway adapter tests
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

Phase 2A is complete only when:

* authorized scope implemented
* no unauthorized implementation exists
* no AntiNuke implementation exists
* no AntiSpam implementation exists
* no moderation implementation exists
* no detector implementation exists
* no audit-log correlation implementation exists
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

After completing Phase 2A, the implementation agent shall stop.

The final report shall include:

1. Implementation summary
2. Files created
3. Files modified
4. Tests added
5. Validation results
6. git status
7. git diff
8. Dependencies added or changed
9. Risks
10. Known limitations
11. Recommended implementation plan for Phase 2B

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
