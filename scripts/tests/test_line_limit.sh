# shellcheck shell=bash
# Tests for scripts/check-line-limit.sh.

test_300_lines_pass() {
  make_repo
  write_lines a.sh 300
  capture "$SCRIPTS_DIR/check-line-limit.sh" a.sh
  assert_status 0
}

test_301_lines_fail_with_file_and_count() {
  make_repo
  write_lines src/b.ts 301
  capture "$SCRIPTS_DIR/check-line-limit.sh" src/b.ts
  assert_fails
  assert_contains "src/b.ts: 301 lines (max 300)"
}

test_last_line_without_newline_counts() {
  make_repo
  write_lines c.lua 300
  printf 'x' >>c.lua # line 301 has no trailing newline
  capture "$SCRIPTS_DIR/check-line-limit.sh" c.lua
  assert_fails
}

test_non_code_files_ignored() {
  make_repo
  write_lines notes.md 400
  write_lines data.json 400
  capture "$SCRIPTS_DIR/check-line-limit.sh" notes.md data.json
  assert_status 0
}
