# Dry-Run Evidence: Unauthorized Bot Removal

Scenario: Unauthorized Bot Removal  
Date captured: 2026-06-28  
Mode: dry-run (no live Discord action)

## Commit and Tag

- Commit: b669ab9a43bc866879873956d3eed40e1968ef9d  
- Tag: v0.4.11-live-drill-procedure

## Harness Inputs

| Field | Value |
|---|---|
| scenarioId | scenario-dry-run-unauthorized-bot-removal |
| guildId | guild-dry-run-test-placeholder |
| botUserId | bot-dry-run-test-placeholder |
| correlationId | corr-dry-run-evidence-001 |
| allowLiveDiscordExecution | false (default) |
| testGuildConfirmed | false |
| disposableBotConfirmed | false |
| dryRunConfirmed | false |
| operatorAcknowledgment | (empty) |

## Readiness Gate Result

| Field | Value |
|---|---|
| ready | false |
| liveExecutionAllowed | false |
| dryRunRequired | true |
| warnings | Live execution is disabled unless allowLiveDiscordExecution=true is explicitly provided. |

Failed requirements (expected for dry-run mode, confirms gate is enforced):

- ALLOW_LIVE_DISCORD_EXECUTION_TRUE
- PRODUCTION_DISCORD_HTTP_CLIENT_REQUIRED
- BOT_TOKEN_REQUIRED
- TEST_GUILD_CONFIRMATION_REQUIRED
- DISPOSABLE_BOT_CONFIRMATION_REQUIRED
- PRIOR_DRY_RUN_CONFIRMATION_REQUIRED
- OPERATOR_ACKNOWLEDGMENT_REQUIRED

All live prerequisites are absent by design. The gate correctly reports not ready and prevents live execution.

## Execution Stages Completed

All ten pipeline stages completed in dry-run mode without issuing any Discord REST request:

1. DETECTION
2. THREAT_INTERPRETATION
3. EVALUATION
4. DECISION
5. ACTION_PLANNING
6. EXECUTION_PLANNING
7. HOT_PATH_PLANNING
8. AUTHORIZATION
9. ROUTING
10. DISPATCH

## Action Results

| Sequence | Action Type | Status | Execution Time |
|---|---|---|---|
| 1 | REMOVE_UNAUTHORIZED_BOT | DRY_RUN | 0 ms |
| 2 | FREEZE_WEBHOOKS | UNSUPPORTED | 0 ms |
| 3 | CREATE_INCIDENT | UNSUPPORTED | 0 ms |
| 4 | NOTIFY_AUDIT | UNSUPPORTED | 0 ms |

All actions carry `correlationId: corr-dry-run-evidence-001`.

## Idempotency Key

```
execution-plan:corr-dry-run-evidence-001:BLOCK:1:REMOVE_UNAUTHORIZED_BOT|2:FREEZE_WEBHOOKS|3:CREATE_INCIDENT|4:NOTIFY_AUDIT:execution-plan:corr-dry-run-evidence-001:BLOCK:1:REMOVE_UNAUTHORIZED_BOT|2:FREEZE_WEBHOOKS|3:CREATE_INCIDENT|4:NOTIFY_AUDIT:hot-path:execution-plan:corr-dry-run-evidence-001:BLOCK:1:REMOVE_UNAUTHORIZED_BOT|2:FREEZE_WEBHOOKS|3:CREATE_INCIDENT|4:NOTIFY_AUDIT:1:REMOVE_UNAUTHORIZED_BOT:corr-dry-run-evidence-001
```

Idempotency key was generated and preserved. The key encodes the execution plan, hot-path plan, primary action sequence, and correlation ID.

## Validation Report Summary

| Field | Value |
|---|---|
| dryRun | true |
| verificationOutcome | DRY_RUN |
| restRequestCount | 0 |
| success | true |
| durationMs | ~5 ms |
| startedAt | 2026-06-28T20:45:53.940Z |
| finishedAt | 2026-06-28T20:45:53.945Z |
| failureReason | (none) |

Report object is immutable. All nested arrays and the readiness sub-object are frozen.

## Pass/Fail Result

PASS

- Dry-run completed successfully.
- No REST requests issued (restRequestCount = 0).
- Idempotency key generated.
- Readiness gate correctly enforced all live prerequisites as unmet.
- All ten pipeline stages completed.
- Primary action type REMOVE_UNAUTHORIZED_BOT reached DRY_RUN status.
- Report is frozen and immutable.

## Confirmation: No Live Discord Action Occurred

Confirmed. This evidence was produced by running the ProductionValidationHarness without:

- allowLiveDiscordExecution flag
- bot token
- productionDiscordHttpClient injection

No real Discord REST request was issued. No Discord guild was mutated. No production or test guild was contacted.

## Next Step

This dry-run evidence satisfies step 12–16 of the live drill procedure defined in  
`docs/09-testing-certification/live-drill-unauthorized-bot-removal.md`.

When an operator is ready to perform the live drill they must first satisfy all prerequisites listed in the readiness gate above and inject the required live dependencies, then execute step 17 of the drill procedure.
