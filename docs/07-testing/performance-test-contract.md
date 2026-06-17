# Guardian Performance Test Contract

## 1. Purpose

This contract defines Guardian's performance testing requirements.

Performance tests prove Guardian can meet its SLOs under realistic load without weakening security correctness, containment, recovery, or forensic logging.

---

## 2. Global Rules

- Performance tests must align with the Performance SLO Contract.
- Critical security paths must measure P50, P95, and P99 latency.
- Performance improvements must not weaken correctness.
- Hot-path containment must be measured separately from background work.
- Performance regressions must block release when they affect security.
- Performance evidence must be retained for certification.

---
## Area: Performance Test Philosophy

### Purpose
Defines performance testing requirements for `PERFORMANCE_TEST_PHILOSOPHY`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Latency Benchmarks

### Purpose
Defines performance testing requirements for `LATENCY_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Gateway Event Benchmarks

### Purpose
Defines performance testing requirements for `GATEWAY_EVENT_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Detector Benchmarks

### Purpose
Defines performance testing requirements for `DETECTOR_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Decision Engine Benchmarks

### Purpose
Defines performance testing requirements for `DECISION_ENGINE_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Punishment Dispatch Benchmarks

### Purpose
Defines performance testing requirements for `PUNISHMENT_DISPATCH_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Unauthorized Bot Containment Benchmarks

### Purpose
Defines performance testing requirements for `UNAUTHORIZED_BOT_CONTAINMENT_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Webhook Freeze Benchmarks

### Purpose
Defines performance testing requirements for `WEBHOOK_FREEZE_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Lockdown Benchmarks

### Purpose
Defines performance testing requirements for `LOCKDOWN_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Recovery Benchmarks

### Purpose
Defines performance testing requirements for `RECOVERY_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Snapshot Benchmarks

### Purpose
Defines performance testing requirements for `SNAPSHOT_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Database Benchmarks

### Purpose
Defines performance testing requirements for `DATABASE_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Cache Benchmarks

### Purpose
Defines performance testing requirements for `CACHE_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Queue Benchmarks

### Purpose
Defines performance testing requirements for `QUEUE_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: API Benchmarks

### Purpose
Defines performance testing requirements for `API_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Dashboard Benchmarks

### Purpose
Defines performance testing requirements for `DASHBOARD_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Plugin Benchmarks

### Purpose
Defines performance testing requirements for `PLUGIN_BENCHMARKS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Load Tests

### Purpose
Defines performance testing requirements for `LOAD_TESTS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Stress Tests

### Purpose
Defines performance testing requirements for `STRESS_TESTS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Soak Tests

### Purpose
Defines performance testing requirements for `SOAK_TESTS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Rate Limit Tests

### Purpose
Defines performance testing requirements for `RATE_LIMIT_TESTS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Multi-Guild Tests

### Purpose
Defines performance testing requirements for `MULTI-GUILD_TESTS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Resource Usage Tests

### Purpose
Defines performance testing requirements for `RESOURCE_USAGE_TESTS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Regression Thresholds

### Purpose
Defines performance testing requirements for `REGRESSION_THRESHOLDS`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Area: Certification Evidence

### Purpose
Defines performance testing requirements for `CERTIFICATION_EVIDENCE`.

### Required Metrics
- P50 latency
- P95 latency
- P99 latency
- Throughput
- Error rate
- Resource usage

### Test Requirements
- Benchmark normal path.
- Benchmark failure path where applicable.
- Benchmark under realistic guild scale.
- Benchmark under rate-limit pressure where applicable.
- Compare against SLO targets.

### Evidence
- Test name
- Environment
- Dataset size
- Metrics
- SLO pass/fail
- Regression verdict

### Release Gate
- Critical SLO failure blocks release.
- Security hot-path regression blocks certification.

---

## Exit Criteria

Performance testing is acceptable only when Guardian proves critical security, recovery, logging, and dashboard paths meet documented SLOs.
