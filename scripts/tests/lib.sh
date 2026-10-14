# shellcheck shell=bash disable=SC2034 # globals are read by sourcing scripts
# Minimal assertion helpers for scripts/tests (sourced by run.sh).

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Create an empty git repo in a temp dir and cd into it.
make_repo() {
  REPO=$(mktemp -d)
  cd "$REPO"
  git init -q
  git config user.email test@example.invalid
  git config user.name test
  git config commit.gpgsign false
}

# Write a file with N lines of valid shell.
write_lines() {
  local path=$1 n=$2
  mkdir -p "$(dirname "$path")"
  {
    printf '#!/usr/bin/env bash\n'
    for ((i = 2; i <= n; i++)); do printf 'true\n'; done
  } >"$path"
}

# Run a command, capturing combined output in OUT and status in STATUS.
capture() {
  set +e
  OUT=$("$@" 2>&1)
  STATUS=$?
  set -e
}

assert_status() {
  [ "$STATUS" -eq "$1" ] && return 0
  printf 'expected status %s, got %s; output:\n%s\n' "$1" "$STATUS" "$OUT"
  return 1
}

assert_fails() {
  [ "$STATUS" -ne 0 ] && return 0
  printf 'expected failure, got status 0; output:\n%s\n' "$OUT"
  return 1
}

assert_contains() {
  [[ $OUT == *"$1"* ]] && return 0
  printf 'expected output to contain %q; output:\n%s\n' "$1" "$OUT"
  return 1
}

assert_not_contains() {
  [[ $OUT != *"$1"* ]] && return 0
  printf 'expected output not to contain %q; output:\n%s\n' "$1" "$OUT"
  return 1
}
