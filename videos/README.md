# videos/ — sample and acceptance video projects
Status: `hello` (task 006) renders with `video render`. `gpu` (task 036) and `demo` (task 047) come later.

## Purpose
Real, renderable projects that show the DSL and prove the pipeline end to end
(PRD §4.1, §13.4). Test-only projects live in `tests/fixtures/projects/`.

## Project layout
```
videos/<name>/
├── index.qmd        # the only authored file required
├── assets/          # images, footage, audio, captions (project-relative)
├── data/            # chart data (CSV/JSON)
├── .video-build/    # generated; gitignored
└── output.mp4       # generated; gitignored
```

## Commands
- Validate: `npx video validate videos/<name>`
- Render:   `npx video render videos/<name>`  → `videos/<name>/output.mp4`

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
Tasks 006, 036, 047. `tests/README.md` for fixture projects.
