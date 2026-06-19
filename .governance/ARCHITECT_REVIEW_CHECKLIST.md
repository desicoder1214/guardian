# Guardian Architect Review Checklist

**Status:** Active  
**Purpose:** Defines the checklist used before accepting implementation work.

---

## Repository Review

- [ ] `README.md` reviewed
- [ ] `IMPLEMENTATION_MANIFEST.md` reviewed
- [ ] `IMPLEMENTATION_CONTRACT.md` reviewed
- [ ] `.governance/` reviewed
- [ ] relevant `docs/` contracts reviewed

---

## Authorization Review

- [ ] `.governance/MILESTONE_AUTHORIZATION.md` reviewed
- [ ] authorization token present if implementation occurred
- [ ] implementation scope matches authorized milestone
- [ ] no approval was inferred from planning language

---

## Scope Review

- [ ] work is limited to approved Phase 1A scope
- [ ] no Discord runtime introduced
- [ ] no detectors introduced
- [ ] no commands introduced
- [ ] no punishment or containment runtime introduced
- [ ] no recovery runtime introduced
- [ ] no persistence introduced
- [ ] no dashboard or SaaS features introduced

---

## Architecture Review

- [ ] kernel remains framework-independent
- [ ] Event Bus remains Discord-independent
- [ ] DI contains no business logic
- [ ] shared types/interfaces/errors remain reusable
- [ ] dependency hierarchy is respected
- [ ] no circular dependencies introduced

---

## Traceability Review

- [ ] `IMPLEMENTATION_TRACEABILITY.md` exists
- [ ] every created file is listed
- [ ] every modified file is listed
- [ ] every file maps to a repository document or contract
- [ ] traceability was updated in the same change set

---

## Validation Review

Required commands:

```bash
npm install
npm run lint
npm run format:check
npm run typecheck
npm run build
npm test
```

- [ ] validation executed
- [ ] failures documented
- [ ] skipped commands marked `NOT VERIFIED`
- [ ] no fake validation results claimed

---

## Git Review

- [ ] `git status` reviewed
- [ ] `git diff` reviewed
- [ ] only approved files changed
- [ ] no commit performed without approval
- [ ] no push performed without approval

---

## Decision

Final review status:

- [ ] APPROVED
- [ ] APPROVED WITH CONDITIONS
- [ ] REJECTED
- [ ] NOT VERIFIED
