# shellcheck shell=bash
# Tests for scripts/test.sh: suite selection, skipping and failure.

test_npm_suites_skip_without_workspace() {
  make_repo
  capture "$SCRIPTS_DIR/test.sh" --all --suite unit --suite lua
  assert_status 0
  assert_contains "skip: unit: npm workspace not initialised"
  assert_contains "skip: lua: npm workspace not initialised"
}

test_missing_npm_script_skips() {
  make_repo
  printf '{"scripts":{"test":"node -e 0"}}\n' >package.json
  capture "$SCRIPTS_DIR/test.sh" --all --suite lua
  assert_status 0
  assert_contains "skip: lua: no 'test:lua' npm script yet"
}

test_failing_suite_stops_the_run() {
  make_repo
  printf '{"scripts":{"test":"node -e process.exit(3)","test:lua":"node -e 0"}}\n' >package.json
  capture "$SCRIPTS_DIR/test.sh" --all --suite unit --suite lua
  assert_fails
  assert_not_contains "==> test: lua"
}

test_no_code_changes_skip_push_tests() {
  make_repo
  printf 'docs\n' >README.md
  git add README.md
  capture "$SCRIPTS_DIR/test.sh" --staged
  assert_status 0
  assert_contains "skip: no code files in scope 'staged'"
}

test_unknown_suite_fails() {
  make_repo
  capture "$SCRIPTS_DIR/test.sh" --suite bogus
  assert_fails
  assert_contains "unknown suite: bogus"
}
