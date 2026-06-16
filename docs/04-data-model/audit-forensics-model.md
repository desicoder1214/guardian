# Guardian Audit and Forensics Model

## Purpose
Defines how Guardian stores evidence for incident review, certification, and forensic reconstruction.

## Required Evidence
Each security incident must preserve:
- Incident ID
- Guild ID
- Event ID
- Actor ID
- Target ID
- Target type
- Event type
- Detector
- Attribution confidence
- Decision
- Action taken
- Error if any
- Timestamp
- Final verdict

## Audit Correlation
Audit correlation records must preserve:
- audit_log_action
- audit_actor_id
- audit_target_id
- correlation_window_ms
- confidence
- source
- failure reason if attribution fails

## Forensic Timeline
Every incident should support chronological reconstruction:
Event → Detection → Attribution → Decision → Containment → Punishment → Recovery → Final verdict

## Retention
Security and certification evidence must not be silently deleted.

## Anti-Drift Rule
No security decision may exist without traceable forensic evidence.
