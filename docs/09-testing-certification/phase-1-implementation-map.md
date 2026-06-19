# Phase 1 Implementation Map

## 1. Governance Status

- Current implementation gate status: CLOSED
- Current implementation state: `IMPLEMENTATION_NOT_AUTHORIZED`
- Milestone authorization: not authorized for implementation
- Code generation authorized: NO
- Required authorization token before implementation:
  - `STATE: IMPLEMENTATION_AUTHORIZED`
  - `TOKEN: PHASE1_IMPLEMENTATION_APPROVED`

## 2. Repository Scope Summary

### Approved Guardian mission
Guardian exists to build a contract-first Discord security platform whose security kernel prevents destructive guild behavior, contains incidents, recovers safe state, and preserves forensic evidence.

### Approved Phase 1 scope
Phase 1 is limited to foundational infrastructure only. Approved work includes:

- Project foundation and bootstrap
- TypeScript configuration and compiler setup
- Shared configuration abstractions
- Dependency injection and service registration
- Shared types, interfaces, and error classes
- Telemetry, metrics, and health interfaces
- Event bus contracts and core event flow
- Authority engine contracts
- Trust registry and FakePerms authority model
- Policy and decision engine foundations
- Foundation tests and implementation traceability

### Explicitly out-of-scope items
Phase 1 must not include runtime or product implementation.

- Discord runtime integration
- Discord event handlers
- Discord commands
- AntiNuke detectors implementation
- AntiSpam implementation
- Moderation implementation
- Dashboard implementation
- Database persistence
- SaaS infrastructure
- Premium modules
- Recovery execution implementation
- Containment or punishment runtime
- HTTP services
- Monitoring infrastructure
- Background workers
- Plugin runtime implementation beyond registry contracts

## 3. Contract References

| File path | Purpose | Implementation impact | Risk if ignored |
|---|---|---|---|
| `IMPLEMENTATION_MANIFEST.md` | Defines current milestone scope, gate status, and authorized work | Must anchor Phase 1 boundaries and prevent unauthorized implementation | Implementation may drift into prohibited runtime work |
| `.governance/IMPLEMENTATION_GATE.md` | Defines closed/open gate and required token | Governs whether any implementation may begin | Implementation may proceed without proper authorization |
| `.governance/MILESTONE_AUTHORIZATION.md` | Records milestone authorization state | Confirms whether map-only output is permitted | Implementation may be started prematurely |
| `.governance/ARCHITECT_REVIEW_CHECKLIST.md` | Defines architecture review criteria | Guides architecture validation and contract adherence | Incomplete architectural review may miss scope or risk |
| `docs/00-governance/scope-boundaries.md` | Defines in-scope and out-of-scope functionality | Establishes security kernel priority and scope limits | Optional features may be allowed to block kernel work |
| `docs/01-architecture/high-level-architecture.md` | Describes Guardian architecture and kernel boundary | Informs system component relationships and kernel isolation | Misaligned architecture may produce untestable, drift-prone design |
| `docs/03-contracts/system-contract-register.md` | Registers major subsystem contracts | Provides authoritative required behavior for subsystems | Subsystems may be implemented without contract traceability |
| `docs/05-security-kernel/antinuke-core.md` | Defines AntiNuke pipeline and event contracts | Drives security event classification and decision flow | AntiNuke behavior may be underspecified or unsafe |
| `docs/05-security-kernel/fakeperms-authority.md` | Defines internal authority model | Drives trust registry, deny-by-default rules, and capability evaluation | Authority decisions may be inconsistent or insecure |
| `docs/05-security-kernel/bot-authorization.md` | Defines bot authorization and unauthorized bot flow | Guides unauthorized bot containment logic and schema | Unknown bots may be treated as trusted incorrectly |
| `docs/05-security-kernel/webhook-integration-security.md` | Defines webhook/integration security | Guides webhook freeze and persistence protection architecture | Webhook threats may bypass containment |
| `docs/05-security-kernel/lockdown-beast-panic.md` | Defines lockdown, panic, and emergency containment | Guides recovery lock and emergency mode architecture | Lockdown design may be non-assertive or unsafe |
| `docs/05-security-kernel/recovery-snapshot.md` | Defines snapshot and recovery safety model | Guides snapshot data model and restore validation | Recovery may restore unsafe or compromised state |
| `docs/06-implementation/api-contract.md` | Defines API boundary, authorization, and error contracts | Guides kernel/internal API design and authorization requirements | APIs may bypass kernel or leak cross-guild data |
| `docs/06-implementation/configuration-contract.md` | Defines configuration model, validation, and audit rules | Guides safe config and feature-flag contracts | Unsafe default configuration or bypassable settings may be introduced |
| `docs/06-implementation/module-registry-contract.md` | Defines module registration and boundary rules | Guides kernel isolation and optional module contracts | Optional modules may block or weaken the security kernel |
| `docs/06-implementation/logging-forensics-contract.md` | Defines structured logging and forensic evidence requirements | Guides audit log schema and failure handling design | Forensic evidence may be incomplete or unsearchable |
| `docs/06-implementation/recovery-orchestrator-contract.md` | Defines recovery orchestration and snapshot validation | Guides recovery job plans and verification strategy | Recovery may be executed without incident safety controls |
| `docs/06-implementation/punishment-catalog.md` | Defines punishment action contracts and ordering | Guides evidence-based punishment and deduplication | Punishment may be duplicated or poorly ordered |
| `docs/07-testing/unit-test-contract.md` | Defines unit test requirements for security-critical modules | Guides test coverage and determinism requirements | Implementation may lack required test evidence |
| `docs/08-build-execution/implementation-roadmap.md` | Defines roadmap philosophy and phase rules | Confirms Phase 1 is architecture-first and within approved scope | Implementation may violate roadmap sequencing |
| `.governance/AGENT_EXECUTION_PROTOCOL.md` | Defines what Codex may do while gate is closed | Confirms no file creation or code generation until token present | Agent may mistakenly produce unauthorized implementation |

## 4. Phase 1 Security Kernel Map

### Security kernel
Phase 1 must map the kernel without implementing runtime.

- Event intake / event bus contracts: kernel receives normalized events and routes them through documented security pipelines.
- Detection architecture: AntiNuke contracts and event classification defined in document form.
- Attribution and audit-log correlation: actor attribution and correlation ID rules must be captured, not executed.
- FakePerms / trust authority: explicit deny-by-default authority model, capability catalog, trust registry contract.
- Policy and decision engine: decision types, risk scoring inputs, evidence outputs, and containment priorities.
- Logging and forensics: structured log schema, correlation IDs, incident IDs, and evidence requirements.
- Recovery snapshot system: snapshot model, validation rules, restore plan requirements, and safety gating.
- Emergency containment: lockdown, panic, Beast Mode, and recovery lock architecture.
- Module boundary rules: kernel isolation, optional modules, plugin registration, and service interactions.

### Event ingestion

- Inbound events are defined as Discord gateway events, audit logs, and cached context.
- Event flow is normalized before security decisions.
- The security kernel must be isolated from optional module slow paths.
- The event bus should expose contracts only, with no Discord runtime dependency in Phase 1.

### Audit-log correlation

- Correlation identifiers and incident timelines are core to forensic evidence.
- Actor attribution must use audit logs, gateway metadata, and guardian-owned markers.
- Uncertain attribution must be logged as uncertainty, not invented certainty.
- Audit and decision logs must include guild_id, actor_id, incident_id, event_id, correlation_id, trace_id.

### Unauthorized bot containment

- Bot authorization registry is a kernel contract.
- Unknown bots are denied by default.
- Containment flow is defined in architecture and catalog documents.
- Phase 1 should define the bot authorization data model and decision API without runtime removal logic.

### AntiNuke detector contracts

- AntiNuke pipeline is defined in `docs/05-security-kernel/antinuke-core.md`.
- Contract components include ingestion, classification, attribution, authority evaluation, scoring, decision, containment, punishment, recovery trigger, and logging.
- Phase 1 must capture these contracts and test plans.

### Punishment engine

- Punishment is evidence-based, deduplicated, and authority-aware.
- Phase 1 should define punishment action contracts, planner interfaces, and logging requirements.
- Actual execution of ban/kick/timeout/neutralize remains out-of-scope.

### FakePerms / trust authority

- FakePerms is the kernel authority layer.
- Decisions must be explicit and revocable.
- Discord Administrator is not enough for Guardian trust.
- Capability catalog items such as `ANTINUKE_CONFIG`, `WEBHOOK_FREEZE`, `LOCKDOWN_EXECUTE` must be documented.

### Quarantine / neutralize flow

- Containment and neutralization are required kernel concepts.
- Phase 1 must define flow and decision classes, not runtime channel or role manipulation.

### Webhook and integration freeze

- Webhook freeze is a hot-path containment action.
- Phase 1 must document webhook security decisions, authorized actions, and incident integration.
- Actual webhook deletion or freeze runtime is deferred.

### Recovery snapshot system

- Snapshots must be versioned, timestamped, validated, and safe.
- Recovery is not the first line of defense.
- Phase 1 must define the snapshot data model, job lifecycle, and verification contract.

### Logging / forensics

- Structured logs must be searchable, causal, and non-blocking.
- Failure of logging must be visible and not silently suppress evidence.
- Forensic timeline tests are required.

### Lockdown / Beast panic

- Emergency containment modes are part of kernel architecture.
- Activation rules, authorization, and unlock requirements must be documented.
- Phase 1 should preserve these contracts without implementing permission overlay runtime.

### Validation and certification harness

- Phase 1 must plan test coverage for contract compliance.
- Required validation includes lint, format, typecheck, build, and tests, but actual execution is blocked by authorization.

## 5. Proposed Future File Tree

```
src/
  core/
    config/
    event/
    authority/
    fakeperms/
    detection/
    decision/
    logging/
    recovery/
    lockdown/
    plugin/
  shared/
    types/
    interfaces/
    errors/
    telemetry/
    metrics/
    health/
  infra/
    di/
    persistence/
    discord/
    audit/
  tests/
    unit/
    integration/
    regression/
    certification/
  implementation-traceability/
    IMPLEMENTATION_TRACEABILITY.md
```

## 6. Traceability Matrix

| Requirement Source | Planned Component | Test Requirement | Status |
|---|---|---|---|
| `IMPLEMENTATION_MANIFEST.md` | Foundation scaffolding, TypeScript, DI, shared types | Foundation tests | Planned |
| `docs/05-security-kernel/antinuke-core.md` | AntiNuke contract module and event definitions | Detector contract tests | Planned |
| `docs/05-security-kernel/fakeperms-authority.md` | FakePerms authority registry and decision interface | FakePerms unit tests | Planned |
| `docs/06-implementation/logging-forensics-contract.md` | Structured logging / forensic evidence schema | Logging correlation tests | Planned |
| `docs/06-implementation/recovery-orchestrator-contract.md` | Snapshot data model and recovery job contract | Snapshot validation tests | Planned |
| `docs/06-implementation/module-registry-contract.md` | Module registry and kernel boundary contract | Module isolation tests | Planned |
| `docs/07-testing/unit-test-contract.md` | Unit testing strategy for kernel modules | Unit test coverage | Planned |
| `.governance/IMPLEMENTATION_GATE.md` | Authorization gate and token requirement | Governance compliance review | Not authorized |
| `.governance/MILESTONE_AUTHORIZATION.md` | Milestone authorization state | Authorization review | Not authorized |
| `docs/00-governance/scope-boundaries.md` | Kernel priority and out-of-scope enforcement | Scope validation | Planned |

## 7. Validation Gates Before Code

- Confirm the implementation gate is opened by updating `.governance/MILESTONE_AUTHORIZATION.md` and `IMPLEMENTATION_MANIFEST.md` with the required token.
- Confirm architecture review approval for this implementation map.
- Confirm implementation contract table approval and traceability plan.
- Confirm that `IMPLEMENTATION_TRACEABILITY.md` exists and is ready to capture Phase 1 artifacts.
- Confirm that Phase 1 scope remains limited to foundational kernel contracts and shared infrastructure.
- Confirm no documentation freeze violation; any contract gap documentation must be approved.
- Confirm the test strategy for lint, format, typecheck, build, and unit tests.
- Confirm no source code generation or runtime file creation until authorization.

## 8. Risks and Open Questions

- Risk: The repository is currently locked by the implementation gate and milestone authorization. No implementation may begin.
- Risk: There is no explicit Phase 1 technical architecture document beyond the general high-level architecture and roadmap guidance.
- Risk: The required `IMPLEMENTATION_TRACEABILITY.md` artifact is referenced by governance but is not visible in the current repo tree.
- Risk: Documentation freeze means any new documentation updates must be approved before being promoted to contracts.
- Open question: Should Phase 1 include only abstract kernel interfaces and contracts, or also minimal non-runtime scaffolding for planned components?
- Open question: What exact future module and package organization should be adopted for `src/` to satisfy kernel isolation and testability?
- Open question: Does Phase 1 require a dedicated contract file for `Security Kernel Foundation` separate from general architecture and roadmap documents?
- Gap: The current repository lacks a `docs/09-testing-certification/phase-1-implementation-map.md` file, which this document now fills.

## 9. Final Verdict

Repository analysis: COMPLETE
Implementation map: COMPLETE
Implementation authorized: NO
Code generated: NO
Next required action: HUMAN REVIEW AND IMPLEMENTATION AUTHORIZATION
