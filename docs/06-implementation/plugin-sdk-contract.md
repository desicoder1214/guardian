# Guardian Plugin SDK Contract

## 1. Purpose

This contract defines how optional Guardian plugins and future premium modules may be built, registered, configured, tested, and certified.

Plugins must extend Guardian without weakening the security kernel.

---

## 2. Global Plugin Rules

- Plugins are optional by default.
- Plugins must be registered through the module registry.
- Plugins must not bypass FakePerms.
- Plugins must not bypass logging and forensics.
- Plugins must not block AntiNuke hot paths.
- Plugins must not directly mutate security decisions.
- Plugins must be controlled through per-guild feature flags.
- Plugins must declare configuration schema.
- Plugins must fail isolated when possible.
- Plugins must include tests and certification evidence.

---
## Plugin Lifecycle

### Purpose
Defines SDK requirements for `PLUGIN_LIFECYCLE`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Plugin Registration

### Purpose
Defines SDK requirements for `PLUGIN_REGISTRATION`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Allowed APIs

### Purpose
Defines SDK requirements for `ALLOWED_APIS`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Forbidden APIs

### Purpose
Defines SDK requirements for `FORBIDDEN_APIS`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Event Subscriptions

### Purpose
Defines SDK requirements for `EVENT_SUBSCRIPTIONS`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Command Registration

### Purpose
Defines SDK requirements for `COMMAND_REGISTRATION`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Service Injection

### Purpose
Defines SDK requirements for `SERVICE_INJECTION`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Configuration Schema

### Purpose
Defines SDK requirements for `CONFIGURATION_SCHEMA`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Per-Guild Feature Flags

### Purpose
Defines SDK requirements for `PER_GUILD_FEATURE_FLAGS`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Security Kernel Isolation

### Purpose
Defines SDK requirements for `SECURITY_KERNEL_ISOLATION`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## FakePerms Requirements

### Purpose
Defines SDK requirements for `FAKEPERMS_REQUIREMENTS`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Data Model Boundaries

### Purpose
Defines SDK requirements for `DATA_MODEL_BOUNDARIES`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Logging Requirements

### Purpose
Defines SDK requirements for `LOGGING_REQUIREMENTS`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Failure Isolation

### Purpose
Defines SDK requirements for `FAILURE_ISOLATION`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Testing Requirements

### Purpose
Defines SDK requirements for `TESTING_REQUIREMENTS`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Certification Requirements

### Purpose
Defines SDK requirements for `CERTIFICATION_REQUIREMENTS`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Versioning

### Purpose
Defines SDK requirements for `VERSIONING`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Deprecation

### Purpose
Defines SDK requirements for `DEPRECATION`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Marketplace Readiness

### Purpose
Defines SDK requirements for `MARKETPLACE_READINESS`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Anti-Drift Controls

### Purpose
Defines SDK requirements for `ANTI_DRIFT_CONTROLS`.

### Requirements
- Must be explicitly documented.
- Must have clear ownership.
- Must declare inputs and outputs.
- Must declare failure behavior.
- Must declare logging requirements.
- Must declare test requirements.

### Security Rules
- Must not bypass FakePerms.
- Must not bypass Security Kernel boundaries.
- Must not execute privileged actions without authority checks.
- Must not access cross-guild data without documented authorization.

### Failure Handling
- Plugin failure must be isolated when possible.
- Failure must be logged.
- Failure must not block containment, punishment, recovery, or forensics.

### Certification
- Unit tests required.
- Integration tests required.
- Failure-path tests required.
- Feature-flag tests required.
- Regression tests required.

---

## Anti-Drift Rule

No plugin may be accepted unless it declares:

- Registry entry
- Capability requirements
- Configuration schema
- Event subscriptions
- Data model boundaries
- Test evidence
- Certification status
