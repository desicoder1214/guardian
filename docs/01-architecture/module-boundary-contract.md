# Guardian Module Boundary Contract

## Purpose

Defines ownership and responsibilities of every Guardian module.

## Rule

Modules communicate through documented contracts.

No module may directly bypass:

- FakePerms
- Attribution
- Decision Engine
- Logging
- Recovery

## Security Kernel Priority

Security kernel modules always take precedence over optional modules.
