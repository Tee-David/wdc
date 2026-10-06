# Marketing audit implementation checklist

Authorized by the owner on 6 October 2026. Source scope: docs/audits/marketing-real-world-review.md and the reconciled onboarding plans. Checked means acceptance evidence exists, not simply that source was edited.

- [ ] Fence overlapping draft saves and confirm reset before clearing answers; test interrupted/failed requests and old resume links.
- [ ] Persist resume-email intent before deferred sending; display saved/queued/failed outcomes truthfully.
- [x] Use plain-language service questions and optional existing help; retain stored option values and older answers. Metadata integrity and all six phone help journeys passed.
- [ ] Use Client portal consistently and map historical channel answers.
- [x] Simplify onboarding service selection with the shared compact picker and explicit Next; browser picker passed. Existing service preselection on enquiry routes is preserved.
- [x] Implement optional maximum-five colour preferences, accessible visual help and legacy-text preservation. Codec checks and eight width/theme interaction cases passed.
- [ ] Verify desktop dialog cursor, touch/keyboard help and bounded menus.
- [x] Route Next/Back/tab/review navigation through one postcommit reset. Next verified at 320/1440px and native touch; all use the same boundary.
- [ ] Implement skippable post-invitation profile personalization separately from initial enquiry.
- [x] Remove the unverified same-working-day promise consistently from Start metadata, page copy and success feedback; no replacement numerical SLA is invented.
- [ ] Run focused checks, production build and responsive journeys at phone/tablet/desktop widths in both themes.
- [ ] Push each verified unit to main and working branch; update delivery ledger and bridge.

## Evidence

Plain-language copy and Client portal compatibility are edited; targeted ESLint completed without diagnostics. Integrated TypeScript passed. Rendered checks are pending. Native-modal cursor fallback uses CSS to restore the browser pointer and hide the body overlay while a modal is open; browser reproduction is pending. Draft/reset/email unit is assigned to the existing marketing agent; compact service selection and colour preferences are assigned to the existing Users agent. No provider messages or live submissions are authorized solely for testing.

Latest source integration: draft/reset/email, compact service picker, five-colour editor and all-six illustrated help are committed. Focused colour/draft checks and integrated TypeScript/lint passed. Responsive suite and optional profile setup are pending.

Browser evidence: 19 distinct focused cases passed (metadata, picker, eight colour width/themes, two Next widths, six service help journeys, native touch). Profile setup and final build remain open.
