# Guardian Certification Matrix

## 1. Purpose

The Certification Matrix defines what Guardian must prove before any subsystem can be considered production-ready.

Certification is evidence-based.

A feature is not certified because it exists. A feature is certified only when tests, drills, logs, and forensic evidence prove it works.

---

## 2. Certification Rule

No Guardian subsystem is certified unless it has:

- Documented architecture
- Threat-model coverage
- Contract reference
- Unit tests
- Integration tests
- Simulation drill
- Controlled live drill where applicable
- Logs
- Forensic evidence
- Regression protection
- Operator review

---

## 3. Certification Status Values

Certification status may be:

- Not Started
- Designed
- Implemented
- Unit-Tested
- Integration-Tested
- Simulation-Passed
- Live-Drill-Passed
- Evidence-Reviewed
- Certified
- Rejected
- Deprecated

Only Certified means production-ready.

---

## 4. Evidence Types

Accepted evidence includes:

- Test output
- Drill logs
- Forensic logs
- Discord state verification
- Database records
- Recovery reports
- Operator screenshots
- Audit correlation records
- Regression test reports

Claims without evidence are not certification.

---

## 5. Certification Matrix

| Area | Contract | Required Evidence | Status |
|---|---|---|---|
| AntiNuke Core | AntiNuke Core | Unit tests, destructive drills, logs | Required |
| FakePerms Authority | FakePerms Authority | Permission tests, trust audit, deny tests | Required |
| Bot Authorization | Bot Authorization | Authorized/unauthorized bot drills | Required |
| Webhook Security | Webhook Integration Security | Webhook create/spam/freeze drills | Required |
| Recovery Snapshot | Recovery Snapshot | Restore drills and verification logs | Required |
| Lockdown / Panic | Lockdown Beast Panic | Real permission enforcement audit | Required |
| AntiSpam | System Contract Register | Spam drills and false-positive review | Required |
| Moderation | System Contract Register | Command tests and case logs | Required |
| Logging / Forensics | High-Level Architecture | Evidence completeness review | Required |
| Dashboard | High-Level Architecture | Read/write config safety review | Required |

---

## 6. AntiNuke Certification

AntiNuke requires proof for:

- Channel delete detection
- Role delete detection
- Dangerous role grant reversal
- Unauthorized bot containment
- Webhook abuse escalation
- Mass ban detection
- Mass kick detection
- Duplicate punishment prevention
- Trusted exemption handling
- Actor attribution handling

Certification requires repeatable test results.

---

## 7. FakePerms Certification

FakePerms requires proof that:

- Discord Administrator alone does not grant Guardian trust
- Trusted users are allowed only within scope
- Revoked trust stops working
- Moderators cannot perform security-admin actions
- Bot authorizers cannot bypass unrelated controls
- Recovery operators cannot grant trust
- Decisions are logged

---

## 8. Bot Authorization Certification

Bot Authorization requires proof that:

- Authorized bots are allowed
- Unknown bots are removed
- Denied bots are removed
- Revoked bots are removed
- Inviter attribution is attempted
- Unauthorized inviter punishment is supported
- Webhook sweep runs when required
- Registry failure fails closed

---

## 9. Webhook Security Certification

Webhook Security requires proof that:

- Unauthorized webhook creation is detected
- Webhook creator attribution is attempted
- Unauthorized webhooks are deleted or frozen
- Webhook spam is contained
- Bot-created webhooks are linked to bot incidents
- Missing permissions enter degraded mode visibly
- Logs contain webhook ID and channel ID

---

## 10. Recovery Certification

Recovery requires proof that:

- Snapshot exists
- Snapshot integrity is validated
- Channels can be restored
- Categories can be restored
- Roles can be safely restored
- Permission overwrites are restored safely
- Dangerous permissions are not blindly restored
- Partial failures are visible
- Verification logs exist

---

## 11. Lockdown Certification

Lockdown requires proof that:

- Single channel lock applies real Discord permission denies
- Server lock applies real Discord permission denies
- Normal user reality check passes
- Unlock restores prior state
- Partial lock failure is visible
- Partial unlock failure is visible
- UI state matches real enforcement
- Lock session survives restart where required

---

## 12. AntiSpam Certification

AntiSpam requires proof that:

- Flood spam is detected
- Mention spam is detected
- Link spam is detected
- Invite spam is detected
- Webhook spam routes to webhook security where needed
- False positives are reviewed
- AntiSpam does not block AntiNuke hot paths

---

## 13. Moderation Certification

Moderation requires proof that:

- Warn works
- Timeout works
- Kick works
- Ban works
- Neutralize works
- Release works
- Cases are logged
- FakePerms is enforced
- Public moderation UI matches policy

---

## 14. Logging and Forensics Certification

Logging and Forensics require proof that logs include:

- Guild ID
- Event type
- Actor ID
- Target ID
- Detector
- Decision
- Action taken
- Errors
- Recovery outcome
- Final status
- Timestamp
- Correlation ID where available

---

## 15. Dashboard Certification

Dashboard certification requires proof that:

- Security settings can be viewed
- Security settings can be changed only by authorized users
- Trust can be inspected
- Bot registry can be inspected
- Recovery status can be inspected
- Lockdown status reflects real state
- Dashboard failure does not block security kernel

---

## 16. Blocking Conditions

A subsystem cannot be certified if:

- It lacks a contract
- It lacks tests
- It lacks logs
- It silently fails
- It bypasses FakePerms
- It trusts Discord Administrator blindly
- It blocks AntiNuke hot paths
- It cannot be repeated
- It cannot be reviewed
- It has unresolved critical failures

---

## 17. Certification Review Checklist

Reviewers must confirm:

1. What was tested?
2. What threat was covered?
3. What contract was validated?
4. What logs were produced?
5. What was the final Discord state?
6. Was recovery required?
7. Did recovery succeed?
8. Were false positives avoided?
9. Was behavior repeatable?
10. Is regression coverage present?

---

## 18. Certification Output

Each certification review must produce:

- Feature name
- Version or commit
- Test environment
- Test date
- Evidence links
- Pass/fail verdict
- Known limitations
- Required follow-ups
- Reviewer
- Final status

---

## 19. Certification Verdict Rules

Verdicts may be:

- Certified
- Conditionally Certified
- Not Certified
- Rejected
- Retest Required

Certified means no known blocking gaps remain.

Conditionally Certified means limited use is allowed with documented restrictions.

Not Certified means the feature must not be treated as production-ready.

---

## 20. Regression Requirement

Certified systems must remain certified after future changes.

Regression protection must run when changing:

- AntiNuke
- FakePerms
- Bot Authorization
- Webhook Security
- Lockdown
- Recovery
- Logging
- Trust model
- Permission model
- Certification scripts

---

## 21. Anti-Drift Rule

Certification cannot be granted to undocumented behavior.

If implementation differs from architecture, either the implementation is wrong or the documentation must go through formal review.

No silent certification is allowed.
