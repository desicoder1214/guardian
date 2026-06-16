# Bot Authorization

## Purpose
Prevent unauthorized bots from joining or operating inside protected guilds.

## Authorized Bot Requirements
- Explicitly registered
- Approved by trusted authority
- Logged in audit trail
- Permission scope reviewed

## Unauthorized Bot Response
1. Detect bot join
2. Resolve inviter
3. Check registry
4. Remove unauthorized bot
5. Punish inviter if malicious or unauthorized
6. Freeze related webhooks/integrations
7. Log incident

## Rule
Unknown bots are denied by default.
