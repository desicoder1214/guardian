# Guardian Logging and Forensics Contract

## 1. Purpose

This contract defines how Guardian records security decisions, operational actions, incidents, failures, recovery activity, and certification evidence.

Guardian cannot be enterprise-grade unless every meaningful security decision is traceable, explainable, and reviewable.

---

## 2. Global Logging Rules

- Security decisions must produce evidence.
- Logs must include correlation identifiers.
- Logs must preserve incident timelines.
- Logging failure must not block hot-path containment.
- Logs must not leak cross-guild data.
- Sensitive data must be redacted.
- Forensic evidence must be exportable.
- Operator actions must be auditable.
- Recovery actions must be verifiable.
- Certification requires log evidence.

---

## 3. Required Core Fields

Every security log should include:

- timestamp
- guild_id
- incident_id when applicable
- event_id when applicable
- detector_id when applicable
- decision_id when applicable
- actor_id when known
- target_id when known
- action
- result
- correlation_id
- trace_id
- error if any
- final_status

---
## Area: Structured Log Schema

### Purpose
Defines logging and forensic requirements for `STRUCTURED_LOG_SCHEMA`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Event Logging

### Purpose
Defines logging and forensic requirements for `EVENT_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Detector Logging

### Purpose
Defines logging and forensic requirements for `DETECTOR_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Decision Logging

### Purpose
Defines logging and forensic requirements for `DECISION_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Punishment Logging

### Purpose
Defines logging and forensic requirements for `PUNISHMENT_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: FakePerms Logging

### Purpose
Defines logging and forensic requirements for `FAKEPERMS_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Authority Decision Logging

### Purpose
Defines logging and forensic requirements for `AUTHORITY_DECISION_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Unauthorized Bot Logging

### Purpose
Defines logging and forensic requirements for `UNAUTHORIZED_BOT_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Webhook Security Logging

### Purpose
Defines logging and forensic requirements for `WEBHOOK_SECURITY_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Invite Protection Logging

### Purpose
Defines logging and forensic requirements for `INVITE_PROTECTION_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Lockdown Logging

### Purpose
Defines logging and forensic requirements for `LOCKDOWN_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Panic Logging

### Purpose
Defines logging and forensic requirements for `PANIC_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Recovery Logging

### Purpose
Defines logging and forensic requirements for `RECOVERY_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Snapshot Logging

### Purpose
Defines logging and forensic requirements for `SNAPSHOT_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Audit Correlation

### Purpose
Defines logging and forensic requirements for `AUDIT_CORRELATION`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Incident Timeline

### Purpose
Defines logging and forensic requirements for `INCIDENT_TIMELINE`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Correlation IDs

### Purpose
Defines logging and forensic requirements for `CORRELATION_IDS`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Incident IDs

### Purpose
Defines logging and forensic requirements for `INCIDENT_IDS`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Trace IDs

### Purpose
Defines logging and forensic requirements for `TRACE_IDS`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Event IDs

### Purpose
Defines logging and forensic requirements for `EVENT_IDS`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Decision IDs

### Purpose
Defines logging and forensic requirements for `DECISION_IDS`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Evidence Collection

### Purpose
Defines logging and forensic requirements for `EVIDENCE_COLLECTION`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Attribution Evidence

### Purpose
Defines logging and forensic requirements for `ATTRIBUTION_EVIDENCE`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Confidence Evidence

### Purpose
Defines logging and forensic requirements for `CONFIDENCE_EVIDENCE`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Performance Metrics

### Purpose
Defines logging and forensic requirements for `PERFORMANCE_METRICS`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Queue Metrics

### Purpose
Defines logging and forensic requirements for `QUEUE_METRICS`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Error Logging

### Purpose
Defines logging and forensic requirements for `ERROR_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Exception Logging

### Purpose
Defines logging and forensic requirements for `EXCEPTION_LOGGING`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Security Violations

### Purpose
Defines logging and forensic requirements for `SECURITY_VIOLATIONS`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Data Redaction

### Purpose
Defines logging and forensic requirements for `DATA_REDACTION`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Privacy Rules

### Purpose
Defines logging and forensic requirements for `PRIVACY_RULES`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Log Retention

### Purpose
Defines logging and forensic requirements for `LOG_RETENTION`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Forensic Export

### Purpose
Defines logging and forensic requirements for `FORENSIC_EXPORT`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Dashboard Integration

### Purpose
Defines logging and forensic requirements for `DASHBOARD_INTEGRATION`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: SIEM Integration

### Purpose
Defines logging and forensic requirements for `SIEM_INTEGRATION`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Multi-Guild Isolation

### Purpose
Defines logging and forensic requirements for `MULTI-GUILD_ISOLATION`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Compliance Requirements

### Purpose
Defines logging and forensic requirements for `COMPLIANCE_REQUIREMENTS`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Area: Certification Requirements

### Purpose
Defines logging and forensic requirements for `CERTIFICATION_REQUIREMENTS`.

### Required Evidence
- timestamp
- guild_id
- incident_id where applicable
- actor_id where applicable
- target_id where applicable
- correlation_id
- trace_id
- result

### Logging Rules
- Must be structured.
- Must be searchable.
- Must preserve causality.
- Must avoid sensitive data leakage.
- Must not block Security Kernel hot paths.

### Forensic Rules
- Must support incident reconstruction.
- Must show decision reasoning.
- Must preserve attribution confidence.
- Must record failure reason.
- Must support certification review.

### Failure Handling
- Logging failure must be visible.
- Security containment must continue when safe.
- Missing evidence must be marked as certification risk.

### Testing Requirements
- Structured log test.
- Correlation ID test.
- Redaction test.
- Failure-path test.
- Forensic timeline test.

---

## Anti-Drift Rule

No security decision, punishment, recovery action, authority decision, or certification verdict may be implemented without documented logging and forensic evidence requirements.
