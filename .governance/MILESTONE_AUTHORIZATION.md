# Guardian Milestone Authorization

**Milestone:** v0.2.0-security-kernel-foundation  
**Authorization Owner:** Human Maintainer / Guardian Architecture Authority  
**Status:** Active

---

## Current State

```text
STATE: IMPLEMENTATION_AUTHORIZED

TOKEN:
PHASE1_IMPLEMENTATION_APPROVED
```

---

## Authorization Scope

This authorization applies only to **Phase 1A — Project Foundation Implementation**.

Codex may implement only the approved Phase 1A foundation slice defined by:

- `IMPLEMENTATION_MANIFEST.md`
- `IMPLEMENTATION_CONTRACT.md`
- `docs/09-testing-certification/phase-1-implementation-map.md`
- `docs/09-testing-certification/phase-1-implementation-package.md`
- `.governance/IMPLEMENTATION_GATE.md`
- `.governance/REVIEW_WORKFLOW.md`

---

## Phase 1A Authorized Work

Codex may create or modify files only for:

- `package.json`
- `tsconfig.json`
- lint configuration
- format configuration
- test configuration
- `src/` folder foundation
- `tests/` folder foundation
- basic bootstrap entry
- configuration abstraction
- shared types, interfaces, and errors
- internal dependency injection skeleton
- Event Bus contracts and minimal implementation
- initial unit tests proving the build and test pipeline works
- `IMPLEMENTATION_TRACEABILITY.md`

---

## Explicitly Not Authorized

This authorization does not allow:

- Discord client
- Discord gateway
- bot login
- commands
- detectors
- punishment execution
- containment execution
- recovery execution
- dashboard
- database persistence
- webhook freeze runtime
- AntiNuke runtime
- production deployment
- commit
- push
- merge
- release

---

## Required Stop Gate

After Phase 1A implementation, Codex must stop and report:

1. files created
2. files modified
3. validation results
4. `git status`
5. `git diff`
6. risks
7. known limitations

Codex must not commit or push.

---

## Final Rule

Implementation authorization does not equal commit approval.

Commit and push require separate explicit human approval.
