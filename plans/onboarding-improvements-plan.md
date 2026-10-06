# Onboarding improvements: reconciled proposal

Superseded in part by [onboarding-redesign-plan.md](onboarding-redesign-plan.md) (6 October 2026). Read that plan first. Its section 9 lists what changed.

Owner-approved scope; implementation proposal for review. 5 October 2026.

This is the entry point for the two agents’ source audits: [shared flow and account setup](onboarding-flow-improvements-plan.md) and [service-specific experience](onboarding-service-experience-plan.md). Together they specify the change. The current Users and Meetings implementation continues separately.

## Decisions reconciled

- Start with a compact, closed WDC service picker, one selected-service description and a visible Next button. Compact options appear when opened; six large cards do not remain on the initial screen.
- Brand colours allow up to five optional preferences: type a name/code or choose visually. The designed picker has a shade surface, hue slider, palette and keyboard/text alternatives. Roles are optional: primary, secondary, accent, text and neutral/background, explained in everyday words. Preferences are not a finished or approved palette.
- Existing brand-guide clients can add preferences through a collapsed optional section. Preserve their guide and all legacy free-text answers. Do not silently invent hex values or discard historical colours.
- Use Client portal across all six briefs and their three existing form styles. Preserve saved channel selections and map historical labels without rewriting completed submissions.
- Improve the existing questions before adding any. Branding gets small meaningful visual examples for a logo, identity system, guide, packaging and signage. SEO explains customer searches and access tools; Web explains goals/domains/hosting; Apps, Software/AI and Social/PPC receive distinct plain-language guidance. Important scope/cost facts remain visible rather than hidden in tips.
- Help opens by tap/click/keyboard, can close with Escape and stays inside dialogs. It never requires hover, enlarges the whole brief into a gallery or promises a reference design as an included deliverable.
- Fix the native-dialog cursor through correct top-layer ownership or a visible native fallback. Audit sibling dialogs. Reset also must await a successful server response, stop stale autosaves and revoke abandoned resume authority without deleting submitted history.
- After secure client invitation activation and sign-in, offer a short optional photo/appearance setup with Continue and Skip. Existing clients are not forced through it; settings remain editable later. Preserve WDC’s palette and existing theme default.

## Delivery order

1. Show responsive WDC design artifacts: compact landing picker, branding colour rows/picker/help, saved-draft/reset states and optional client profile setup. Review these alongside both source audits.
2. Implement shared brief improvements and service-specific explanations with unchanged answer keys, conditional logic, reversible advice choices and preserved legacy data.
3. Implement secure account-scoped optional profile setup and validated photo uploads. Allocate the next free migration after Users/Meetings; the owner applies production migrations in Settings > System.
4. Validate lint, TypeScript, production build, saved-data round trips, token/reset races, account/upload authorization and responsive interactions at 320/390/640/768/1024/1440px in both themes. Verify the deployed commit separately from a Git push.

## Current boundaries

The plans are source audits and proposals. New onboarding code, production schema and provider settings have not been changed for this work. Source findings include a top-layer cursor conflict and a cookie-only reset that currently ignores failures; neither should be reported as a live fix until reproduced and verified after implementation.

Users and Meetings must reuse the actual shared Pager, BulkBar, PickAll, RowPick, RowMenu, Dialog and form kit. Tables retain their pinned first column and contained scrolling. Completed pieces are committed and pushed to main; active plans remain until delivery is verified.
