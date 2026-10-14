# docs/decisions/ — Architecture Decision Records
Status: Template only. ADRs are written by the tasks listed below.

## Purpose
Record every decision that shapes parsing, timing, portability, or the
renderer boundary — in particular the open decisions in PRD §18. Code must
follow accepted ADRs; changing course requires a new ADR.

## Format
- File name: `NNNN-kebab-title.md`, numbered in the order listed below.
- Copy `0000-template.md`. Sections: Status, Context, Options, Decision,
  Consequences, Verification, References.
- Status values: `proposed` → `accepted` → (`superseded by NNNN`).
- Never edit the Decision of an accepted ADR; write a new ADR that supersedes it
  and update the old one's Status line only.
- Each ADR must state how the decision is verified (test name or command).
- Keep ADRs short (≤ 100 lines). Evidence (spike logs) may live in
  `docs/decisions/evidence/NNNN-*`.

## Index
Numbers follow task order. Each ADR is written by the task shown.

| ADR  | Topic                                            | PRD     | Task |
| ---- | ------------------------------------------------ | ------- | ---- |
| 0001 | Toolchain: TypeScript, npm workspaces, pinning   | §11.1   | 001  |
| 0002 | Quarto-native invocation feasibility             | §18.1   | 007  |
| 0003 | Duration units, frame rounding, default duration | §18.2   | 009  |
| 0004 | IR content representation                        | §18.4   | 012  |
| 0005 | Transition model and overlap semantics           | §18.3   | 015  |
| 0006 | Asset security boundary                          | §18.5   | 016  |
| 0007 | IR/DSL versioning and migration policy           | §18.7   | 017  |
| 0008 | Supported media formats                          | §18.8   | 037  |
| 0009 | Audio architecture                               | §18.6   | 044  |

## Rules for agents
- If your task says "writes ADR-NNNN", the ADR must reach `accepted` (or be
  explicitly left `proposed` with the reason flagged) before the task is done.
- If you find you need a decision not in this index, append a row with the
  next number and link the task that needs it.
- Reference ADRs from code comments only where the rule is non-obvious.
