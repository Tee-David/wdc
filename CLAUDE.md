# WDC project guide for Claude

Read [AGENTS.md](AGENTS.md) before substantive work. It is the canonical shared engineering and design guide; user instructions take precedence. Read the root README for the design system and `docs/status.md` for current unfinished delivery.

For shared context, run the installed AIContextBridge session-start command from this repository with agent `claude`. The bridge is advisory. Git and project files remain authoritative; optimistic section updates must preserve concurrent work and never contain secrets or personal data.

## Infrastructure

The running application is in `frontend/`, including its server endpoints and domain modules. `backend/` is reserved. Both directories have detailed READMEs. Maintained operational documentation lives in `docs/`; old mockups and handoff folders have been retired. Active Meetings plans and its preview stay until end-to-end delivery is finished.

## Motion designs

Read `.claude/skills/motion-studio/SKILL.md` before creating motion films, promos, explainers, animated brand pieces or authored motion designs. Its engine, templates and references live alongside it. The corresponding Codex/project skill is `.agents/skills/motion-studio/SKILL.md`.

Use existing owner decisions instead of repeating settled discovery questions. Keep WDC tokens, typography, assets and responsive rules. Adapt environment-specific commands to this workspace; do not install dependencies merely because an example uses them. Ordinary UI transitions follow the existing accessibility and performance rules rather than invoking the full film workflow.

## Delivery

Preserve unrelated edits. Verify responsive grouping and spacing at phone, tablet and desktop widths in both themes. Give truthful action feedback and clear recovery from failures. Update current documentation when behaviour changes. Stage named paths only; use the repository Git identity without assistant attribution. Commit and synchronize finished pieces as instructed by the owner; verify deployment separately before claiming a live fix.
