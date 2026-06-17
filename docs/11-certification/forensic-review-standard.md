# Guardian Forensic Review Standard

## Purpose

Defines the certification standard for Guardian Forensic Review Standard.

## Scope

This standard applies to Guardian security, recovery, authority, logging, runbooks, and release readiness.

## Certification Requirements

- Architecture must exist.
- Threat model must exist.
- Contract must exist.
- Tests must pass.
- Simulation must pass where required.
- Live drill must pass where required.
- Logs must prove behavior.
- Forensic evidence must be reviewable.
- Known limitations must be documented.
- Reviewer verdict must be recorded.

## Verdicts

Allowed verdicts:

- Certified
- Conditionally Certified
- Not Certified
- Retest Required
- Rejected

## Anti-Drift Rule

No Guardian capability may be certified if implementation behavior differs from documented contracts without formal review.
