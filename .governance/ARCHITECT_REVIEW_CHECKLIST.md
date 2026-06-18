
## `.governance/ARCHITECT_REVIEW_CHECKLIST.md`

```markdown
# Guardian Architect Review Checklist

## Purpose

This checklist is used by the architecture reviewer before approving any Guardian implementation phase.

It ensures every implementation remains aligned with repository contracts, security-kernel architecture, anti-drift controls, and milestone scope.

---

## Review Scope

Before approving implementation, verify the following.

---

## Repository Alignment

- [ ] The implementation references the correct repository documents.
- [ ] The implementation follows `IMPLEMENTATION_MANIFEST.md`.
- [ ] The implementation follows `.governance/AGENT_EXECUTION_PROTOCOL.md`.
- [ ] The implementation follows `.governance/MILESTONE_AUTHORIZATION.md`.
- [ ] The implementation follows `.governance/IMPLEMENTATION_GATE.md`.

---

## Milestone Scope

- [ ] Work is limited to the approved milestone.
- [ ] No out-of-scope feature was introduced.
- [ ] No Discord runtime was introduced.
- [ ] No detector logic was introduced.
- [ ] No punishment or containment logic was introduced.
- [ ] No persistence layer was introduced.
- [ ] No dashboard, SaaS, premium module, or optional module was introduced.

---

## Security Kernel Architecture

- [ ] Security Kernel remains isolated.
- [ ] Event Bus remains framework-independent.
- [ ] Event Bus has no Discord dependency.
- [ ] Event Bus has no database dependency.
- [ ] Event Bus has no networking dependency.
- [ ] Authority Engine remains contract-driven.
- [ ] Trust Registry remains explicit and deny-by-default.
- [ ] FakePerms does not treat Discord Administrator as Guardian trust.
- [ ] Policy Engine separates decisions from enforcement.
- [ ] Optional modules cannot block Security Kernel behavior.

---

## Structure and Maintainability

- [ ] Folder structure matches the approved implementation map.
- [ ] Public APIs are exposed through `index.ts` barrel files.
- [ ] Shared modules are folder-based, not monolithic.
- [ ] Kernel modules follow consistent contracts/implementation boundaries where approved.
- [ ] Configuration remains minimal and does not introduce runtime infrastructure prematurely.

---

## Traceability

- [ ] Every created or modified file is listed in `IMPLEMENTATION_TRACEABILITY.md`.
- [ ] Every file maps to a repository document.
- [ ] Every file maps to a contract or approved milestone requirement.
- [ ] Every file lists planned or existing validation.
- [ ] Traceability was updated in the same change set.

---

## Tests and Validation

- [ ] Unit tests exist for implemented behavior.
- [ ] Contract tests exist where applicable.
- [ ] Integration tests exist where applicable.
- [ ] Validation commands were actually run.
- [ ] Failed or skipped commands are marked `NOT VERIFIED`.
- [ ] No fake validation results are claimed.

Required validation:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test