# videos/ — sample and acceptance video projects
Status: every project here renders with `video render`, and with `quarto render` through the extension's post-render filter, which the root `_quarto.yml` turns on (task 053; ADR-0022). `hello-world` (ADR-0020, IR 1.12) is six title scenes on a 1000 x 1000 black canvas: `H` fades in over 0.5 s, `E`, `L`, `L`, `O` hold 0.5 s each, `World!` holds 1.5 s and fades out over 0.5 s (5.0 s, 150 frames). `gpu` (task 036, 49 s, validates with no diagnostics) is the design-system sample; `demo` (task 047) is the acceptance project: every PRD §13.4 element, with music and captions.

## Purpose
Real, renderable projects that show the DSL and prove the pipeline end to end
(PRD §4.1, §13.4). Test-only projects live in `tests/fixtures/projects/`.

`videos/_template/` (task 050) is the starter project: `index.qmd` only, with a title, a statement, a bullet list and an exit with `animationDuration`. `npx video validate videos/_template` prints no diagnostics. Copy it to start a project; the copy renders with `video render` and `quarto render` as it is. Quarto skips `_template` itself (a directory starting with `_`).

## Project layout
```
videos/                  # the root _quarto.yml renders videos/*/index.qmd with filters: [video]
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

## Quarto render (task 053; ADR-0022)
The root `_quarto.yml` is the Quarto project for these samples: `render:` lists
`videos/*/index.qmd`, and `filters: [video]` loads `_extensions/video`, whose
`render.lua` runs at `post-render` and calls `video render` on the project of
the rendered file. A failed render (for example a validation error) makes
`quarto render` exit non-zero; a previous `output.mp4` is left as it was, as
`video render` does (`packages/cli/README.md`).

- Forms: `quarto render videos/<name>`, `quarto render videos/<name>/index.qmd`,
  and `quarto render index.qmd` inside `videos/<name>`. `_template` is skipped.
- `video` must be on PATH (`node_modules/.bin`; mise adds it) or named by
  `QUARTO_VIDEO_CLI`.
- Do not add a `_quarto.yml` inside a project here: it would make that
  directory its own project, without the filter.
- Other Quarto versions and `quarto preview` are not supported.
- `quarto render` also writes `index.html` and `index_files/` next to each
  `index.qmd`, and `.quarto/` at the repository root. They are gitignored.

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
Tasks 006, 007a, 036, 047, 052, 053; ADR-0002, ADR-0020 (hello-world), ADR-0022. `tests/README.md` for fixture projects. `videos/gpu` is authored only in the DSL: no renderer code (task 036).
