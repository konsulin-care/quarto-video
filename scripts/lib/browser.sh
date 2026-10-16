# shellcheck shell=bash disable=SC2034 # globals are read by sourcing scripts
# Chromium headless shell for the render suites (renderer/remotion/README.md).
# Source it; do not execute it. Nothing is downloaded.

# Sets QV_BROWSER_EXECUTABLE when it is unset: the newest chromium_headless_shell-*
# under PLAYWRIGHT_BROWSERS_PATH (default ~/.cache/ms-playwright), the same lookup
# as scripts/spike-quarto-native.sh. Here PLAYWRIGHT_BROWSERS_PATH is
# /opt/pw-browsers, the pinned shell (chromium_headless_shell-1194). Returns 1
# when no binary is found.
resolve_browser() {
  export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-1}"
  if [ -n "${QV_BROWSER_EXECUTABLE:-}" ]; then
    export QV_BROWSER_EXECUTABLE
    return 0
  fi
  local root="${PLAYWRIGHT_BROWSERS_PATH:-${HOME:-.}/.cache/ms-playwright}"
  local shell_dir binary
  shell_dir="$(find "$root" -maxdepth 1 -name 'chromium_headless_shell-*' \
    2>/dev/null | sort | tail -n 1 || true)"
  [ -n "$shell_dir" ] || return 1
  binary="$shell_dir/chrome-linux/headless_shell"
  [ -f "$binary" ] || return 1
  QV_BROWSER_EXECUTABLE="$binary"
  export QV_BROWSER_EXECUTABLE PLAYWRIGHT_BROWSERS_PATH="$root"
}
