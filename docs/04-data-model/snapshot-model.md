# Guardian Snapshot Model

## Purpose

Defines how Guardian stores recovery snapshots.

## Snapshot Requirements

Snapshots must capture guild structure, channel metadata, role metadata, safe permissions, category lineage, and recovery-critical configuration.

## Safety Rules

- Do not blindly restore dangerous permissions.
- Do not automatically restore dangerous roles to users.
- Validate snapshot integrity before use.
- Preserve recovery evidence.

## Anti-Drift Rule

Snapshot schema changes require recovery certification review.
