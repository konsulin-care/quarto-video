#!/usr/bin/env bash
# Fail when any given code file exceeds MAX_LINES (300) lines (ADR-0010).
# Usage: scripts/check-line-limit.sh <file>...   Non-code files are ignored.
set -euo pipefail
# shellcheck source=scripts/lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

over=0
for file in "$@"; do
  [[ $file =~ $CODE_RE ]] || continue
  # awk counts a final line even without a trailing newline.
  lines=$(awk 'END { print NR }' "$file")
  if [ "$lines" -gt "$MAX_LINES" ]; then
    printf '%s: %s lines (max %s)\n' "$file" "$lines" "$MAX_LINES" >&2
    over=1
  fi
done

if [ "$over" -ne 0 ]; then
  fail "split files over $MAX_LINES lines by responsibility"
fi
log "ok: $# file(s) within $MAX_LINES lines"
