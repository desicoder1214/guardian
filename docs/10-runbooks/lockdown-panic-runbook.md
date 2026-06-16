# Lockdown and Panic Runbook

## 1. Purpose

This runbook defines the approved operational process for Lockdown and Panic Runbook.

Operators must follow this runbook during incidents, drills, recovery, and certification activities.

---

## 2. Scope

This runbook applies to Guardian-protected Discord guilds and must be used only by authorized operators.

---

## 3. Preconditions

Before executing this runbook:

- Confirm the guild ID.
- Confirm Guardian is online.
- Confirm Guardian has required permissions.
- Confirm logging channels are reachable.
- Confirm the operator has Guardian authority.
- Confirm the incident or drill scope.
- Confirm rollback or recovery path.

---

## 4. Required Evidence

Capture:

- Incident ID
- Guild ID
- Operator ID
- Actor ID if known
- Target ID if known
- Start time
- End time
- Actions taken
- Errors
- Final verdict

---

## 5. Execution Steps

1. Confirm alert or trigger.
2. Identify affected guild.
3. Identify affected channels, roles, users, bots, or webhooks.
4. Confirm Guardian status.
5. Confirm containment status.
6. Execute required containment action.
7. Verify real Discord state.
8. Preserve logs.
9. Start recovery only after containment.
10. Record final verdict.

---

## 6. Safety Rules

- Do not run destructive steps in production unless responding to a real incident.
- Do not delete evidence.
- Do not restore unsafe permissions blindly.
- Do not bypass FakePerms.
- Do not mark success without verification.
- Do not continue if Guardian loses required permissions.

---

## 7. Stop Conditions

Stop and escalate if:

- Guardian is kicked.
- Guardian loses permissions.
- Logs stop working.
- The incident spreads beyond expected scope.
- Recovery cannot be verified.
- Operator authority is unclear.
- Real users are at unexpected risk.

---

## 8. Verification

Verify:

- Containment succeeded.
- Punishment executed where required.
- Recovery completed or partial failure is documented.
- Logs contain evidence.
- Final Discord state matches expected state.
- Follow-up actions are recorded.

---

## 9. Output

The operator must produce:

- Summary
- Evidence links or log references
- Pass/fail verdict
- Known limitations
- Required follow-up work
- Certification impact if applicable

---

## 10. Anti-Drift Rule

This runbook must remain aligned with Guardian architecture, threat model, system contracts, security-kernel contracts, certification matrix, and live drill plan.

No operator process may bypass documented Guardian security controls.
