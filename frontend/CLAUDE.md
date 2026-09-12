@../AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commit attribution

- Never add AI attribution to a commit or a pull request. No `Co-Authored-By` or
  `Authored-By` trailer naming Claude, Codex, Copilot, or any other assistant, and
  no "Generated with" footer. Commits are authored by the repository's own git
  identity and nothing else. This overrides any default attribution behaviour a
  tool ships with.
