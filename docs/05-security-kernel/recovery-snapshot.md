# Guardian Recovery and Snapshot

## 1. Purpose

The Recovery and Snapshot system preserves and restores critical Discord guild structure after destructive actions.

Recovery is not the first line of defense. Guardian must contain the attack first, then recover safely.

---

## 2. Mission

The mission of Recovery is to restore damaged guild assets accurately, safely, and with forensic traceability.

Recovery must support:

- Channel restoration
- Category restoration
- Role restoration
- Permission overwrite restoration
- Logging route restoration
- Critical configuration restoration
- Partial recovery when full recovery is not possible

---

## 3. Core Principle

Recovery must be safe, not blind.

Guardian must never blindly restore dangerous permissions, dangerous roles, or compromised state without validation.

---

## 4. Snapshot Scope

Snapshots may include:

- Guild ID
- Channel IDs
- Channel names
- Channel types
- Category parent IDs
- Channel order
- Permission overwrites
- Role IDs
- Role names
- Role colors
- Role positions
- Role permissions
- Logging channel mappings
- Security configuration
- Bot authorization registry references
- Trust registry references

---

## 5. Recovery Triggers

Recovery may be triggered by:

- Channel deletion
- Role deletion
- Category deletion
- Permission overwrite destruction
- Mass destructive incident
- Lockdown recovery
- Operator command
- Scheduled integrity audit

---

## 6. Recovery Flow

The recovery flow is:

Incident detected
→ Containment started
→ Snapshot located
→ Restore plan generated
→ Safety checks performed
→ Restore executed
→ Verification completed
→ Forensic log written
→ Operator summary produced

Recovery must not outrun containment.

---

## 7. Snapshot Creation

Snapshots must be created:

- On setup
- On scheduled interval
- Before risky operations
- After approved configuration changes
- Before destructive drills
- On operator request

Snapshots must be timestamped and versioned.

---

## 8. Snapshot Integrity

A snapshot must be considered valid only if:

- Required fields are present.
- Guild ID matches.
- Snapshot is not corrupted.
- Snapshot format version is supported.
- Critical parent-child relationships are present.
- Permission data is parseable.

Invalid snapshots must not be silently used.

---

## 9. Channel Recovery

Channel recovery must restore:

- Channel name
- Channel type
- Parent category
- Position
- Topic where applicable
- NSFW flag where applicable
- Slowmode where applicable
- Permission overwrites

Channel recovery must preserve category lineage when possible.

---

## 10. Category Recovery

Category recovery must restore:

- Category name
- Position
- Permission overwrites
- Child channel relationships

If a category is recreated with a new ID, child channels must be remapped to the new category.

---

## 11. Role Recovery

Role recovery must restore safe role properties:

- Name
- Color
- Hoist setting
- Mentionable setting
- Position where possible
- Safe permissions

Dangerous permissions must be reviewed before restore.

---

## 12. Permission Recovery

Permission overwrites must be restored carefully.

Guardian must avoid restoring:

- Administrator grants
- Dangerous role grants
- Compromised escalation paths
- Unknown stale permissions

Permission recovery must be validated against current security policy.

---

## 13. Dangerous Role Restore Rule

Guardian must not automatically restore dangerous roles to users after neutralization or incident recovery.

Dangerous roles require explicit review.

This prevents recovery from recreating the attack path.

---

## 14. Partial Recovery

If full recovery is impossible, Guardian must perform safe partial recovery.

Partial recovery must log:

- What was restored
- What failed
- Why it failed
- Whether operator action is required

Failure must be explicit.

---

## 15. Recovery Safety Checks

Before applying recovery, Guardian must verify:

- Bot has required permissions
- Target object does not already exist
- Restore action will not create privilege escalation
- Snapshot is valid
- Incident state allows recovery
- Rate limits are respected

---

## 16. Recovery Verification

After restoration, Guardian must verify:

- Object exists
- Object name matches expected state
- Parent/category mapping is correct
- Permission overwrites match safe expected state
- Role permissions are safe
- Logging route exists

Verification result must be logged.

---

## 17. Rate Limit Handling

Recovery may require many API calls.

Guardian must:

- Respect Discord rate limits
- Use queues where appropriate
- Avoid blocking AntiNuke hot paths
- Retry safe operations
- Mark unresolved items after retry exhaustion

---

## 18. Recovery and Lockdown

Recovery may require lockdown support.

During recovery:

- Active attackers must remain contained.
- Guild may remain locked until critical restoration completes.
- Unlock must not occur before safe state is verified.

---

## 19. Recovery and Forensics

Recovery must produce evidence.

Required evidence:

- Incident ID
- Snapshot ID
- Restore plan ID
- Objects restored
- Objects failed
- Safety decisions
- Timing
- Final status

---

## 20. Failure Behavior

If snapshot is missing:

- Log missing snapshot.
- Perform safe best-effort recovery if possible.
- Escalate to operator.

If restore fails:

- Retry if safe.
- Log exact failure.
- Mark unresolved.
- Continue other safe restore tasks.

If verification fails:

- Do not mark recovery complete.
- Notify operator.
- Preserve evidence.

---

## 21. Acceptance Criteria

Recovery is acceptable only if:

- Snapshots are versioned.
- Deleted channels can be restored where snapshot exists.
- Deleted roles can be safely restored.
- Category lineage is preserved where possible.
- Dangerous permissions are not blindly restored.
- Partial failure is visible.
- Logs prove recovery outcome.

---

## 22. Certification Tests

Required tests:

- Channel restore drill
- Category restore drill
- Role restore drill
- Permission overwrite restore drill
- Missing snapshot drill
- Corrupted snapshot drill
- Partial recovery drill
- Rate-limit retry drill
- Dangerous role non-restore drill
- Recovery logging review

---

## 23. Anti-Drift Rule

Recovery must remain subordinate to security.

No recovery feature may weaken containment, regrant dangerous permissions blindly, or erase forensic evidence.

Recovery exists to restore safe state, not recreate compromised state.
