# Guardian Production Readiness Gate

## Purpose

Defines the build-execution contract for Guardian Production Readiness Gate.

## Scope

This document governs how Guardian moves from architecture to implementation, validation, release, and certification.

## Requirements

- Work must be milestone-based.
- Every implementation item must trace to a contract.
- Every release must have acceptance criteria.
- Every change must have review evidence.
- Security kernel changes require special review.
- Production release requires certification evidence.
- Known limitations must be documented.

## Required Evidence

- Commit hash
- Linked contract
- Test result
- Review result
- Release impact
- Rollback path
- Final verdict

## Anti-Drift Rule

No implementation work may be accepted if it cannot be traced to the documented build execution plan.
