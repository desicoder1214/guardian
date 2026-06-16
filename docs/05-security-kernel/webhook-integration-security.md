# Webhook and Integration Security

## Purpose
Prevent nukes and spam through webhooks, integrations, and external automation.

## Threats
- Rogue admin creates webhook
- Nuker bot creates webhook
- Integration sends destructive spam
- Webhook survives bot removal

## Response
1. Detect webhook/integration creation
2. Attribute actor
3. Freeze or delete unauthorized webhook
4. Punish actor if unauthorized
5. Log forensic evidence

## Rule
Webhook freeze must run as a hot-path containment action.
