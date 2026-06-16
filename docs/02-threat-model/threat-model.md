# Guardian Threat Model

## 1. Purpose

This document defines the primary threats Guardian must defend against, the expected attacker behaviors, the security objectives, and the required defensive responses.

Guardian is designed to protect Discord guilds from destructive administrative abuse, unauthorized automation, nuker bots, webhook abuse, spam, raids, permission escalation, and recovery failure.

---

## 2. Security Objectives

Guardian must achieve the following objectives:

1. Detect destructive behavior quickly.
2. Attribute the responsible actor correctly.
3. Contain the attack before damage spreads.
4. Punish unauthorized actors safely.
5. Remove or neutralize unauthorized automation.
6. Freeze webhook and integration abuse.
7. Recover damaged guild structure.
8. Preserve audit-grade forensic evidence.
9. Avoid punishing trusted users without evidence.
10. Prevent architecture drift through testable contracts.

---

## 3. Protected Assets

Guardian protects:

- Channels
- Categories
- Roles
- Members
- Guild configuration
- Permission overwrites
- Webhooks
- Integrations
- Invites
- Trusted role hierarchy
- Bot authorization registry
- Recovery snapshots
- Logging routes
- Security configuration

---

## 4. Primary Threat Actors

### Rogue Administrator

A user with Discord administrative permissions who attempts to abuse power.

Capabilities may include:

- Deleting channels
- Deleting roles
- Banning users
- Kicking users
- Granting dangerous roles
- Adding unauthorized bots
- Creating webhooks
- Modifying permissions
- Generating dangerous invites

### Nuker Bot

An automated bot designed to destroy a server quickly.

Capabilities may include:

- Mass channel deletion
- Mass role deletion
- Mass bans
- Mass kicks
- Webhook creation
- Webhook spam
- Channel spam
- Permission overwrite abuse
- High-concurrency API execution

### Compromised Trusted User

A normally trusted user whose account is compromised.

Risk:

- Actions appear to come from a trusted identity.
- Guardian must distinguish trust from behavior severity.
- High-risk actions may still require containment or review.

### Unauthorized Bot Inviter

A user who adds an unapproved bot.

Risk:

- Bot may execute before manual review.
- Inviter may be rogue, compromised, or negligent.
- Guardian must remove the bot and evaluate inviter punishment.

### Webhook Abuser

An actor who uses webhooks to continue damage or spam after a bot is removed.

Risk:

- Webhook can persist beyond bot removal.
- Webhook messages can bypass normal bot-member containment.
- Guardian must freeze/delete unauthorized webhooks.

---

## 5. Threat Scenario: Rogue Admin Deletes Channels

### Attack

A rogue admin deletes multiple channels rapidly.

### Required Guardian Response

1. Detect channel deletion.
2. Resolve actor using audit logs.
3. Check Guardian authority.
4. Trigger AntiNuke decision.
5. Punish rogue actor.
6. Start lockdown or containment if threshold reached.
7. Queue recovery using snapshots.
8. Log forensic evidence.

### Acceptance Criteria

- Actor is identified when audit logs are available.
- Trusted bypass does not apply to unauthorized destructive behavior.
- Duplicate punishment is avoided.
- Recovery plan is created if snapshot exists.

---

## 6. Threat Scenario: Rogue Admin Deletes Roles

### Attack

A rogue admin deletes important roles.

### Required Guardian Response

1. Detect role deletion.
2. Attribute actor.
3. Check if role is protected.
4. Punish actor if unauthorized.
5. Restore role if recoverable.
6. Reattach safe permissions where possible.
7. Log result.

### Acceptance Criteria

- Protected roles receive higher severity.
- Recovery does not recreate dangerous permissions blindly.
- Evidence includes role ID, name, actor, and restore result.

---

## 7. Threat Scenario: Dangerous Role Grant

### Attack

A rogue admin grants Administrator or dangerous permissions to another user.

### Required Guardian Response

1. Detect role update/member role grant.
2. Identify actor and target.
3. Remove dangerous role from target.
4. Punish rogue actor.
5. Neutralize recipient if needed.
6. Log decision.
7. Suppress unnecessary full-server lockdown unless thresholds justify it.

### Acceptance Criteria

- Dangerous role is removed quickly.
- Rogue actor is punished.
- Recipient cannot use elevated permissions.
- Release must not blindly restore dangerous roles.

---

## 8. Threat Scenario: Unauthorized Bot Add

### Attack

A rogue admin adds an unapproved bot.

### Required Guardian Response

1. Detect bot join.
2. Resolve inviter.
3. Check bot authorization registry.
4. Remove unauthorized bot.
5. Punish inviter if unauthorized.
6. Freeze related webhooks/integrations.
7. Log incident.

### Acceptance Criteria

- Unknown bots are denied by default.
- Authorized bot registry is explicit.
- Inviter is audited.
- Webhook sweep runs when risk exists.

---

## 9. Threat Scenario: Nuker Bot Executes Before Containment

### Attack

A nuker bot is added and immediately performs destructive actions.

### Required Guardian Response

1. Detect destructive events.
2. Detect bot actor if possible.
3. Ban/remove bot.
4. Freeze webhooks.
5. Lock affected guild areas if needed.
6. Attribute inviter.
7. Punish inviter when evidence supports it.
8. Start recovery.

### Acceptance Criteria

- Bot removal has hot-path priority.
- Webhook freeze is not delayed by logging or optional modules.
- Damage is bounded.
- Recovery evidence is generated.

---

## 10. Threat Scenario: Webhook Abuse

### Attack

A rogue admin or bot creates webhooks and uses them for spam or persistence.

### Required Guardian Response

1. Detect webhook creation.
2. Attribute actor.
3. Check authorization.
4. Delete/freeze unauthorized webhook.
5. Punish actor.
6. Log webhook metadata.

### Acceptance Criteria

- Webhook containment runs as a security hot path.
- Webhook abuse cannot continue after bot removal.
- Logs include webhook ID, channel, creator, and action.

---

## 11. Threat Scenario: Invite Exploitation

### Attack

A rogue actor creates an invite that allows dangerous users or bots to enter.

### Required Guardian Response

1. Monitor invite creation.
2. Track inviter where possible.
3. Detect suspicious join patterns.
4. Inspect new members for dangerous grants.
5. Neutralize risky joiners.
6. Punish malicious creator if attributed.

### Acceptance Criteria

- Invite creator attribution is attempted.
- JoinGate and AntiRaid signals are linked.
- Dangerous role grants after join are handled immediately.

---

## 12. Threat Scenario: Spam and Raid

### Attack

Multiple accounts flood messages, mentions, links, or invites.

### Required Guardian Response

1. Detect rate and content patterns.
2. Apply AntiSpam scoring.
3. Mute, timeout, delete, or lock as configured.
4. Escalate to raid mode if thresholds are met.
5. Log action summary.

### Acceptance Criteria

- AntiSpam does not block AntiNuke hot paths.
- Slow stealth spam is detected where possible.
- Webhook spam receives separate security handling.

---

## 13. Threat Scenario: Recovery Failure

### Attack Impact

Damage occurs and restoration is incomplete.

### Required Guardian Response

1. Preserve incident evidence.
2. Identify missing snapshot data.
3. Attempt safe partial recovery.
4. Mark unresolved items.
5. Notify operator.
6. Prevent unsafe restoration.

### Acceptance Criteria

- Recovery failure is explicit, not silent.
- Dangerous permissions are not blindly restored.
- Logs show what was restored and what failed.

---

## 14. Security Assumptions

Guardian assumes:

- Discord audit logs may be delayed.
- Gateway events may arrive before audit attribution.
- Attackers may execute actions concurrently.
- Bots may be faster than human operators.
- Webhooks may persist after bot removal.
- Trusted users may be compromised.
- Optional modules may fail without affecting security kernel.

---

## 15. Required Evidence

Every major incident must collect:

- Guild ID
- Event type
- Actor ID
- Target ID
- Timestamp
- Detector
- Decision
- Punishment action
- Recovery action
- Confidence level
- Errors
- Final outcome

---

## 16. Certification Questions

Guardian is not certified unless these questions can be answered with evidence:

1. Was the attack detected?
2. Was the actor attributed?
3. Was the actor trusted or unauthorized?
4. Was containment dispatched?
5. Was punishment executed?
6. Was recovery attempted?
7. Was recovery correct?
8. Were webhooks checked?
9. Were duplicate punishments avoided?
10. Were logs complete?

---

## 17. Non-Negotiable Requirements

- Unknown bots are denied by default.
- Dangerous role grants must be reversed.
- Rogue destructive actions must be punished.
- Webhook abuse must be contained.
- Recovery must be safe, not blind.
- Security kernel must outrank optional modules.
- Every security decision must be auditable.
- Certification requires repeatable tests and logs.

---

## 18. Threat Model Verdict

Guardian must be designed against fast, concurrent, multi-vector attacks.

A secure Guardian build must assume that attackers will combine:

- Rogue admin access
- Unauthorized bot add
- High-speed nuker execution
- Webhook persistence
- Invite abuse
- Permission escalation
- Recovery disruption

The correct defensive posture is prevention first, containment second, punishment third, recovery fourth, and certification always.
