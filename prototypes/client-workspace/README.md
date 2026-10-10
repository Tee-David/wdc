# Client work and communications — dashboard design preview

Open [the portable interactive artifact](artifact.html). It works without a server or an internet connection. Alternatively run `node prototypes/client-workspace/server.mjs` from the repository and open http://127.0.0.1:3150.

This is a detailed design proposal using fictional Paper & Pine records. It does not send emails, upload files, charge money, book meetings, publish posts or connect to client accounts. Refreshing resets the sample decisions. It is separate from the live application.

## How it follows our design system

The renderer uses the actual `AdminShell`, `ClientShell`, `Panel` and `DemoNote` components from the frontend. It uses the existing WDC logo, Lucide icons, `admin.css`, dashboard tone tokens and local fonts. We have not introduced another dashboard brand or a UI package.

The current runtime uses Space Grotesk for headings and body text. README's Design system section explicitly asks previews to match that runtime, while retaining Outfit as the intended body direction. This artifact follows that recorded rule.

Primary administrative controls follow the existing light navy/white and dark orange/white system. Status badges have solid fills. Tables remain tables: the first column stays visible and the rest scrolls within the table. Phone navigation uses the sidebar in a dialog. Focus outlines, large controls and reduced-motion support are retained. The Studio / Client portal switch and the service-example buttons are review tools in this artifact; they are not a proposal to add seven primary navigation pages.

## The top controls

**Studio / Client portal** changes whose responsibilities you are inspecting. This is a fictional role switch, not real account access. A client cannot see internal drafts or team handovers. Production must enforce that separation on the server.

**Theme** switches between the light and dark dashboard. **Explain this screen** opens a plain-language guide for the page you are viewing. Closing a dialog returns to the same page.

The existing sidebar remains the frame. The new sections sit within the existing workspace rather than replacing the whole navigation. Billing, blog and account administration are outside this design's interactive scope; this artifact is not a replacement for those live pages.

## Overview: what needs attention

The first card shows work waiting for a decision. The second shows content or access needed from the client. The studio's third card shows a team handover; the client's shows a meeting.

Each card opens the relevant record. It answers three questions: what is waiting, who needs to act, and what they should do next. Counts are fictional examples, not a read of the live database.

The projects table shows all service examples for one fictional client. A real client should see only their own projects, while keeping one client record and one portal. Opening a row takes you to that project's service-specific work.

## Inbox: the right message to the right person

**Needs me** contains decisions, replies and assignments that require action. **All activity** retains the history. **Summaries** groups routine progress so that small updates do not all become separate emails.

Select a message to read the reason, deadline and next action. Mark read removes it from the action filter; it does not approve any work. The email should link to the matching portal record.

The studio receives internal handovers and client feedback. The client receives review requests, requests for content or access, and deliberately shared updates. Internal notes do not appear in their inbox.

Email preferences belong to the person. Change a sample preference, then use Save preferences or Discard changes. In-app history remains available even when someone switches off optional email. Account security notices are a separate category.

## Team and handovers: stop work losing its context

The example passes approved branding work to the website team. It includes the files, decision already made, unresolved risk and next task. The receiving lead accepts the handover before the dependent task becomes ready.

Assign to Jo demonstrates named ownership. Complete sample task demonstrates a recorded result. The proposed notifications go to the receiving lead, outgoing lead or dependent task owner, according to the event; they should not all go to one general studio mailbox.

Internal note and Client update are separate choices. An internal note stays with the assigned team. Publishing a client update deliberately shares a suitable summary. It must never copy private discussion into a client email by accident.

## Communication coverage: all important events

The searchable table contains 146 audit and service-flow entries. Search for a service or words such as approval, invoice, department, deadline, report or renewal. Filter by:

- **Exists:** a source path was found in the current code. This is not proof of inbox delivery.
- **Partial:** some of the flow exists, but the recipients, record or follow-up need work.
- **Proposed:** the workflow is missing and needs implementation.

Inspect flow explains the trigger, intended recipient, reason to notify and current gap. The fuller evidence and research links are in [the source audit](../../docs/audits/client-communications-and-service-portals.md).

The inventory covers enquiry and onboarding; invites and account access; kickoff and project stage changes; department, lead and task assignments; dates, scope, blockers and health; client updates and comments; deliverable versions, approval, review notes and reminders; cross-team handovers; billing and payment exceptions; meetings; support; publication, launch and release exceptions; final handover; service periods, reports, renewal and closure. It also lists service-specific events.

Not every event needs an immediate email. Decisions, important replies and exceptions usually do. Routine progress can be a summary. Every message needs the correct recipient, visibility, preference, next action, event identity and retry record. A reminder must stop when the decision has been made or the deadline changes.

The provider accepting a message is different from that message reaching an inbox. A future delivery screen should show pending, provider accepted, failed or uncertain truthfully. It should not invent Delivered or Read without evidence.

## The four sections inside a project

**Overview** shows the next step, responsible people, the plan and recent decisions. The client approver and billing contact can be different people.

**Work** changes with the service. It contains the actual items to produce, review, test or report, instead of forcing everything into one generic attachment list.

**Review** records a decision against an exact version. Read the work, approve it or request changes. Notes include enough location and context to act on. The studio can mark a note addressed; the client can reopen it. Earlier versions and their decisions remain in history. Sharing version 3 requires a new approval even if version 2 was approved.

**Handover** shows final files, the guide or training, account ownership, open items and support terms. Acknowledge receipt confirms the package was received; it does not approve unresolved work. Request continuation asks for a new term and price; it does not automatically renew or charge the client.

The additional scope example records the proposed cost and date change separately. Accepting an extra collection is a different decision from approving a design or paying an invoice.

## Social media management

The content calendar has one row per post. It carries the platform, planned time, version and publication state. The studio sees drafts; clients see deliberately shared work.

Open a post to inspect its visual and caption. Approve the exact version or leave a note. The studio handles scheduling, publishing and provider failures. A published record needs the actual publication time and live-post evidence. A failed post must stay failed until the provider confirms a successful retry.

Important messages include calendar ready, post ready for approval, changes requested, revision ready, approaching review deadline, planned time changed, account connection failed, publication failed and period report ready. Published posts can be grouped into a summary.

## Branding and design

The client first chooses a creative direction. That choice does not approve the final artwork. Review rounds then carry the exact artwork version, location of notes and recorded decision.

The final package lists usable exports, editable source where agreed and the usage guide. Print and production approval are separate when relevant.

Important messages include direction ready, choice needed, review round ready, feedback replied to, final artwork approved, print approval needed and final files ready.

## Websites and ecommerce

Client inputs and account access have a named owner and deadline. Access requests should use the approved access method, not ask someone to paste a password into an email or comment.

The staging site is tested against agreed checks. A bug record needs the page, browser, steps, expected result and actual result. Launch permission follows testing and is an explicit separate decision. Ownership, backups, training and support belong in handover.

Important messages include content needed, staging ready, test issue raised, issue fixed for retest, launch permission requested, launch completed, handover ready and maintenance or renewal due.

## Mobile apps

Test builds carry their version, build number and installation instructions. Feedback needs the device, operating system, screen and steps. Earlier builds remain available as history.

Store materials need approval. Store submission, store approval and public release are different states. The studio records store outcomes; the client reviews shared builds and materials.

Important messages include build ready, testing requested, feedback replied to, store materials ready, submission made, store rejection needs action, store approval and actual release.

## Custom software and AI

Milestones have agreed acceptance checks. Test evidence shows whether those checks passed. New features are handled as scope changes. Production release needs training, operating instructions, backup and rollback information.

AI work also needs an evaluation set, permitted data, known limitations, running-cost limits and a named human for escalation. A test result is not a guarantee that every future answer will be correct.

Important messages include milestone ready, acceptance needed, test failure, correction ready, integration access needed, scope decision needed, release permission, operational incident and cost-limit warning.

## SEO and AI visibility

The workspace contains the content plan, technical work, implementation owner and period report. An article may need client approval; a technical task may only need the responsible team's action.

Report figures keep their source and date range. Search clicks, impressions, enquiries and sampled AI mentions remain separate. They must not become one invented success score or a ranking promise. All numbers in this preview are fictional.

Important messages include access needed, audit or plan ready, content approval, technical permission needed, indexing issue, report ready and next-period priorities.

## Paid advertising

This is an additional campaign example, not a change to the site's six published service categories. Creative approval and spending approval are separate. An increased limit needs a fresh decision.

Platform review, launch permission, actual campaign delivery, connection failures and reports need their own records. WDC does not hold the client's provider money in this proposed flow.

Important messages include creative ready, budget approval needed, platform rejection, launch permission, campaign launched, connection or spend warning and period report ready.

## What needs implementation first

1. Keep drafts private until deliberately shared; add correct project-scoped recipients and client roles.
2. Save real events and pending messages before background sending; make deduplication and retries safe.
3. Persist review deadlines, exact-version decisions, notes and history.
4. Add assignment, update, blocker, review follow-up and handover notices.
5. Add the social calendar and shared requests, scope changes and handover records.
6. Build the remaining service views and recurring period/report/renewal flows.

This artifact does not implement those production changes. It makes the intended experience concrete so that its workflows can be reviewed before building them.

## Rebuild and check

From the repository root:

```powershell
node prototypes/client-workspace/render-components.cjs
node prototypes/client-workspace/build-artifact.cjs
node prototypes/client-workspace/server.mjs
```

The renderer has explicit inert account and routing adapters and never loads `.env`. The static server serves an allowlist and disallows outbound browser connections. `verify-browser.js` is a Playwright CLI check snippet, not an application test suite. Run one browser check at a time:

```powershell
npx.cmd --yes --package @playwright/cli playwright-cli -s=wdc-preview open http://127.0.0.1:3150
npx.cmd --yes --package @playwright/cli playwright-cli -s=wdc-preview run-code --filename=prototypes/client-workspace/verify-browser.js
```

See `VERIFICATION.md` for measured checks and limitations.
