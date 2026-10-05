# Git reconciliation before Cal.com planning

Checked 5 October 2026 against freshly fetched GitHub refs.

## Main checkout

The workspace was clean. Local `main` had no local-only commits and was 41 commits behind `origin/main`. Applied `git merge --ff-only origin/main`, preserving GitHub's current styling and source history. Starting point after sync: `59450634a1c5d62ce16f14e9b7817c1ff57c48b8`. `git rev-list --left-right --count main...origin/main` returned `0 0`; `git diff main origin/main` was empty.

Planning-only changes will be committed and pushed, then main equality rechecked. This proves local main equals GitHub main; it does not mean historical feature branches are all identical or all merged.

## Historical branch review

Most remote feature branches are ancestors of current main and have no unique commits. Local `feat/option-wheel` contains its remote branch's one additional commit, but that entire history is already in current main. It needs no merge into main.

`section2` and `origin/wip/section-2-auth-email` have four different-SHA commits; `git cherry origin/main` marks all four `-`, meaning equivalent patches are already in main. Re-merging those commits is unnecessary.

The following histories have genuine non-equivalent patches and remain preserved:

| Branch | Commit(s) | Reason to preserve separately |
|---|---|---|
| Local `wip/local-client-invitations` | `6ee716d` | Explicit WIP with broad historical auth/client changes and a transcript file; no blind merge or upload. |
| Local worktree `worktree-agent-a19ecb32192c21501` | `e5a878f` | Saved mid-run auth/email WIP; an attached worktree belongs to existing work. |
| Remote `claude/frontend-marketing-redesign-ev0ki9` | `e91b39e`, `eb33751` | Older offering/performance changes touch shared styling, dependencies and site chrome; comparing its chrome shows differences from the newer portal exclusion. Requires a dedicated source/behaviour review, not an automatic merge into planning. |
| Remote `claude/mobile-footer-first-section-ihwfas` | `85e57b9` | Explicit mobile-footer experiment (`try ... side by side`) changes styling; not inferred as approved over current main. |
| Remote `feat/admin-db` | `a71203a` | Broad WIP data-layer migration spanning many admin/portal/payment files; must not be applied as an incidental calendar-planning update. |

Existing attached worktrees were not reset, removed, checked out onto another branch or treated as safe to overwrite. Older branch tips were not force-updated just to manufacture equal counters. No historical branch was deleted.

## Remaining boundary

Main is reconciled. Whole-repository convergence of the genuine WIP/experiment branches above is still a separate review task; their patches are not declared merged or complete. Before any Cal.com implementation, fetch again and check main, dirty files, pending migrations and overlapping work. A user's request to preserve current styling must not be interpreted as permission to revive old styling experiments automatically.
