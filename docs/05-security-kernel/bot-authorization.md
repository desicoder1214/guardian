# Guardian Bot Authorization

## 1. Purpose

The Bot Authorization system controls which bots are allowed to join, remain, and operate inside a protected Guardian guild.

Unknown bots are denied by default.

This system is part of the Guardian security kernel and must not depend on optional modules.

---

## 2. Mission

The mission of Bot Authorization is to prevent rogue administrators, compromised users, or attackers from adding unauthorized bots that can nuke, spam, scrape, escalate permissions, create webhooks, or disrupt recovery.

Guardian must assume that an unauthorized bot may begin executing destructive actions immediately after joining.

---

## 3. Core Principle

A bot is not trusted because it is popular, verified, has a familiar name, or was invited by a Discord administrator.

A bot is trusted only when it is explicitly approved in the Guardian authorization registry.

---

## 4. Authorization States

A bot may have one of the following states:

- Authorized
- Pending Review
- Denied
- Revoked
- Unknown
- Quarantined

Unknown is the default state.

---

## 5. Authorized Bot Requirements

A bot may be authorized only if:

- Bot ID is recorded.
- Bot name is recorded.
- Approver is recorded.
- Guild scope is recorded.
- Permission scope is reviewed.
- Approval reason is recorded.
- Timestamp is recorded.
- Revocation path exists.

---

## 6. Unauthorized Bot Definition

A bot is unauthorized if:

- It is not in the registry.
- Its authorization was revoked.
- It was denied.
- It appears in the wrong guild.
- Its permissions exceed approved scope.
- It was invited by an unauthorized actor.
- Its identity does not match the registered bot.

---

## 7. Inputs

The Bot Authorization system consumes:

- Guild member add events
- Audit log bot add entries
- Bot registry records
- Trust registry records
- Guild configuration
- Permission snapshots
- Webhook scan results
- Incident state

---

## 8. Outputs

The system may produce:

- Allow decision
- Remove bot decision
- Ban bot decision
- Quarantine decision
- Inviter punishment request
- Webhook freeze request
- Incident record
- Forensic log

---

## 9. Detection Flow

Bot join detection flow:

1. Receive guild member add event.
2. Check whether member is a bot.
3. Resolve guild ID.
4. Query bot authorization registry.
5. Resolve inviter from audit logs.
6. Evaluate inviter trust.
7. Evaluate bot authorization state.
8. Select response.
9. Execute containment.
10. Log evidence.

---

## 10. Authorization Registry

The registry must store:

- Guild ID
- Bot ID
- Bot name
- Authorization state
- Approved permissions
- Approved modules
- Approved inviter or approver
- Created timestamp
- Updated timestamp
- Revoked timestamp
- Notes

---

## 11. Inviter Attribution

Guardian must attempt to identify who invited the bot.

Attribution sources:

- Audit logs
- Join timing
- Invite metadata
- Prior command context
- Operator actions
- Incident correlation

If inviter attribution fails, Guardian must still remove unknown bots according to policy.

---

## 12. Inviter Punishment

The inviter may be punished when:

- They are unauthorized.
- They are not trusted.
- They added a denied bot.
- They added a bot during incident mode.
- They added a bot with dangerous permissions.
- The bot immediately performed destructive actions.

Punishment must be evidence-based and logged.

---

## 13. Containment Actions

Unauthorized bot containment may include:

- Kick bot
- Ban bot
- Remove bot roles
- Freeze webhooks
- Delete unauthorized webhooks
- Trigger lockdown if active attack begins
- Create incident record
- Notify operators

Bot removal must be prioritized over slow logging.

---

## 14. Webhook and Integration Sweep

After unauthorized bot detection, Guardian should inspect:

- New webhooks
- Recently modified webhooks
- Integration changes
- Bot-created channels
- Bot-created roles
- Permission changes

This prevents a bot from leaving persistent attack infrastructure behind.

---

## 15. Permission Scope Review

Authorized bots should have approved permission scope.

Guardian should flag:

- Administrator
- Manage Guild
- Manage Roles
- Manage Channels
- Manage Webhooks
- Ban Members
- Kick Members
- Manage Permissions
- Mention Everyone

A bot may be authorized while still being permission-risky. That risk must be documented.

---

## 16. Emergency Behavior

During active incident mode, Guardian may apply stricter policy.

Emergency mode may:

- Deny all new bots.
- Remove pending bots.
- Require owner approval.
- Freeze webhooks automatically.
- Escalate suspicious bot joins.

---

## 17. Trusted Bot Exceptions

Trusted bots may include known safe bots such as moderation, logging, utility, or security bots.

However:

- Trust must be explicit.
- Trust must be per guild.
- Trust must be revocable.
- Trust must not bypass all security checks blindly.

---

## 18. Failure Behavior

If audit logs are delayed:

- Continue monitoring.
- Temporarily classify inviter as unknown.
- Remove unknown bot if policy requires.
- Backfill inviter attribution later.

If bot removal fails:

- Log failure.
- Retry safely.
- Escalate to operator.
- Trigger lockdown if bot is actively destructive.

If registry is unavailable:

- Fail closed for unknown bots.
- Allow only cached explicitly authorized bots if cache is trusted.

---

## 19. Logging Requirements

Every bot authorization decision must log:

- Guild ID
- Bot ID
- Bot tag/name
- Authorization state
- Inviter ID if known
- Approver ID if authorized
- Permissions
- Decision
- Action taken
- Error if any
- Timestamp

---

## 20. Acceptance Criteria

This system is acceptable only if:

- Unknown bots are denied by default.
- Authorized bots are explicitly registered.
- Inviter attribution is attempted.
- Unauthorized bots are removed.
- Dangerous bot permissions are flagged.
- Webhook sweep is triggered when needed.
- Inviter punishment is supported.
- Every decision is logged.

---

## 21. Certification Tests

Required tests:

- Authorized bot join allowed.
- Unknown bot join removed.
- Denied bot join removed.
- Revoked bot join removed.
- Unauthorized inviter punished.
- Trusted inviter audited.
- Bot with dangerous permissions flagged.
- Webhook sweep triggered.
- Audit-log delay handled.
- Registry failure fails closed.

---

## 22. Anti-Drift Rule

No code may allow a new bot to bypass this system unless that bot is explicitly approved by the Guardian authority model.

Any bypass must be documented in the system contract register and tested.
