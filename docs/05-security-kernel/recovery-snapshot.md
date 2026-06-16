# Recovery and Snapshot

## Purpose
Restore server structure after destructive actions.

## Snapshot Scope
- Channels
- Categories
- Roles
- Permission overwrites
- Critical configuration
- Logging routes

## Recovery Flow
Incident → Freeze → Snapshot lookup → Restore plan → Execute restore → Verify → Log result

## Acceptance Criteria
- Category lineage restored
- Channel permissions restored
- Roles restored safely
- Dangerous roles not blindly re-granted
- Recovery evidence generated
