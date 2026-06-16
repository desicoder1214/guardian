# AntiNuke Core

## Purpose
Detect and stop destructive actions before the server is damaged.

## Protected Events
- Channel delete/create/update
- Role delete/create/update
- Member ban/kick
- Dangerous role grant
- Webhook create/update/delete
- Bot add
- Integration abuse

## Pipeline
Event → Normalize → Attribute → Score → Decide → Contain → Punish → Log → Recover

## Acceptance Criteria
- Fast detection
- Correct actor attribution
- No duplicate punishment
- Trusted exemptions respected
- Forensic logs generated
