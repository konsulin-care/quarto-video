#!/usr/bin/env bash
# shellcheck disable=SC2016 # post-render bodies are literal; $QV_SPIKE_REPO expands at run time
# Task 007 spike: which Quarto invocations produce output.mp4 for videos/hello?
# Each form runs on a fresh temp copy of videos/hello (plus the extension, as an
# author's project would hold it). Prints `<form> WORKS` or `<form> FAILS: <reason>`.
# Results are data for docs/decisions/0002-quarto-native-invocation.md, not a gate.
# Usage: scripts/spike-quarto-native.sh   (needs quarto, ffprobe, node, npm ci)
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$here/.." && pwd)"

# Expected MP4 of videos/hello: 2 scenes x 2 s at 30 fps, 1920x1080 (ffprobe order:
# width, height, r_frame_rate, nb_frames).
EXPECTED_MP4="1920,1080,30/1,120"

# Read by the post-render script in the temp project (absolute repo path).
export QV_SPIKE_REPO="$repo"

fail() {
  printf 'spike: %s\n' "$*" >&2
  exit 2
}

# Chromium headless shell (renderer/remotion/README.md): QV_BROWSER_EXECUTABLE, else
# the newest chromium_headless_shell-* in the Playwright cache (as the integration
# tests find it). Nothing is downloaded.
: "${PLAYWRIGHT_BROWSERS_PATH:="${HOME:-.}/.cache/ms-playwright"}"
: "${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:=1}"
if [ -z "${QV_BROWSER_EXECUTABLE:-}" ]; then
  shell_dir="$(find "$PLAYWRIGHT_BROWSERS_PATH" -maxdepth 1 \
    -name 'chromium_headless_shell-*' 2>/dev/null | sort | tail -n 1 || true)"
  if [ -n "$shell_dir" ]; then
    QV_BROWSER_EXECUTABLE="$shell_dir/chrome-linux/headless_shell"
  fi
fi
[ -n "${QV_BROWSER_EXECUTABLE:-}" ] || fail "no headless shell; set QV_BROWSER_EXECUTABLE"
export QV_BROWSER_EXECUTABLE PLAYWRIGHT_BROWSERS_PATH PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD
for tool in quarto ffprobe node; do
  command -v "$tool" >/dev/null 2>&1 || fail "'$tool' not on PATH"
done
[ -d "$repo/node_modules" ] || fail "node_modules missing; run 'npm ci'"

tmp="$(mktemp -d "${TMPDIR:-/tmp}/qv-spike.XXXXXX")"
trap 'rm -rf "$tmp"' EXIT

# Fresh copy of videos/hello and the extension under $tmp/<id>/videos/hello.
# Prints the work directory (the cwd for quarto).
new_project() {
  local work="$tmp/$1"
  mkdir -p "$work/videos" "$work/videos/hello/_extensions"
  cp -r "$repo/videos/hello" "$work/videos/"
  rm -rf "$work/videos/hello/.video-build" "$work/videos/hello/output.mp4"
  cp -r "$repo/_extensions/video" "$work/videos/hello/_extensions/"
  printf '%s' "$work"
}

# Documented filter activation: `filters: [video]` in the document front matter.
add_filter() {
  sed -i '1a filters: [video]' "$1"
}

# Project config with a post-render script. The script runs the repo's `video
# render` on the project; $1 is the script body (after the shebang).
write_post_render() {
  local dir=$1 body=$2
  printf 'project:\n  type: default\n  post-render:\n    - ./render-video.sh\n' \
    >"$dir/_quarto.yml"
  printf '#!/usr/bin/env bash\nset -euo pipefail\ncd "$(dirname "$0")"\n%s\n' \
    "$body" >"$dir/render-video.sh"
  chmod +x "$dir/render-video.sh"
}

# Runs `quarto <args>` in $1 (cwd). Sets QUARTO_STATUS and QUARTO_LOG.
run_quarto() {
  local work=$1
  shift
  QUARTO_LOG="$work/quarto.log"
  (cd "$work" && quarto "$@") >"$QUARTO_LOG" 2>&1 && QUARTO_STATUS=0 || QUARTO_STATUS=$?
}

# Last error-looking line of a log, without colour codes.
last_error() {
  sed -e 's/\x1b\[[0-9;]*m//g' "$1" | grep -E 'ERROR|rror' | tail -n 1 |
    cut -c1-160 || true
}

# Files Quarto left in the project, ignoring the inputs the author wrote.
project_files() {
  local f name out=""
  for f in "$1"/*; do
    name="$(basename "$f")"
    case "$name" in
      index.qmd | _quarto.yml | render-video.sh | _extensions | index_files) continue ;;
    esac
    if [ -f "$f" ]; then out="$out$name "; fi
  done
  printf '%s' "${out:-none}"
}

# Prints why output.mp4 in $1 is not the expected MP4; prints nothing if it is.
mp4_problem() {
  local file=$1 info
  if [ ! -f "$file" ]; then
    echo "no output.mp4"
    return 0
  fi
  info="$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height,r_frame_rate,nb_frames \
    -of default=nw=1:nk=1 "$file" 2>/dev/null | paste -sd, - || true)"
  if [ "$info" != "$EXPECTED_MP4" ]; then
    echo "output.mp4 is not the expected MP4 (ffprobe: ${info:-unreadable})"
  fi
}

# Prints the verdict line for a form that renders through quarto in $1.
judge_render() {
  local work=$1 id=$2 project reason="" manifest="no"
  project="$work/videos/hello"
  [ -f "$project/.video-build/manifest.json" ] && manifest="yes"
  if [ "$QUARTO_STATUS" -ne 0 ]; then
    reason="quarto exited $QUARTO_STATUS: $(last_error "$QUARTO_LOG")"
  else
    reason="$(mp4_problem "$project/output.mp4")"
    if [ -n "$reason" ] && [ ! -f "$project/output.mp4" ]; then
      reason="$reason (manifest written: $manifest; other files written: $(project_files "$project"))"
    fi
  fi
  report "$id" "$reason"
}

# Prints `<id> WORKS` when $2 is empty, else `<id> FAILS: <$2>`.
report() {
  if [ -z "$2" ]; then
    printf '%-26s WORKS\n' "$1"
  else
    printf '%-26s FAILS: %s\n' "$1" "$2"
  fi
}

form_index_filter() {
  local work
  work="$(new_project index-extension-filter)"
  add_filter "$work/videos/hello/index.qmd"
  run_quarto "$work" render videos/hello/index.qmd
  judge_render "$work" index-extension-filter
}

form_index_custom_format() {
  local work
  work="$(new_project index-custom-format)"
  add_filter "$work/videos/hello/index.qmd"
  printf '  formats:\n    html:\n      output-ext: mp4\n' \
    >>"$work/videos/hello/_extensions/video/_extension.yml"
  run_quarto "$work" render videos/hello/index.qmd --to video-html
  judge_render "$work" index-custom-format
}

form_dir_filter() {
  local work
  work="$(new_project dir-extension-filter)"
  add_filter "$work/videos/hello/index.qmd"
  run_quarto "$work" render videos/hello
  judge_render "$work" dir-extension-filter
}

form_index_post_render() {
  local work
  work="$(new_project index-post-render)"
  write_post_render "$work/videos/hello" 'node "$QV_SPIKE_REPO/packages/cli/bin/video.mjs" render .'
  run_quarto "$work" render videos/hello/index.qmd
  judge_render "$work" index-post-render
}

form_dir_post_render() {
  local work
  work="$(new_project dir-post-render)"
  write_post_render "$work/videos/hello" 'node "$QV_SPIKE_REPO/packages/cli/bin/video.mjs" render .'
  run_quarto "$work" render videos/hello
  judge_render "$work" dir-post-render
}

# Negative control: a failing post-render script must make quarto exit non-zero.
form_post_render_failure() {
  local work reason=""
  work="$(new_project post-render-failure)"
  write_post_render "$work/videos/hello" 'echo "spike: deliberate failure" >&2; exit 3'
  run_quarto "$work" render videos/hello/index.qmd
  if [ "$QUARTO_STATUS" -eq 0 ]; then
    reason="quarto exited 0 although the post-render script failed"
  fi
  report post-render-failure-exit "$reason"
}

# Documented Pandoc path (_extensions/video/README.md): manifest only, no render.
form_pandoc_manifest() {
  local work reason="" manifest
  work="$(new_project quarto-pandoc-manifest)"
  run_quarto "$work" pandoc videos/hello/index.qmd --from markdown --to native \
    --lua-filter videos/hello/_extensions/video/video.lua
  manifest="$work/videos/hello/.video-build/manifest.json"
  if [ "$QUARTO_STATUS" -ne 0 ]; then
    reason="quarto pandoc exited $QUARTO_STATUS: $(last_error "$QUARTO_LOG")"
  elif [ ! -f "$manifest" ] || ! grep -q '"scene-002"' "$manifest"; then
    reason="no manifest with two scenes"
  fi
  if [ -z "$reason" ]; then
    printf '%-26s WORKS (manifest only; no render)\n' quarto-pandoc-manifest
  else
    report quarto-pandoc-manifest "$reason"
  fi
}

printf 'quarto-native spike (task 007): quarto %s\n' "$(quarto --version)"
printf 'project: videos/hello, expected MP4: %s\n' "$EXPECTED_MP4"
form_index_filter
form_index_custom_format
form_dir_filter
form_index_post_render
form_dir_post_render
form_post_render_failure
form_pandoc_manifest
