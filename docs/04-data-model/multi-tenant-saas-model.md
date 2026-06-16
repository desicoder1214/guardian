# Guardian Multi-Tenant SaaS Model

## Purpose

Defines how Guardian separates data for multiple guilds.

## Requirements

- Every tenant-scoped table must include guild_id.
- Guild configuration must not leak across tenants.
- Incidents must remain guild-scoped.
- Bot authorization must be guild-scoped unless explicitly global.
- Trust must be guild-scoped unless explicitly global.

## Anti-Drift Rule

No cross-guild data access may exist without documented authorization and audit logging.
