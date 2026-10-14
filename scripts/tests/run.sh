#!/usr/bin/env bash
# Self-tests for the gate scripts. Runs every test_* function defined in
# scripts/tests/test_*.sh, each in its own subshell and temp git repo.
set -euo pipefail
tests_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

passed=0
failed=0
for file in "$tests_dir"/test_*.sh; do
  mapfile -t names < <(
    # shellcheck source=/dev/null
    source "$file"
    declare -F | awk '$3 ~ /^test_/ { print $3 }'
  )
  for name in "${names[@]}"; do
    if output=$(
      set -euo pipefail
      # shellcheck source=scripts/tests/lib.sh
      source "$tests_dir/lib.sh"
      # shellcheck source=/dev/null
      source "$file"
      trap 'rm -rf "${REPO:-}"' EXIT
      "$name"
    ); then
      printf 'ok   %s\n' "$name"
      passed=$((passed + 1))
    else
      printf 'FAIL %s\n%s\n' "$name" "$output"
      failed=$((failed + 1))
    fi
  done
done

printf '\nscripts tests: %s passed, %s failed\n' "$passed" "$failed"
[ "$failed" -eq 0 ]
