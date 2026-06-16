# Guardian Live Drill Plan

## 1. Purpose

The Live Drill Plan defines the controlled real-world validation scenarios required to prove Guardian works under realistic Discord attack conditions.

Live drills validate behavior that unit tests and simulations cannot fully prove.

---

## 2. Core Rule

No destructive drill may be run in a production community guild.

Live drills must use:

- Isolated test guild
- Known owner/operator
- Known rogue test account
- Known target test account
- Prepared snapshots
- Logging channels
- Rollback plan
- Stop condition
- Evidence capture

---

## 3. Drill Safety Requirements

Before every drill:

- Confirm test guild
- Confirm Guardian permissions
- Confirm Guardian role position
- Confirm logging channels
- Confirm snapshots
- Confirm owner access
- Confirm test accounts
- Confirm rollback plan
- Confirm no real users are at risk

If any safety condition fails, the drill is cancelled.

---

## 4. Evidence Requirements

Every drill must capture:

- Guild ID
- Drill name
- Start time
- End time
- Actors
- Targets
- Triggered detectors
- Containment action
- Punishment action
- Recovery action
- Logs
- Final Discord state
- Pass/fail verdict

---

## 5. Drill Verdicts

Allowed verdicts:

- Pass
- Conditional Pass
- Fail
- Blocked
- Retest Required

A drill cannot pass without evidence.

---

## 6. Drill 001 — Rogue Admin Channel Delete

### Objective

Prove Guardian detects and responds to unauthorized channel deletion.

### Steps

1. Prepare snapshot.
2. Rogue admin deletes one channel.
3. Guardian detects event.
4. Guardian attributes actor.
5. Guardian checks FakePerms.
6. Guardian punishes unauthorized actor.
7. Guardian queues recovery.
8. Guardian logs evidence.

### Pass Criteria

- Channel delete detected.
- Actor attribution attempted.
- Unauthorized actor punished.
- Recovery request created.
- Logs contain final status.

---

## 7. Drill 002 — Rogue Admin Role Delete

### Objective

Prove Guardian detects and responds to unauthorized role deletion.

### Steps

1. Prepare protected role.
2. Rogue admin deletes role.
3. Guardian detects role deletion.
4. Guardian attributes actor.
5. Guardian checks authority.
6. Guardian punishes actor.
7. Guardian starts safe restore.
8. Guardian logs evidence.

### Pass Criteria

- Role delete detected.
- Actor punished.
- Recovery attempts safe restore.
- Dangerous permissions are not blindly restored.
- Logs prove result.

---

## 8. Drill 003 — Dangerous Role Grant

### Objective

Prove Guardian reverses unauthorized dangerous role grants.

### Steps

1. Create safe target user.
2. Rogue admin grants dangerous role.
3. Guardian detects grant.
4. Guardian removes dangerous role.
5. Guardian punishes rogue actor.
6. Guardian neutralizes recipient if required.
7. Guardian logs decision.

### Pass Criteria

- Dangerous role removed.
- Rogue actor punished.
- Recipient cannot use escalation.
- No blind dangerous-role restore.
- Logs include actor and target.

---

## 9. Drill 004 — Unauthorized Bot Add

### Objective

Prove unknown bots are denied by default.

### Steps

1. Ensure bot is not authorized.
2. Rogue admin adds bot.
3. Guardian detects bot join.
4. Guardian checks registry.
5. Guardian removes bot.
6. Guardian attributes inviter.
7. Guardian punishes inviter when evidence supports it.
8. Guardian runs webhook sweep.

### Pass Criteria

- Unknown bot removed.
- Inviter attribution attempted.
- Unauthorized inviter punished when proven.
- Webhook sweep triggered.
- Logs complete.

---

## 10. Drill 005 — Nuker Bot Fast Attack

### Objective

Prove Guardian can contain a fast destructive bot.

### Steps

1. Use isolated destructive drill guild.
2. Prepare snapshots.
3. Add controlled nuker bot.
4. Bot attempts channel delete, role delete, bans, and webhook creation.
5. Guardian detects destructive activity.
6. Guardian removes bot.
7. Guardian freezes webhooks.
8. Guardian starts recovery.

### Pass Criteria

- Bot contained.
- Damage bounded.
- Webhooks checked.
- Recovery begins.
- Evidence shows timeline.

---

## 11. Drill 006 — Webhook Persistence

### Objective

Prove Guardian detects webhooks that persist after bot removal.

### Steps

1. Create unauthorized webhook through test actor or bot.
2. Trigger webhook spam or persistence scenario.
3. Guardian detects webhook.
4. Guardian attributes creator if possible.
5. Guardian deletes or freezes webhook.
6. Guardian logs evidence.

### Pass Criteria

- Webhook detected.
- Webhook deleted or frozen.
- Attribution attempted.
- Logs include webhook ID and channel ID.

---

## 12. Drill 007 — Lockdown Reality Check

### Objective

Prove lockdown applies real Discord permission denies.

### Steps

1. Select test channel.
2. Trigger lock.
3. Normal user attempts to send message.
4. Normal user attempts voice action if applicable.
5. Guardian verifies lock.
6. Trigger unlock.
7. Normal user confirms restored access.

### Pass Criteria

- Normal user cannot act during lock.
- Access restored after unlock.
- UI matches real state.
- Logs include verification.

---

## 13. Drill 008 — Recovery Restore

### Objective

Prove Guardian restores safe guild state.

### Steps

1. Prepare snapshot.
2. Delete test channel/category/role.
3. Trigger recovery.
4. Guardian builds restore plan.
5. Guardian restores assets.
6. Guardian verifies result.
7. Guardian logs recovery report.

### Pass Criteria

- Restore plan created.
- Assets restored where possible.
- Partial failures visible.
- Unsafe permissions not restored blindly.
- Verification logs exist.

---

## 14. Drill 009 — AntiSpam Flood

### Objective

Prove Guardian detects spam without blocking AntiNuke.

### Steps

1. Test user sends flood pattern.
2. Guardian detects spam.
3. Guardian applies configured action.
4. Guardian logs result.
5. AntiNuke hot path remains unaffected.

### Pass Criteria

- Spam detected.
- Action applied.
- False positives reviewed.
- AntiNuke unaffected.

---

## 15. Drill 010 — Raid / JoinGate

### Objective

Prove Guardian responds to join bursts and suspicious joins.

### Steps

1. Simulate multiple joins.
2. Guardian detects burst.
3. Guardian applies JoinGate or AntiRaid rules.
4. Guardian monitors suspicious users.
5. Guardian logs summary.

### Pass Criteria

- Join burst detected.
- Risk scoring applied.
- Action taken according to config.
- Logs complete.

---

## 16. Drill 011 — FakePerms Deny

### Objective

Prove Discord Administrator does not equal Guardian trust.

### Steps

1. Give test actor Discord Administrator.
2. Do not grant Guardian trust.
3. Actor attempts protected action.
4. Guardian checks FakePerms.
5. Guardian denies or punishes according to policy.

### Pass Criteria

- Raw Discord admin is not treated as Guardian trust.
- FakePerms decision logged.
- Protected action blocked or punished.

---

## 17. Drill 012 — Bot Authorization Registry

### Objective

Prove explicit bot authorization works.

### Steps

1. Register approved bot.
2. Add approved bot.
3. Confirm allowed.
4. Revoke bot.
5. Re-add revoked bot.
6. Confirm removed.

### Pass Criteria

- Approved bot allowed.
- Revoked bot denied.
- Registry decision logged.

---

## 18. Drill 013 — Restart Recovery

### Objective

Prove critical state survives restart where required.

### Steps

1. Start lockdown or recovery session.
2. Restart Guardian.
3. Guardian loads pending session.
4. Guardian resumes or marks recovery required.
5. Guardian logs final state.

### Pass Criteria

- State is not lost.
- Operator receives clear status.
- No silent failure.

---

## 19. Drill 014 — Logging Completeness

### Objective

Prove all major actions produce evidence.

### Steps

1. Run selected security drill.
2. Collect logs.
3. Verify required fields.
4. Compare against certification matrix.
5. Record pass/fail.

### Pass Criteria

- Event type present.
- Actor present or uncertainty logged.
- Target present.
- Decision present.
- Action present.
- Final status present.

---

## 20. Required Drill Report Format

Each drill report must include:

- Drill ID
- Drill name
- Date
- Commit hash
- Test guild
- Actors
- Targets
- Preconditions
- Steps executed
- Expected result
- Actual result
- Evidence
- Verdict
- Follow-up work

---

## 21. Stop Conditions

Stop the drill immediately if:

- Guardian loses permissions
- Guardian is kicked
- Destruction exceeds expected scope
- Logs stop working
- Recovery cannot be verified
- Real users are affected
- Test guild becomes unstable

---

## 22. Certification Mapping

Drills map to certification areas:

| Drill | Certification Area |
|---|---|
| Channel Delete | AntiNuke |
| Role Delete | AntiNuke / Recovery |
| Dangerous Role Grant | AntiNuke / FakePerms |
| Unauthorized Bot Add | Bot Authorization |
| Nuker Bot | AntiNuke / Bot Authorization / Recovery |
| Webhook Persistence | Webhook Security |
| Lockdown Reality | Lockdown |
| Recovery Restore | Recovery |
| Spam Flood | AntiSpam |
| Raid JoinGate | AntiRaid |
| FakePerms Deny | FakePerms |
| Logging Completeness | Forensics |

---

## 23. Final Certification Rule

Live drills do not replace unit tests or simulation tests.

Live drills provide final real-world confidence.

A Guardian subsystem is not production-certified until required drills pass and evidence is reviewed.
