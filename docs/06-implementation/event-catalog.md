# Guardian Event Catalog

## 1. Purpose

This catalog defines every approved event Guardian consumes, normalizes, routes, stores, and uses for security decisions.

No event may be introduced into Guardian implementation without being documented in this catalog.

---

## 2. Global Event Rules

- Events must be normalized before detector execution.
- Security events must include guild_id.
- Events must preserve raw payload references where useful.
- Events must not bypass the Security Kernel.
- Events must not bypass FakePerms where authority is required.
- Events must be traceable to detectors, decisions, logs, and certification evidence.
- High-risk events must be prioritized over optional modules.

---

## 3. Event Priority Classes

| Priority | Meaning |
|---|---|
| P0 | Emergency destructive event |
| P1 | Security-sensitive event |
| P2 | Moderation or recovery event |
| P3 | Informational event |
| P4 | Optional module event |

---

## 4. Latency Classes

| Class | Target |
|---|---|
| Hot Path | Must be routed immediately |
| Fast Path | Must be routed quickly |
| Background | May be queued |
| Advisory | May be delayed |

---
## Event: CHANNEL_DELETE

### Purpose
Defines how Guardian consumes and normalizes `CHANNEL_DELETE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P0`
- Latency class: `Hot Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: CHANNEL_CREATE

### Purpose
Defines how Guardian consumes and normalizes `CHANNEL_CREATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: CHANNEL_UPDATE

### Purpose
Defines how Guardian consumes and normalizes `CHANNEL_UPDATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: ROLE_DELETE

### Purpose
Defines how Guardian consumes and normalizes `ROLE_DELETE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P0`
- Latency class: `Hot Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: ROLE_CREATE

### Purpose
Defines how Guardian consumes and normalizes `ROLE_CREATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: ROLE_UPDATE

### Purpose
Defines how Guardian consumes and normalizes `ROLE_UPDATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: GUILD_MEMBER_UPDATE

### Purpose
Defines how Guardian consumes and normalizes `GUILD_MEMBER_UPDATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: GUILD_MEMBER_ADD

### Purpose
Defines how Guardian consumes and normalizes `GUILD_MEMBER_ADD`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: GUILD_MEMBER_REMOVE

### Purpose
Defines how Guardian consumes and normalizes `GUILD_MEMBER_REMOVE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: GUILD_BAN_ADD

### Purpose
Defines how Guardian consumes and normalizes `GUILD_BAN_ADD`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P0`
- Latency class: `Hot Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: GUILD_BAN_REMOVE

### Purpose
Defines how Guardian consumes and normalizes `GUILD_BAN_REMOVE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P0`
- Latency class: `Hot Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: WEBHOOKS_UPDATE

### Purpose
Defines how Guardian consumes and normalizes `WEBHOOKS_UPDATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P0`
- Latency class: `Hot Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: INVITE_CREATE

### Purpose
Defines how Guardian consumes and normalizes `INVITE_CREATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: INVITE_DELETE

### Purpose
Defines how Guardian consumes and normalizes `INVITE_DELETE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P0`
- Latency class: `Hot Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: GUILD_UPDATE

### Purpose
Defines how Guardian consumes and normalizes `GUILD_UPDATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P0`
- Latency class: `Hot Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: MESSAGE_CREATE

### Purpose
Defines how Guardian consumes and normalizes `MESSAGE_CREATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: MESSAGE_DELETE

### Purpose
Defines how Guardian consumes and normalizes `MESSAGE_DELETE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P0`
- Latency class: `Hot Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: MESSAGE_UPDATE

### Purpose
Defines how Guardian consumes and normalizes `MESSAGE_UPDATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: INTERACTION_CREATE

### Purpose
Defines how Guardian consumes and normalizes `INTERACTION_CREATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: AUDIT_LOG_ENTRY_CREATE

### Purpose
Defines how Guardian consumes and normalizes `AUDIT_LOG_ENTRY_CREATE`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: READY

### Purpose
Defines how Guardian consumes and normalizes `READY`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: RESUME

### Purpose
Defines how Guardian consumes and normalizes `RESUME`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: ERROR

### Purpose
Defines how Guardian consumes and normalizes `ERROR`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---

## Event: RATE_LIMIT

### Purpose
Defines how Guardian consumes and normalizes `RATE_LIMIT`.

### Source
- Discord gateway event
- Discord audit log correlation when applicable
- Internal Guardian event when derived

### Priority
- Priority class: `P1`
- Latency class: `Fast Path`

### Required Normalized Fields
- event_id
- guild_id
- event_type
- actor_id when available
- target_id when available
- target_type when available
- created_at
- raw_payload_ref
- correlation_id when available

### Detectors Consuming Event
- AntiNuke detectors where destructive
- Authority detectors where permission-sensitive
- Webhook detectors where webhook-related
- Recovery detectors where restore-related
- Logging and forensic pipeline

### Security Impact
- Must be evaluated against Guardian threat model.
- Must route through detector pipeline when security-sensitive.
- Must not be dropped silently.

### Recovery Dependency
- If destructive, event may trigger snapshot lookup or recovery job.
- Recovery must only run after containment.
- Recovery evidence must reference the source event.

### Evidence Requirements
- Normalized event record
- Detector result where applicable
- Decision record where applicable
- Final action or no-action reason

### Failure Modes
- Missing guild_id
- Missing actor attribution
- Gateway delay
- Audit-log delay
- Rate limit
- Payload mismatch

### Certification Requirements
- Event normalization test
- Detector routing test
- Failure-path test
- Logging evidence test

---
