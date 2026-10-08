import type { TourDef } from "./types";

/**
 * The admin's own tours, three tiers deep:
 *
 * - `admin-welcome`: the map, not the manual. Nav groups and the controls
 *   around them, nothing page-specific. Offered once, automatically, on a
 *   first sign-in; short enough that skipping it costs nothing.
 * - `admin-walkthrough`: the full, cross-page tour of what is actually on
 *   every screen -- the one a returning admin reaches for from the launcher
 *   when they want the whole workflow, not just the map.
 * - one page tour per route in the sidebar, for "what does THIS page do"
 *   without sitting through either of the above.
 *
 * THE CLIENT PORTAL HAS ITS OWN REGISTRY, `lib/tours/client.ts`, run by the
 * same provider with `audience="client"`. Nothing here is shown to a client.
 *
 * TARGETS ARE `data-tour` ATTRIBUTES, EVERY ONE OF THEM, wired at the
 * component that renders the real control rather than guessed from a class
 * name: `components/admin/shell.tsx` (the sidebar links, the pin toggle,
 * the mobile menu button, the search button), `components/admin/bits.tsx`'s
 * `Panel` (threaded through `dashboard-view.tsx` as an optional `dataTour`
 * prop), `components/admin/dialog.tsx`'s `DialogButton` (threaded through
 * `AddClient`/`AddProject`/`InvoiceBuilder`), and the six page files
 * directly for the table/filter/switch regions neither of those cover.
 * None of them are generated classes or DOM positions, so a redesign that
 * keeps the same control keeps the same tour.
 */

const closer = (id: string, title: string, content: string): TourDef["steps"][number] => ({
  id, target: "body", placement: "center", icon: "check", content, title,
});

export const ADMIN_WELCOME: TourDef = {
  id: "admin-welcome",
  version: 3,
  kind: "welcome",
  title: "Welcome to the admin",
  steps: [
    {
      id: "welcome",
      target: "body",
      placement: "center",
      href: "/admin",
      icon: "compass",
      showEstimate: true,
      title: "Welcome to the WDC admin",
      content:
        "A quick lap of the navigation before anything else: where the seven sections live, and the handful of controls around them. The full workflow tour is one click away whenever you want it.",
    },
    { id: "nav-dashboard", target: '[data-tour="nav-dashboard"]', href: "/admin", icon: "layout", title: "Dashboard", content: "What needs a decision this morning, at a glance. The section everything else feeds." },
    { id: "nav-clients", target: '[data-tour="nav-clients"]', href: "/admin", icon: "users", interact: { hint: "Click Clients to move on" }, title: "Clients", content: "Everyone you work for, grouped by what they buy." },
    { id: "nav-projects", target: '[data-tour="nav-projects"]', href: "/admin/clients", icon: "folder", interact: { hint: "Click Projects to move on" }, title: "Projects", content: "Every live and delivered engagement, with a stage and a health." },
    { id: "nav-money", roles: ["owner"], target: '[data-tour="nav-money"]', href: "/admin/projects", icon: "wallet", interact: { hint: "Click Money to move on" }, title: "Money", content: "Invoices, payments, and expenses: what is owed, right now." },
    { id: "nav-forms", target: '[data-tour="nav-forms"]', href: "/admin/money", icon: "inbox", interact: { hint: "Click Forms to move on" }, title: "Forms", content: "Everything people send through the site: briefs, enquiries, sign-ups, and the forms you build." },
    { id: "nav-blog", target: '[data-tour="nav-blog"]', href: "/admin/forms", icon: "book", interact: { hint: "Click Blog to move on" }, title: "Blog", content: "Write, review and schedule posts. A live post you change says Update, not Save." },
    { id: "nav-users", roles: ["owner"], target: '[data-tour="nav-users"]', href: "/admin/blog", icon: "users", title: "Users", content: "The studio team, client accounts and invitations. Who can sign in, and from how many devices." },
    { id: "nav-settings", target: '[data-tour="nav-settings"]', href: "/admin/blog", icon: "settings", interact: { hint: "Click Settings to move on" }, title: "Settings", content: "How the studio, the site and the admin run, with the media library and your own account." },
    { id: "sidebar-pin", target: '[data-tour="sidebar-pin"]', href: "/admin/settings", icon: "panelLeft", desktopOnly: true, optional: true, title: "Collapse the sidebar", content: "Icons only, more room for the page. It remembers your choice next time." },
    { id: "mobile-menu", target: '[data-tour="mobile-menu"]', href: "/admin/settings", icon: "panelLeft", mobileOnly: true, optional: true, title: "The sections, on a phone", content: "This button opens the sidebar: every section, the theme switch and sign out. Tap a section and it closes." },
    { id: "search", target: '[data-tour="topbar-search"]', href: "/admin/settings", icon: "search", title: "Search or Ctrl+K", content: "Jump straight to any page from anywhere, without touching the sidebar." },
    closer("done", "That's the map", "Take the full workflow walkthrough any time from the ? button beside search, or replay this one. Nothing here is required."),
  ],
};

export const ADMIN_WALKTHROUGH: TourDef = {
  id: "admin-walkthrough",
  version: 4,
  kind: "walkthrough",
  title: "The full admin walkthrough",
  steps: [
    {
      id: "welcome",
      target: "body",
      placement: "center",
      href: "/admin",
      icon: "compass",
      showEstimate: true,
      page: "Dashboard",
      title: "The full workflow, start to finish",
      content:
        "Every section, in the order a real morning actually uses them: what needs a decision, then clients, projects, money, forms, the blog, and settings. Skip any time. Nothing here is required.",
    },
    { id: "dash-kpis", target: '[data-tour="dash-kpis"]', href: "/admin", icon: "gauge", title: "The four numbers that matter", content: "Collected, outstanding, cash position, and live projects: every one recomputed from the underlying records, never typed in and left to drift." },
    { id: "dash-attention", target: '[data-tour="dash-attention"]', href: "/admin", icon: "flag", title: "Start here every morning", content: "Overdue invoices, projects asking for something, and onboarding nobody finished, worst first. An empty queue here means there is genuinely nothing waiting on you." },
    { id: "dash-cashflow", roles: ["owner"], target: '[data-tour="dash-cashflow"]', href: "/admin", icon: "barChart", title: "Cashflow, at a glance", content: "Six months of collected income against recorded spend, so a bad month is visible before it becomes a bad quarter." },
    { id: "dash-pipeline", target: '[data-tour="dash-pipeline"]', href: "/admin", icon: "folder", title: "Where every project sits", content: "One count per stage. Click any of them to jump straight to that slice of the board." },
    { id: "dash-payments", roles: ["owner"], target: '[data-tour="dash-payments"]', href: "/admin", icon: "receipt", title: "The last few payments in", content: "Who paid, how much, and by what method: a running check against what Money says is owed." },
    { id: "dash-deadlines", target: '[data-tour="dash-deadlines"]', href: "/admin", icon: "calendar", title: "What's due soonest", content: "Every live project with a date, nearest first, so nothing slips because it fell off the bottom of a list." },
    { id: "dash-quick-actions", target: '[data-tour="dash-quick-actions"]', href: "/admin", icon: "plus", title: "The four things you do most", content: "A new client, a new invoice, an expense, or reviewing what came in through onboarding, without leaving the dashboard." },

    { id: "nav-clients", target: '[data-tour="nav-clients"]', href: "/admin", icon: "users", interact: { hint: "Click Clients to see the list" }, page: "Clients", title: "On to Clients", content: "Everyone you work for, grouped by what they buy: a branding-and-web client shows up in both places, because that is the truth of what they are worth." },
    { id: "clients-add", target: '[data-tour="clients-add"]', href: "/admin/clients", icon: "plus", title: "Adding a client", content: "One form, and they can be attached to a project or invoice straight after." },
    { id: "clients-filters", target: '[data-tour="clients-filters"]', href: "/admin/clients", icon: "filter", title: "Finding anyone fast", content: "Search, filter by service or status, and sort any column. The address bar keeps the filter, so a link to a filtered list is a real, shareable link." },

    { id: "nav-projects", target: '[data-tour="nav-projects"]', href: "/admin/clients", icon: "folder", interact: { hint: "Click Projects to see the board" }, page: "Projects", title: "On to Projects", content: "Every project belongs to a client and carries a stage, a due date, and a health that is derived rather than typed, and it goes stale the moment something slips." },
    { id: "projects-add", target: '[data-tour="projects-add"]', href: "/admin/projects", icon: "plus", title: "Opening a project", content: "Pick the client, the service, and a starting stage." },
    { id: "projects-switch", target: '[data-tour="projects-switch"]', href: "/admin/projects", icon: "layout", interact: { hint: "Try switching the view" }, title: "List or board", content: "The same projects, sorted or grouped by stage. Whichever you leave it on is what loads next time." },

    { id: "nav-money", roles: ["owner"], target: '[data-tour="nav-money"]', href: "/admin/projects", icon: "wallet", interact: { hint: "Click Money to see the totals" }, page: "Money", title: "On to Money", content: "What is owed, right now: collected, outstanding, and overdue, all recomputed from the actual invoices and payments." },
    { id: "money-tiles", roles: ["owner"], target: '[data-tour="money-tiles"]', href: "/admin/money", icon: "calculator", title: "The real-time totals", content: "Reconciliation for anything the bank and the books disagree on is one link away." },
    { id: "money-add", roles: ["owner"], target: '[data-tour="money-add"]', href: "/admin/money", icon: "receipt", title: "Raising an invoice", content: "Add the lines, issue it, and the client gets a token-addressed public copy with a pay link. A draft can still be edited; an issued invoice cannot, because somebody outside the studio is holding it." },
    { id: "money-reports", roles: ["owner"], target: '[data-tour="reports-tiles"]', href: "/admin/reports", page: "Reports", icon: "barChart", title: "Reports", content: "Any stretch of days against the one before it: invoiced, collected, spent and net, with a month-by-month table and a CSV." },

    { id: "nav-forms", target: '[data-tour="nav-forms"]', href: "/admin/money", icon: "inbox", interact: { hint: "Click Forms to see them" }, page: "Forms", title: "On to Forms", content: "Everything people send through the site: onboarding briefs, enquiries, newsletter sign-ups, and any form you build." },
    { id: "forms-table", target: '[data-tour="forms-table"]', href: "/admin/forms", icon: "clipboard", title: "Every form, with what is new", content: "Each row is one form with its unread count. Open one for its entries, its questions and its emails." },
    { id: "forms-entries", target: '[data-tour="forms-entries"]', href: "/admin/forms/contact", icon: "inbox", title: "One form's entries", content: "An inbox: star, mark read, move to spam or the Trash, and export. Open an entry to read it in full, see what they uploaded, and download it as a PDF." },

    { id: "nav-blog", target: '[data-tour="nav-blog"]', href: "/admin/forms/contact", icon: "book", interact: { hint: "Click Blog to see the posts" }, page: "Blog", title: "On to the Blog", content: "Posts are written weekly, so the blog has its own section rather than a corner of Settings." },
    { id: "blog-new", target: '[data-tour="blog-new"]', href: "/admin/blog", optional: true, icon: "plus", title: "Writing a post", content: "Drafts are yours until you send them for review or publish. Saving a live post says Update, and a toast confirms it." },
    { id: "blog-filters", target: '[data-tour="blog-filters"]', href: "/admin/blog", optional: true, icon: "filter", title: "Finding a post", content: "Search, filter by state or service, or pick dates. Drafts moved to the Trash wait there before they go." },

    { id: "users-table", roles: ["owner"], target: '[data-tour="users-table"]', href: "/admin/users", page: "Users", icon: "users", title: "People and access", content: "Team, client accounts and invitations. A row's ⋮ menu renames, deactivates or signs someone out." },

    { id: "nav-settings", target: '[data-tour="nav-settings"]', href: "/admin/blog", icon: "settings", interact: { hint: "Click Settings to see every section" }, page: "Settings", title: "On to Settings", content: "How the studio, the site and the admin run." },
    { id: "settings-sections", target: '[data-tour="settings-sections"]', href: "/admin/settings", icon: "shieldCheck", title: "Every setting, in one column", content: "Each panel is a group of sections with its current state beside it. Search finds a setting by name. Changes go through the bar that appears at the bottom, and a toast says when they are saved." },
    { id: "media-upload", target: '[data-tour="media-upload"]', href: "/admin/settings/media", page: "Media", icon: "fileStack", title: "The media library", content: "Pictures, videos and files for the site and the blog. Upload here, or drop files on the page or on a folder." },
    { id: "media-tabs", target: '[data-tour="media-tabs"]', href: "/admin/settings/media", optional: true, icon: "filter", title: "Kinds, and the Trash", content: "Deleting is two steps: Move to Trash, which can be undone, then Delete permanently from the Trash, which asks you to confirm twice." },

    { id: "search", target: '[data-tour="topbar-search"]', href: "/admin/settings/media", icon: "search", title: "Search or Ctrl+K, from anywhere", content: "Jump straight to any page without touching the sidebar." },
    closer("done", "That's everything", "Replay this any time from the ? button beside search, or take a shorter tour for just the page you're on."),
  ],
};

/** One short tour per route in the sidebar, keyed by pathname. Each reuses
 *  the exact targets the walkthrough does -- see the note at the top of
 *  this file -- so there is one place that can go stale, not two. */
export const ADMIN_PAGE_TOURS: Record<string, TourDef> = {
  "/admin": {
    id: "admin-page-dashboard",
    version: 2,
    kind: "page",
    title: "This page: the dashboard",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "compass", showEstimate: true, title: "The dashboard", content: "What needs a decision, a reply, or a payment follow-up, at a glance." },
      { id: "kpis", target: '[data-tour="dash-kpis"]', icon: "gauge", title: "The four numbers", content: "Collected, outstanding, cash position, and live projects." },
      { id: "attention", target: '[data-tour="dash-attention"]', icon: "flag", title: "Attention needed", content: "Overdue invoices, projects asking for something, and unfinished onboarding, worst first." },
      { id: "cashflow", target: '[data-tour="dash-cashflow"]', icon: "barChart", title: "Cashflow", content: "Six months of collected income against recorded spend." },
      { id: "pipeline", target: '[data-tour="dash-pipeline"]', icon: "folder", title: "Project pipeline", content: "One count per stage. Click any of them to jump to that slice of the board." },
      { id: "quick-actions", target: '[data-tour="dash-quick-actions"]', icon: "plus", title: "Quick actions", content: "A new client, invoice, or expense, without leaving this page." },
      { id: "search", target: '[data-tour="topbar-search"]', icon: "search", title: "Search anything", content: "Ctrl+K from anywhere in the admin." },
    ],
  },
  "/admin/clients": {
    id: "admin-page-clients",
    version: 2,
    kind: "page",
    title: "This page: Clients",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "users", showEstimate: true, title: "Clients", content: "Grouped by what they buy, with the flat list of everyone underneath." },
      { id: "add", target: '[data-tour="clients-add"]', icon: "plus", title: "Add a client", content: "One form; they can be attached to a project or invoice straight after." },
      { id: "filters", target: '[data-tour="clients-filters"]', icon: "filter", title: "Search and filter", content: "By name, service, or status. The URL keeps the filter, so it is a real link you can send." },
      { id: "row-menu", target: '[data-tour="row-menu"]', optional: true, icon: "settings", interact: { hint: "Open a row's ⋮ menu" }, title: "The ⋮ menu on a row", content: "Everything you can do to that client without opening them: edit, add a project or invoice, invite them to the portal, archive. Dangerous ones ask you to confirm." },
    ],
  },
  "/admin/projects": {
    id: "admin-page-projects",
    version: 2,
    kind: "page",
    title: "This page: Projects",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "folder", showEstimate: true, title: "Projects", content: "Every live and delivered project, with a health that is derived rather than typed." },
      { id: "add", target: '[data-tour="projects-add"]', icon: "plus", title: "Open a project", content: "Pick the client, the service, and a starting stage." },
      { id: "switch", target: '[data-tour="projects-switch"]', icon: "layout", interact: { hint: "Try switching the view" }, title: "List or board", content: "Sorted or grouped by stage. Whichever you leave it on loads next time." },
      { id: "row-menu", target: '[data-tour="row-menu"]', optional: true, icon: "settings", interact: { hint: "Open a row's ⋮ menu" }, title: "The ⋮ menu on a row", content: "Move its stage, set a due date, change who is answerable, post an update or archive it, from the row." },
    ],
  },
  "/admin/money": {
    id: "admin-page-money",
    version: 2,
    kind: "page",
    title: "This page: Money",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "wallet", showEstimate: true, title: "Money", content: "In, out, and what is still owed: every figure recomputed from the underlying invoices and payments." },
      { id: "tiles", target: '[data-tour="money-tiles"]', icon: "calculator", title: "The real-time totals", content: "Collected, outstanding, and overdue. Reconciliation for anything the bank and the books disagree on is one link away." },
      { id: "add", target: '[data-tour="money-add"]', icon: "receipt", title: "Raise an invoice", content: "Or an estimate first, if the work has not been agreed yet: the button beside it." },
      { id: "row-menu", target: '[data-tour="row-menu"]', optional: true, icon: "settings", interact: { hint: "Open a row's ⋮ menu" }, title: "The ⋮ menu on a row", content: "Issue, record a payment (cash, card, POS, transfer; part or full), email a reminder, duplicate or void an invoice, depending on its status." },
    ],
  },
  "/admin/forms": {
    id: "admin-page-forms",
    version: 3,
    kind: "page",
    title: "This page: Forms",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "inbox", showEstimate: true, title: "Forms", content: "Every form on the site, with its entries: briefs, enquiries, sign-ups and the forms you build." },
      { id: "table", target: '[data-tour="forms-table"]', icon: "clipboard", title: "The forms", content: "Each row opens that form's entries, its questions and its emails." },
      { id: "all", target: '[data-tour="forms-all-link"]', optional: true, icon: "inbox", title: "All entries", content: "Click the Entries card to open every entry from every form in one table, with search, columns and export." },
    ],
  },
  "/admin/settings/general": {
    id: "admin-page-settings",
    version: 2,
    kind: "page",
    title: "This page: Settings",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "settings", showEstimate: true, title: "Settings", content: "Content on the public site, and how the agency runs." },
      { id: "table", target: '[data-tour="settings-table"]', icon: "shieldCheck", title: "Invoice defaults", content: "Change anything and a bar appears at the bottom to save or discard it." },
    ],
  },

  "/admin/settings": {
    id: "admin-page-settings-overview",
    version: 1,
    kind: "page",
    title: "This page: Settings",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "settings", showEstimate: true, title: "Settings", content: "Every section in one column of panels, in the order of the list beside them." },
      { id: "search", target: '[data-tour="settings-search"]', icon: "search", title: "Find a setting", content: "Type what you are after: a section, or a setting inside one." },
      { id: "sections", target: '[data-tour="settings-sections"]', icon: "shieldCheck", title: "Each section's state", content: "What a section is set to shows beside it. Open one to change it; a bar at the bottom saves or discards, and a toast confirms." },
    ],
  },
  "/admin/settings/media": {
    id: "admin-page-media",
    version: 1,
    kind: "page",
    title: "This page: the media library",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "fileStack", showEstimate: true, title: "The media library", content: "Pictures, videos and files for the site and the blog, in folders." },
      { id: "upload", target: '[data-tour="media-upload"]', icon: "plus", title: "Upload", content: "Or drop files anywhere on the page, or straight onto a folder." },
      { id: "folders", target: '[data-tour="media-folders"]', desktopOnly: true, optional: true, icon: "folder", title: "Folders", content: "Make, rename and nest folders here, and drag files onto one to move them." },
      { id: "folders-sheet", target: '[data-tour="media-folders-sheet"]', mobileOnly: true, optional: true, icon: "folder", title: "Folders", content: "On a phone the folders open from here." },
      { id: "tabs", target: '[data-tour="media-tabs"]', optional: true, icon: "filter", title: "Kinds, and the Trash", content: "Move to Trash can be undone. Delete permanently lives in the Trash, is the owner's, and asks twice." },
    ],
  },
  "/admin/blog": {
    id: "admin-page-blog",
    version: 1,
    kind: "page",
    title: "This page: the blog",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "book", showEstimate: true, title: "The blog", content: "Every post, published, scheduled, in review or still a draft." },
      { id: "new", target: '[data-tour="blog-new"]', optional: true, icon: "plus", title: "Write a post", content: "Save keeps a draft. On a live post the button reads Update, and a toast confirms the change is live." },
      { id: "filters", target: '[data-tour="blog-filters"]', optional: true, icon: "filter", title: "Search and filter", content: "By words, state, service or dates. The Trash keeps drafts you removed for a while before they go." },
      { id: "table", target: '[data-tour="blog-table"]', optional: true, icon: "clipboard", title: "The posts", content: "Tick several for bulk actions: publish, unpublish or move to the Trash." },
    ],
  },
  "/admin/clients/support": {
    id: "admin-page-support",
    version: 1,
    kind: "page",
    title: "This page: Support",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "inbox", showEstimate: true, title: "Support", content: "Questions clients ask in their portal. Your answer is emailed to them and waits in their portal." },
      { id: "tiles", target: '[data-tour="support-tiles"]', icon: "gauge", title: "Who is waiting", content: "Waiting on us is the one to empty. A closed question reopens if the client writes again." },
      { id: "filters", target: '[data-tour="support-filters"]', icon: "filter", title: "Search and filter", content: "By words or by status." },
    ],
  },
  "/admin/forms/all": {
    id: "admin-page-all-entries",
    version: 1,
    kind: "page",
    title: "This page: all entries",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "inbox", showEstimate: true, title: "Every entry, one table", content: "Entries from every form together, newest first." },
      { id: "filters", target: '[data-tour="entries-filters"]', icon: "filter", title: "Narrow it down", content: "Search, pick one form, set the dates, and choose which columns to show. The address keeps all of it." },
      { id: "table", target: '[data-tour="entries-table"]', icon: "clipboard", title: "The entries", content: "Open any row for the full entry. The pager sits under the table; the owner also gets CSV and Excel at the top." },
    ],
  },
  "/admin/reports": {
    id: "admin-page-reports",
    version: 1,
    kind: "page",
    title: "This page: Reports",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "barChart", showEstimate: true, title: "Reports", content: "What came in and went out for any stretch of days, set against the stretch just before it." },
      { id: "range", target: '[data-tour="reports-range"]', icon: "calendar", title: "Pick the days, take the file", content: "Presets or your own dates. CSV downloads exactly what is on screen." },
      { id: "tiles", target: '[data-tour="reports-tiles"]', icon: "gauge", title: "The figures and their change", content: "Each card says how it moved against the period before." },
      { id: "months", target: '[data-tour="reports-months"]', icon: "barChart", title: "Month by month", content: "Collected against spent, with the table under it. Who paid most, how they paid and where the money went follow below." },
    ],
  },
  "/admin/users": {
    id: "admin-page-users",
    version: 1,
    kind: "page",
    title: "This page: Users",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "users", showEstimate: true, title: "Users", content: "The studio team, client accounts and invitations in one place." },
      { id: "table", target: '[data-tour="users-table"]', icon: "clipboard", title: "People and access", content: "Switch between team, clients and invitations. Search, then use a row's menu to rename, deactivate, sign someone out or open their sessions." },
      { id: "row-menu", target: '[data-tour="row-menu"]', optional: true, icon: "settings", interact: { hint: "Open a row's ⋮ menu" }, title: "The ⋮ menu", content: "Make someone a studio owner or staff, send a sign-in link, deactivate or reactivate. Each asks you to confirm." },
    ],
  },
  "/admin/forms/[form]": {
    id: "admin-page-form",
    version: 1,
    kind: "page",
    title: "This page: a form",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "inbox", showEstimate: true, title: "One form", content: "Its entries, the questions it asks, and the emails it sends." },
      { id: "tabs", target: '[data-tour="form-tabs"]', icon: "layout", title: "Entries, questions, settings", content: "Settings is where its emails are switched on or off, and where the studio's notice goes." },
      { id: "entries", target: '[data-tour="forms-entries"]', icon: "clipboard", title: "The entries", content: "An inbox: tick several to star, mark read, move to spam or the Trash, or export them." },
    ],
  },
  "/admin/forms/[form]/entries/[entry]": {
    id: "admin-page-entry",
    version: 1,
    kind: "page",
    title: "This page: an entry",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "clipboard", showEstimate: true, title: "One entry", content: "Everything they sent, in the order they saw the questions." },
      { id: "pdf", target: '[data-tour="entry-pdf"]', icon: "fileStack", title: "Download it as a PDF", content: "The same PDF the studio's email carries, with the files they sent attached." },
      { id: "answers", target: '[data-tour="entry-answers"]', icon: "clipboard", title: "The answers", content: "A gap shows as Not answered: something to ask about on the call." },
      { id: "attachments", target: '[data-tour="entry-attachments"]', optional: true, icon: "fileStack", title: "What they uploaded", content: "Pictures show as pictures. Open or download any file; the links are private and last an hour." },
      { id: "emails", target: '[data-tour="entry-emails"]', optional: true, icon: "bell", title: "Emails about it", content: "What was sent, to whom, and whether it arrived. Send one again from here." },
    ],
  },
  /* THE FOUR BELOW ARE DRILL-DOWN PAGES, not sidebar routes -- reached by
     opening a row on the list above them, never by a nav link. `[id]` in
     their key is literal: `adminPageTourFor` normalises a real pathname
     like `/admin/clients/c_10` down to `/admin/clients/[id]` before the
     lookup, the same idea `route-match.ts` uses in the reference this
     registry followed. `/admin/money/reconciliation` is the one exception
     kept out of that normalisation on purpose -- see the note there. */
  "/admin/clients/[id]": {
    id: "admin-page-client",
    version: 1,
    kind: "page",
    title: "This page: a client",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "users", showEstimate: true, title: "One client's record", content: "Everything under their name: projects, invoices, payments, and what is owed between the studio and them." },
      { id: "projects", target: '[data-tour="client-projects"]', icon: "folder", title: "Their projects", content: "Open the menu on any row for what a first look will not show: move its stage, set a due date, archive it." },
      { id: "invoices", target: '[data-tour="client-invoices"]', icon: "receipt", title: "Their invoices", content: "Issue, record a payment, or void, all from the row menu here too." },
      /* NOT LAST, DELIBERATELY: this step's target is only in the DOM for a
         client the studio currently owes something, which is almost none
         of them. `optional: true` already tells the missing-target case
         apart from a real fault; putting it before a step that is ALWAYS
         there means a skip here still lands on a real step with a proper
         Finish, rather than ending the tour on nothing and leaving the
         background blur to catch up a beat behind the vanished card. */
      { id: "credit", target: '[data-tour="client-credit"]', optional: true, icon: "wallet", title: "Their balance with us", content: "Only appears when the studio owes them something: an overpayment held rather than refunded. Apply it to their next invoice from here." },
      { id: "payments", target: '[data-tour="client-payments"]', icon: "creditCard", title: "What they have actually paid", content: "Every receipt, with a reversal or a refund shown rather than hidden once it happens." },
    ],
  },
  "/admin/projects/[id]": {
    id: "admin-page-project",
    version: 1,
    kind: "page",
    title: "This page: a project",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "folder", showEstimate: true, title: "One project, start to delivery", content: "What was agreed, where it stands, and what it has actually made the studio." },
      { id: "stage", target: '[data-tour="proj-stage"]', icon: "gauge", title: "Moving the stage", content: "The track shows where it is; the control under it is what moves it." },
      { id: "tasks", target: '[data-tour="proj-tasks"]', icon: "check", title: "What is left", content: "Add, tick, or remove. A task can wait on one other task, shown as soon as it is entered." },
      { id: "updates", target: '[data-tour="proj-updates"]', icon: "bell", title: "Posting an update", content: "Worth knowing before you post one: a box in that form decides whether the client can read it. Leave it unticked for a note that stays internal." },
      { id: "deliverables", target: '[data-tour="proj-deliverables"]', icon: "fileStack", title: "Deliverables and approval", content: "Adding a new version resets its approval to not sent. That is deliberate: an old approval should never cover new work." },
      { id: "margin", target: '[data-tour="proj-margin"]', icon: "calculator", title: "What it has made", content: "Collected against spent, not invoiced against spent: a bill nobody has paid is not income yet." },
    ],
  },
  "/admin/money/[id]": {
    id: "admin-page-invoice",
    version: 1,
    kind: "page",
    title: "This page: an invoice",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "receipt", showEstimate: true, title: "One invoice", content: "What it offers changes with its own status: a draft, an issued invoice, and a struck one are three different documents." },
      { id: "actions", target: '[data-tour="inv-actions"]', icon: "gauge", title: "The actions here follow the status", content: "A draft can still be edited or deleted. Once issued, neither is offered again: somebody outside the studio is holding a copy." },
      /* NOT LAST: a draft has no client-facing copy at all, and ending a
         tour on a step that might not exist leaves the background blur
         catching up a beat after the card has already gone. See the same
         note on the client workspace tour above. */
      { id: "client-copy", target: '[data-tour="inv-client-copy"]', optional: true, icon: "fileStack", title: "The client's own copy", content: "A code and a link that open a live version of this invoice: what is owed right now, not what was true when it was printed." },
      { id: "payments", target: '[data-tour="inv-payments"]', icon: "creditCard", title: "Refund or reverse, not the same thing", content: "Reverse says the money never really arrived. Refund says it did, and some or all of it went back. The row menu keeps them apart on purpose." },
    ],
  },
  "/admin/money/reconciliation": {
    id: "admin-page-reconciliation",
    version: 1,
    kind: "page",
    title: "This page: Reconciliation",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "shieldCheck", showEstimate: true, title: "Where the books and the bank are asked to agree", content: "Not a sidebar page: reached from a banner on Money, and only when there is genuinely something in it." },
      { id: "attention", target: '[data-tour="recon-attention"]', icon: "flag", title: "Match it, or write it off", content: "Matching banks real money onto an invoice. Writing off records a decision and moves nothing. Kept as two separate buttons so neither happens by accident." },
      { id: "log", target: '[data-tour="recon-log"]', icon: "clipboard", title: "Seeing two rows for one payment is normal", content: "Paystack's own retry and a payer's return from checkout often race each other. Both get logged; only one gets banked." },
    ],
  },
};

/** The one route this registry deliberately does NOT collapse to `[id]`:
 *  `/admin/money/reconciliation` has the exact same shape as
 *  `/admin/money/<invoiceId>` (two segments past `/admin`), and the two
 *  pages have nothing in common. Checked first, and by itself, rather than
 *  folded into a shared exceptions list that would need a new entry every
 *  time a static route happens to sit at the same depth as a dynamic one. */
const STATIC_ROUTES_AT_DYNAMIC_DEPTH = new Set(["/admin/money/reconciliation", "/admin/clients/support"]);

/** Collapses a real pathname like `/admin/clients/c_10` down to the
 *  registry's own `/admin/clients/[id]` key, the same idea Litch's own
 *  `route-match.ts` uses for exactly this problem: a page tour is written
 *  once per TEMPLATE, not once per record. */
function normalizeAdminRoute(pathname: string): string {
  if (STATIC_ROUTES_AT_DYNAMIC_DEPTH.has(pathname)) return pathname;
  const segments = pathname.split("/").filter(Boolean);
  const [admin, section, id] = segments;
  /* A form is keyed by its own name, and its entries sit one level down. */
  if (admin === "admin" && section === "forms" && id) {
    if (segments.length === 3 && id === "all") return "/admin/forms/all";
    if (segments.length === 3) return "/admin/forms/[form]";
    if (segments.length === 5 && segments[3] === "entries") return "/admin/forms/[form]/entries/[entry]";
    return pathname;
  }
  if (admin === "admin" && id && ["clients", "projects", "money"].includes(section)) {
    return `/admin/${section}/[id]`;
  }
  return pathname;
}

export function adminPageTourFor(pathname: string): TourDef | null {
  return ADMIN_PAGE_TOURS[normalizeAdminRoute(pathname)] ?? null;
}
