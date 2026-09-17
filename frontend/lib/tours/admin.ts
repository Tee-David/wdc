import type { Tour } from "./types";

/**
 * The admin's own tours: one full walkthrough that follows the real daily
 * workflow across pages, and a short page-only tour for each of the six
 * routes in the sidebar.
 *
 * NO CLIENT REGISTRY SITS BESIDE THIS ONE YET. Section 5.1 also asks for a
 * client full walkthrough -- required actions, deliverables/approvals,
 * invoices/payments, forms/files, messages/support -- and every one of
 * those is a screen in the client portal section 4.7 has not built. A tour
 * of a page that does not exist is not a tour, it is a lie with steps, so
 * this file stays admin-only until there is a portal to walk through.
 *
 * TARGETS ARE `data-tour` ATTRIBUTES, EVERY ONE OF THEM, wired at the
 * component that renders the real control rather than guessed from a class
 * name: `components/admin/shell.tsx` (the sidebar links and the search
 * button), `components/admin/dialog.tsx`'s `DialogButton` (threaded through
 * `AddClient`/`AddProject`/`InvoiceBuilder` as an optional `dataTour` prop),
 * and the six page files directly for the table/filter/tile regions a
 * dialog button does not cover. None of them are generated classes or DOM
 * positions, so a redesign that keeps the same control keeps the same tour.
 */

const WELCOME: Omit<Tour["steps"][number], "id"> = {
  target: "body",
  placement: "center",
  href: "/admin",
  title: "A quick tour of the admin",
  content:
    "Twelve more stops through the real daily workflow: what needs a decision this morning, where everything lives, and how to get to any of it fast. Skip any time -- nothing here is required.",
};

export const ADMIN_FULL_TOUR: Tour = {
  id: "admin-full",
  version: 1,
  title: "The full admin walkthrough",
  steps: [
    { id: "welcome", ...WELCOME },
    {
      id: "attention",
      target: '[data-tour="dash-attention"]',
      href: "/admin",
      title: "Start here every morning",
      content:
        "Overdue invoices, projects asking for something, and onboarding nobody finished -- worst first. An empty queue here means there is genuinely nothing waiting on you.",
    },
    {
      id: "quick-actions",
      target: '[data-tour="dash-quick-actions"]',
      href: "/admin",
      title: "The four things you do most",
      content: "A new client, a new invoice, an expense, or reviewing what came in through onboarding -- without leaving the dashboard.",
    },
    {
      id: "nav",
      target: '[data-tour="nav-clients"]',
      href: "/admin",
      title: "Everything else, one click away",
      content: "Clients, Projects, Money, Forms and Settings live in this sidebar on every page. It collapses on a phone; look for the menu icon.",
    },
    {
      id: "clients-add",
      target: '[data-tour="clients-add"]',
      href: "/admin/clients",
      title: "Adding a client",
      content: "One form, and they appear grouped under every service they buy -- a branding-and-web client shows up in both places, because that is the truth of what they are worth.",
    },
    {
      id: "clients-filters",
      target: '[data-tour="clients-filters"]',
      href: "/admin/clients",
      title: "Finding anyone fast",
      content: "Search, filter by service or status, and sort any column. The address bar keeps the filter, so a link to a filtered list is a real, shareable link.",
    },
    {
      id: "projects-add",
      target: '[data-tour="projects-add"]',
      href: "/admin/projects",
      title: "Opening a project",
      content: "Every project belongs to a client and carries a stage, a due date, and a health that is derived rather than typed -- it goes stale the moment something slips.",
    },
    {
      id: "projects-switch",
      target: '[data-tour="projects-switch"]',
      href: "/admin/projects",
      title: "List or board",
      content: "The same projects, sorted or grouped by stage. Whichever you leave it on is what loads next time.",
    },
    {
      id: "money-tiles",
      target: '[data-tour="money-tiles"]',
      href: "/admin/money",
      title: "What is owed, right now",
      content: "Collected, outstanding, and overdue, all recomputed from the actual invoices and payments -- never a figure typed in and left to drift.",
    },
    {
      id: "money-add",
      target: '[data-tour="money-add"]',
      href: "/admin/money",
      title: "Raising an invoice",
      content: "Add the lines, issue it, and the client gets a token-addressed public copy with a pay link. A draft can still be edited; an issued invoice cannot, because somebody outside the studio is holding it.",
    },
    {
      id: "forms",
      target: '[data-tour="forms-table"]',
      href: "/admin/forms",
      title: "What clients have told you",
      content: "Every onboarding submission, what is still blank, and one press to turn a new lead into a client without losing their original answers.",
    },
    {
      id: "settings",
      target: '[data-tour="settings-table"]',
      href: "/admin/settings",
      title: "Editing what the public site says",
      content: "An override by field, never a raw replacement -- the worst a bad edit can do is change one value, and putting it back deletes the row rather than guessing at what shipped.",
    },
    {
      id: "search",
      target: '[data-tour="topbar-search"]',
      href: "/admin/settings",
      title: "Search or Ctrl+K, from anywhere",
      content: "Jump straight to any page without touching the sidebar. That is the whole tour -- replay it, or take a shorter one for just the page you are on, from the account menu any time.",
    },
  ],
};

/** One short tour per route in the sidebar, keyed by pathname. Each reuses
 *  the exact targets the full walkthrough does -- see the note at the top
 *  of this file -- so there is one place that can go stale, not two. */
export const ADMIN_PAGE_TOURS: Record<string, Tour> = {
  "/admin": {
    id: "admin-page-dashboard",
    version: 1,
    title: "This page: the dashboard",
    steps: [
      { id: "intro", target: "body", placement: "center", title: "The dashboard", content: "What needs a decision, a reply, or a payment follow-up, at a glance." },
      { id: "attention", target: '[data-tour="dash-attention"]', title: "Attention needed", content: "Overdue invoices, projects asking for something, and unfinished onboarding, worst first." },
      { id: "quick-actions", target: '[data-tour="dash-quick-actions"]', title: "Quick actions", content: "A new client, invoice, or expense, without leaving this page." },
      { id: "search", target: '[data-tour="topbar-search"]', title: "Search anything", content: "Ctrl+K from anywhere in the admin." },
    ],
  },
  "/admin/clients": {
    id: "admin-page-clients",
    version: 1,
    title: "This page: Clients",
    steps: [
      { id: "intro", target: "body", placement: "center", title: "Clients", content: "Grouped by what they buy, with the flat list of everyone underneath." },
      { id: "add", target: '[data-tour="clients-add"]', title: "Add a client", content: "One form; they can be attached to a project or invoice straight after." },
      { id: "filters", target: '[data-tour="clients-filters"]', title: "Search and filter", content: "By name, service, or status -- the URL keeps the filter, so it is a real link you can send." },
    ],
  },
  "/admin/projects": {
    id: "admin-page-projects",
    version: 1,
    title: "This page: Projects",
    steps: [
      { id: "intro", target: "body", placement: "center", title: "Projects", content: "Every live and delivered project, with a health that is derived rather than typed." },
      { id: "add", target: '[data-tour="projects-add"]', title: "Open a project", content: "Pick the client, the service, and a starting stage." },
      { id: "switch", target: '[data-tour="projects-switch"]', title: "List or board", content: "Sorted or grouped by stage -- whichever you leave it on loads next time." },
    ],
  },
  "/admin/money": {
    id: "admin-page-money",
    version: 1,
    title: "This page: Money",
    steps: [
      { id: "intro", target: "body", placement: "center", title: "Money", content: "In, out, and what is still owed -- every figure recomputed from the underlying invoices and payments." },
      { id: "tiles", target: '[data-tour="money-tiles"]', title: "The real-time totals", content: "Collected, outstanding, and overdue. Reconciliation for anything the bank and the books disagree on is one link away." },
      { id: "add", target: '[data-tour="money-add"]', title: "Raise an invoice", content: "Or an estimate first, if the work has not been agreed yet -- the button beside it." },
    ],
  },
  "/admin/forms": {
    id: "admin-page-forms",
    version: 1,
    title: "This page: Forms",
    steps: [
      { id: "intro", target: "body", placement: "center", title: "Forms", content: "Every onboarding submission, sent or still in progress, plus every question the live form actually asks." },
      { id: "table", target: '[data-tour="forms-table"]', title: "Submissions", content: "Open one to see exactly what was answered and what was left blank -- a gap is something to ask about on the call." },
    ],
  },
  "/admin/settings": {
    id: "admin-page-settings",
    version: 1,
    title: "This page: Settings",
    steps: [
      { id: "intro", target: "body", placement: "center", title: "Settings", content: "Content on the public site, and how the agency runs." },
      { id: "table", target: '[data-tour="settings-table"]', title: "Editable content", content: "An override by field. The worst an edit can do is change one value; putting it back deletes the row." },
    ],
  },
};

export function adminPageTourFor(pathname: string): Tour | null {
  return ADMIN_PAGE_TOURS[pathname] ?? null;
}
