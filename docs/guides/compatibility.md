# Compatibility matrix

Status: supported versions for task 049. The versions below are the pins in
`mise.toml` and `renderer/remotion/package.json` (ADR-0001, ADR-0010). The same
values are the single source of truth in `packages/cli/src/compatibility.json`,
which `video doctor` reads. A test (`packages/cli/test/compat-matrix.test.ts`)
fails when a pin and this table or the JSON disagree.

## Supported versions

| Tool | Supported | Pinned in | Notes |
| --- | --- | --- | --- |
| Node.js | `24.21.0` | `mise.toml`, root `package.json` `engines` | `doctor` reports `v24.21.0`; the matrix stores it without the `v`. |
| Quarto CLI | `1.10.19` | `mise.toml` (`github:quarto-dev/quarto-cli`) | Needed for `quarto render` and the Lua filter tests. |
| Pandoc | `3.10` | bundled with the pinned Quarto | Not pinned on its own; `quarto pandoc --version` reports it. |
| Remotion | `4.0.530` | `renderer/remotion/package.json` (`@remotion/renderer`, `remotion`, `@remotion/bundler`) | Exact pins, so one version. |
| ffmpeg (ffprobe) | `9.0.2` | `mise.toml` (`conda:ffmpeg`) | Stage 6 reads frame counts and sizes with ffprobe. |
| Chromium headless shell | not pinned | `QV_BROWSER_EXECUTABLE` | Recorded in build-info. Tested here: Chromium 141.0.7390.37. |

Packages `video`, `validator` and the renderer are versioned `0.0.0` in this
repository; their versions are recorded in build-info too.

## Operating systems

- **Linux x86_64**: the verified platform. Every version above was run here
  (`mise exec -- npx video doctor` reports all ✓ except the browser when
  `QV_BROWSER_EXECUTABLE` is unset).
- **macOS**: `mise.toml` says the conda ffmpeg builds are prebuilt for Linux and
  macOS. Not verified by the test suite in this repository.
- **Windows**: not verified; no support is claimed.

## Checking your machine

```sh
mise install && mise run setup
npm ci
npx video doctor
```

`video doctor` prints one line per tool. A version that is not in the matrix
gets a `⚠` warning on the same line, for example
`✓ quarto    1.11.0  ⚠ 1.11.0 is outside the compatibility matrix (...)`. A warning
does not change the exit status; a missing tool does (exit 2).

## Known cross-platform differences

- **Browser rendering.** Remotion draws each frame in Chromium. Rasterisation,
  anti-aliasing and GPU or software compositing differ between operating
  systems and browser builds, so the same IR can produce slightly different
  pixels on different machines.
- **Encoded bytes.** Different ffmpeg builds, encoder options and CPUs give
  different MP4 bytes. Bit-identical MP4 files are a non-goal (PRD §11.1). Two
  renders on the same machine produce identical decoded stills
  (`tests/integration/reproducibility.test.ts`).
- **Fonts.** The bundled Inter family (`renderer/remotion/themes/fonts`) is
  loaded from the package, so text metrics do not depend on system fonts.
- **Paths.** Tools resolve from `PATH`; a different `quarto` or `ffprobe` on
  the path changes the versions reported by `doctor` and in build-info.

## Reproducibility record

Every successful `video render` writes `.video-build/build-info.json` (schema:
`packages/cli/schema/build-info.json`). It holds the SHA-256 of the resolved IR,
of each asset the IR names and of each device frame definition, the tool
versions, the OS and architecture, and the CLI flags. Compare its `tools` block
with the table above when output changes.
