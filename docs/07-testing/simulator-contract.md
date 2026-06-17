# Guardian Simulator Test Contract

## 1. Purpose

This contract defines Guardian's simulator testing requirements.

The simulator allows Guardian to test high-risk Discord attack and recovery scenarios safely without requiring destructive production guild actions.

---

## 2. Global Rules

- Simulator tests must not require production guild destruction.
- Simulator scenarios must model realistic Discord event ordering.
- Simulator scenarios must support audit-log delay and attribution uncertainty.
- Simulator scenarios must validate detection, decision, containment, recovery, and logging.
- Simulator evidence must be suitable for regression and certification review.

---
## Area: Simulator Purpose

### Purpose
Defines simulator testing requirements for `SIMULATOR_PURPOSE`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Simulation Architecture

### Purpose
Defines simulator testing requirements for `SIMULATION_ARCHITECTURE`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Event Simulation

### Purpose
Defines simulator testing requirements for `EVENT_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Audit Log Simulation

### Purpose
Defines simulator testing requirements for `AUDIT_LOG_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Actor Simulation

### Purpose
Defines simulator testing requirements for `ACTOR_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Guild State Simulation

### Purpose
Defines simulator testing requirements for `GUILD_STATE_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Role Simulation

### Purpose
Defines simulator testing requirements for `ROLE_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Channel Simulation

### Purpose
Defines simulator testing requirements for `CHANNEL_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Webhook Simulation

### Purpose
Defines simulator testing requirements for `WEBHOOK_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Invite Simulation

### Purpose
Defines simulator testing requirements for `INVITE_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Raid Simulation

### Purpose
Defines simulator testing requirements for `RAID_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Spam Simulation

### Purpose
Defines simulator testing requirements for `SPAM_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Nuke Simulation

### Purpose
Defines simulator testing requirements for `NUKE_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Unauthorized Bot Simulation

### Purpose
Defines simulator testing requirements for `UNAUTHORIZED_BOT_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Recovery Simulation

### Purpose
Defines simulator testing requirements for `RECOVERY_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Lockdown Simulation

### Purpose
Defines simulator testing requirements for `LOCKDOWN_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Rate Limit Simulation

### Purpose
Defines simulator testing requirements for `RATE_LIMIT_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Timing Simulation

### Purpose
Defines simulator testing requirements for `TIMING_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Concurrency Simulation

### Purpose
Defines simulator testing requirements for `CONCURRENCY_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Failure Simulation

### Purpose
Defines simulator testing requirements for `FAILURE_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Evidence Simulation

### Purpose
Defines simulator testing requirements for `EVIDENCE_SIMULATION`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Regression Replay

### Purpose
Defines simulator testing requirements for `REGRESSION_REPLAY`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Area: Certification Evidence

### Purpose
Defines simulator testing requirements for `CERTIFICATION_EVIDENCE`.

### Required Coverage
- Simulated event input
- Expected detector result
- Expected decision result
- Expected containment result
- Expected logging evidence

### Simulation Requirements
- Must support deterministic replay.
- Must support timing variation where applicable.
- Must support failure injection where applicable.
- Must support multi-guild isolation where applicable.

### Evidence
- Scenario ID
- Input event sequence
- Expected result
- Actual result
- Pass/fail verdict
- Forensic evidence reference

### Release Gate
- Simulator failures for critical scenarios block certification.

---

## Exit Criteria

Simulator testing is acceptable only when high-risk Guardian scenarios can be replayed safely, deterministically, and with certifiable evidence.
