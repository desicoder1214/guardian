# Guardian Entity Relationships

## Purpose
Defines Guardian's core entity relationships so implementation does not invent inconsistent database links.

## Primary Entities
- Guild
- GuildConfig
- TrustedSubject
- BotAuthorization
- Incident
- SecurityEvent
- SecurityDecision
- RecoverySnapshot
- RecoveryJob
- LockdownSession
- WebhookRegistry
- ModerationCase
- AuditCorrelation
- CertificationRun

## Relationship Rules
- One guild has one active guild_config.
- One guild has many trusted_subjects.
- One guild has many bot_authorizations.
- One guild has many incidents.
- One incident has many security_events.
- One security_event may have many security_decisions.
- One incident may have many recovery_jobs.
- One recovery_job references one recovery_snapshot.
- One guild has many lockdown_sessions.
- One guild has many webhook_registry entries.
- One guild has many moderation_cases.
- One security_event may have one or more audit_correlation records.

## Ownership
Guild is the tenant root. All tenant-scoped records must be traceable to guild_id.

## Lifecycle Rules
Records tied to security, authority, incidents, recovery, and certification must remain auditable.

## Anti-Drift Rule
No relationship may be added without documenting owner, lifecycle, security impact, and certification impact.
