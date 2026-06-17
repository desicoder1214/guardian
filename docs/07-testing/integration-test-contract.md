# Guardian Integration Test Contract

## 1. Purpose

This contract defines Guardian's integration testing requirements.

Integration tests prove that independently tested modules work together correctly across security, authority, recovery, logging, configuration, and certification flows.

---

## 2. Global Rules

- Integration tests must validate end-to-end module interaction.
- Security Kernel flows must be tested before optional modules.
- FakePerms must be tested across all privileged flows.
- Logging and forensic evidence must be verified.
- Integration tests must not require destructive production guild actions.
- Test data must be isolated per guild.
- Failures must produce actionable evidence.

---
## Area: Integration Test Architecture

### Purpose
Defines integration testing requirements for `INTEGRATION_TEST_ARCHITECTURE`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Module Interaction Tests

### Purpose
Defines integration testing requirements for `MODULE_INTERACTION_TESTS`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Event to Detector Flow

### Purpose
Defines integration testing requirements for `EVENT_TO_DETECTOR_FLOW`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Detector to Decision Flow

### Purpose
Defines integration testing requirements for `DETECTOR_TO_DECISION_FLOW`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Decision to Punishment Flow

### Purpose
Defines integration testing requirements for `DECISION_TO_PUNISHMENT_FLOW`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Punishment to Logging Flow

### Purpose
Defines integration testing requirements for `PUNISHMENT_TO_LOGGING_FLOW`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Recovery Integration

### Purpose
Defines integration testing requirements for `RECOVERY_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: FakePerms Integration

### Purpose
Defines integration testing requirements for `FAKEPERMS_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Bot Authorization Integration

### Purpose
Defines integration testing requirements for `BOT_AUTHORIZATION_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Webhook Security Integration

### Purpose
Defines integration testing requirements for `WEBHOOK_SECURITY_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Lockdown Integration

### Purpose
Defines integration testing requirements for `LOCKDOWN_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Configuration Integration

### Purpose
Defines integration testing requirements for `CONFIGURATION_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Database Integration

### Purpose
Defines integration testing requirements for `DATABASE_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: API Integration

### Purpose
Defines integration testing requirements for `API_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Dashboard Integration

### Purpose
Defines integration testing requirements for `DASHBOARD_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Plugin Integration

### Purpose
Defines integration testing requirements for `PLUGIN_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Queue Integration

### Purpose
Defines integration testing requirements for `QUEUE_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Failure Path Integration

### Purpose
Defines integration testing requirements for `FAILURE_PATH_INTEGRATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Cross-Guild Isolation

### Purpose
Defines integration testing requirements for `CROSS-GUILD_ISOLATION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Regression Protection

### Purpose
Defines integration testing requirements for `REGRESSION_PROTECTION`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: CI Evidence

### Purpose
Defines integration testing requirements for `CI_EVIDENCE`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Area: Certification Evidence

### Purpose
Defines integration testing requirements for `CERTIFICATION_EVIDENCE`.

### Required Coverage
- Inputs from upstream module.
- Outputs to downstream module.
- Correct state transitions.
- Authorization behavior.
- Logging behavior.
- Failure behavior.

### Evidence
- Test name
- Modules involved
- Test environment
- Expected result
- Actual result
- Logs or report reference

### Anti-Drift Rule
- No cross-module behavior may be accepted without integration test evidence.

---

## Exit Criteria

Integration testing is acceptable only when critical Guardian flows prove that events, detectors, decisions, punishments, recovery, and forensic logging work together.
