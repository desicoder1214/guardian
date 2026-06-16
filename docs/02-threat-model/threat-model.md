# Guardian Threat Model

## Primary Threats
- Rogue admin deletes channels
- Rogue admin deletes roles
- Rogue admin bans/kicks members
- Rogue admin grants dangerous roles
- Rogue admin adds unauthorized bot
- Nuker bot joins and executes fast attack
- Webhook or integration abuse
- Invite exploitation
- Permission escalation
- Recovery failure

## Security Objectives
1. Detect fast
2. Attribute correctly
3. Contain immediately
4. Punish safely
5. Recover accurately
6. Produce forensic evidence

## Non-Negotiable
No trusted bypass may allow destructive action without auditability.
