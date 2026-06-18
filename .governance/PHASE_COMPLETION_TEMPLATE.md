# Guardian Phase Completion Template

**Version:** 1.0.0
**Status:** Active
**Owner:** Guardian Architecture Authority

---

# Purpose

This template defines the mandatory report that must be produced at the completion of every implementation phase.

No implementation phase shall be considered complete until this report has been generated, reviewed, and approved.

---

# Phase Information

| Field                 | Value |
| --------------------- | ----- |
| Milestone             |       |
| Phase                 |       |
| Date                  |       |
| Implementation Agent  |       |
| Architecture Reviewer |       |
| Repository Revision   |       |

---

# Phase Objective

Describe the approved objective of the implementation phase.

---

# Approved Scope

List the approved work for this phase.

* [ ]
* [ ]
* [ ]
* [ ]

---

# Delivered Scope

Describe what was actually implemented.

---

# Files Created

| File | Purpose | Repository Contract |
| ---- | ------- | ------------------- |

---

# Files Modified

| File | Reason | Repository Contract |
| ---- | ------ | ------------------- |

---

# Files Deleted

| File | Reason |
| ---- | ------ |

If none:

```text id="cw6mb3"
None
```

---

# Repository Contract Traceability

For every implementation artifact identify:

| File | Repository Document | Contract | Milestone |
| ---- | ------------------- | -------- | --------- |

---

# Validation

The following validation shall be executed.

| Command                | Result | Status |
| ---------------------- | ------ | ------ |
| `npm run lint`         |        |        |
| `npm run format:check` |        |        |
| `npm run typecheck`    |        |        |
| `npm run build`        |        |        |
| `npm test`             |        |        |

If a command could not execute:

Status:

```text id="trwz3m"
NOT VERIFIED
```

Reason:

Document why execution was not possible.

No validation result may be fabricated.

---

# Tests Added

| Test | Purpose | Status |
| ---- | ------- | ------ |

---

# Architecture Verification

Confirm:

* [ ] Repository contracts followed.
* [ ] Milestone scope preserved.
* [ ] No architectural redesign.
* [ ] Security Kernel boundaries maintained.
* [ ] Event Bus remains framework independent.
* [ ] Authority Engine remains contract driven.
* [ ] FakePerms remains deny-by-default.
* [ ] Policy Engine contains no enforcement logic.
* [ ] Optional modules do not affect Security Kernel.

---

# Governance Verification

Confirm:

* [ ] AGENT_EXECUTION_PROTOCOL followed.
* [ ] IMPLEMENTATION_GATE followed.
* [ ] REVIEW_WORKFLOW followed.
* [ ] ARCHITECT_REVIEW_CHECKLIST completed.
* [ ] IMPLEMENTATION_MANIFEST updated.
* [ ] IMPLEMENTATION_TRACEABILITY updated.

---

# Git Verification

Provide evidence from:

```bash id="exlxdd"
git status

git diff
```

Verify:

* [ ] Only approved files changed.
* [ ] No frozen documentation modified.
* [ ] No unrelated files modified.

---

# Risks

Document any remaining risks.

| Risk | Severity | Mitigation |
| ---- | -------- | ---------- |

---

# Known Limitations

Document limitations that remain after this phase.

---

# Deferred Work

List work intentionally deferred to future milestones.

| Item | Reason | Target Milestone |
| ---- | ------ | ---------------- |

---

# Outstanding Issues

List unresolved issues discovered during implementation.

---

# Lessons Learned

Document implementation observations that may improve future phases.

---

# Next Phase Recommendation

Recommended next milestone:

Reason:

Prerequisites:

---

# Approval Request

Select one:

* [ ] APPROVED
* [ ] APPROVED WITH CONDITIONS
* [ ] REJECTED
* [ ] NOT VERIFIED

---

# Reviewer Notes

Architecture Reviewer:

Date:

Comments:

---

# Final Certification

The reviewer certifies that:

* repository contracts were followed;
* implementation remained within approved scope;
* validation evidence has been reviewed;
* governance requirements were satisfied;
* implementation is ready for the next milestone **or** the required corrective actions have been documented.

---

# Final Principle

Completion of implementation **does not** authorize:

* the next implementation phase;
* repository commits beyond the approved scope;
* production readiness;
* release certification.

Each subsequent phase requires a new architecture review, implementation authorization, validation cycle, and approval.
