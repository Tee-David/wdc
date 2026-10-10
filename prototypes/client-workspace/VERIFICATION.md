# Preview verification — 10 October 2026

This verifies the standalone proposal, not production features or email delivery.

| Check | Observed result |
| --- | --- |
| Actual component rendering | AdminShell, ClientShell, Panel, DemoNote and Lucide icons rendered successfully with inert account/routing adapters |
| Static artifact build | Self-contained HTML with embedded dashboard CSS, scripts and existing local fonts generated successfully |
| Prototype ESLint | Zero errors and zero warnings under the installed ESLint recommended rules |
| Frontend TypeScript | `tsc --noEmit` exited 0 in the current working tree |
| Seven services × four sections × two roles | 56 rendered cases passed |
| Core studio pages and social work at 320, 768 and 1440; light and dark | 30 further rendered cases passed |
| All 86 measured cases | No document-width overflow; exactly one H1; no rendered main button below the checked 43px tolerance for a 44px target; no page JavaScript errors |
| Handover and task | Acceptance unlocks dependent task; task completes with visible feedback |
| Flow inventory | Search narrows results and Inspect flow opens the correct detail dialog |
| Preferences | Sample checkbox change requires Save; saved setting remains reflected; person state is separate for studio/client |
| Direct portable-file rendering | Passed without a server or live account |
| Version review | Client approves v2; studio shares v3; v3 requires a new client decision; earlier approval remains in history |
| Overview | Sample decision changes update the matching count |
| Roles | Internal draft and studio scheduling controls excluded from client view; studio cannot approve as the client |
| Service details | Social caption appears in social detail; software uses its own acceptance/evaluation detail |
| Phone navigation | Dialog opens at 320px; Escape closes it |
| Visual review | Desktop light/dark and phone captures inspected for grouping, readable copy, spacing and bounded tables |

An initial browser pass found an action hidden behind the pinned column at 320px. The prototype column rule was corrected and the same check passed. Screenshots wait for the existing arrival animation to settle. No blanket accessibility or contrast certification is claimed; existing dashboard tokens are reused.

The prototype build is the relevant build for this standalone artifact. A new Next.js production build or live release was not required for this proposal. Application source, providers and schema were not changed. Sample actions are memory-only and reset on refresh. The six published service categories are preserved; paid advertising is an additional example, not a new published category.

Run the reusable checks from the repository root:

```powershell
node prototypes/client-workspace/check.cjs
node prototypes/client-workspace/render-components.cjs
node prototypes/client-workspace/build-artifact.cjs
node prototypes/client-workspace/server.mjs
```

In a second terminal, run one browser check at a time:

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=wdc-preview open http://127.0.0.1:3150
npx.cmd --yes --package @playwright/cli playwright-cli -s=wdc-preview run-code --filename=prototypes/client-workspace/verify-browser.js
npx.cmd --yes --package @playwright/cli playwright-cli -s=wdc-preview run-code --filename=prototypes/client-workspace/verify-decisions.js
```

The direct-file check uses this workspace's Windows path. Update that one URL if the repository moves. CSS screenshots can be rebuilt with the browser checks. The shell snapshot is rebuilt by `render-components.cjs`, so it is reproducible rather than an unmaintained picture of the application.
