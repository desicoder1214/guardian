# Guardian Multi-Tenant SaaS Model

## Purpose
Defines how Guardian safely supports multiple Discord guilds as a SaaS platform.

## Tenant Root
The tenant root is guild_id.

## Tenant-Scoped Data
Must include guild_id:
- guild_config
- trusted_subjects
- bot_authorizations
- incidents
- security_events
- recovery_snapshots
- recovery_jobs
- lockdown_sessions
- webhook_registry
- moderation_cases
- certification_runs

## Isolation Rules
- Guild data must not leak across tenants.
- Trust is guild-scoped unless explicitly global.
- Bot authorization is guild-scoped unless explicitly global.
- Snapshots are guild-scoped.
- Incidents are guild-scoped.

## Global Data
Global data must be explicitly documented and access-controlled.

## SaaS Requirements
- Per-guild feature flags
- Per-guild plan limits
- Per-guild logging routes
- Per-guild recovery state
- Per-guild certification evidence

## Anti-Drift Rule
No cross-guild data access may exist without documented authorization and audit logging.
