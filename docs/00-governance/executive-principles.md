# Guardian Executive Principles

## Security First

Guardian exists to protect Discord communities from destructive actions before damage occurs.

Security decisions take precedence over convenience, aesthetics, and feature velocity.

---

## Prevention Before Recovery

The preferred outcome is preventing damage entirely.

Recovery systems exist as a safety net and must never be considered the primary defense.

---

## Containment Before Restoration

When an incident occurs:

1. Detect
2. Attribute
3. Contain
4. Neutralize
5. Recover
6. Certify

Recovery must not begin until containment is achieved.

---

## Explicit Trust Model

No user, role, bot, webhook, integration, or system component is trusted by default.

Trust must be explicitly granted, auditable, and revocable.

---

## Least Privilege

Every capability must operate with the minimum permissions required.

No subsystem should receive elevated permissions without justification.

---

## Anti-Drift Architecture

Every implementation must trace back to:

Mission
→ Architecture
→ Threat Model
→ Contracts
→ Implementation
→ Tests
→ Certification

Changes that violate documented contracts are prohibited.

---

## Evidence-Based Decisions

Security conclusions must be supported by:

- Runtime evidence
- Logs
- Metrics
- Drill results
- Forensic analysis

Assumptions are not evidence.

---

## Enterprise Reliability

Guardian must remain operational during:

- Nuke attacks
- Raid attacks
- Rogue administrator actions
- Unauthorized bot additions
- Webhook abuse
- Large-scale moderation events

Reliability is a core feature.

---

## Certification Driven Development

Features are not considered complete until:

- Implemented
- Tested
- Validated
- Documented
- Certified

