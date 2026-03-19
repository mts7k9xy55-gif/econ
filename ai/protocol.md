# AI Development Protocol

## Responsibilities

Codex:
- read ai/next.md
- implement tasks
- update ai/progress.md
- after every commit:
  - update ai/progress.md
  - analyze repository state
  - generate ai/next.md
  - choose max 3 tasks

GPT:
- read ai/progress.md
- analyze repository state from the progress snapshot
- produce ai/next.md
- choose max 3 tasks

Human:
- set direction
