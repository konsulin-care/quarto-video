#!/usr/bin/env bash
# Post-render hook for videos/hello (task 007a; ADR-0002). Quarto runs it with
# the project directory as cwd after `quarto render`; it renders this project
# with the video CLI and exits with the CLI's status, so a failed render fails
# `quarto render`. Uses only documented mechanisms: `video` on PATH if present,
# else `npm exec --prefix <repo>` (packages/cli/README.md).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
if command -v video >/dev/null 2>&1; then
  video render "$here"
else
  npm exec --prefix "$repo" --no -- video render "$here"
fi
