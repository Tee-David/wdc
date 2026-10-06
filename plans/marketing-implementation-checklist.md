# Marketing audit implementation checklist

Authorized by the owner on 6 October 2026. Source scope: docs/audits/marketing-real-world-review.md and the reconciled onboarding plans. Checked means acceptance evidence exists, not simply that source was edited.

- [ ] Fence overlapping draft saves and confirm reset before clearing answers; test interrupted/failed requests and old resume links.
- [ ] Persist resume-email intent before deferred sending; display saved/queued/failed outcomes truthfully.
- [ ] Use plain-language service questions and optional existing help; retain stored option values and older answers.
- [ ] Use Client portal consistently and map historical channel answers.
- [ ] Simplify onboarding service selection and retain preselection between enquiry paths.
- [ ] Implement optional maximum-five colour preferences, accessible visual help and legacy-text preservation.
- [ ] Verify desktop dialog cursor, touch/keyboard help and bounded menus.
- [ ] Implement skippable post-invitation profile personalization separately from initial enquiry.
- [ ] Verify public response-time wording against a confirmed operational commitment; do not invent an SLA.
- [ ] Run focused checks, production build and responsive journeys at phone/tablet/desktop widths in both themes.
- [ ] Push each verified unit to main and working branch; update delivery ledger and bridge.

## Evidence

Plain-language copy and Client portal compatibility are edited; targeted ESLint completed without diagnostics. Integrated TypeScript is still running; rendered checks are pending. Native-modal cursor fallback uses CSS to restore the browser pointer and hide the body overlay while a modal is open; browser reproduction is pending. Draft/reset/email unit is assigned to the existing marketing agent; compact service selection and colour preferences are assigned to the existing Users agent. No provider messages or live submissions are authorized solely for testing.
