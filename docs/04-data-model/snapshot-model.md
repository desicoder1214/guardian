# Guardian Snapshot Model

## Purpose
Defines the recovery snapshot model used to restore safe Discord guild state.

## Snapshot Scope
Snapshots may include:
- Guild metadata
- Channels
- Categories
- Roles
- Permission overwrites
- Logging routes
- Critical configuration
- Webhook registry references

## Snapshot Types
- Scheduled snapshot
- Manual snapshot
- Pre-drill snapshot
- Pre-recovery snapshot
- Emergency snapshot

## Safety Rules
- Do not blindly restore dangerous permissions.
- Do not automatically restore dangerous roles to users.
- Validate snapshot integrity before use.
- Preserve recovery evidence.
- Keep snapshot schema versioned.

## Restore Rules
Restore must use a restore plan, not raw snapshot replay.

## Required Fields
- snapshot_id
- guild_id
- schema_version
- snapshot_type
- created_at
- created_by
- integrity_hash
- payload
- validation_status

## Certification Requirements
Snapshot model is certified only after restore drills prove safe recovery.

## Anti-Drift Rule
Snapshot schema changes require recovery contract review and certification update.
