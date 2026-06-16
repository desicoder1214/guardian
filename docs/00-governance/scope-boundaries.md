# Guardian Scope Boundaries

## Purpose

This document defines what Guardian is responsible for and what is outside the scope of the platform.

---

## In Scope

### Security

- AntiNuke
- AntiRaid
- AntiSpam
- AntiWebhook Abuse
- Unauthorized Bot Protection
- Integration Security
- Invite Abuse Protection
- Dangerous Role Protection
- Role Escalation Protection

### Moderation

- Warnings
- Mutes
- Quarantine
- FakePerms
- Moderation Logging
- Evidence Collection

### Recovery

- Snapshot System
- Restore System
- Emergency Lockdown
- Panic Mode
- Incident Recovery

### Platform

- Multi-Guild Support
- SaaS Architecture
- Dashboard
- Feature Flags
- Audit Trails
- Enterprise Observability

---

## Out Of Scope

The following are not part of Guardian's security mission:

- Music Bots
- Economy Systems
- Gambling Systems
- Meme Commands
- Entertainment Features

These may exist as optional modules but must never affect the security kernel.

---

## Security Kernel Priority

The following systems have the highest execution priority:

1. AntiNuke
2. Containment
3. Authority
4. Recovery
5. Logging

No optional feature may block or delay these systems.

---

## Anti-Drift Rule

Any feature request outside the documented scope must be reviewed before implementation.

