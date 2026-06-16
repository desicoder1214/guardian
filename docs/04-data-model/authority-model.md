# Guardian Authority Data Model

## Purpose

Defines how Guardian stores FakePerms authority, trust, permits, and capability scope.

## Required Data

- Subject ID
- Subject type
- Guild ID
- Capability
- Scope
- Granted by
- Granted at
- Revoked at
- Status

## Rules

- Trust must be explicit.
- Trust must be revocable.
- Revoked trust remains auditable.
- Discord Administrator alone is not Guardian trust.

## Anti-Drift Rule

No module may create its own authority store outside FakePerms.
