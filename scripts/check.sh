#!/usr/bin/env bash
# Static checks on code files: line limit → format → lint → typecheck.
# Stops at the first failing step. Skips steps with no files to check.
# Usage: scripts/check.sh [--staged|--push|--all]   (default: --all)
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "$here/lib/common.sh"

parse_scope "$@"
[ "${#REST_ARGS[@]}" -eq 0 ] || fail "unknown argument: ${REST_ARGS[0]}"
cd "$(git rev-parse --show-toplevel)"

mapfile -t files < <(collect_code_files "$SCOPE")
if [ "${#files[@]}" -eq 0 ]; then
  skip "no code files in scope '$SCOPE'"
  exit 0
fi
mapfile -t sh_files < <(filter_ext '\.sh$' "${files[@]}")
mapfile -t lua_files < <(filter_ext '\.lua$' "${files[@]}")
mapfile -t js_files < <(filter_ext '\.(ts|tsx|js|mjs|cjs)$' "${files[@]}")
mapfile -t ts_files < <(filter_ext '\.(ts|tsx)$' "${files[@]}")

# Run "<label> <cmd...>" only when the language has files; else skip.
run_for() {
  local label=$1 count=$2
  shift 2
  if [ "$count" -eq 0 ]; then
    skip "$label: no files"
    return 0
  fi
  require_tool "$1"
  log "$label: $count file(s)"
  "$@"
}

# JS/TS tools come from the npm workspace (task 001).
run_js() {
  local label=$1
  shift
  if [ "${#js_files[@]}" -eq 0 ]; then
    skip "$label: no files"
  elif ! has_npm_workspace; then
    skip "$label: npm workspace not initialised (task 001)"
  else
    [ -d node_modules ] || fail "node_modules missing; run 'npm ci'"
    run_for "$label" "${#js_files[@]}" "$@" "${js_files[@]}"
  fi
}

step "line limit (max $MAX_LINES)"
"$here/check-line-limit.sh" "${files[@]}"

step "format"
run_for "shfmt" "${#sh_files[@]}" shfmt -d -i 2 -ci "${sh_files[@]}"
run_for "stylua" "${#lua_files[@]}" stylua --check "${lua_files[@]}"
run_js "prettier" prettier --check

step "lint"
run_for "shellcheck" "${#sh_files[@]}" shellcheck "${sh_files[@]}"
run_for "selene" "${#lua_files[@]}" selene "${lua_files[@]}"
run_js "eslint" eslint --max-warnings 0

step "typecheck"
if [ "$SCOPE" = staged ]; then
  skip "typecheck: runs on pre-push and CI"
elif [ "${#ts_files[@]}" -eq 0 ]; then
  skip "typecheck: no files"
elif ! has_npm_workspace; then
  skip "typecheck: npm workspace not initialised (task 001)"
else
  has_npm_script typecheck || fail "package.json has no 'typecheck' script"
  npm run --silent typecheck
fi

log ""
log "check: passed ($SCOPE)"
