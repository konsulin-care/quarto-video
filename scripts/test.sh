#!/usr/bin/env bash
# Run test suites in order, stopping at the first failure.
# Usage: scripts/test.sh [--staged|--push|--all] [--suite <name>]...
#   Suites: scripts unit lua integration visual.
#   Default: all suites for --all; all but visual (CI only) otherwise.
# A suite skips when its runner does not exist yet (see docs/testing.md).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "$here/lib/common.sh"

ALL_SUITES=(scripts unit lua integration visual)

parse_scope "$@"
suites=()
set -- "${REST_ARGS[@]+"${REST_ARGS[@]}"}"
while [ "$#" -gt 0 ]; do
  case "$1" in
    --suite)
      [ "$#" -ge 2 ] || fail "--suite needs a name"
      [[ " ${ALL_SUITES[*]} " == *" $2 "* ]] || fail "unknown suite: $2"
      suites+=("$2")
      shift 2
      ;;
    *) fail "unknown argument: $1" ;;
  esac
done
if [ "${#suites[@]}" -eq 0 ]; then
  if [ "$SCOPE" = all ]; then
    suites=("${ALL_SUITES[@]}")
  else
    suites=(scripts unit lua integration)
  fi
fi
cd "$(git rev-parse --show-toplevel)"

if [ "$SCOPE" != all ] && [ -z "$(collect_code_files "$SCOPE")" ]; then
  skip "no code files in scope '$SCOPE'"
  exit 0
fi

# Run an npm script, skipping while the workspace or script does not exist.
run_npm_suite() {
  local suite=$1 script=$2
  if ! has_npm_workspace; then
    skip "$suite: npm workspace not initialised (task 001)"
  elif ! has_npm_script "$script"; then
    skip "$suite: no '$script' npm script yet"
  else
    npm run --silent "$script"
  fi
}

for suite in "${suites[@]}"; do
  step "test: $suite"
  case "$suite" in
    scripts) "$here/tests/run.sh" ;;
    unit) run_npm_suite unit test ;;
    lua) run_npm_suite lua test:lua ;;
    integration) run_npm_suite integration test:integration ;;
    visual) run_npm_suite visual test:visual ;;
  esac
done

log ""
log "test: passed (${suites[*]})"
