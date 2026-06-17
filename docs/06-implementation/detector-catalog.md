# Guardian Detector Catalog

## 1. Purpose

This catalog defines Guardian's approved security detectors.

Each detector must have documented triggers, inputs, attribution strategy, containment behavior, punishment behavior, recovery behavior, evidence requirements, failure modes, and certification requirements.

No detector may be implemented outside this catalog without architecture review.

---

## 2. Detector Contract

Every detector must define:

- Detector ID
- Purpose
- Trigger event
- Input data
- Attribution strategy
- Trust exemptions
- Containment actions
- Punishment actions
- Recovery actions
- Evidence produced
- Failure modes
- Certification requirements
- Live drill validation

---

## 3. Global Detector Rules

- Detectors must not bypass FakePerms.
- Detectors must not silently fail.
- Detectors must produce evidence.
- Detectors must respect trusted exemptions.
- Detectors must fail closed when authority cannot be trusted.
- Detectors must not block unrelated hot paths.
- Destructive-event detectors must prioritize containment over dashboard updates.
- Recovery must occur only after containment.

---
## Detector: CHANNEL_DELETE

### Purpose
Detects Channel Delete behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `CHANNEL_DELETE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: CHANNEL_CREATE

### Purpose
Detects Channel Create behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `CHANNEL_CREATE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: CHANNEL_UPDATE

### Purpose
Detects Channel Update behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `CHANNEL_UPDATE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: ROLE_DELETE

### Purpose
Detects Role Delete behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `ROLE_DELETE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: ROLE_CREATE

### Purpose
Detects Role Create behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `ROLE_CREATE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: ROLE_UPDATE

### Purpose
Detects Role Update behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `ROLE_UPDATE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: DANGEROUS_ROLE_GRANT

### Purpose
Detects Dangerous Role Grant behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `DANGEROUS_ROLE_GRANT`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: DANGEROUS_ROLE_RECIPIENT

### Purpose
Detects Dangerous Role Recipient behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `DANGEROUS_ROLE_RECIPIENT`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: MEMBER_BAN

### Purpose
Detects Member Ban behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `MEMBER_BAN`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: MEMBER_KICK

### Purpose
Detects Member Kick behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `MEMBER_KICK`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: BOT_ADD

### Purpose
Detects Bot Add behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `BOT_ADD`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: UNAUTHORIZED_BOT_ADD

### Purpose
Detects Unauthorized Bot Add behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `UNAUTHORIZED_BOT_ADD`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: WEBHOOK_CREATE

### Purpose
Detects Webhook Create behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `WEBHOOK_CREATE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: WEBHOOK_UPDATE

### Purpose
Detects Webhook Update behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `WEBHOOK_UPDATE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: WEBHOOK_DELETE

### Purpose
Detects Webhook Delete behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `WEBHOOK_DELETE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: INVITE_CREATE

### Purpose
Detects Invite Create behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `INVITE_CREATE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: INVITE_ABUSE

### Purpose
Detects Invite Abuse behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `INVITE_ABUSE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: VANITY_UPDATE

### Purpose
Detects Vanity Update behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `VANITY_UPDATE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: JOIN_GATE

### Purpose
Detects Join Gate behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `JOIN_GATE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: RAID_DETECTION

### Purpose
Detects Raid Detection behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `RAID_DETECTION`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: MESSAGE_SPAM

### Purpose
Detects Message Spam behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `MESSAGE_SPAM`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: MENTION_SPAM

### Purpose
Detects Mention Spam behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `MENTION_SPAM`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: LINK_SPAM

### Purpose
Detects Link Spam behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `LINK_SPAM`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: CATEGORY_NUKE

### Purpose
Detects Category Nuke behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `CATEGORY_NUKE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: CHANNEL_FLOOD

### Purpose
Detects Channel Flood behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `CHANNEL_FLOOD`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: ROLE_FLOOD

### Purpose
Detects Role Flood behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `ROLE_FLOOD`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: INTEGRATION_ABUSE

### Purpose
Detects Integration Abuse behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `INTEGRATION_ABUSE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---

## Detector: PERMISSION_OVERWRITE_ABUSE

### Purpose
Detects Permission Overwrite Abuse behavior and routes it through Guardian's security decision pipeline.

### Trigger Event
- Normalized event type: `PERMISSION_OVERWRITE_ABUSE`
- Source: Discord gateway event, audit log correlation, or internal Guardian event.

### Input Data
- guild_id
- event_id
- actor_id when available
- target_id when available
- target_type
- timestamp
- raw payload reference
- audit correlation record when available

### Attribution Strategy
- Attempt audit-log correlation.
- Use event context where Discord provides direct actor data.
- Use Guardian-owned action markers to avoid self-punishment.
- Record attribution confidence.
- Never invent certainty when attribution is incomplete.

### Trust Exemptions
- Check FakePerms authority.
- Check guild owner rules.
- Check Guardian owner rules.
- Check trusted subject scope.
- Check bot authorization where relevant.

### Containment Actions
- Stop or limit the destructive path.
- Remove dangerous role, bot, webhook, or access where applicable.
- Trigger lockdown only when severity requires it.
- Preserve forensic evidence.

### Punishment Actions
- Ban, kick, timeout, neutralize, role-strip, or escalate according to severity and policy.
- Deduplicate punishment.
- Do not punish without sufficient authority and evidence.

### Recovery Actions
- Queue recovery only after containment.
- Use safe restore rules.
- Do not blindly restore dangerous permissions.
- Record partial failures.

### Evidence Produced
- detector_id
- event_id
- guild_id
- actor_id or attribution uncertainty
- target_id
- decision
- action
- recovery request if applicable
- final status

### Failure Modes
- Audit log unavailable.
- Missing permissions.
- Rate limit encountered.
- Actor attribution uncertain.
- Recovery snapshot missing.
- Containment action failed.

### Certification Requirements
- Unit test for detector trigger.
- Integration test for decision path.
- Failure-path test.
- Log evidence review.
- Regression test.

### Live Drill Validation
- Required for destructive detectors.
- Optional for low-risk advisory detectors.
- Drill result must be recorded in certification evidence.

---
