# Guardian Regression Test Contract

## 1. Purpose

This contract defines Guardian's regression testing requirements.

Regression tests ensure Guardian never reintroduces previously discovered security failures, bypasses, race conditions, attribution gaps, recovery failures, or certification failures.

---

## 2. Global Rules

- Every confirmed bug must produce a regression test.
- Every live-drill failure must produce a regression test.
- Every security bypass must produce a regression test.
- Every fixed incident must be replayable where possible.
- Regression tests must run before release.
- Regression failures block certification.
- Regression evidence must be retained.

---
## Area: Regression Philosophy

### Purpose
Defines regression testing requirements for `REGRESSION_PHILOSOPHY`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Regression Suite Ownership

### Purpose
Defines regression testing requirements for `REGRESSION_SUITE_OWNERSHIP`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Security Regression Tests

### Purpose
Defines regression testing requirements for `SECURITY_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Detector Regression Tests

### Purpose
Defines regression testing requirements for `DETECTOR_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Punishment Regression Tests

### Purpose
Defines regression testing requirements for `PUNISHMENT_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: FakePerms Regression Tests

### Purpose
Defines regression testing requirements for `FAKEPERMS_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Bot Authorization Regression Tests

### Purpose
Defines regression testing requirements for `BOT_AUTHORIZATION_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Webhook Security Regression Tests

### Purpose
Defines regression testing requirements for `WEBHOOK_SECURITY_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Recovery Regression Tests

### Purpose
Defines regression testing requirements for `RECOVERY_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Lockdown Regression Tests

### Purpose
Defines regression testing requirements for `LOCKDOWN_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Logging Regression Tests

### Purpose
Defines regression testing requirements for `LOGGING_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Configuration Regression Tests

### Purpose
Defines regression testing requirements for `CONFIGURATION_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Database Regression Tests

### Purpose
Defines regression testing requirements for `DATABASE_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: API Regression Tests

### Purpose
Defines regression testing requirements for `API_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Plugin Regression Tests

### Purpose
Defines regression testing requirements for `PLUGIN_REGRESSION_TESTS`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Incident Replay

### Purpose
Defines regression testing requirements for `INCIDENT_REPLAY`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Known Vulnerability Replay

### Purpose
Defines regression testing requirements for `KNOWN_VULNERABILITY_REPLAY`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Live Drill Replay

### Purpose
Defines regression testing requirements for `LIVE_DRILL_REPLAY`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Performance Regression

### Purpose
Defines regression testing requirements for `PERFORMANCE_REGRESSION`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: False Positive Regression

### Purpose
Defines regression testing requirements for `FALSE_POSITIVE_REGRESSION`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: False Negative Regression

### Purpose
Defines regression testing requirements for `FALSE_NEGATIVE_REGRESSION`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: CI Regression Gate

### Purpose
Defines regression testing requirements for `CI_REGRESSION_GATE`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Release Regression Gate

### Purpose
Defines regression testing requirements for `RELEASE_REGRESSION_GATE`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Area: Certification Evidence

### Purpose
Defines regression testing requirements for `CERTIFICATION_EVIDENCE`.

### Required Coverage
- Previously fixed defects.
- Previously observed bypasses.
- Incident replay where possible.
- Failure-path replay.
- Evidence comparison.

### Evidence
- Original issue or incident reference
- Fix reference
- Regression test name
- Expected result
- Actual result
- Pass/fail status

### Release Gate
- Regression failure blocks release.
- Security regression failure blocks certification.

---

## Exit Criteria

Regression testing is acceptable only when previously discovered Guardian failures cannot silently return.
