#!/usr/bin/env bash
# Fresh-setup verification (task 051, PRD §16). Runs the shell blocks of
# docs/guides/installation.md in order, in a new clone of the repository, then
# validates and renders videos/demo with the documented `video` commands and
# checks output.mp4 (ffprobe and a full decode) against the demo's IR.
# Used by .github/workflows/fresh-setup.yml; runs on any machine with mise.
#
# Usage: scripts/fresh-setup.sh <repo-url> <work-dir>
#   repo-url  replaces the guide's <repository-url> (a file:// path works)
#   work-dir  a new or empty directory; the clone, blocks and logs go in it
# The guide's /path/to/chromium_headless_shell/headless_shell is replaced by
# QV_BROWSER_EXECUTABLE when that is set, else by the binary the guide's browser
# install put in the Playwright cache (scripts/lib/browser.sh).
# Exit 0 when every check passes; otherwise the first failure stops the script.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/.." && pwd)"
# shellcheck source=scripts/lib/common.sh
source "$here/lib/common.sh"
# shellcheck source=scripts/lib/browser.sh
source "$here/lib/browser.sh"

GUIDE="$root/docs/guides/installation.md"
# Headings whose sh blocks run, in guide order. A block under any other heading
# (the ### "Outside videos/" part, the optional Quarto section) does not run.
RUN_SECTIONS="1. Get the repository|2. Install the tools and dependencies|3. Check the machine|4. Point at a Chromium headless shell|5. Try the reference video|Start your own project"
BROWSER_PLACEHOLDER="/path/to/chromium_headless_shell/headless_shell"

# fresh_extract <guide> <dir> <sections>: writes each sh block whose nearest
# heading is in <sections> to <dir>/NNN.sh (NNN counts every block, so the
# numbers follow the guide), and prints "<file><TAB><heading>" per kept block.
fresh_extract() {
  awk -v dir="$2" -v keep_list="$3" '
    /^```/ && !in_block {
      in_block = 1
      n++
      keep = ($0 == "```sh") && index("|" keep_list "|", "|" section "|") > 0
      if (keep) {
        file = sprintf("%s/%03d.sh", dir, n)
        printf "" > file
        print file "\t" section
      }
      next
    }
    in_block && /^```[ \t]*$/ { in_block = 0; next }
    in_block { if (keep) print > file; next }
    /^#+ / { section = $0; sub(/^#+ +/, "", section) }
  ' "$1"
}

# fresh_unresolved <text>: succeeds when a placeholder is still in the text.
fresh_unresolved() {
  grep -Eq '<[a-z-]+>|/path/to/' <<<"$1"
}

# Mise tools for the later blocks: what `mise activate` does in a shell.
fresh_activate_mise() {
  PATH="$(mise bin-paths | tr '\n' ':')$PATH"
  export PATH
}

# Checks on one guide block. $1 heading, $2 exit status, $3 its log, $4 its
# body. Step 3 exits 2 by design (the browser is not set yet); every other
# block exits 0 and prints the output the guide documents.
fresh_check_block() {
  local heading=$1 status=$2 out=$3 body=$4
  if [ "$heading" = "3. Check the machine" ]; then
    [ "$status" -eq 2 ] || fail "guide step 3 'video doctor' exited $status, expected 2"
    grep -q '^✗ browser' "$out" || fail "guide step 3: no ✗ browser line"
    return 0
  fi
  [ "$status" -eq 0 ] || fail "guide block '$heading' exited $status (log: $out)"
  case "$body" in
    *"validate videos/hello-world"*)
      grep -qF "OK hello-world (6 scenes, 150 frames)" "$out" ||
        fail "guide: validate hello-world did not print its OK line"
      ;;
    *"validate videos/my-video"*)
      grep -qF "OK my-video (3 scenes, 360 frames)" "$out" ||
        fail "guide: validate my-video did not print its OK line"
      ;;
    *"render videos/hello-world"*)
      grep -q "^Wrote " "$out" || fail "guide: render hello-world printed no Wrote line"
      [ -s videos/hello-world/output.mp4 ] || fail "guide: no videos/hello-world/output.mp4"
      ;;
  esac
  return 0
}

# Runs one guide block in the current directory, after the placeholders are
# filled. Each block is its own bash, so a failing command stops that block.
fresh_run_block() {
  local file=$1 heading=$2 body out status
  body="$(cat "$file")"
  body=${body//<repository-url>/$REPO_URL}
  if [[ $body == *"$BROWSER_PLACEHOLDER"* ]]; then
    resolve_browser || fail "no Chromium headless shell: the guide's step 4 install did not leave one"
    body=${body//"$BROWSER_PLACEHOLDER"/$QV_BROWSER_EXECUTABLE}
  fi
  fresh_unresolved "$body" && fail "unresolved placeholder under '$heading': $body"
  out="$LOG_DIR/$(basename "$file" .sh).log"
  step "guide: $heading"
  while IFS= read -r line; do printf '    | %s\n' "$line"; done <<<"$body"
  set +e
  bash -e -c "$body" >"$out" 2>&1 </dev/null
  status=$?
  set -e
  cat "$out"
  fresh_check_block "$heading" "$status" "$out" "$body"
  if [ "$heading" = "2. Install the tools and dependencies" ]; then
    fresh_activate_mise
  fi
  if [ -d "$WORK/quarto-video/.git" ]; then
    cd "$WORK/quarto-video"
  fi
}

# Runs one documented command for the demo; its output goes to <log>.
fresh_demo_run() {
  local label=$1 log_file=$2
  shift 2
  step "$label"
  if ! "$@" >"$log_file" 2>&1 </dev/null; then
    cat "$log_file"
    fail "$label failed (log: $log_file)"
  fi
  cat "$log_file"
}

fresh_verify_demo() {
  local ir="$LOG_DIR/demo-ir.json" probe="$LOG_DIR/demo-probe.json" frames
  local mp4="videos/demo/output.mp4"
  fresh_demo_run "validate videos/demo" "$LOG_DIR/demo-validate.log" \
    npx video validate videos/demo
  frames="$(sed -nE 's/^OK demo \([0-9]+ scenes, ([0-9]+) frames\)$/\1/p' \
    "$LOG_DIR/demo-validate.log")"
  [ -n "$frames" ] || fail "validate did not print 'OK demo (N scenes, M frames)'"
  step "IR of videos/demo"
  npx video validate videos/demo --print-ir >"$ir" 2>"$LOG_DIR/demo-ir.err" </dev/null ||
    fail "validate --print-ir failed (log: $LOG_DIR/demo-ir.err)"
  fresh_demo_run "render videos/demo" "$LOG_DIR/demo-render.log" \
    npx video render videos/demo
  grep -q "^Wrote .*videos/demo/output.mp4" "$LOG_DIR/demo-render.log" ||
    fail "render did not report videos/demo/output.mp4"
  [ -s "$mp4" ] || fail "$mp4 is missing or empty"
  require_tool ffprobe
  fresh_demo_run "ffprobe $mp4" "$probe" \
    ffprobe -v error -count_frames -select_streams v:0 \
    -show_entries stream=width,height,nb_read_frames,r_frame_rate \
    -of json "$mp4"
  fresh_demo_run "decode $mp4 end to end" "$LOG_DIR/demo-decode.log" \
    ffmpeg -v error -xerror -i "$mp4" -f null -
  step "compare $mp4 with its IR"
  npx tsx "$here/fresh-setup-check.ts" "$ir" "$probe" "$frames"
}

main() {
  [ "$#" -eq 2 ] || fail "usage: scripts/fresh-setup.sh <repo-url> <work-dir>"
  REPO_URL=$1
  if [ -e "$2" ] && [ -n "$(ls -A "$2")" ]; then
    fail "work dir is not empty: $2"
  fi
  mkdir -p "$2"
  WORK="$(cd "$2" && pwd)"
  LOG_DIR="$WORK/logs"
  mkdir -p "$LOG_DIR" "$WORK/blocks"
  cd "$WORK"

  local entries entry file heading
  mapfile -t entries < <(fresh_extract "$GUIDE" "$WORK/blocks" "$RUN_SECTIONS")
  [ "${#entries[@]}" -gt 0 ] || fail "no runnable blocks in $GUIDE"
  local section found
  IFS='|' read -r -a sections <<<"$RUN_SECTIONS"
  for section in "${sections[@]}"; do
    found=0
    for entry in "${entries[@]}"; do
      [[ $entry == *$'\t'"$section" ]] && found=1
    done
    [ "$found" -eq 1 ] || fail "no sh block under '$section' in $GUIDE"
  done
  for entry in "${entries[@]}"; do
    IFS=$'\t' read -r file heading <<<"$entry"
    fresh_run_block "$file" "$heading"
  done

  cd "$WORK/quarto-video"
  fresh_verify_demo
  log "fresh setup: PASS (logs: $LOG_DIR)"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
