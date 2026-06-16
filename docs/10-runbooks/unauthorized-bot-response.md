# Unauthorized Bot Response Runbook

## Purpose

Defines response steps when an unauthorized bot joins a protected guild.

## Steps

1. Confirm bot join event.
2. Check bot authorization registry.
3. Remove unauthorized bot.
4. Attribute inviter if possible.
5. Punish inviter if evidence supports it.
6. Sweep webhooks.
7. Review incident logs.
8. Record verdict.

## Success Criteria

Unknown bot removed, inviter attribution attempted, webhook sweep completed, and logs preserved.
