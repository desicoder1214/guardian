# Guardian Documentation Index

Guardian documentation is organized as contract-first architecture.

## Governance Control Documents

The following governance documents define document precedence, ownership, and lifecycle stage gates:

- `docs/00-governance/GOVERNANCE_HIERARCHY.md` — defines the mandatory order of precedence across mission, architecture, contracts, authorization, testing, certification, and release documents.
- `docs/00-governance/SOURCE_OF_TRUTH_MATRIX.md` — defines the authoritative owner for each major decision area so planning documents do not redefine contracts.
- `docs/00-governance/PROJECT_LIFECYCLE.md` — defines mandatory lifecycle stages from vision through implementation authorization, validation, certification, release, and operations.

## Order

1. Governance
2. Architecture
3. Threat Model
4. System Contracts
5. Data Model
6. Security Kernel
7. Implementation Contracts
8. Testing Contracts
9. Build Execution and Implementation Planning
10. Testing & Certification
11. Runbooks
12. Enterprise Certification

## Governance Rule

If documents conflict, follow `docs/00-governance/GOVERNANCE_HIERARCHY.md`.

If a decision area has more than one possible source, follow `docs/00-governance/SOURCE_OF_TRUTH_MATRIX.md`.

If implementation authorization is unclear or absent, follow `docs/00-governance/PROJECT_LIFECYCLE.md` and stop before generating code.
