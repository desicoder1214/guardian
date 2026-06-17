# Guardian API Contract

## 1. Purpose

This contract defines Guardian's internal and external API boundaries for bot runtime, dashboard, services, modules, plugins, and certification workflows.

No API may be implemented without documented authentication, authorization, validation, error handling, logging, and certification requirements.

---

## 2. Global API Rules

- APIs must authenticate callers where applicable.
- APIs must authorize through FakePerms where privileged.
- APIs must validate inputs.
- APIs must return structured errors.
- APIs must produce audit logs for security-sensitive actions.
- APIs must be versioned when externally consumed.
- APIs must not expose cross-guild data without authorization.
- APIs must not bypass the Security Kernel.

---

## 3. Standard Error Format

Every API error should include:

- error_code
- message
- correlation_id
- guild_id when applicable
- retryable
- details

---

## 4. API Security Classes

| Class | Meaning |
|---|---|
| Public | No sensitive data |
| Authenticated | Requires valid session/token |
| Privileged | Requires FakePerms capability |
| Kernel | Security-kernel internal |
| Owner | Owner-only |

---
## API: Internal Service API

### Purpose
Defines contract requirements for `INTERNAL_SERVICE_API`.

### Security Class
- Kernel

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Dashboard API

### Purpose
Defines contract requirements for `DASHBOARD_API`.

### Security Class
- Authenticated

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Guild Configuration API

### Purpose
Defines contract requirements for `GUILD_CONFIGURATION_API`.

### Security Class
- Authenticated

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Trust and FakePerms API

### Purpose
Defines contract requirements for `TRUST_AND_FAKEPERMS_API`.

### Security Class
- Privileged

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Bot Authorization API

### Purpose
Defines contract requirements for `BOT_AUTHORIZATION_API`.

### Security Class
- Privileged

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Incident API

### Purpose
Defines contract requirements for `INCIDENT_API`.

### Security Class
- Authenticated

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Security Event API

### Purpose
Defines contract requirements for `SECURITY_EVENT_API`.

### Security Class
- Kernel

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Security Decision API

### Purpose
Defines contract requirements for `SECURITY_DECISION_API`.

### Security Class
- Kernel

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Recovery API

### Purpose
Defines contract requirements for `RECOVERY_API`.

### Security Class
- Privileged

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Snapshot API

### Purpose
Defines contract requirements for `SNAPSHOT_API`.

### Security Class
- Authenticated

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Lockdown API

### Purpose
Defines contract requirements for `LOCKDOWN_API`.

### Security Class
- Privileged

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Webhook Security API

### Purpose
Defines contract requirements for `WEBHOOK_SECURITY_API`.

### Security Class
- Kernel

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Logging API

### Purpose
Defines contract requirements for `LOGGING_API`.

### Security Class
- Authenticated

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Forensics API

### Purpose
Defines contract requirements for `FORENSICS_API`.

### Security Class
- Authenticated

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Certification API

### Purpose
Defines contract requirements for `CERTIFICATION_API`.

### Security Class
- Privileged

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Plugin API

### Purpose
Defines contract requirements for `PLUGIN_API`.

### Security Class
- Authenticated

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Health API

### Purpose
Defines contract requirements for `HEALTH_API`.

### Security Class
- Authenticated

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## API: Admin API

### Purpose
Defines contract requirements for `ADMIN_API`.

### Security Class
- Privileged

### Authentication
- Required unless explicitly public.
- Service-to-service calls must identify caller.
- Dashboard calls must identify operator.

### Authorization
- Privileged APIs must check FakePerms.
- Guild-scoped APIs must validate guild access.
- Owner-only actions must enforce owner rules.

### Input Validation
- Validate guild_id.
- Validate actor/operator identity.
- Validate target identifiers.
- Validate enum values.
- Reject malformed payloads.

### Output Requirements
- Return structured response.
- Include correlation_id.
- Avoid leaking cross-guild data.
- Include clear status.

### Audit Logging
- Log security-sensitive calls.
- Log failed authorization.
- Log mutation operations.
- Preserve forensic evidence where applicable.

### Rate Limits
- Protect high-cost endpoints.
- Do not allow dashboard calls to starve Security Kernel.
- Apply per-guild and per-operator limits where needed.

### Failure Handling
- Return structured error.
- Do not silently fail.
- Do not partially mutate security state without logging.

### Testing Requirements
- Authentication test.
- Authorization test.
- Validation test.
- Failure-path test.
- Audit logging test.

---

## Anti-Drift Rule

No API endpoint may be added unless it declares:

- Owner
- Security class
- Authentication behavior
- Authorization behavior
- Input schema
- Output schema
- Error schema
- Logging requirements
- Tests
