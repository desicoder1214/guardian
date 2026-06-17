# Guardian Database Migration Contract

## 1. Purpose

This contract defines how Guardian database schema changes are designed, reviewed, tested, deployed, rolled back, audited, and certified.

Database migrations affect security, recovery, authority, logging, and multi-guild isolation. They must be treated as production-risk changes.

---

## 2. Global Migration Rules

- Every migration must have an owner.
- Every migration must be versioned.
- Every migration must be reviewable.
- Every migration must be testable.
- Every migration must define rollback behavior.
- Destructive migrations require special review.
- Tenant isolation must never be weakened.
- Security evidence must not be deleted silently.
- Migration failures must be visible.
- Production migrations require release evidence.

---

## 3. Required Migration Metadata

Every migration must define:

- migration_id
- owner
- purpose
- affected_tables
- affected_columns
- forward_plan
- rollback_plan
- data_risk
- tenant_risk
- security_risk
- performance_risk
- test_evidence
- approval_status

---
## Area: Migration Ownership

### Purpose
Defines database migration requirements for `MIGRATION_OWNERSHIP`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Migration Naming

### Purpose
Defines database migration requirements for `MIGRATION_NAMING`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Schema Versioning

### Purpose
Defines database migration requirements for `SCHEMA_VERSIONING`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Forward Migration

### Purpose
Defines database migration requirements for `FORWARD_MIGRATION`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Rollback Migration

### Purpose
Defines database migration requirements for `ROLLBACK_MIGRATION`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Data Backfill

### Purpose
Defines database migration requirements for `DATA_BACKFILL`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Destructive Changes

### Purpose
Defines database migration requirements for `DESTRUCTIVE_CHANGES`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Table Creation

### Purpose
Defines database migration requirements for `TABLE_CREATION`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Column Addition

### Purpose
Defines database migration requirements for `COLUMN_ADDITION`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Column Removal

### Purpose
Defines database migration requirements for `COLUMN_REMOVAL`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Index Creation

### Purpose
Defines database migration requirements for `INDEX_CREATION`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Index Removal

### Purpose
Defines database migration requirements for `INDEX_REMOVAL`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Constraint Changes

### Purpose
Defines database migration requirements for `CONSTRAINT_CHANGES`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Tenant Isolation

### Purpose
Defines database migration requirements for `TENANT_ISOLATION`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Guild Scoped Tables

### Purpose
Defines database migration requirements for `GUILD_SCOPED_TABLES`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Authority Tables

### Purpose
Defines database migration requirements for `AUTHORITY_TABLES`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Incident Tables

### Purpose
Defines database migration requirements for `INCIDENT_TABLES`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Recovery Tables

### Purpose
Defines database migration requirements for `RECOVERY_TABLES`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Logging Tables

### Purpose
Defines database migration requirements for `LOGGING_TABLES`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Certification Tables

### Purpose
Defines database migration requirements for `CERTIFICATION_TABLES`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Migration Testing

### Purpose
Defines database migration requirements for `MIGRATION_TESTING`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Rollback Testing

### Purpose
Defines database migration requirements for `ROLLBACK_TESTING`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Performance Testing

### Purpose
Defines database migration requirements for `PERFORMANCE_TESTING`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Production Deployment

### Purpose
Defines database migration requirements for `PRODUCTION_DEPLOYMENT`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Failure Recovery

### Purpose
Defines database migration requirements for `FAILURE_RECOVERY`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Audit Evidence

### Purpose
Defines database migration requirements for `AUDIT_EVIDENCE`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Area: Certification Requirements

### Purpose
Defines database migration requirements for `CERTIFICATION_REQUIREMENTS`.

### Required Controls
- Document affected tables.
- Document affected fields.
- Document forward behavior.
- Document rollback behavior.
- Document data safety impact.
- Document tenant isolation impact.

### Safety Rules
- Do not delete forensic evidence silently.
- Do not weaken guild isolation.
- Do not bypass schema review.
- Do not deploy untested migrations.
- Do not run destructive changes without approval.

### Testing Requirements
- Local migration test.
- Rollback test.
- Seed data test.
- Production-like dry run.
- Performance impact test where applicable.

### Audit Requirements
- Record migration ID.
- Record executor.
- Record environment.
- Record start and completion time.
- Record result.
- Record errors if any.

### Failure Handling
- Stop safely.
- Preserve partial state evidence.
- Execute rollback when safe.
- Escalate if rollback is unsafe.

### Certification Requirements
- Migration reviewed.
- Tests passed.
- Rollback verified.
- Tenant isolation verified.
- Security impact approved.

---

## Certification Rule

No release may be certified if database migrations are unreviewed, untested, irreversible without approval, or capable of weakening tenant isolation or security evidence.

## Anti-Drift Rule

No persistent security concept may be introduced without documenting its schema, migration path, rollback behavior, and certification impact.
