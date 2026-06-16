# Guardian AntiNuke Core

## 1. Purpose

The AntiNuke Core is the primary security engine responsible for detecting, attributing, containing, punishing, and initiating recovery for destructive guild actions.

AntiNuke is part of the Guardian security kernel and must always execute before optional modules.

---

## 2. Mission

The mission of AntiNuke is to stop destructive behavior before it becomes catastrophic.

AntiNuke must defend against:

- Rogue administrators
- Compromised staff accounts
- Unauthorized bots
- Nuker bots
- Webhook abuse
- Role escalation
- Invite exploitation
- High-concurrency destructive API usage

---

## 3. Protected Actions

AntiNuke must monitor and evaluate:

- Channel delete
- Channel create flood
- Channel update abuse
- Role delete
- Role create flood
- Role update abuse
- Member ban
- Member kick
- Dangerous role grant
- Permission overwrite abuse
- Bot add
- Webhook create
- Webhook update
- Integration abuse
- Invite abuse
- Vanity URL abuse
- Mass destructive sequences

---

## 4. Core Pipeline

The AntiNuke pipeline is:

Discord Event
→ Normalize
→ Classify
→ Attribute Actor
→ Load Authority
→ Score Risk
→ Make Decision
→ Contain
→ Punish
→ Trigger Recovery
→ Log Evidence

Each stage must be observable and testable.

---

## 5. Event Intake Contract

AntiNuke receives events from the Discord gateway.

Inputs may include:

- Raw gateway event
- Guild ID
- Actor candidate
- Target object
- Timestamp
- Event type
- Cached state
- Audit log result

AntiNuke must not depend on optional modules for event processing.

---

## 6. Event Classification

Events must be classified into security categories:

- Destructive
- Escalation
- Suspicious
- Administrative
- Benign
- Recovery-related
- Guardian-owned

Guardian-owned actions must be identified to prevent self-trigger loops.

---

## 7. Actor Attribution

AntiNuke must determine who performed the action.

Attribution sources:

- Discord audit logs
- Gateway metadata
- Cached action context
- Known Guardian action markers
- Recovery action markers
- Correlation windows

If attribution is uncertain, AntiNuke must log uncertainty instead of inventing certainty.

---

## 8. Authority Evaluation

After actor attribution, AntiNuke checks Guardian authority.

Authority sources:

- Guild owner
- Guardian owner
- Explicit trusted users
- Explicit trusted roles
- Permit system
- Bot registry
- Recovery operator registry

Raw Discord Administrator permission is not enough to bypass AntiNuke.

---

## 9. Risk Scoring

AntiNuke must score risk using:

- Event severity
- Actor trust level
- Target sensitivity
- Action velocity
- Repeated behavior
- Guild state
- Active incident state
- Prior detector signals

High-risk actions must enter hot-path containment.

---

## 10. Decision Types

AntiNuke may return:

- Allow
- Log only
- Warn
- Remove role
- Neutralize
- Kick
- Ban
- Remove bot
- Delete webhook
- Lock channel
- Lock guild
- Trigger recovery
- Escalate to operator

Decision must include reason and evidence.

---

## 11. Containment Priority

Containment must execute before slow work.

Hot-path actions include:

- Ban rogue actor
- Remove unauthorized bot
- Remove dangerous role
- Neutralize recipient
- Freeze webhook
- Lock affected channel
- Start panic mode if thresholds require it

Logging must not block containment.

---

## 12. Punishment Rules

Punishment must be:

- Evidence-based
- Deduplicated
- Authority-aware
- Severity-aware
- Logged
- Reversible only where safe

No punishment should be dispatched twice for the same incident unless escalation rules require it.

---

## 13. Dangerous Role Grant Protection

When a dangerous role is granted:

1. Detect the grant.
2. Resolve actor and recipient.
3. Remove dangerous role from recipient.
4. Punish unauthorized actor.
5. Neutralize recipient if risk remains.
6. Log decision.
7. Do not blindly restore dangerous role on release.

This scenario is high priority because it can create immediate escalation.

---

## 14. Unauthorized Bot Protection

When a bot joins:

1. Detect guild member add.
2. Check whether member is bot.
3. Resolve inviter.
4. Check bot authorization registry.
5. Remove bot if unauthorized.
6. Punish inviter if unauthorized.
7. Freeze related webhooks/integrations.
8. Log incident.

Unknown bots are denied by default.

---

## 15. Webhook Protection

Webhook actions are AntiNuke-relevant when they create persistence or spam risk.

AntiNuke must detect:

- Webhook creation
- Webhook update
- Webhook deletion abuse
- Webhook spam indicators

Unauthorized webhook response:

- Freeze
- Delete
- Attribute
- Punish
- Log

---

## 16. Channel Destruction Protection

Channel deletion is a critical AntiNuke event.

Response:

1. Detect delete.
2. Attribute actor.
3. Check trust.
4. Punish if unauthorized.
5. Queue recovery.
6. Avoid duplicate punishment.
7. Log forensic summary.

Mass deletion must escalate to incident mode.

---

## 17. Role Destruction Protection

Role deletion is critical when:

- Role is protected
- Role has permissions
- Role is part of hierarchy
- Role is used by Guardian
- Role impacts recovery or moderation

Recovery must not restore dangerous permissions blindly.

---

## 18. Ban and Kick Protection

Mass bans and kicks are high-severity events.

AntiNuke must detect:

- Single unauthorized ban/kick
- Burst ban/kick
- Targeted staff removal
- Guardian bot kick attempt
- Member purge behavior

Punishment should prioritize stopping the actor.

---

## 19. Thresholds and Limits

AntiNuke must support thresholds such as:

- Per-action limit
- Per-actor limit
- Per-time-window limit
- Per-guild emergency threshold
- Protected-target threshold

Thresholds must be configurable per guild but bounded by safe defaults.

---

## 20. Incident State

AntiNuke must track active incidents.

Incident state includes:

- Incident ID
- Guild ID
- Actor
- Targets
- Triggering events
- Containment actions
- Recovery state
- Final verdict

Incident state prevents duplicate punishment and supports forensic review.

---

## 21. Recovery Handoff

AntiNuke does not perform all restoration itself.

It creates recovery requests.

Recovery request includes:

- Incident ID
- Guild ID
- Event type
- Target ID
- Snapshot reference
- Priority
- Safety constraints

Recovery must run only after containment is underway or complete.

---

## 22. Logging and Forensics

AntiNuke must emit evidence for every security decision.

Required log fields:

- Guild ID
- Event type
- Actor ID
- Target ID
- Detector
- Decision
- Punishment
- Recovery request
- Timing
- Confidence
- Errors
- Final status

---

## 23. Performance Requirements

AntiNuke hot paths must avoid:

- Blocking file I/O
- Slow dashboard calls
- Optional module waits
- Long synchronous logging
- Unbounded audit-log polling
- Expensive recovery work before containment

Containment dispatch must be prioritized.

---

## 24. Failure Behavior

If attribution fails:

- Log uncertainty.
- Continue monitoring.
- Use conservative containment where safe.
- Avoid false punishment of trusted users.

If punishment fails:

- Log failure.
- Retry if safe.
- Escalate to operator.
- Continue containment alternatives.

If logging fails:

- Do not block security.
- Queue retry.

---

## 25. Anti-Drift Requirements

AntiNuke implementation must trace to:

- Executive Architecture Contract
- Threat Model
- System Contract Register
- Certification Matrix
- Live Drill Plan

Any new detector must include:

- Threat scenario
- Contract reference
- Test case
- Logging requirement
- Acceptance criteria

---

## 26. Certification Requirements

AntiNuke is not certified until it passes:

- Channel delete drill
- Role delete drill
- Dangerous role grant drill
- Unauthorized bot add drill
- Webhook abuse drill
- Mass ban drill
- Mass kick drill
- Recovery handoff drill
- Logging completeness review
- Regression test suite

---

## 27. Acceptance Criteria

AntiNuke is acceptable only if:

- Destructive actions are detected.
- Actor attribution is attempted.
- Unauthorized actors are contained.
- Trusted users are protected from false punishment.
- Dangerous role escalation is reversed.
- Unauthorized bots are removed.
- Webhook abuse is contained.
- Recovery is triggered when needed.
- Logs prove what happened.
- Tests can repeat the result.

---

## 28. Executive Verdict

AntiNuke is the core defensive layer of Guardian.

It must be fast, authority-aware, evidence-based, recovery-integrated, and certification-driven.

If AntiNuke is slow, optional-module-dependent, or unable to prove decisions with logs, Guardian cannot be considered enterprise-grade.
