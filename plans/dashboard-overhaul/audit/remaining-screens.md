# Screens left to design or rebuild (running list, 2026-10-25)

Resume here: wait for Agent B client-portal findings, then fold them in below. Owner side is complete.

Sources: agentA-findings.md (35 owner routes, done), agentB-findings.md + out/agentB.jsonl (Forms, Email, Blog, all Settings done; client portal pending), hand checks in this session.

## Owner pages still on the OLD layout (need the new design live)
- All 10 project pages (/admin/projects/[id]). One shared markup; same empty "Service work" panel for every service.
- Client detail (/admin/clients/[id])
- Money detail (/admin/money/[id]) and New invoice (/admin/money/new)
- Messages (/admin/messages)
- Welcome (/admin/welcome), Departments (/admin/users/departments)
- Forms: All entries (/admin/forms/all), New form (/admin/forms/new), a demo brief (/admin/forms/s1)

## HYBRID (part new, part old)
- Clients list, Support list, Projects list, Money, Reconciliation, Meetings, Notifications, Users
- Forms: Contact form, Web onboarding entries

## Not designed at all (gaps in the system, not just the layout)
- Per-service project pages: Branding, Social, SEO, Websites, Apps, Custom software. Each needs its own stages, deliverables, approvals, comments and iterations. Today only the tab label differs.
- Retainers for any service: systems covered, included work per period, costs passed on, monthly report, recurring draft invoice on Today, receipts and accounting log.
- Notifications and approvals per service (social: batch approval, late reminder, published, monthly report; silent clients get reminders then a Today card).
- Staff assignment: several equal owners per project, Admin and department leads assign, move and hand over; staff daily email.
- Team chat inside Messages, and the Settings tabs still on old panels.
- App case study (public): canvas https://claude.ai/artifact/6ms2WAytQWxpKHQoRwkG7f awaiting approval.

## Fixed already today
- Notice Dismiss hides at once; print drops the sidebar; 44px row checkboxes; service filter is a searchable picker.

## Agent false positives (checked by hand, nothing to do)
- Log a call, New project, Snooze, Attach to a client, Apply, Open onboarding, "buttons with no text" (hidden menu links).
