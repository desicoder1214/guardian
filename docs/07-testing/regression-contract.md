# Guardian Regression Contract

## Purpose

Defines the required testing contract for Guardian Regression Contract.

## Scope

This contract applies to all Guardian implementation work that affects security, authority, recovery, logging, configuration, or certification.

## Requirements

- Tests must be repeatable.
- Tests must produce evidence.
- Security tests must include failure paths.
- Authority tests must verify FakePerms.
- Recovery tests must verify final Discord state.
- Logging tests must verify forensic evidence.
- Regression tests must protect previously certified behavior.

## Required Evidence

- Test name
- Commit hash
- Environment
- Inputs
- Expected result
- Actual result
- Pass/fail verdict
- Logs or report reference

## Anti-Drift Rule

No feature may be considered tested unless its tests trace to architecture, threat model, contract, and certification requirement.
