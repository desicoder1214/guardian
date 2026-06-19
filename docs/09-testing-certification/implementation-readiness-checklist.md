# Guardian Implementation Readiness Checklist

## Required Before Coding

- Governance hierarchy approved: `docs/00-governance/GOVERNANCE_HIERARCHY.md`
- Source-of-truth ownership approved: `docs/00-governance/SOURCE_OF_TRUTH_MATRIX.md`
- Lifecycle stage validated: `docs/00-governance/PROJECT_LIFECYCLE.md`
- Governance approved
- Architecture approved
- Threat model approved
- Contracts approved
- Data model approved
- Testing contracts approved
- Runbooks approved
- Certification matrix approved
- Implementation map approved as planning artifact
- Implementation contract approved when present
- Milestone authorization explicitly updated to allow implementation
- Implementation gate explicitly open
- Required implementation token present

## Required Human Review

Before coding begins, an architect must confirm:

- Current lifecycle stage permits implementation.
- The implementation map does not override contracts.
- The source-of-truth matrix has no unresolved ownership gaps.
- The governance hierarchy has no unresolved conflicts.
- All implementation work is traceable to approved scope.
- All required tests are planned before code starts.

## Rule

Implementation begins only after documentation review is complete and milestone authorization explicitly permits implementation.

Planning approval does not authorize code generation.

Architecture approval does not authorize code generation.

Implementation-map approval does not authorize code generation.
