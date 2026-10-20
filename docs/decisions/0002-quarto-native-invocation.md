# ADR-0002: Quarto-native invocation feasibility

- Status: accepted
- Date: 2026-10-14
- Task: 007
- PRD: §1.3, §4.3, §16, §18.1

## Context
PRD §18.1 asks whether Quarto can invoke Remotion and produce the MP4, or
whether the CLI must stay the only end-to-end command. PRD §16 allows a
`quarto render` claim only when verified end to end. The filter already runs
under `quarto render` (`filters: [video]`) but writes only the manifest.

## Options
1. **Extension only** — `filters: [video]` or a custom format in
   `_extension.yml`. Cons: nothing here starts a process without a Lua filter
   that spawns one, which `_extensions/video/README.md` forbids.
2. **Project post-render hook** — `project: post-render:` in the author's
   `_quarto.yml` runs a script that calls `video render` (`share/schema/project.yml`).
3. **CLI only** — `video render` as the sole entry point (PRD §4.3 fallback).

## Decision
1. `video render` remains the supported end-to-end entry point.
2. The extension (filters, custom formats) does not produce an MP4 with any
   documented option tested here; it writes `manifest.json` only. Docs must
   not say otherwise.
3. `quarto render` produces `output.mp4` only through a project `_quarto.yml`
   with `project: post-render:` running `video render`. Verified for a file
   (`quarto render <dir>/index.qmd`) and a directory (`quarto render <dir>`).
4. A directory without `_quarto.yml` is not a render form: `quarto render <dir>`
   renders nothing and exits 0 (observed).
5. No Lua filter may spawn a process to render. Option 2 uses a shell script,
   so the filter stays pure.
6. Not tried: a Lua filter at `post-render` that spawns `video render` via
   `pandoc.pipe`. Rejected by rule 5. Custom formats have no format-level
   post-render option in the pinned schema (`share/schema`).

## Forms tried
Each form runs on a fresh copy of `videos/hello` with `_extensions/video`
inside it (a parent `_extensions` was not found, observed manually).

| Form id | Invocation (cwd = copy root) | Setup in the copy |
| --- | --- | --- |
| index-extension-filter | `quarto render videos/hello/index.qmd` | `filters: [video]` |
| index-custom-format | `quarto render videos/hello/index.qmd --to video-html` | extension adds `formats: html: output-ext: mp4`; `filters: [video]` |
| dir-extension-filter | `quarto render videos/hello` | `filters: [video]`, no `_quarto.yml` |
| index-post-render | `quarto render videos/hello/index.qmd` | `_quarto.yml`: `project: post-render: ./render-video.sh`; script runs `video render .` |
| dir-post-render | `quarto render videos/hello` | same as index-post-render |
| post-render-failure-exit | `quarto render videos/hello/index.qmd` | post-render script exits 3; WORKS here means quarto exits non-zero |
| quarto-pandoc-manifest | `quarto pandoc videos/hello/index.qmd --from markdown --to native --lua-filter videos/hello/_extensions/video/video.lua` | the documented pandoc path (manifest only) |

WORKS needs an MP4 of 1920x1080, 30/1 fps, 120 frames (ffprobe), not just a
file of that name: `--output output.mp4` with the custom format wrote HTML into
one (manual run). Quarto 1.10.19 (the ADR-0010 pin), Chromium headless shell.

## Evidence
Verbatim output of `scripts/spike-quarto-native.sh` (2026-10-14):

```
quarto-native spike (task 007): quarto 1.10.19
project: videos/hello, expected MP4: 1920,1080,30/1,120
index-extension-filter     FAILS: no output.mp4 (manifest written: yes; other files written: index.html )
index-custom-format        FAILS: no output.mp4 (manifest written: yes; other files written: index.html )
dir-extension-filter       FAILS: no output.mp4 (manifest written: no; other files written: none)
index-post-render          WORKS
dir-post-render            WORKS
post-render-failure-exit   WORKS
quarto-pandoc-manifest     WORKS (manifest only; no render)
```

Manual observations: a post-render entry without `./` fails with `Failed to
spawn`; post-render scripts run with the project directory as cwd.

## Consequences
- PRD §18.1 is resolved: the CLI remains the required end-to-end command;
  Quarto can invoke it through a documented project hook.
- Docs may claim, as a spike result only: "with the post-render hook in
  `_quarto.yml`, `quarto render` wrote `output.mp4` for `videos/hello` with
  Quarto 1.10.19 (ADR-0002)". Docs must not claim that an extension, filter or
  custom format renders video, that `quarto render <dir>` works without
  `_quarto.yml`, or any other Quarto version, platform, project or preview.
- Follow-up 007a (done): the post-render form is supported. `videos/hello/_quarto.yml`
  and `videos/hello/render-video.sh` implement it; the CLI is found through
  `video` on PATH or `npm exec --prefix <repo>`, both documented. Tested by
  `tests/integration/quarto-render.test.ts` (file and directory forms write the
  MP4; a failing `video render` exits non-zero and leaves no `output.mp4` when none existed).
  The supported claim is limited to `videos/hello` with the pinned Quarto
  (1.10.19); other projects copy the two files.
- ADR-0021 (task 052) replaces the per-project files with one shared
  `videos/_quarto.yml` and `videos/_render-video.sh`, so every project under
  `videos/` renders with `quarto render`. The decision above is unchanged:
  the output still comes only from a project post-render hook.

## Verification
- `scripts/spike-quarto-native.sh` prints the lines above and exits 0. Its
  results are data, not a gate.
- Human check: read this ADR, run the script, and compare its lines with the
  block above.
- The script passes `shellcheck` and `shfmt` (`scripts/check.sh --all`).

## References
- PRD §1.3, §4.3, §16, §18.1 · ADR-0010 · `docs/testing.md`
- Quarto 1.10.19 schemas in its install: `share/schema/project.yml`
  (`post-render`), `share/schema/extension.yml` (`contributes`: shortcodes,
  filters, formats, engines), `share/schema/definitions.yml` (filter entry points)
- `_extensions/video/README.md` · `packages/cli/README.md` · `renderer/remotion/README.md`
