# shellcheck shell=bash disable=SC2034 # globals are read by sourcing scripts
# Shared helpers for scripts/check.sh and scripts/test.sh (ADR-0010).
# Source it; do not execute it.

# Code files: the only files hooks, checks and tests look at.
CODE_RE='\.(ts|tsx|js|mjs|cjs|lua|sh)$'
MAX_LINES=300

log() { printf '%s\n' "$*"; }
step() { printf '\n==> %s\n' "$*"; }
skip() { printf 'skip: %s\n' "$*"; }
fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

# Fail with a setup hint when a pinned tool is missing.
require_tool() {
  command -v "$1" >/dev/null 2>&1 ||
    fail "'$1' not found; run 'mise install' (pinned in mise.toml)"
}

# Usage: parse_scope "$@" — sets SCOPE to staged|push|all, leaves
# remaining arguments in REST_ARGS.
parse_scope() {
  SCOPE=all
  REST_ARGS=()
  while [ "$#" -gt 0 ]; do
    case "$1" in
      --staged) SCOPE=staged ;;
      --push) SCOPE=push ;;
      --all) SCOPE=all ;;
      *) REST_ARGS+=("$1") ;;
    esac
    shift
  done
}

# Base commit for --push: upstream, else the remote default branch.
push_base() {
  local ref
  for ref in '@{upstream}' origin/HEAD origin/main; do
    if git rev-parse --verify -q "$ref" >/dev/null 2>&1; then
      git merge-base HEAD "$ref" 2>/dev/null && return 0
    fi
  done
  return 1
}

# Print candidate paths for a scope, one per line (not yet filtered).
scope_paths() {
  local base
  case "$1" in
    staged) git diff --cached --name-only --diff-filter=ACMR ;;
    push)
      if base=$(push_base); then
        git diff --name-only --diff-filter=ACMR "$base" HEAD
      else
        git ls-files # nothing to compare against: check everything
      fi
      ;;
    all) git ls-files ;;
    *) fail "unknown scope: $1" ;;
  esac
}

# Usage: collect_code_files <scope> — prints existing code files.
collect_code_files() {
  local path
  scope_paths "$1" | grep -E "$CODE_RE" | while IFS= read -r path; do
    if [ -f "$path" ]; then printf '%s\n' "$path"; fi
  done
  return 0
}

# Usage: filter_ext <regex> <files...> — prints files matching the regex.
filter_ext() {
  local re=$1 f
  shift
  for f in "$@"; do
    if [[ $f =~ $re ]]; then printf '%s\n' "$f"; fi
  done
  return 0
}

# True when package.json exists, i.e. the npm workspace (task 001) is set up.
has_npm_workspace() { [ -f package.json ]; }

# True when package.json defines the named npm script.
has_npm_script() {
  has_npm_workspace || return 1
  node -e 'const s=require("./package.json").scripts||{};
    process.exit(Object.hasOwn(s, process.argv[1]) ? 0 : 1)' "$1"
}
