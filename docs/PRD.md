# WDC product scope

The studio website, admin workspace and client portal form one full-stack application. "We Dig Creativity" means loving creativity. Product language and visual conventions live in the root README and AGENTS.md.

## Public website

Present the studio's work, services, articles and contact options through the established navy hero and shared components. Service definitions live in `frontend/lib/services.ts`; work and editorial modules define their own persisted content. Do not maintain a second list of fabricated metrics or testimonials in documentation.

Contact and onboarding collect validated enquiries and project briefs. Onboarding is excluded from indexing. Public tools explain what their evidence can and cannot establish, with useful fallback results when a lookup is unavailable.

## Authenticated work

The admin manages clients, projects, financial records, forms, editorial content and settings. The client portal exposes the client's own work and relevant actions. Authentication, role rules and server validation govern access; a hidden navigation item is not authorization.

Use real persisted financial and communication state, auditable changes, in-app confirmations and immediate action feedback. Phone navigation uses the sidebar drawer; tables keep their table structure. Empty, filtered, error, loading and unavailable states are distinct.

## Meetings under development

Provide a choice between an enquiry and a scheduled conversation. Booking should have a short understandable flow, timezone clarity and a clear confirmation. Hosts configure availability; clients can manage their booking through authorized links. Changes explain what happened and what to do next. Optional reminders respect recipient preferences.

The Cal.com feature remains a design/setup project. Its sample preview is not live booking functionality. See [current work](status.md) and the retained integration plan for scope and verification requirements.

## Acceptance

Match the existing design system, remain usable at 320px, support both themes and keyboard interaction, and preserve reduced motion and native mobile scrolling. Validate server inputs and permissions. Test the behaviour that changes, then verify the deployed commit and canonical site before reporting a live feature as complete.
