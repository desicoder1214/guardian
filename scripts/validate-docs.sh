#!/usr/bin/env bash
set -euo pipefail

echo "=== Empty files ==="
EMPTY=$(find docs -type f -empty | wc -l)
echo "$EMPTY"

if [ "$EMPTY" -ne 0 ]; then
  echo "FAILED: Some docs are empty"
  find docs -type f -empty
  exit 1
fi

echo "=== Line counts ==="
find docs -type f -exec wc -l {} \; | sort -n

echo "PASSED: all docs contain content"
