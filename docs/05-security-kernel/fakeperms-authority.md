# Guardian FakePerms Authority

## 1. Purpose

FakePerms is Guardian's internal authority layer.

It determines what a user, role, bot, or operator is allowed to do inside Guardian, regardless of raw Discord permissions.

Discord permissions are inputs. Guardian authority is the enforcement decision.

---

## 2. Mission

The mission of FakePerms is to prevent Discord permission abuse from becoming Guardian trust abuse.

A user may have Administrator in Discord and still be unauthorized to perform dangerous Guardian-protected actions.

---

## 3. Core Principle

Raw Discord power does not equal Guardian trust.

Guardian must evaluate authority using its own trust registry, permit system, role mapping, owner rules, bot registry, and security contracts.

---

## 4. Authority Sources

Guardian authority may come from:

- Guild owner
- Guardian owner
- Explicit trusted user
- Explicit trusted role
- Permit grant
- Recovery operator grant
- Security admin grant
- Bot authorizer grant
- Emergency operator grant

Authority must be explicit, auditable, and revocable.

---

## 5. Authority Decisions

FakePerms may return:

- Allow
- Deny
- Require owner
- Require security admin
- Require recovery operator
- Require bot authorizer
- Require escalation
- Audit only

Every decision must include a reason.

---

## 6. Protected Capabilities

FakePerms must govern:

- AntiNuke bypass
- Trust management
- Bot authorization
- Lockdown
- Unlock
- Panic mode
- Recovery
- Dangerous role grants
- Permit grants
- Configuration changes
- Dashboard security changes

---

## 7. Capability Bundles

Guardian may define bundles such as:

### Owner

Highest authority. Cannot be overridden by normal staff.

### Security Admin

Can manage security settings, AntiNuke configuration, trust rules, and incident response.

### Moderator

Can use moderation tools but cannot bypass AntiNuke.

### Recovery Operator

Can run restore workflows but cannot grant dangerous trust.

### Bot Authorizer

Can approve bots according to policy.

### Lockdown Operator

Can activate or release lockdown according to scope.

---

## 8. Deny by Default

If a capability is not explicitly granted, it is denied.

The system must not infer Guardian authority from:

- Discord Administrator alone
- Role position alone
- Staff title alone
- Bot nickname
- Server custom naming
- Prior behavior

---

## 9. Trust Inspection

Operators must be able to inspect:

- Who is trusted
- Why they are trusted
- What capabilities they have
- Who granted trust
- When trust was granted
- Whether trust expires
- Whether trust was revoked

---

## 10. Revocation

All granted authority must be revocable.

Revocation must:

- Remove the capability
- Log the actor
- Log the target
- Log the reason
- Take effect immediately where possible

---

## 11. AntiNuke Integration

AntiNuke must call FakePerms before allowing dangerous actions.

Examples:

- Channel deletion
- Role deletion
- Dangerous role grant
- Bot add
- Webhook creation
- Lockdown release
- Recovery execution

A Discord admin without Guardian trust must still be punishable.

---

## 12. Moderation Integration

Moderation commands must use FakePerms.

A moderator may be allowed to warn or mute, but denied from:

- Trust grants
- Bot authorization
- Recovery control
- Panic release
- AntiNuke bypass

---

## 13. Bot Authorization Integration

Only approved bot authorizers may register or revoke bots.

Adding a bot to Discord does not authorize it in Guardian.

---

## 14. Lockdown Integration

Lockdown actions require scoped authority.

Rules:

- Channel lock may require moderator or security admin.
- Server lock may require security admin.
- Panic mode may require owner or emergency operator.
- Unlock must require equal or stronger authority than lock.

---

## 15. Recovery Integration

Recovery operations can modify critical guild state.

Therefore:

- Recovery operators must be explicit.
- Recovery must be logged.
- Dangerous permissions must not be blindly restored.
- Recovery authority must not imply trust-management authority.

---

## 16. Conflict Resolution

If multiple authority signals conflict:

1. Owner authority wins.
2. Explicit deny overrides general allow.
3. Revocation overrides previous grants.
4. More specific scope overrides broad scope.
5. Security kernel safety overrides optional module request.

---

## 17. Scope

Capabilities may be scoped by:

- Guild
- Channel
- Module
- Command
- Action type
- Time window
- Incident state

Scope must be part of the decision.

---

## 18. Failure Behavior

If authority lookup fails:

- Deny dangerous actions.
- Allow only safe read-only operations where appropriate.
- Log failure.
- Escalate to owner/security admin.

If cache is stale:

- Prefer safe denial for destructive actions.
- Refresh authority in background.
- Do not silently allow high-risk operations.

---

## 19. Logging Requirements

Every FakePerms decision must log:

- Guild ID
- Actor ID
- Capability requested
- Decision
- Reason
- Scope
- Trust source
- Timestamp
- Error if any

---

## 20. Acceptance Criteria

FakePerms is acceptable only if:

- Discord Administrator alone does not bypass Guardian.
- Trusted users can be inspected.
- Trust can be revoked.
- Dangerous actions require explicit authority.
- AntiNuke uses FakePerms.
- Bot authorization uses FakePerms.
- Lockdown uses FakePerms.
- Recovery uses FakePerms.
- Decisions are logged.

---

## 21. Certification Tests

Required tests:

- Discord admin without trust denied.
- Trusted security admin allowed.
- Moderator denied security admin action.
- Revoked trust denied immediately.
- Owner override works.
- Bot authorizer can authorize bot.
- Moderator cannot authorize bot.
- Recovery operator can restore but cannot grant trust.
- Lockdown release requires correct authority.
- Decision logs are generated.

---

## 22. Anti-Drift Rule

No subsystem may implement its own separate trust model without documenting how it maps to FakePerms.

FakePerms is the authority source of truth for Guardian.
