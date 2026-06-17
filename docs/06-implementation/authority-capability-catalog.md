# Guardian Authority Capability Catalog

## 1. Purpose

This catalog defines every FakePerms capability recognized by Guardian.

No module may invent its own permissions or authority model.

Authority decisions must be made exclusively through FakePerms.

---

## 2. Global Rules

- Every capability has a unique identifier.
- Every capability is explicitly granted.
- Every capability is auditable.
- Every capability is revocable.
- Discord Administrator never implies Guardian authority.
- Capabilities are evaluated before any privileged action.
- Owner overrides remain explicitly documented.

---

## 3. Capability Levels

| Level | Purpose |
|---|---|
| L0 | Read-only |
| L1 | Configuration |
| L2 | Operational |
| L3 | Security |
| L4 | Recovery |
| L5 | Owner-only |

---
## Capability: ANTINUKE_VIEW

### Purpose
Authorizes execution of `ANTINUKE_VIEW`.

### Capability Level
- L0

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: ANTINUKE_CONFIG

### Purpose
Authorizes execution of `ANTINUKE_CONFIG`.

### Capability Level
- L1

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: ANTINUKE_BYPASS

### Purpose
Authorizes execution of `ANTINUKE_BYPASS`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: ANTISPAM_VIEW

### Purpose
Authorizes execution of `ANTISPAM_VIEW`.

### Capability Level
- L0

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: ANTISPAM_CONFIG

### Purpose
Authorizes execution of `ANTISPAM_CONFIG`.

### Capability Level
- L1

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: MOD_WARN

### Purpose
Authorizes execution of `MOD_WARN`.

### Capability Level
- L2

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: MOD_TIMEOUT

### Purpose
Authorizes execution of `MOD_TIMEOUT`.

### Capability Level
- L2

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: MOD_KICK

### Purpose
Authorizes execution of `MOD_KICK`.

### Capability Level
- L2

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: MOD_BAN

### Purpose
Authorizes execution of `MOD_BAN`.

### Capability Level
- L2

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: MOD_UNBAN

### Purpose
Authorizes execution of `MOD_UNBAN`.

### Capability Level
- L2

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: MOD_PURGE

### Purpose
Authorizes execution of `MOD_PURGE`.

### Capability Level
- L2

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: TRUST_VIEW

### Purpose
Authorizes execution of `TRUST_VIEW`.

### Capability Level
- L0

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: TRUST_GRANT

### Purpose
Authorizes execution of `TRUST_GRANT`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: TRUST_REVOKE

### Purpose
Authorizes execution of `TRUST_REVOKE`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: PERMIT_GRANT

### Purpose
Authorizes execution of `PERMIT_GRANT`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: PERMIT_REVOKE

### Purpose
Authorizes execution of `PERMIT_REVOKE`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: BOT_AUTHORIZE

### Purpose
Authorizes execution of `BOT_AUTHORIZE`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: BOT_REVOKE

### Purpose
Authorizes execution of `BOT_REVOKE`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: WEBHOOK_PROTECT

### Purpose
Authorizes execution of `WEBHOOK_PROTECT`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: WEBHOOK_FREEZE

### Purpose
Authorizes execution of `WEBHOOK_FREEZE`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: LOCKDOWN_EXECUTE

### Purpose
Authorizes execution of `LOCKDOWN_EXECUTE`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: LOCKDOWN_RELEASE

### Purpose
Authorizes execution of `LOCKDOWN_RELEASE`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: PANIC_EXECUTE

### Purpose
Authorizes execution of `PANIC_EXECUTE`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: PANIC_RELEASE

### Purpose
Authorizes execution of `PANIC_RELEASE`.

### Capability Level
- L3

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: RECOVERY_EXECUTE

### Purpose
Authorizes execution of `RECOVERY_EXECUTE`.

### Capability Level
- L4

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: RECOVERY_APPROVE

### Purpose
Authorizes execution of `RECOVERY_APPROVE`.

### Capability Level
- L4

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: RECOVERY_CANCEL

### Purpose
Authorizes execution of `RECOVERY_CANCEL`.

### Capability Level
- L4

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: SNAPSHOT_CREATE

### Purpose
Authorizes execution of `SNAPSHOT_CREATE`.

### Capability Level
- L2

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: SNAPSHOT_RESTORE

### Purpose
Authorizes execution of `SNAPSHOT_RESTORE`.

### Capability Level
- L4

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: LOG_VIEW

### Purpose
Authorizes execution of `LOG_VIEW`.

### Capability Level
- L0

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: FORENSICS_VIEW

### Purpose
Authorizes execution of `FORENSICS_VIEW`.

### Capability Level
- L0

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: CERTIFICATION_REVIEW

### Purpose
Authorizes execution of `CERTIFICATION_REVIEW`.

### Capability Level
- L0

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: CERTIFICATION_APPROVE

### Purpose
Authorizes execution of `CERTIFICATION_APPROVE`.

### Capability Level
- L4

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: DASHBOARD_VIEW

### Purpose
Authorizes execution of `DASHBOARD_VIEW`.

### Capability Level
- L0

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: DASHBOARD_CONFIG

### Purpose
Authorizes execution of `DASHBOARD_CONFIG`.

### Capability Level
- L1

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: GUILD_CONFIG

### Purpose
Authorizes execution of `GUILD_CONFIG`.

### Capability Level
- L1

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: PLUGIN_INSTALL

### Purpose
Authorizes execution of `PLUGIN_INSTALL`.

### Capability Level
- L2

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: PLUGIN_REMOVE

### Purpose
Authorizes execution of `PLUGIN_REMOVE`.

### Capability Level
- L2

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: PLUGIN_CONFIG

### Purpose
Authorizes execution of `PLUGIN_CONFIG`.

### Capability Level
- L1

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: AI_CONFIG

### Purpose
Authorizes execution of `AI_CONFIG`.

### Capability Level
- L1

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Capability: OWNER_OVERRIDE

### Purpose
Authorizes execution of `OWNER_OVERRIDE`.

### Capability Level
- L5

### Required Authority Checks
- Subject must be trusted.
- Capability must be explicitly granted.
- Scope must include current guild.
- Grant must not be revoked.

### Audit Requirements
- Actor ID
- Guild ID
- Capability
- Decision
- Timestamp
- Correlation ID

### Failure Behaviour
- Deny action
- Record audit evidence
- Return authorization failure

### Certification Requirements
- Grant test
- Revoke test
- Scope validation test
- Audit verification

---

## Anti-Drift Rule

No implementation may introduce a new capability without updating:

- FakePerms Authority
- System Contract Register
- Threat Model
- Detector Catalog (if applicable)
- Punishment Catalog (if applicable)
- Certification Matrix
- Live Drill Plan
