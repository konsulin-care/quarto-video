# shellcheck shell=bash
# Tests for scripts/fresh-setup.sh: which guide blocks run, and the placeholder
# guard. The full run is the fresh-setup workflow (.github/workflows).

# A guide with kept sections, a ### part that must not run, a yaml fence whose
# "# " line is not a heading, and a section that is not kept.
write_guide() {
  cat >guide.md <<'EOF'
# Guide

## 1. Get the repository

```sh
git clone <repository-url> quarto-video
```

## 2. Install the tools and dependencies

```yaml
# not a heading
key: value
```

```sh
mise install
```

### Outside `videos/`

```sh
cd /path/to/quarto-video
```

## Other

```sh
echo skipped
```

## Start your own project

```sh
npx video validate videos/my-video
```
EOF
}

test_extracts_kept_blocks_in_guide_order() {
  make_repo
  write_guide
  mkdir blocks
  # shellcheck source=scripts/fresh-setup.sh
  source "$SCRIPTS_DIR/fresh-setup.sh"
  local got want
  got="$(fresh_extract guide.md blocks "1. Get the repository|2. Install the tools and dependencies|Start your own project")"
  want="$(printf 'blocks/001.sh\t1. Get the repository\nblocks/003.sh\t2. Install the tools and dependencies\nblocks/006.sh\tStart your own project')"
  if [ "$got" != "$want" ]; then
    printf 'got:\n%s\n' "$got"
    return 1
  fi
  [ "$(cat blocks/003.sh)" = "mise install" ]
}

test_block_under_outside_heading_is_not_extracted() {
  make_repo
  write_guide
  mkdir blocks
  # shellcheck source=scripts/fresh-setup.sh
  source "$SCRIPTS_DIR/fresh-setup.sh"
  fresh_extract guide.md blocks "1. Get the repository|Start your own project" >/dev/null
  [ ! -e blocks/004.sh ]
}

test_unresolved_placeholder_is_flagged() {
  # shellcheck source=scripts/fresh-setup.sh
  source "$SCRIPTS_DIR/fresh-setup.sh"
  if ! fresh_unresolved 'git clone <repository-url> quarto-video'; then
    echo "a <repository-url> placeholder was not flagged"
    return 1
  fi
  if fresh_unresolved 'npx video validate videos/demo'; then
    echo "a plain command was flagged as a placeholder"
    return 1
  fi
}
