# Guardian Unit Test Contract

## 1. Purpose

This contract defines Guardian's unit testing requirements.

Unit tests prove isolated behavior before integration, simulation, live drills, and certification.

---

## 2. Global Rules

- Every security-critical module must have unit tests.
- Every detector must have trigger and failure-path tests.
- Every punishment action must have planner and dedupe tests.
- FakePerms decisions must be tested independently.
- Recovery safety filters must be tested independently.
- Tests must be deterministic.
- Tests must not require live Discord.
- Tests must produce CI evidence.

---
## Area: Test Architecture

### Purpose
Defines unit testing requirements for `TEST_ARCHITECTURE`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Test Naming

### Purpose
Defines unit testing requirements for `TEST_NAMING`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Test Organization

### Purpose
Defines unit testing requirements for `TEST_ORGANIZATION`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Detector Unit Tests

### Purpose
Defines unit testing requirements for `DETECTOR_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Event Unit Tests

### Purpose
Defines unit testing requirements for `EVENT_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Punishment Unit Tests

### Purpose
Defines unit testing requirements for `PUNISHMENT_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: FakePerms Unit Tests

### Purpose
Defines unit testing requirements for `FAKEPERMS_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Authority Unit Tests

### Purpose
Defines unit testing requirements for `AUTHORITY_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Bot Authorization Unit Tests

### Purpose
Defines unit testing requirements for `BOT_AUTHORIZATION_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Webhook Security Unit Tests

### Purpose
Defines unit testing requirements for `WEBHOOK_SECURITY_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Recovery Unit Tests

### Purpose
Defines unit testing requirements for `RECOVERY_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Lockdown Unit Tests

### Purpose
Defines unit testing requirements for `LOCKDOWN_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Configuration Unit Tests

### Purpose
Defines unit testing requirements for `CONFIGURATION_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Database Unit Tests

### Purpose
Defines unit testing requirements for `DATABASE_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Logging Unit Tests

### Purpose
Defines unit testing requirements for `LOGGING_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Plugin Unit Tests

### Purpose
Defines unit testing requirements for `PLUGIN_UNIT_TESTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Failure Injection

### Purpose
Defines unit testing requirements for `FAILURE_INJECTION`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Edge Cases

### Purpose
Defines unit testing requirements for `EDGE_CASES`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Race Conditions

### Purpose
Defines unit testing requirements for `RACE_CONDITIONS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Mocking Rules

### Purpose
Defines unit testing requirements for `MOCKING_RULES`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Fixtures

### Purpose
Defines unit testing requirements for `FIXTURES`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Coverage Requirements

### Purpose
Defines unit testing requirements for `COVERAGE_REQUIREMENTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: CI Requirements

### Purpose
Defines unit testing requirements for `CI_REQUIREMENTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Certification Requirements

### Purpose
Defines unit testing requirements for `CERTIFICATION_REQUIREMENTS`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Area: Anti-Drift Rules

### Purpose
Defines unit testing requirements for `ANTI-DRIFT_RULES`.

### Requirements
- Test normal path.
- Test failure path.
- Test invalid input.
- Test permission/authority denial where applicable.
- Test logging or evidence output where applicable.

### Evidence
- Test name
- Test file
- Expected result
- Actual result
- Pass/fail status

### Anti-Drift Rule
- No implementation may be considered complete without unit tests tied to its contract.

---

## Exit Criteria

A unit test suite is acceptable only when all security-critical paths, failure paths, and authority decisions are covered.
