# videos/ — sample and acceptance video projects
Status: `hello` (task 006) renders with `video render`, and with `quarto render` through its post-render hook (task 007a, ADR-0002). `hello-world` (ADR-0020, IR 1.12) is six title scenes on a 1000 x 1000 black canvas: `H` fades in over 0.5 s, `E`, `L`, `L`, `O` hold 0.5 s each, `World!` holds 1.5 s and fades out over 0.5 s (5.0 s, 150 frames). It has the same post-render hook as `hello`. `gpu` (task 036, 49 s, validates with no diagnostics) is the design-system sample; `demo` (task 047) is the acceptance project: every PRD §13.4 element, with music and captions.

## Purpose
Real, renderable projects that show the DSL and prove the pipeline end to end
(PRD §4.1, §13.4). Test-only projects live in `tests/fixtures/projects/`.

`videos/_template/` (task 050) is the starter project: `index.qmd` only, with a title, a statement, a bullet list and an exit with `animationDuration`. `npx video validate videos/_template` prints no diagnostics. Copy it to start a project; it has no `_quarto.yml` or `render-video.sh` (see `docs/guides/installation.md`).

## Project layout
```
videos/<name>/
├── index.qmd        # the only authored file required
├── assets/          # images, footage, audio, captions (project-relative)
├── data/            # chart data (CSV/JSON)
├── _quarto.yml      # hello and hello-world: post-render hook for `quarto render` (007a)
├── render-video.sh  # hello only: the hook; runs `video render` (007a)
├── .video-build/    # generated; gitignored
└── output.mp4       # generated; gitignored
```

## Commands
- Validate: `npx video validate videos/<name>`
- Render:   `npx video render videos/<name>`  → `videos/<name>/output.mp4`
- Quarto:   `quarto render videos/<name>/index.qmd` or `quarto render videos/<name>`
  → `videos/<name>/output.mp4`, only in a project that has `_quarto.yml`
  (see below). Needs the pinned Quarto (`mise.toml`).

## Quarto render (task 007a, ADR-0002)
`videos/hello/_quarto.yml` declares `project: post-render:` with
`./render-video.sh`. After `quarto render`, Quarto runs the hook from the
project directory. The hook runs `video render` on the project and exits with
its status, so a failed render (for example a validation error) makes
`quarto render` exit non-zero. A previous `output.mp4` is left as it was, as
`video render` does (`packages/cli/README.md`).

- The hook finds the CLI with documented mechanisms only: `video` on PATH if
  present, else `npm exec --prefix <repo> -- video` (`packages/cli/README.md`).
- `render-video.sh` must stay executable and use `./render-video.sh` in
  `_quarto.yml`; a bare name fails to spawn.
- A directory without `_quarto.yml` is not a render form: `quarto render <dir>`
  renders nothing and exits 0.
- Only `videos/hello` has the hook. A new project copies `_quarto.yml` and
  `render-video.sh`; other Quarto versions and `quarto preview` are not supported.
- `quarto render` also writes `index.html`, `index_files/` and `.quarto/` next
  to `index.qmd`. They are generated and gitignored (root `.gitignore`).

## Authoring rules (for agents writing `.qmd`)
- Use only components, presets and themes listed by `npx video components`
  and documented in `docs/components/`.
- One `.scene` Div per timeline scene; content in Markdown inside it.
- Semantic attributes only; never CSS, HTML, JS, pixel positions.
- Asset paths are relative to the project root (e.g. `assets/clip.mp4`).
- Every `.video` block declares `audio` explicitly.
- Run `video validate` and fix every error before `video render`.
- Do not commit generated files or large media; keep committed assets small
  and licensed for redistribution (record source in `assets/SOURCES.md`).

## Related
Tasks 006, 036, 047; ADR-0020 (hello-world). `tests/README.md` for fixture projects. `videos/gpu` is authored only in the DSL: no renderer code (task 036).
