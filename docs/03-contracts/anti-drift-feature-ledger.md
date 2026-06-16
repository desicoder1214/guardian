# Guardian Anti-Drift Feature Ledger

## 1. Purpose

The Anti-Drift Feature Ledger prevents Guardian from drifting away from its approved architecture, security mission, threat model, and system contracts.

This file defines which features are approved, which are optional, which are prohibited, and what evidence is required before implementation.

---

## 2. Core Rule

No feature may be implemented unless it traces to:

Governance
→ Architecture
→ Threat Model
→ System Contract
→ Security Kernel Contract
→ Tests
→ Certification Evidence

If a feature cannot be traced, it is architecture drift.

---

## 3. Approved Security-Kernel Features

These features are approved as core Guardian security features:

- AntiNuke
- FakePerms Authority
- Bot Authorization
- Webhook and Integration Security
- Lockdown
- Panic Mode
- Recovery and Snapshot
- Logging and Forensics
- Dangerous Role Protection
- Role Escalation Protection
- Unauthorized Bot Protection
- Invite Abuse Protection
- Raid Containment
- Incident State Tracking

---

## 4. Approved Platform Features

These features are approved platform features:

- AntiSpam
- Moderation
- Jail / Neutralize
- Release
- Case logging
- Dashboard configuration
- Trust inspection
- Bot registry management
- Guild configuration
- Feature flags
- Multi-guild SaaS operation

---

## 5. Optional Future Features

Optional future features may include:

- AI moderation
- Leveling
- Giveaways
- Ticket system
- Economy system
- Analytics dashboard
- Premium SaaS modules
- Utility commands
- Community engagement modules

Optional features must never weaken or delay the security kernel.

---

## 6. Prohibited Drift

The following are prohibited unless explicitly approved by architecture review:

- Bypassing FakePerms
- Trusting raw Discord Administrator as Guardian trust
- Allowing unknown bots by default
- Restoring dangerous roles blindly
- Cosmetic lockdown without real permission enforcement
- Logging-only security for destructive events
- Optional modules blocking AntiNuke
- Recovery executing before containment
- Silent failure of punishment
- Silent failure of recovery
- Unlogged security decisions
- New trust models outside FakePerms

---

## 7. Feature Admission Requirements

A new feature must have:

- Feature name
- Purpose
- Architecture reference
- Threat-model reference
- Contract reference
- Owner
- Inputs
- Outputs
- Failure behavior
- Logging requirements
- Test requirements
- Certification criteria

Without these, the feature is not approved.

---

## 8. Feature Status Values

Feature status may be:

- Proposed
- Approved
- In Design
- In Implementation
- Test Pending
- Drill Pending
- Certified
- Deprecated
- Rejected
- Superseded

Only Certified features may be considered production-ready.

---

## 9. Approved Feature Ledger

| Feature | Type | Status | Contract |
|---|---|---|---|
| AntiNuke Core | Security Kernel | Approved | AntiNuke Core |
| FakePerms Authority | Security Kernel | Approved | FakePerms Authority |
| Bot Authorization | Security Kernel | Approved | Bot Authorization |
| Webhook Security | Security Kernel | Approved | Webhook Integration Security |
| Recovery Snapshot | Security Kernel | Approved | Recovery Snapshot |
| Lockdown / Panic | Security Kernel | Approved | Lockdown Beast Panic |
| AntiSpam | Platform Security | Approved | System Contract Register |
| Moderation | Platform Security | Approved | System Contract Register |
| Dashboard | Platform | Approved | High-Level Architecture |
| Multi-Guild SaaS | Platform | Approved | High-Level Architecture |

---

## 10. Required Traceability

Each feature must trace to:

- North Star
- Executive Principles
- Scope Boundaries
- Executive Architecture Contract
- High-Level Architecture
- Threat Model
- System Contract Register
- Relevant Security Kernel contract
- Certification Matrix
- Live Drill Plan

Traceability must be reviewable.

---

## 11. AntiNuke Drift Rules

AntiNuke must not drift into:

- Slow dashboard dependency
- Optional module dependency
- Logging-only detection
- Recovery-first behavior
- Unbounded audit polling
- Duplicate punishment
- Silent actor attribution assumptions

AntiNuke must remain hot-path, evidence-based, and authority-aware.

---

## 12. FakePerms Drift Rules

FakePerms must not drift into:

- Raw Discord permission trust
- Hidden trust grants
- Unlogged trust decisions
- Irrevocable trust
- Module-specific authority bypasses

FakePerms is the Guardian authority source of truth.

---

## 13. Bot Authorization Drift Rules

Bot Authorization must not drift into:

- Allowing unknown bots by default
- Trusting bot name or popularity
- Ignoring inviter attribution
- Skipping webhook sweep
- Allowing revoked bots
- Silent registry failure

Unknown bots are denied by default.

---

## 14. Webhook Security Drift Rules

Webhook Security must not drift into:

- Treating webhook abuse as normal spam only
- Ignoring webhook persistence after bot removal
- Skipping attribution
- Skipping deletion/freeze
- Allowing optional modules to own webhook containment

Webhook containment remains security-kernel work.

---

## 15. Recovery Drift Rules

Recovery must not drift into:

- Blindly restoring dangerous permissions
- Restoring dangerous roles to users automatically
- Erasing forensic evidence
- Running before containment
- Marking partial failures as success
- Hiding missing snapshot errors

Recovery restores safe state, not compromised state.

---

## 16. Lockdown Drift Rules

Lockdown must not drift into:

- Cosmetic-only status messages
- No real permission enforcement
- Unlock without restore verification
- Missing session persistence
- UI showing success when enforcement failed

Lockdown is only complete when Discord permissions are actually enforced.

---

## 17. Logging Drift Rules

Logging must not drift into:

- Blocking containment
- Missing security decisions
- Missing actor/target evidence
- Missing recovery outcomes
- Missing final verdicts
- Unreviewable incident records

Logs must support forensic review and certification.

---

## 18. Optional Module Rules

Optional modules may not:

- Block AntiNuke
- Override FakePerms
- Authorize bots
- Manage security trust independently
- Execute recovery
- Release lockdown
- Suppress security logs
- Modify security kernel state directly

Optional modules must communicate through approved interfaces.

---

## 19. Change Control

Any change to core security behavior requires:

- Architecture review
- Contract update
- Threat-model update if applicable
- Test update
- Certification update
- ADR entry if architectural

Security behavior must not change silently.

---

## 20. Certification Gate

A feature cannot be marked Certified unless:

- Documentation exists
- Contract exists
- Tests exist
- Simulation drill passes
- Live drill passes where required
- Logs prove behavior
- Regression protection exists
- Operator review is complete

---

## 21. Review Checklist

Before accepting a feature, reviewers must ask:

1. Does this support the North Star?
2. Does this match the architecture?
3. Does this address a real threat?
4. Does this have a contract?
5. Does this preserve security-kernel priority?
6. Does this preserve FakePerms authority?
7. Does this fail safely?
8. Does this log evidence?
9. Does this have tests?
10. Does this have certification criteria?

---

## 22. Rejection Criteria

Reject a feature if it:

- Weakens AntiNuke
- Bypasses FakePerms
- Creates hidden trust
- Adds unbounded latency to hot paths
- Restores unsafe state
- Hides failures
- Lacks tests
- Lacks logs
- Lacks a contract
- Cannot be certified

---

## 23. Anti-Drift Verdict

Guardian must remain contract-first.

This ledger is the guardrail against hallucinated features, accidental scope creep, unsafe implementation shortcuts, and architecture drift.

Features that do not trace to this ledger and the approved contracts are not part of Guardian.
