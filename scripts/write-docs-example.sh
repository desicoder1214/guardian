#!/usr/bin/env bash
set -euo pipefail

cat > docs/README.md << 'DOC'
# Guardian Documentation Index

Guardian documentation is contract-first.
DOC

cat > docs/00-governance/north-star.md << 'DOC'
# Guardian North Star

## Mission
Build an enterprise Discord security platform focused on prevention, containment, recovery, and certification.
DOC

cat > docs/00-governance/executive-principles.md << 'DOC'
# Executive Principles

## Security First
Security decisions take priority over convenience.
DOC

echo "Docs written successfully."
