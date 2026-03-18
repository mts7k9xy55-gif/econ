# auto-cfo

Non-UI economic operations backend built on Cloudflare Workers, D1, and AI-driven decisioning.

## AI Development Loop

This repository uses a simple AI development loop stored in `/ai`.

- `ai/next.md`
  The current priority task list. Keep it to a maximum of 3 tasks.
- `ai/progress.md`
  The running implementation log. Record what was built, which files changed, decisions, blockers, and next suggestions.
- `ai/protocol.md`
  The operating contract between Codex, GPT, and the human.

## Roles

- Codex reads `ai/next.md`, implements tasks, and updates `ai/progress.md`.
- GPT reads `ai/progress.md` and produces the next version of `ai/next.md`.
- Human sets direction and decides priorities.

## Usage

1. Human sets direction.
2. GPT reads `ai/progress.md` and writes the next 1 to 3 priority tasks into `ai/next.md`.
3. Codex reads `ai/next.md`, implements the work, and updates `ai/progress.md`.
4. Repeat.
