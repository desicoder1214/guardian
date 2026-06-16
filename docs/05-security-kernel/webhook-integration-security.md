# Guardian Webhook and Integration Security

## 1. Purpose

Webhook and Integration Security protects Discord guilds from destructive or abusive automation that operates through webhooks, integrations, external services, and bot-created persistence.

This system is part of the Guardian security kernel.

---

## 2. Mission

The mission is to prevent attackers from using webhooks or integrations to bypass normal bot/member containment.

Guardian must assume that a nuker bot, rogue admin, or compromised integration may create webhooks before or during an attack.

---

## 3. Core Principle

Removing a malicious bot is not enough if the bot created webhooks before removal.

Webhook security must detect, freeze, delete, audit, and recover from webhook-based persistence.

---

## 4. Protected Objects

Guardian must monitor:

- Webhooks
- Integration-created automation
- Bot-created webhooks
- Recently modified webhooks
- Channels containing suspicious webhooks
- Webhook spam behavior
- Webhook permission abuse
- External automation paths

---

## 5. Threats

Webhook threats include:

- Rogue admin creates webhook
- Nuker bot creates webhook
- Unauthorized bot creates webhook
- Webhook spam after bot removal
- Integration sends destructive spam
- Webhook used to impersonate staff
- Webhook used to bypass moderation
- Webhook persists after incident containment

---

## 6. Detection Inputs

Detection may use:

- Webhook create events
- Webhook update events
- Webhook delete events
- Audit log entries
- Message events
- Bot authorization state
- Incident state
- Channel metadata
- Recent actor activity
- Permission changes

---

## 7. Security Decisions

Guardian may decide to:

- Allow webhook
- Monitor webhook
- Freeze webhook
- Delete webhook
- Lock affected channel
- Punish actor
- Trigger incident mode
- Trigger recovery
- Escalate to operator

Every decision must be logged.

---

## 8. Webhook Authorization

A webhook is authorized only if:

- It is registered or explicitly approved
- Its channel scope is known
- Its creator is trusted
- Its purpose is documented
- Its risk is accepted
- Its authorization can be revoked

Unknown webhooks are suspicious during incident mode.

---

## 9. Unauthorized Webhook Response

When an unauthorized webhook is detected:

1. Identify webhook.
2. Identify channel.
3. Resolve creator if possible.
4. Check authorization.
5. Freeze or delete webhook.
6. Punish actor if unauthorized.
7. Log evidence.
8. Link to incident state.

---

## 10. Webhook Freeze

Webhook freeze is a hot-path containment action.

Freeze may include:

- Deleting webhook
- Temporarily locking channel
- Blocking further webhook creation
- Removing risky permissions
- Escalating to panic mode

Freeze must not wait for slow dashboard or optional-module work.

---

## 11. Integration Security

Integrations may create or send automated content.

Guardian must monitor integration risk where possible.

Risks include:

- External automation abuse
- Compromised integration tokens
- Unapproved service connections
- Spam through integration messages
- Privilege misuse

---

## 12. Rogue Admin Webhook Abuse

A rogue admin may create webhooks to preserve attack capability.

Guardian must:

- Detect webhook creation
- Attribute creator
- Check FakePerms authority
- Remove webhook if unauthorized
- Punish actor if malicious
- Log incident

---

## 13. Unauthorized Bot Webhook Abuse

A nuker bot may create webhooks immediately after joining.

Guardian must:

- Link webhook creation to bot join
- Check bot authorization
- Remove unauthorized bot
- Delete related webhooks
- Punish inviter if evidence supports it
- Preserve forensic evidence

---

## 14. Webhook Spam

Webhook spam must be treated separately from normal user spam.

Guardian must detect:

- High-frequency webhook messages
- Mention abuse
- Link spam
- Invite spam
- Impersonation spam
- Multi-channel webhook spam

Response may include webhook deletion, channel lock, or incident escalation.

---

## 15. Attribution

Webhook attribution sources:

- Audit logs
- Webhook creator metadata
- Recent bot activity
- Recent admin activity
- Channel changes
- Incident correlation
- Message patterns

If attribution is uncertain, Guardian must log uncertainty.

---

## 16. Recovery Interaction

Webhook recovery may include:

- Restoring deleted legitimate webhooks where documented
- Removing unauthorized webhooks
- Restoring channel permissions
- Verifying no persistence remains
- Updating incident report

Guardian must not restore malicious webhooks.

---

## 17. Permission Requirements

Guardian requires sufficient permissions to:

- View audit logs
- Manage webhooks
- Manage channels where needed
- Read messages for spam detection
- Send logs
- Apply locks where required

If permissions are missing, Guardian must enter degraded mode and report the limitation.

---

## 18. Failure Behavior

If webhook deletion fails:

- Retry safely
- Lock affected channel if necessary
- Escalate to operator
- Log failure

If attribution fails:

- Contain webhook if unauthorized or suspicious
- Avoid false punishment
- Continue correlation

If permissions are missing:

- Log degraded mode
- Notify operator
- Use available containment actions

---

## 19. Logging Requirements

Webhook security logs must include:

- Guild ID
- Channel ID
- Webhook ID
- Webhook name
- Creator if known
- Actor if attributed
- Authorization state
- Decision
- Action taken
- Error if any
- Timestamp
- Incident ID if applicable

---

## 20. Acceptance Criteria

Webhook security is acceptable only if:

- Unauthorized webhooks are detected.
- Webhook creators are attributed where possible.
- Unauthorized webhooks are deleted or frozen.
- Webhook spam is contained.
- Bot-created webhooks are linked to bot incidents.
- Legitimate webhooks can be distinguished.
- Degraded mode is visible.
- Logs prove actions and outcomes.

---

## 21. Certification Tests

Required tests:

- Unauthorized webhook create drill
- Rogue admin webhook create drill
- Unauthorized bot webhook create drill
- Webhook spam drill
- Webhook deletion failure drill
- Missing Manage Webhooks permission drill
- Authorized webhook allow test
- Webhook attribution delay test
- Integration abuse simulation
- Forensic log completeness review

---

## 22. Anti-Drift Rule

Webhook security must remain part of the security kernel.

No optional module may own webhook containment.

Webhook containment must remain prioritized with AntiNuke, Bot Authorization, Lockdown, and Recovery.
