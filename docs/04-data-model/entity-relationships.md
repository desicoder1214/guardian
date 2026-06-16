# Guardian Entity Relationships

## Purpose

Defines how Guardian database entities relate to each other.

## Core Relationships

- One guild has one guild_config.
- One guild has many trusted_subjects.
- One guild has many bot_authorizations.
- One guild has many incidents.
- One incident has many security_events.
- One security_event has many security_decisions.
- One incident may have many recovery_jobs.
- One recovery_job may reference one recovery_snapshot.
- One guild has many lockdown_sessions.
- One guild has many moderation_cases.

## Anti-Drift Rule

No entity relationship may be added without documenting ownership, lifecycle, and security impact.
