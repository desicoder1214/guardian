# Guardian Implementation Gate

## Purpose

This file defines the required gate that must be satisfied before Codex or any implementation agent may create files, modify files, generate patches, or run implementation commands.

The goal is to prevent accidental transition from planning into implementation.

---

## Current Gate Status

**Implementation Gate:** CLOSED

**Patch Generation:** NOT AUTHORIZED

**File Modification:** NOT AUTHORIZED

**Command Execution:** NOT AUTHORIZED

**Commit:** NOT AUTHORIZED

**Push:** NOT AUTHORIZED

---

## Required Authorization

Implementation may begin only when all of the following are true:

1. `IMPLEMENTATION_MANIFEST.md` marks the milestone as implementation-authorized.
2. `.governance/MILESTONE_AUTHORIZATION.md` contains the approved milestone state.
3. The exact authorization token is present.
4. The implementation map has been reviewed and approved.
5. The implementation contract table has been reviewed and approved.

Required token:

```text
TOKEN: PHASE1_IMPLEMENTATION_APPROVED