# docs/tasks/ — sequential development tasks
Status: Task 000 in progress; all others `todo`. Numbers are the execution order.

## Picking work
1. Take the lowest-numbered task whose `Status` is not `done` and whose
   `Depends on` tasks are all `done`. Do not skip ahead.
2. Set `Status: in-progress`, commit nothing else alongside that edit.
3. Read every README and ADR the task lists before writing code.

## Task file format (≤ 100 lines)
Header line: `Phase · Status · Depends on · PRD refs · ADR (writes/reads)`.
Sections: Goal, Scope (In/Out), Deliverables, Definition of done
(**Automated** checks + **Human check** steps), Notes, Completion log.

## Definition of done (applies to every task)
- Every Automated box is satisfied by a committed test that runs in
  `mise run test` (see `docs/testing.md` for what needs a test).
- The Human check can be followed verbatim by a person with a fresh clone
  and produces the stated observable result.
- READMEs of touched directories and `AGENT.md` Commands are current.
- ADR written/accepted if the header says "writes ADR-NNNN".
- `Status: done` and a `Completion log` entry: date, summary, follow-ups.

## Rules
- A task is atomic: one behaviour, one reviewable change set. If it grows,
  split it: append a new task (`NNNa`) instead of widening scope.
- Never renumber or delete tasks. Obsolete tasks get `Status: dropped` + reason.
- `blocked` requires a `Notes` entry saying what unblocks it.
- Fixtures for a task live in `tests/fixtures/projects/<task-slug>/`.

## Index
| #   | Task                                   | Depends  |
| --- | -------------------------------------- | -------- |
| **Phase 1 — Technical validation** |  |  |
| 000 | Dev environment, gates + ADR-0010      | —        |
| 001 | Workspace tooling + ADR-0001           | 000      |
| 002 | IR v0 schema and checker               | 001      |
| 003 | Minimal Lua filter → IR                | 002      |
| 004 | Minimal Remotion render of IR          | 002      |
| 005 | `video validate`                       | 003      |
| 006 | `video render`                         | 004, 005 |
| 007 | Quarto-native spike + ADR-0002         | 006      |
| **Phase 2 — DSL and validation** |  |  |
| 008 | Diagnostics model and reporter         | 005      |
| 009 | Durations → frames + ADR-0003          | 008      |
| 010 | Front matter and defaults              | 009      |
| 011 | Scene ids and source lines             | 008      |
| 012 | Content representation + ADR-0004      | 011      |
| 013 | Component registry + `video components`| 012      |
| 014 | Contract validation stage              | 013      |
| 015 | Timeline and transitions + ADR-0005    | 010, 014 |
| 016 | Asset paths and security + ADR-0006    | 014      |
| 017 | IR v1.0 freeze + ADR-0007              | 015, 016 |
| 018 | Preflight and output check             | 017      |
| **Phase 3 — Design system** |  |  |
| 019 | Theme tokens (`modern`)                | 018      |
| 020 | Visual regression harness              | 019      |
| 021 | Animation presets: fade-in, slide-up, reveal | 020 |
| 022 | Transition presets                     | 021      |
| 023 | Reduced motion                         | 022      |
| 024 | Component `title`                      | 023      |
| 025 | Component `statement`                  | 024      |
| 026 | Preset `kinetic`                       | 025      |
| 027 | Component `bullets`                    | 024      |
| 028 | Preset `stagger`                       | 027      |
| 029 | Component `section-divider`            | 024      |
| 030 | Component `end-card`                   | 024      |
| 031 | Component `statistic`                  | 024      |
| 032 | Preset `count-up`                      | 031      |
| 033 | Component `image`                      | 024      |
| 034 | Component `comparison`                 | 024      |
| 035 | Component `chart`                      | 024      |
| 036 | Sample explainer `videos/gpu`          | 026–035  |
| **Phase 4 — Media and audio** |  |  |
| 037 | Media probe + ADR-0008                 | 036      |
| 038 | `.video` block and source ranges       | 037      |
| 039 | Background video placement             | 038      |
| 040 | Device frames                          | 039      |
| 041 | Component `product-demo`               | 040      |
| 042 | Component `text-media`                 | 039      |
| 043 | Component `split-screen`               | 039      |
| 044 | Source audio policy + ADR-0009         | 039      |
| 045 | Background music                       | 044      |
| **Phase 5 — Release hardening** |  |  |
| 046 | Captions                               | 045      |
| 047 | Acceptance demo `videos/demo`          | 041–046  |
| 048 | Path robustness                        | 047      |
| 049 | Reproducibility + compatibility matrix | 047      |
| 050 | User guides                            | 049      |
| 051 | Fresh-setup verification               | 050      |
