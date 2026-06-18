# Guardian Architect Review Checklist

**Version:** 1.0.0
**Status:** Active
**Owner:** Guardian Architecture Authority

---

# Purpose

This checklist defines the mandatory architectural review process that shall be completed before any implementation phase is approved.

Its purpose is to ensure every implementation:

* complies with repository contracts
* remains within milestone scope
* preserves architectural integrity
* maintains Security Kernel isolation
* remains fully traceable
* satisfies quality gates
* prevents implementation drift

No implementation phase may proceed without completing this checklist.

---

# Review Inputs

Before beginning the review, the reviewer shall inspect:

* README.md
* IMPLEMENTATION_MANIFEST.md
* `.governance/`
* `docs/`
* Current milestone
* Current implementation map
* Current implementation contract
* Current repository status

---

# Repository Governance

Verify:

* [ ] Repository structure follows the approved architecture.
* [ ] Repository contracts were reviewed.
* [ ] Current milestone is correct.
* [ ] Current implementation state is correct.
* [ ] Current authorization state is correct.
* [ ] Documentation freeze has been preserved.

---

# Milestone Scope

Verify:

* [ ] Implementation remains inside the approved milestone.
* [ ] No additional features were introduced.
* [ ] No scope expansion occurred.
* [ ] Deferred work remains deferred.
* [ ] Out-of-scope work has not been implemented.

---

# Security Kernel Review

Verify:

* [ ] Security Kernel remains isolated.
* [ ] Kernel remains framework independent.
* [ ] Kernel remains Discord independent.
* [ ] Kernel remains database independent.
* [ ] Kernel remains network independent.
* [ ] Kernel remains UI independent.
* [ ] Kernel remains SaaS independent.

---

# Event Bus

Verify:

* [ ] Event Bus exposes contracts only.
* [ ] Event Bus implementation follows repository contracts.
* [ ] Event Bus has no Discord dependency.
* [ ] Event Bus has no persistence dependency.
* [ ] Event Bus has no networking dependency.
* [ ] Event Bus remains observable.
* [ ] Event Bus remains testable.

---

# Authority Engine

Verify:

* [ ] Authority Engine follows repository contracts.
* [ ] Authority Engine is deny-by-default.
* [ ] Authority Engine has no Discord runtime dependency.
* [ ] Authority Engine contains no enforcement logic.

---

# Trust Registry

Verify:

* [ ] Trust Registry follows repository contracts.
* [ ] Trust decisions are explicit.
* [ ] Unknown entities are denied by default.
* [ ] Trust is independent of Discord Administrator permission.

---

# FakePerms

Verify:

* [ ] FakePerms follows repository contracts.
* [ ] Discord Administrator does not imply Guardian authority.
* [ ] Decisions remain deterministic.
* [ ] No Discord runtime actions exist.

---

# Policy Engine

Verify:

* [ ] Policy Engine follows repository contracts.
* [ ] Policy decisions remain independent from enforcement.
* [ ] Policy outputs contain sufficient reasoning.
* [ ] Policy contains no punishment logic.

---

# Configuration

Verify:

* [ ] Configuration remains minimal.
* [ ] Configuration contains no runtime infrastructure.
* [ ] Configuration contains no environment-specific logic beyond approved abstractions.
* [ ] Configuration follows repository structure.

---

# Dependency Injection

Verify:

* [ ] Internal container only.
* [ ] No third-party DI framework unless approved.
* [ ] Dependency graph remains acyclic.
* [ ] Services are registered explicitly.

---

# Shared Components

Verify:

* [ ] Shared types are reusable.
* [ ] Shared interfaces remain stable.
* [ ] Shared errors remain framework independent.
* [ ] Public APIs are exported through barrel files.

---

# Traceability

Verify:

* [ ] Every implementation file appears in `IMPLEMENTATION_TRACEABILITY.md`.
* [ ] Every file references the repository document that required it.
* [ ] Every file maps to a contract.
* [ ] Every file maps to a milestone.
* [ ] Traceability was updated within the same change set.

---

# Validation

Required evidence:

* [ ] lint
* [ ] format check
* [ ] typecheck
* [ ] build
* [ ] tests

If any validation was not executed:

* [ ] Result marked **NOT VERIFIED**
* [ ] Reason documented

---

# Git Review

Verify:

* [ ] `git status` reviewed.
* [ ] `git diff` reviewed.
* [ ] Only approved files changed.
* [ ] Frozen documentation unchanged.
* [ ] No unrelated modifications exist.

---

# Risk Review

Verify:

* [ ] Architectural risks documented.
* [ ] Technical debt documented.
* [ ] Deferred work documented.
* [ ] Security implications documented.

---

# Decision

Select exactly one:

* [ ] APPROVED
* [ ] APPROVED WITH CONDITIONS
* [ ] REJECTED
* [ ] NOT VERIFIED

---

# Review Summary

Reviewer:

Date:

Milestone:

Files Reviewed:

Contracts Reviewed:

Validation Reviewed:

Known Risks:

Outstanding Issues:

Approval Decision:

Follow-up Actions:

---

# Final Principle

Architecture review is independent of implementation.

Approval of architecture shall never be interpreted as authorization to implement.

Implementation requires explicit authorization through the Implementation Gate and Milestone Authorization documents.
