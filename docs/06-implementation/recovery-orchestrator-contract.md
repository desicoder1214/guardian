# Guardian Recovery Orchestrator Contract

## 1. Purpose

This contract defines how Guardian recovery jobs are planned, executed, verified, logged, and certified.

Recovery is not the first line of defense. Guardian must contain the incident first, then recover safely.

---

## 2. Global Recovery Rules

- Containment comes before recovery.
- Recovery must use snapshots or verified source state.
- Recovery must use restore plans, not blind replay.
- Recovery must not restore unsafe permissions blindly.
- Recovery must not restore dangerous roles to users blindly.
- Recovery must preserve forensic evidence.
- Recovery must verify final Discord state.
- Partial failures must be visible.
- Every recovery job must be tied to an incident.

---

## 3. Recovery Job Required Fields

Every recovery job must include:

- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- requested_by
- recovery_type
- status
- started_at
- completed_at
- plan
- result
- verification_status
- errors
- final_verdict

---
## Area: Recovery Job Lifecycle

### Purpose
Defines recovery orchestration requirements for `RECOVERY_JOB_LIFECYCLE`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Snapshot Selection

### Purpose
Defines recovery orchestration requirements for `SNAPSHOT_SELECTION`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Snapshot Validation

### Purpose
Defines recovery orchestration requirements for `SNAPSHOT_VALIDATION`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Restore Planning

### Purpose
Defines recovery orchestration requirements for `RESTORE_PLANNING`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Channel Restore

### Purpose
Defines recovery orchestration requirements for `CHANNEL_RESTORE`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Category Restore

### Purpose
Defines recovery orchestration requirements for `CATEGORY_RESTORE`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Role Restore

### Purpose
Defines recovery orchestration requirements for `ROLE_RESTORE`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Permission Overwrite Restore

### Purpose
Defines recovery orchestration requirements for `PERMISSION_OVERWRITE_RESTORE`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Logging Route Restore

### Purpose
Defines recovery orchestration requirements for `LOGGING_ROUTE_RESTORE`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Webhook Cleanup

### Purpose
Defines recovery orchestration requirements for `WEBHOOK_CLEANUP`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Safe Restore Rules

### Purpose
Defines recovery orchestration requirements for `SAFE_RESTORE_RULES`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Dangerous Permission Filtering

### Purpose
Defines recovery orchestration requirements for `DANGEROUS_PERMISSION_FILTERING`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Dangerous Role Filtering

### Purpose
Defines recovery orchestration requirements for `DANGEROUS_ROLE_FILTERING`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Verification

### Purpose
Defines recovery orchestration requirements for `VERIFICATION`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Partial Failure Handling

### Purpose
Defines recovery orchestration requirements for `PARTIAL_FAILURE_HANDLING`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Recovery Evidence

### Purpose
Defines recovery orchestration requirements for `RECOVERY_EVIDENCE`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Recovery Certification

### Purpose
Defines recovery orchestration requirements for `RECOVERY_CERTIFICATION`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Rollback

### Purpose
Defines recovery orchestration requirements for `ROLLBACK`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Area: Operator Review

### Purpose
Defines recovery orchestration requirements for `OPERATOR_REVIEW`.

### Preconditions
- Incident must be identified.
- Containment status must be checked.
- Snapshot availability must be checked where required.
- Operator authority must be checked for manual recovery.

### Execution Rules
- Use explicit recovery plan.
- Execute only approved recovery actions.
- Preserve old and new state references.
- Respect Discord rate limits.
- Do not overwrite evidence.

### Safety Rules
- Do not blindly restore dangerous permissions.
- Do not blindly restore dangerous roles.
- Do not restore compromised webhook state.
- Do not remove incident evidence.

### Verification Requirements
- Verify Discord state after execution.
- Verify restored objects exist.
- Verify permissions are safe.
- Record partial failures.

### Evidence Requirements
- recovery_job_id
- incident_id
- guild_id
- snapshot_id
- action list
- execution result
- verification result
- final verdict

### Failure Handling
- Mark recovery as partial or failed.
- Preserve failure reason.
- Do not retry blindly.
- Escalate to operator when required.

### Certification Requirements
- Unit test.
- Integration restore test.
- Snapshot validation test.
- Failure-path test.
- Live drill where destructive recovery is involved.

---

## Anti-Drift Rule

No recovery behavior may be implemented unless it documents:

- Recovery trigger
- Snapshot dependency
- Restore plan
- Safety filter
- Verification method
- Evidence output
- Certification test
