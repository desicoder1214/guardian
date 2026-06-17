# Guardian Punishment Catalog

## 1. Purpose

This catalog defines every approved punishment, containment, and emergency response action Guardian may execute.

No punishment action may be implemented outside this catalog without architecture review.

---

## 2. Global Rules

- Punishment must be evidence-based.
- Punishment must respect FakePerms.
- Punishment must deduplicate repeated actions.
- Punishment must produce forensic logs.
- Containment comes before recovery.
- Dangerous role removal must happen quickly.
- Unauthorized bot removal must be prioritized.
- Webhook freeze/delete must preserve evidence.
- Lockdown must be real, not cosmetic.
- Failure must be visible.

---

## 3. Execution Ordering

Recommended order during active destructive events:

1. Contain immediate threat.
2. Remove dangerous access.
3. Punish unauthorized actor.
4. Freeze webhook or integration persistence.
5. Queue safe recovery.
6. Record forensic evidence.
7. Produce final incident verdict.

---
## Action: BAN_ACTOR

### Purpose
Defines the approved behavior for `BAN_ACTOR`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: KICK_ACTOR

### Purpose
Defines the approved behavior for `KICK_ACTOR`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: TIMEOUT_ACTOR

### Purpose
Defines the approved behavior for `TIMEOUT_ACTOR`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: NEUTRALIZE_ACTOR

### Purpose
Defines the approved behavior for `NEUTRALIZE_ACTOR`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: NEUTRALIZE_TARGET

### Purpose
Defines the approved behavior for `NEUTRALIZE_TARGET`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: REMOVE_DANGEROUS_ROLE

### Purpose
Defines the approved behavior for `REMOVE_DANGEROUS_ROLE`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: STRIP_DANGEROUS_PERMISSIONS

### Purpose
Defines the approved behavior for `STRIP_DANGEROUS_PERMISSIONS`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: REMOVE_UNAUTHORIZED_BOT

### Purpose
Defines the approved behavior for `REMOVE_UNAUTHORIZED_BOT`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: FREEZE_WEBHOOK

### Purpose
Defines the approved behavior for `FREEZE_WEBHOOK`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: DELETE_WEBHOOK

### Purpose
Defines the approved behavior for `DELETE_WEBHOOK`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: REVOKE_INVITE

### Purpose
Defines the approved behavior for `REVOKE_INVITE`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: LOCK_CHANNEL

### Purpose
Defines the approved behavior for `LOCK_CHANNEL`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: LOCK_GUILD

### Purpose
Defines the approved behavior for `LOCK_GUILD`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: PANIC_MODE

### Purpose
Defines the approved behavior for `PANIC_MODE`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: QUEUE_RECOVERY

### Purpose
Defines the approved behavior for `QUEUE_RECOVERY`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---

## Action: PRESERVE_EVIDENCE

### Purpose
Defines the approved behavior for `PRESERVE_EVIDENCE`.

### Allowed Triggers
- AntiNuke detector decision.
- FakePerms denial on protected action.
- Unauthorized bot or webhook detection.
- Active nuke, raid, spam, or abuse incident.
- Manual authorized operator action where permitted.

### Authority Requirements
- Must check Guardian authority before manual execution.
- Automated execution must trace to detector decision.
- Owner/trusted exemptions must be evaluated.
- Raw Discord Administrator is not enough for Guardian trust.

### Execution Rules
- Execute only through approved punishment orchestrator.
- Record start, result, and failure state.
- Avoid duplicate punishment.
- Respect Discord rate limits without blocking critical containment.
- Escalate visibly if action cannot complete.

### Failure Handling
- Log failure reason.
- Preserve incident state.
- Escalate to operator if permissions are missing.
- Do not mark incident as contained unless verified.

### Recovery Interaction
- Recovery may begin only after containment.
- Recovery must not blindly restore unsafe state.
- Recovery jobs must reference incident and action evidence.

### Evidence Produced
- action_id
- incident_id
- guild_id
- actor_id
- target_id
- trigger_detector
- execution_status
- error if any
- final verification state

### Certification Requirements
- Unit test action planner.
- Integration test execution path.
- Failure-path test.
- Log evidence review.
- Regression test for dedupe.

---
