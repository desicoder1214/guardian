# Guardian High-Level Architecture
## 1. Purpose
This document describes Guardian's high-level architecture and how all major security, authority, recovery, logging, dashboard, and SaaS systems connect.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 2. Executive Overview
Guardian is a contract-first Discord security platform built around prevention, containment, recovery, and certification.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 3. System Context
Guardian sits between Discord gateway events, Discord REST actions, operator configuration, and security evidence stores.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 4. Primary Flow
Discord Gateway Events → Event Intake → Normalization → Security Kernel → Detection → Attribution → FakePerms → Decision → Containment → Punishment → Recovery → Logging → Dashboard.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 5. Security Kernel
The security kernel contains AntiNuke, FakePerms, Bot Authorization, Webhook Security, Lockdown/Panic, Recovery, and Forensics.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 6. Kernel Boundary
Optional modules may observe events but must never block containment, punishment, recovery, or forensic logging.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 7. Discord Integration Layer
This layer receives gateway events, sends REST actions, fetches audit logs, and executes Discord permission changes.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 8. Event Intake Layer
The intake layer receives raw events and forwards them quickly without slow processing.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 9. Event Normalization Layer
The normalization layer converts Discord-specific payloads into Guardian security events with consistent fields.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 10. Detection Layer
Detection engines identify destructive, suspicious, abusive, administrative, recovery-owned, and benign events.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 11. Attribution Layer
Attribution resolves the actor using audit logs, cached context, correlation windows, and Guardian-owned action markers.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 12. FakePerms Layer
FakePerms determines Guardian-effective authority instead of trusting raw Discord Administrator permission.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 13. Decision Engine
The decision engine combines event severity, actor authority, target sensitivity, thresholds, and incident state.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 14. Containment Engine
Containment stops damage through bot removal, webhook deletion, dangerous-role removal, neutralization, bans, kicks, and lockdown.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 15. Punishment Engine
Punishment executes evidence-based actions against unauthorized actors and prevents duplicate punishment.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 16. Recovery Engine
Recovery uses snapshots, restore plans, verification, and safety rules to restore safe guild state.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 17. Logging Layer
Logging records security decisions, moderation actions, recovery outcomes, errors, and timing evidence.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 18. Forensics Layer
Forensics reconstructs incident timelines and produces audit-grade evidence.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 19. Dashboard Layer
The dashboard exposes configuration, incidents, trust, bot authorization, recovery status, lockdown status, and logs.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 20. SaaS Layer
The SaaS layer supports per-guild configuration, per-guild isolation, feature flags, subscriptions, and tenant-safe storage.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 21. Plugin Architecture
Optional modules register commands, events, services, configuration, permissions, and tests without weakening the kernel.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 22. Future Modules
Future modules may include AI moderation, leveling, giveaways, tickets, analytics, utility commands, and premium dashboards.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 23. Rate Limit Architecture
Guardian must prioritize security actions while respecting Discord rate limits and queueing slow work safely.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 24. Reliability Architecture
Guardian must avoid single-module blocking, preserve incident state, prevent duplicate punishment, and survive partial failures.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 25. Failure Handling
Dangerous decisions fail closed, recovery failures fail visibly, and logging failures must not block containment.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 26. Anti-Drift Architecture
Every implementation must trace from governance to architecture, threat model, contracts, code, tests, and certification.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 27. Certification Architecture
No system is certified without documented contracts, tests, drills, logs, forensic review, and regression protection.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

## 28. Executive Verdict
Guardian's high-level architecture is designed to support enterprise-grade Discord security with explicit trust, containment, recovery, and evidence.

### Responsibilities
- Preserve security kernel priority.
- Maintain auditability.
- Prevent architecture drift.
- Support per-guild operation.
- Produce evidence suitable for certification.

### Design Rules
- Do not block hot-path containment with optional modules.
- Do not trust raw Discord permissions without Guardian authority evaluation.
- Do not silently fail security actions.
- Do not restore unsafe or dangerous state blindly.
- Do not certify behavior without repeatable validation evidence.

