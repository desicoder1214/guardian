# Guardian Controlled Live Drill Plan

## Unauthorized Bot Removal

Purpose: execute the first controlled live test-guild validation drill for unauthorized bot removal using existing Guardian runtime components only.

Scope constraints:
- Use existing Production Validation Harness.
- Use existing Live Drill Readiness Gate.
- Use existing Production Discord REST Client.
- Use existing Production Execution Adapter.
- Use existing Bot Removal Operation.
- Do not run live Discord actions from tests or automation.
- Do not run this drill in any production guild.

## Preconditions

1. Dedicated test guild only.
2. Disposable unauthorized test bot only.
3. Guardian bot role is above the disposable test bot role.
4. Guardian bot has required guild permissions for member removal.
5. Operator owns or fully controls the test guild.
6. No production server is involved.

## Safety Gate Inputs

7. allowLiveDiscordExecution: true
8. testGuildConfirmed: true
9. disposableBotConfirmed: true
10. dryRunConfirmed: true
11. operatorAcknowledgment: I_UNDERSTAND_THIS_WILL_CALL_DISCORD_TEST_GUILD_ONLY

## Dry-Run Procedure

12. Run the production validation harness in dry-run mode.
13. Confirm REST request count is 0.
14. Confirm report success for dry-run.
15. Confirm idempotency key is generated.
16. Confirm readiness output is present and indicates live drill requirements.

## Live-Run Procedure

17. Run exactly one live unauthorized bot removal scenario.
18. Do not run against a production guild.
19. Do not run destructive multi-action drills in this phase.

## Evidence Collection

20. Record current git commit and tag.
21. Record guild ID used for the drill.
22. Record scenario ID.
23. Record correlation ID.
24. Record REST request count.
25. Record verification outcome.
26. Record latency and total duration.
27. Record Discord final state for target bot membership.
28. Record full Guardian validation report artifact.

## Pass/Fail Criteria

29. Dry-run passes first.
30. Readiness gate passes for live request.
31. REST request count is exactly 1 for the single live unauthorized bot removal action.
32. Unauthorized bot is removed or already removed with expected verification outcome.
33. No unrelated action types are executed.
34. No production guild is touched.

## Abort Criteria

35. Wrong guild is selected.
36. Required permissions are missing.
37. Bot role hierarchy is unsafe.
38. Readiness gate fails.
39. REST request count exceeds expected value.
40. Unexpected action types are observed.

## Prohibitions For This Drill

- No new production execution code.
- No new detectors, planners, or orchestrators.
- No recovery engine additions.
- No persistence or database writes.
- No dashboard or command feature additions.
- No automatic token reads.
- No real Discord token stored in repository.
- No live Discord calls in tests.

## Operational Notes

- This document defines manual operational steps only.
- Execute live steps only by intentional operator action in a controlled test guild.
- Keep all run artifacts with timestamps for traceability.
