#!/usr/bin/env bash
# Post-render hook for the shared videos/ project (task 052; ADR-0021). Quarto
# runs it from videos/ after `quarto render` and lists the pages it rendered in
# QUARTO_PROJECT_OUTPUT_FILES, one `<project>/index.html` per line. The hook
# runs `video render` on each of those projects and exits with the first
# non-zero status, so a failed render fails `quarto render`. Uses only
# documented mechanisms: `video` on PATH if present, else `npm exec --prefix
# <repo>` (packages/cli/README.md).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/.." && pwd)"

render() {
  if command -v video >/dev/null 2>&1; then
    video render "$1"
  else
    npm exec --prefix "$repo" --no -- video render "$1"
  fi
}

status=0
while IFS= read -r page; do
  [ -n "$page" ] || continue
  project="$here/$(dirname "$page")"
  rc=0
  render "$project" || rc=$?
  if [ "$status" -eq 0 ]; then status=$rc; fi
done <<<"${QUARTO_PROJECT_OUTPUT_FILES:-}"
exit "$status"
