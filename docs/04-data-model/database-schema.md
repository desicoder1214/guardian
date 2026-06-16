# Guardian Database Schema

## Purpose

This document defines the baseline database schema required for Guardian's enterprise architecture.

The database must support security decisions, authority, guild configuration, incidents, recovery, logging, certification, and multi-guild SaaS operation.

---

## Core Tables

### guilds

Stores each Discord guild protected by Guardian.

Required fields:

- guild_id
- name
- owner_id
- plan
- created_at
- updated_at
- status

### guild_config

Stores per-guild configuration.

Required fields:

- guild_id
- antinuke_enabled
- antispam_enabled
- moderation_enabled
- lockdown_enabled
- recovery_enabled
- webhook_guard_enabled
- bot_authorization_enabled
- created_at
- updated_at

### trusted_subjects

Stores trusted users, roles, and bots.

Required fields:

- id
- guild_id
- subject_id
- subject_type
- capability
- scope
- granted_by
- granted_at
- revoked_at
- status

### bot_authorizations

Stores approved, denied, revoked, and pending bots.

Required fields:

- id
- guild_id
- bot_id
- bot_name
- status
- approved_by
- approved_at
- revoked_at
- permission_scope
- notes

### incidents

Stores security incidents.

Required fields:

- incident_id
- guild_id
- incident_type
- severity
- status
- actor_id
- target_id
- started_at
- ended_at
- final_verdict

### security_events

Stores normalized security events.

Required fields:

- event_id
- guild_id
- event_type
- actor_id
- target_id
- target_type
- confidence
- raw_payload_ref
- created_at

### security_decisions

Stores Guardian decisions.

Required fields:

- decision_id
- event_id
- guild_id
- detector
- decision
- reason
- action
- status
- created_at

### recovery_snapshots

Stores recovery snapshots.

Required fields:

- snapshot_id
- guild_id
- snapshot_type
- schema_version
- snapshot_payload
- created_by
- created_at
- integrity_status

### recovery_jobs

Stores recovery execution jobs.

Required fields:

- job_id
- guild_id
- incident_id
- snapshot_id
- status
- started_at
- completed_at
- failure_reason

### lockdown_sessions

Stores lockdown and panic sessions.

Required fields:

- session_id
- guild_id
- mode
- status
- actor_id
- reason
- started_at
- ended_at
- restore_status

### webhook_registry

Stores known webhook state.

Required fields:

- webhook_id
- guild_id
- channel_id
- name
- creator_id
- authorization_status
- created_at
- last_seen_at

### moderation_cases

Stores moderation actions.

Required fields:

- case_id
- guild_id
- actor_id
- target_id
- action
- reason
- evidence_ref
- created_at

### audit_correlation

Stores audit-log correlation evidence.

Required fields:

- correlation_id
- guild_id
- event_id
- audit_log_action
- actor_id
- target_id
- confidence
- created_at

### certification_runs

Stores test, drill, and certification results.

Required fields:

- run_id
- guild_id
- commit_hash
- certification_area
- verdict
- evidence_ref
- reviewer
- created_at

---

## Schema Rules

- Every table must include guild_id where tenant scoping is required.
- Every security action must be traceable to an event, decision, incident, or case.
- Destructive actions must preserve evidence.
- Recovery must not overwrite forensic records.
- Revoked trust must remain auditable.
- Deleted security data must be soft-deleted where auditability matters.

---

## Anti-Drift Rule

No implementation may introduce a new persistent security concept without documenting its table, fields, ownership, retention, and certification impact.
