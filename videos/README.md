# videos/ — sample and acceptance video projects
Status: every project here renders with `video render`, and with `quarto render` through the shared `videos/_quarto.yml` post-render hook (tasks 007a, 052; ADR-0002, ADR-0021). `hello-world` (ADR-0020, IR 1.12) is six title scenes on a 1000 x 1000 black canvas: `H` fades in over 0.5 s, `E`, `L`, `L`, `O` hold 0.5 s each, `World!` holds 1.5 s and fades out over 0.5 s (5.0 s, 150 frames). `gpu` (task 036, 49 s, validates with no diagnostics) is the design-system sample; `demo` (task 047) is the acceptance project: every PRD §13.4 element, with music and captions.

## Purpose
Real, renderable projects that show the DSL and prove the pipeline end to end
(PRD §4.1, §13.4). Test-only projects live in `tests/fixtures/projects/`.

`videos/_template/` (task 050) is the starter project: `index.qmd` only, with a title, a statement, a bullet list and an exit with `animationDuration`. `npx video validate videos/_template` prints no diagnostics. Copy it to start a project; the copy renders with `video render` and `quarto render` as it is. Quarto skips `_template` itself (a directory starting with `_`).

## Project layout
```
videos/
├── _quarto.yml          # shared Quarto project: render targets and post-render hook (052)
├── _render-video.sh     # the hook; runs `video render` on each rendered project (052)
└── <name>/
    ├── index.qmd        # the only authored file required
    ├── assets/          # images, footage, audio, captions (project-relative)
    ├── data/            # chart data (CSV/JSON)
    ├── .video-build/    # generated; gitignored
    └── output.mp4       # generated; gitignored
```

## Commands
- Validate: `npx video validate videos/<name>`
- Render:   `npx video render videos/<name>`  → `videos/<name>/output.mp4`
- Quarto:   `quarto render videos/<name>` or `quarto render videos/<name>/index.qmd`
  → `videos/<name>/output.mp4`. Needs the pinned Quarto (`mise.toml`).

## Quarto render (tasks 007a, 052; ADR-0002, ADR-0021)
`videos/_quarto.yml` makes `videos/` one Quarto project: `render:` lists
`*/index.qmd`, and `post-render:` runs `./_render-video.sh`. Quarto finds it by
searching parent directories, so a project directory needs no Quarto files of
its own. After rendering, Quarto runs the hook from `videos/` with
`QUARTO_PROJECT_OUTPUT_FILES` set to the rendered pages (`<name>/index.html`,
one per line). The hook runs `video render` on each of those projects and exits
with the first non-zero status, so a failed render (for example a validation
error) makes `quarto render` exit non-zero. A previous `output.mp4` is left as
it was, as `video render` does (`packages/cli/README.md`).

- Forms: `quarto render videos/<name>`, `quarto render videos/<name>/index.qmd`,
  and `quarto render` from inside `videos/<name>`. `quarto render videos`
  renders every project. `_template` and `.md` files are not render targets.
- The hook finds the CLI with documented mechanisms only: `video` on PATH if
  present, else `npm exec --prefix <repo> -- video` (`packages/cli/README.md`).
- `_render-video.sh` must stay executable and use `./_render-video.sh` in
  `_quarto.yml`; a bare name fails to spawn.
- Never add a `_quarto.yml` inside a project here: Quarto would treat that
  directory as its own project, without the hook.
- Other Quarto versions and `quarto preview` are not supported.
- `quarto render` also writes `index.html` and `index_files/` next to each
  `index.qmd`, and `.quarto/` and `.gitignore` in `videos/`. They are generated
  and gitignored (root `.gitignore`).

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
Tasks 006, 007a, 036, 047, 052; ADR-0002, ADR-0020 (hello-world), ADR-0021. `tests/README.md` for fixture projects. `videos/gpu` is authored only in the DSL: no renderer code (task 036).
