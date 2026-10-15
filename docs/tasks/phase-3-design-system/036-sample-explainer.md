# 036 — Sample explainer `videos/gpu`

Phase 3 · Status: in-progress · Depends on: 026–035 · PRD: §1.3, §15 (Phase 3 exit) · ADR: —

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
- [ ] `video validate videos/gpu` → zero errors and zero warnings.
- [ ] Render test passes; output matches IR settings.
- [ ] No file under `renderer/` mentions `gpu` (test).

Human check:
1. `npx video render videos/gpu` and watch the full video: coherent theme,
   readable text, smooth transitions, nothing clipped.
2. Edit the text of one bullet and re-render: only that
   text changes in the new output.

## Notes
Phase 3 exit criterion (PRD §15) is met when this task is done.

## Completion log
