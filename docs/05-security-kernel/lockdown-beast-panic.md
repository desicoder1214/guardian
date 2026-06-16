# Guardian Lockdown, Beast Mode, and Panic

## 1. Purpose

Lockdown, Beast Mode, and Panic are Guardian emergency containment systems.

They restrict destructive activity during active incidents, raids, nukes, webhook abuse, and recovery operations.

---

## 2. Mission

The mission is to stop ongoing damage quickly while preserving enough state for recovery and forensic analysis.

Emergency containment must be:

- Fast
- Real
- Auditable
- Reversible
- Permission-enforced
- Safe for recovery

---

## 3. Core Principle

Lockdown must be real, not cosmetic.

A successful lockdown must actually deny normal users and unauthorized actors from performing restricted actions.

UI messages are not enough.

---

## 4. Modes

Guardian supports the following emergency modes:

- Single Channel Lock
- Server Lock
- Emergency Overlay
- Panic Mode
- Beast Mode
- Recovery Lock
- Webhook Freeze Mode
- Raid Containment Mode

---

## 5. Single Channel Lock

Single channel lock restricts one channel.

It must:

- Apply real permission denies
- Preserve previous overwrites
- Log affected channel
- Support safe unlock
- Verify enforcement

---

## 6. Server Lock

Server lock restricts activity across many channels.

It must:

- Plan affected channels
- Apply permission denies safely
- Avoid duplicate overwrites
- Track progress
- Verify applied state
- Support full restore

---

## 7. Panic Mode

Panic Mode is high-severity emergency containment.

It may:

- Lock channels
- Freeze webhooks
- Block risky joins
- Deny new bot joins
- Escalate AntiNuke thresholds
- Protect recovery operations
- Notify operators

Panic Mode must be explicitly logged.

---

## 8. Beast Mode

Beast Mode is an aggressive protection posture used during severe attack conditions.

It may:

- Lower thresholds
- Increase containment speed
- Disable optional modules
- Prioritize hot-path punishment
- Enforce stricter bot authorization
- Increase webhook scrutiny

Beast Mode must not create unsafe false punishment without evidence.

---

## 9. Emergency Overlay

Emergency overlay is a temporary permission layer applied during incidents.

It must:

- Be reversible
- Be traceable
- Not permanently destroy existing permissions
- Be linked to an incident ID
- Be verified after application

---

## 10. Recovery Lock

Recovery Lock protects the guild during restoration.

It prevents attackers from damaging assets while recovery is in progress.

Unlock should occur only after:

- Critical restore actions are complete
- Attackers are contained
- Verification passes
- Operator confirms or policy allows release

---

## 11. Webhook Freeze Mode

Webhook Freeze Mode prevents webhook abuse.

It may:

- Delete unauthorized webhooks
- Freeze webhook creation
- Audit recent webhook activity
- Trigger integration review
- Link webhook activity to incident state

---

## 12. Activation Triggers

Lockdown may be triggered by:

- Channel delete threshold
- Role delete threshold
- Mass ban threshold
- Mass kick threshold
- Unauthorized bot add
- Webhook abuse
- Raid indicators
- Operator command
- Recovery requirement

---

## 13. Authorization Requirements

Lockdown actions require FakePerms authority.

Suggested authority:

- Single channel lock: Moderator or Security Admin
- Server lock: Security Admin
- Panic mode: Owner, Security Admin, or Emergency Operator
- Recovery lock: Recovery Operator or Security Admin
- Unlock: same or stronger authority than lock

---

## 14. Lock Planning

Before applying lock, Guardian must build a lock plan.

Plan includes:

- Guild ID
- Incident ID
- Channel list
- Current overwrites
- Target deny permissions
- Expected restore state
- Actor requesting lock
- Reason

---

## 15. Permission Enforcement

Guardian must deny risky actions such as:

- Send Messages
- Create Public Threads
- Create Private Threads
- Send Messages in Threads
- Connect
- Speak
- Use Activities
- Manage Messages where applicable

Server-specific policy may extend this list.

---

## 16. Unlock Requirements

Unlock must restore previous state safely.

Unlock must:

- Use saved lock session data
- Restore previous overwrites
- Verify restored state
- Avoid removing unrelated new permissions
- Log completion
- Report partial failures

---

## 17. Verification

After lock, Guardian must verify:

- Expected denies exist
- Normal users cannot send messages where locked
- Voice restrictions apply where required
- Lock session is persisted
- UI status matches real enforcement

After unlock, Guardian must verify:

- Previous permissions restored
- Lock overlay removed
- No stale emergency denies remain

---

## 18. UI Truth Requirement

Lockdown UI must reflect actual enforcement.

Guardian must not show “locked” if permission denies failed.

Status values may include:

- Planning
- Locking
- Locked
- Partially Locked
- Unlocking
- Unlocked
- Failed
- Recovery Required

---

## 19. Failure Behavior

If lock partially fails:

- Keep successful locks
- Retry failed channels
- Report partial status
- Escalate to operator
- Preserve session state

If unlock fails:

- Mark recovery required
- Preserve original overwrite history
- Notify operator
- Avoid destructive overwrite cleanup

---

## 20. Performance Requirements

Lockdown must avoid blocking AntiNuke hot paths.

Requirements:

- Fast plan creation
- Bounded concurrency
- Rate-limit aware execution
- No slow optional module dependency
- Summary logging instead of per-channel spam

---

## 21. Logging Requirements

Each lock session must log:

- Session ID
- Guild ID
- Actor
- Reason
- Mode
- Channels targeted
- Channels succeeded
- Channels failed
- Start time
- End time
- Verification result
- Restore result

---

## 22. Acceptance Criteria

Lockdown is acceptable only if:

- Real Discord permissions are applied.
- Normal users are actually restricted.
- Unlock restores prior state.
- Partial failures are visible.
- UI status matches reality.
- Security logs are generated.
- AntiNuke remains higher priority.

---

## 23. Certification Tests

Required tests:

- Single channel lock
- Single channel unlock
- Server lock
- Server unlock
- Panic mode activation
- Recovery lock activation
- Partial lock failure
- Partial unlock failure
- Normal user reality check
- UI truth validation
- Rate-limit handling
- Restart recovery

---

## 24. Anti-Drift Rule

No lockdown implementation may be considered complete unless it proves real Discord permission enforcement.

Cosmetic status without real enforcement is not lockdown.
