# 036 — Sample explainer `videos/gpu`

Phase 3 · Status: done · Depends on: 026–035 · PRD: §1.3, §15 (Phase 3 exit) · ADR: —

## Goal
Prove the design system end to end: the PRD's "Why GPUs Matter" explainer
authored purely in the DSL renders well with no per-video renderer code.

## Scope
- In: `videos/gpu/index.qmd` using title, statement, bullets, statistic,
  chart, comparison, section-divider, end-card; data in `videos/gpu/data/`;
  presets and transitions from the registry; integration test.
- Out: footage and audio (Phase 4).

## Deliverables
- `videos/gpu/` project (≈ 45–60 s).
- Integration test: validate with zero diagnostics; render at reduced
  resolution; frame count equals IR total.
- Visual case sampling one frame per scene.

## Definition of done
Automated:
- [x] `video validate videos/gpu` → zero errors and zero warnings.
- [x] Render test passes; output matches IR settings.
- [x] No file under `renderer/` mentions `gpu` (test).

Human check:
1. `npx video render videos/gpu` and watch the full video: coherent theme,
   readable text, smooth transitions, nothing clipped.
2. Edit the text of one bullet and re-render: only that
   text changes in the new output.

## Notes
Phase 3 exit criterion (PRD §15) is met when this task is done.
- Awaiting human playback: the full video in motion (theme, transitions,
  clipping). Stills were checked, not the moving video.
- Chart and statistic figures are illustrative and labelled so on screen.
- Reduced-size render (960x540, the integration test) crowds the chart title
  and value labels (known chart limit); 1920x1080 is clean.
- The IR `settings.background` is `#000000` when `video.background` is unset;
  the frames draw the theme canvas (`#10131C`). Not changed here.

## Completion log
- 2026-10-15: `videos/gpu` done. 49.1 s (1473 frames, 1920x1080, 30 fps),
  11 scenes: title (reveal, 5 s); statement (kinetic, 5 s, fade); section-
  divider (3 s, wipe); comparison (fade-in, 8 s, zoom); bullets (stagger, 7 s,
  slide); section-divider (3 s, fade); statistic 50x (count-up, 4 s, cut);
  statistic 1,000 (count-up, 4 s, slide); chart (bar, reveal, 7 s, wipe);
  statement (reveal, 3 s, zoom); end-card (stagger, 5 s, fade).
- Tests: `tests/integration/sample-gpu.test.ts` (render group: zero diagnostics,
  45–60 s, a 960x540 render with the IR size and frame count, no `gpu` under
  `renderer/`); visual `gpu-scenes` (11 settled frames, one per scene).
- Gates: `check.sh --all` passed; `test.sh --all` passed (EXIT 0);
  `npm run test:visual` passed (225 frames, EXIT 0). The render test alone
  takes about 55 s, so it cannot meet a 5 s timeout; it sets its own 600 s.
- Human check: rendered at 1080p (exit 0, 72 s); stills checked. One bullet
  edited in a scratch copy and re-rendered: the difference is confined to that
  bullet; other frames match or differ only by encoder noise (PSNR ~61 dB).
- Phase 3 exit (PRD §15) met by this task. The PRD was not edited.
