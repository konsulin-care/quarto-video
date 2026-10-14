# shellcheck shell=bash
# Tests for scripts/check.sh: scoping, skipping and fail-fast.

test_docs_only_change_skips() {
  make_repo
  write_lines README.md 500
  git add README.md
  capture "$SCRIPTS_DIR/check.sh" --staged
  assert_status 0
  assert_contains "skip: no code files in scope 'staged'"
}

test_only_staged_files_are_checked() {
  make_repo
  write_lines big.sh 301
  write_lines ok.sh 3
  git add ok.sh
  capture "$SCRIPTS_DIR/check.sh" --staged
  assert_status 0
  assert_not_contains "big.sh"
}

test_over_limit_fails_before_later_steps() {
  make_repo
  write_lines big.sh 301
  git add big.sh
  capture "$SCRIPTS_DIR/check.sh" --staged
  assert_fails
  assert_contains "big.sh: 301 lines"
  assert_not_contains "==> format"
}

test_shell_lint_error_fails() {
  make_repo
  # shellcheck disable=SC2016 # the unquoted $1 is the lint error under test
  printf '#!/usr/bin/env bash\necho $1\n' >bad.sh
  git add bad.sh
  capture "$SCRIPTS_DIR/check.sh" --all
  assert_fails
  assert_contains "SC2086"
}

test_ts_skips_without_npm_workspace() {
  make_repo
  printf 'export const a = 1;\n' >a.ts
  git add a.ts
  capture "$SCRIPTS_DIR/check.sh" --all
  assert_status 0
  assert_contains "prettier: npm workspace not initialised"
  assert_contains "typecheck: npm workspace not initialised"
}

test_push_without_upstream_checks_all_files() {
  make_repo
  write_lines big.sh 301
  git add big.sh
  git commit -qm init
  capture "$SCRIPTS_DIR/check.sh" --push
  assert_fails
  assert_contains "big.sh: 301 lines"
}

test_unknown_argument_fails() {
  make_repo
  capture "$SCRIPTS_DIR/check.sh" --bogus
  assert_fails
  assert_contains "unknown argument: --bogus"
}
