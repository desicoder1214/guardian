# Guardian Authority Data Model

## Purpose
Defines the data model for FakePerms authority, trust, permits, and capability scope.

## Core Principle
Discord Administrator is not Guardian trust.

## Authority Subjects
Subjects may be:
- User
- Role
- Bot
- Guild owner
- Guardian owner
- System actor

## Authority Records
Required fields:
- authority_id
- guild_id
- subject_id
- subject_type
- capability
- scope
- granted_by
- granted_at
- revoked_by
- revoked_at
- status
- reason

## Capability Examples
- SECURITY_ADMIN
- MODERATOR
- RECOVERY_OPERATOR
- BOT_AUTHORIZER
- LOCKDOWN_OPERATOR
- TRUST_MANAGER

## Status Values
- active
- revoked
- expired
- suspended
- pending_review

## Revocation Rules
Revoked trust remains auditable.

## Enforcement Rules
All protected actions must check FakePerms before execution.

## Anti-Drift Rule
No module may create its own authority model outside FakePerms.
