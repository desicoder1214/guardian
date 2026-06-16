# Guardian System Contract Register

## Purpose

This document defines the authoritative contracts for every major Guardian subsystem.

A contract defines:

- Purpose
- Responsibilities
- Inputs
- Outputs
- Security guarantees
- Failure behavior
- Acceptance criteria

No subsystem may drift from its documented contract.

---

# Contract 001 — AntiNuke

## Purpose

Detect and contain destructive actions against a guild.

## Inputs

- Gateway events
- Audit log attribution
- Trust registry
- Configuration

## Outputs

- Security decisions
- Punishment actions
- Recovery requests
- Forensic logs

## Security Guarantees

- Destructive actions are evaluated.
- Trusted exemptions are respected.
- Duplicate punishment is prevented.

## Acceptance Criteria

- Channel deletion detected.
- Role deletion detected.
- Dangerous role grants detected.
- Unauthorized bot additions detected.

---

# Contract 002 — AntiSpam

## Purpose

Protect guilds from message abuse.

## Inputs

- Message events
- User history
- Spam detectors

## Outputs

- Warnings
- Timeouts
- Message deletion
- Logs

## Acceptance Criteria

- Flood spam detected.
- Mention spam detected.
- Invite spam detected.

---

# Contract 003 — Moderation

## Purpose

Provide human-facing moderation controls.

## Responsibilities

- Warn
- Timeout
- Kick
- Ban
- Neutralize
- Release

## Acceptance Criteria

- Actions logged.
- Permissions validated.
- Audit trail generated.

---

# Contract 004 — FakePerms Authority

## Purpose

Determine Guardian-effective authority.

## Rules

- Discord Administrator does not imply trust.
- Trust must be explicit.
- Trust must be revocable.

## Outputs

- Allow
- Deny
- Escalate
- Audit

---

# Contract 005 — Authority Registry

## Purpose

Maintain trusted users, roles, and operators.

## Requirements

- Explicit registration.
- Full auditability.
- Revocation support.

---

# Contract 006 — Bot Authorization

## Purpose

Control which bots may operate in protected guilds.

## Rules

- Unknown bots denied by default.
- Authorized bots explicitly registered.
- Authorization auditable.

## Response

Unauthorized bot:

1. Detect.
2. Attribute inviter.
3. Remove bot.
4. Evaluate punishment.
5. Freeze related webhooks.

---

# Contract 007 — Webhook Security

## Purpose

Protect against webhook persistence and abuse.

## Threats

- Unauthorized webhook creation.
- Webhook spam.
- Integration abuse.

## Response

- Freeze.
- Delete.
- Log.
- Attribute.

---

# Contract 008 — Invite Protection

## Purpose

Protect against malicious invite usage.

## Responsibilities

- Invite tracking.
- Creator attribution.
- Join correlation.

---

# Contract 009 — JoinGate

## Purpose

Evaluate joining members for risk.

## Inputs

- Join event.
- Account age.
- Guild state.

## Outputs

- Allow.
- Monitor.
- Neutralize.

---

# Contract 010 — AntiRaid

## Purpose

Detect coordinated join attacks.

## Indicators

- Join bursts.
- Spam bursts.
- Bot waves.

## Response

- Slow joins.
- Lock joins.
- Escalate monitoring.

---

# Contract 011 — Lockdown

## Purpose

Restrict activity during incidents.

## Modes

- Channel lock.
- Server lock.
- Emergency lock.

## Acceptance Criteria

- Real Discord permissions enforced.
- Unlock restores previous state.

---

# Contract 012 — Panic Mode

## Purpose

Provide emergency containment.

## Requirements

- Fast activation.
- Minimal operator effort.
- Forensic evidence retained.

---

# Contract 013 — Snapshot

## Purpose

Preserve guild state for recovery.

## Coverage

- Channels
- Categories
- Roles
- Permissions
- Critical settings

---

# Contract 014 — Recovery

## Purpose

Restore protected assets.

## Inputs

- Snapshot
- Incident record

## Outputs

- Restore plan
- Verification report

## Rules

- Dangerous permissions not blindly restored.

---

# Contract 015 — Logging

## Purpose

Create audit-grade evidence.

## Required Fields

- Event
- Actor
- Target
- Decision
- Result
- Timestamp

---

# Contract 016 — Forensics

## Purpose

Support incident investigation.

## Requirements

- Traceability
- Evidence preservation
- Correlation support

---

# Contract 017 — Dashboard

## Purpose

Provide operator visibility.

## Functions

- Configuration
- Monitoring
- Incident review
- Trust management

---

# Contract 018 — Multi-Guild SaaS

## Purpose

Support multiple guilds safely.

## Requirements

- Tenant isolation
- Per-guild settings
- Per-guild trust registry
- Per-guild snapshots

---

# Contract 019 — Module Registry

## Purpose

Allow optional modules without affecting security.

## Rule

Optional modules may never block:

- Containment
- Punishment
- Recovery
- Logging

---

# Contract 020 — Certification

## Purpose

Define completion requirements.

## Required Evidence

- Documentation
- Tests
- Simulation
- Live drill
- Logs
- Review

## Rule

No subsystem is certified without evidence.

---

# Contract Governance

Every contract must be:

- Versioned
- Reviewed
- Tested
- Audited
- Traceable

Implementation must map back to:

Governance
→ Architecture
→ Threat Model
→ Contracts
→ Code
→ Tests
→ Certification

Any feature that cannot be traced to this chain is considered architecture drift.
