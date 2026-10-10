import type { TourDef } from "./types";

/**
 * The client portal's tours: a short welcome and the full walkthrough.
 *
 * BUILT AROUND WHAT A CLIENT COMES HERE TO DO, in the order they usually do
 * it: see what is waiting on them, look at the work, pay what is owed, ask a
 * question, and decide what we email them about. Every stop is a real screen
 * in `app/portal`; there is no stop for forms or files, because the portal
 * does not have them yet and a tour of a page that does not exist is a lie
 * with steps.
 *
 * PAGE TOURS ARE FOR THE TWO SCREENS WITH A DECISION ON THEM: Projects
 * (approve or send back a deliverable) and Billing (pay an invoice). The
 * other screens have one job each, and the walkthrough already stops on them.
 *
 * Targets are `data-tour` attributes on the rendered control, the same rule
 * `lib/tours/admin.ts` follows: `components/client/shell.tsx` for the nav
 * and `app/portal/*` for the panels.
 */

const closer = (id: string, title: string, content: string): TourDef["steps"][number] => ({
  id, target: "body", placement: "center", icon: "check", content, title,
});

export const CLIENT_WELCOME: TourDef = {
  id: "client-welcome",
  version: 2,
  kind: "welcome",
  title: "Welcome to your portal",
  steps: [
    {
      id: "welcome",
      target: "body",
      placement: "center",
      href: "/portal",
      icon: "compass",
      showEstimate: true,
      title: "Welcome to your WDC portal",
      content:
        "Everything about your projects with us, in one place. A quick look at where things live; the full walkthrough is in the ? menu whenever you want it.",
    },
    { id: "nav-overview", target: '[data-tour="portal-nav-overview"]', href: "/portal", desktopOnly: true, icon: "layout", title: "Overview", content: "What is waiting on you today, and the latest news on your work." },
    { id: "nav-projects", target: '[data-tour="portal-nav-projects"]', href: "/portal", desktopOnly: true, icon: "folder", title: "Projects", content: "Each project's stage, the updates we share, and the work ready for your review." },
    { id: "nav-billing", target: '[data-tour="portal-nav-billing"]', href: "/portal", desktopOnly: true, icon: "wallet", title: "Billing", content: "Invoices, receipts and anything still to pay." },
    { id: "nav-support", target: '[data-tour="portal-nav-support"]', href: "/portal", desktopOnly: true, icon: "inbox", title: "Support", content: "Ask us anything. Every question and reply stays in one thread." },
    { id: "mobile-menu", target: '[data-tour="portal-mobile-menu"]', href: "/portal", icon: "panelLeft", mobileOnly: true, optional: true, title: "The sections, on a phone", content: "This button opens the menu with your five sections. Tap one and it closes." },
    closer("done", "That's the map", "Take the full walkthrough any time from the ? button at the top, or replay this one. Nothing here is required."),
  ],
};

export const CLIENT_WALKTHROUGH: TourDef = {
  id: "client-walkthrough",
  version: 5,
  kind: "walkthrough",
  title: "The full portal walkthrough",
  steps: [
    {
      id: "welcome",
      target: "body",
      placement: "center",
      href: "/portal",
      page: "Overview",
      icon: "compass",
      showEstimate: true,
      title: "How working with us looks from here",
      content: "Five stops: what needs you, your projects, billing, support and your email settings. Skip whenever you like.",
    },
    { id: "attention", target: '[data-tour="portal-attention"]', href: "/portal", page: "Overview", icon: "flag", title: "What needs you", content: "Work ready for your review, invoices with a balance, and our replies to your questions. Each row opens the place to deal with it." },
    { id: "kpis", target: '[data-tour="portal-kpis"]', href: "/portal", icon: "gauge", title: "The numbers at a glance", content: "Live projects, what you owe, and what is waiting for your review. They come from the same records the studio works from." },
    { id: "next-step", target: '[data-tour="portal-next"]', href: "/portal", optional: true, icon: "flag", title: "Your next step", content: "The one thing we need from you next, with its button. It changes as work moves, and it is not here when nothing is waiting." },
    { id: "nav-projects", target: '[data-tour="portal-nav-projects"]', href: "/portal", desktopOnly: true, icon: "folder", interact: { hint: "Click Projects to move on" }, title: "Your projects", content: "Open Projects to see every piece of work with us." },
    { id: "projects", target: '[data-tour="portal-projects"]', href: "/portal/projects", page: "Projects", icon: "fileStack", title: "Review and approve", content: "Open a project to see its stage and updates. Deliverables ready for you can be approved or sent back with a note on what to change." },
    { id: "nav-billing", target: '[data-tour="portal-nav-billing"]', href: "/portal/projects", desktopOnly: true, icon: "wallet", interact: { hint: "Click Billing to move on" }, title: "Billing", content: "Open Billing to see what you have been invoiced." },
    {id:"billing-currencies",target:'[data-tour="money-currencies"]',optional:true,href:"/portal/billing",icon:"wallet",title:"Your amounts stay in their currency",content:"NGN and USD are separate balances. Open the invoice for its payment account and printable PDF."},
    { id: "billing", target: '[data-tour="portal-billing"]', href: "/portal/billing", page: "Billing", icon: "creditCard", title: "Invoices and payments", content: "Each invoice opens its own page, where you can see its payment options and print or download the document. NGN uses online checkout; foreign currency uses the selected bank account." },
    { id: "nav-support", target: '[data-tour="portal-nav-support"]', href: "/portal/billing", desktopOnly: true, icon: "inbox", interact: { hint: "Click Support to move on" }, title: "Support", content: "Open Support to ask us something." },
    { id: "support", target: '[data-tour="portal-support"]', href: "/portal/support", page: "Support", icon: "inbox", title: "Questions and replies", content: "Start a conversation about anything. We reply here, and you can also reach us by email or on your project's WhatsApp group if we set one up." },
    { id: "nav-settings", target: '[data-tour="portal-nav-settings"]', href: "/portal/support", desktopOnly: true, icon: "settings", interact: { hint: "Click Settings to move on" }, title: "Settings", content: "Open Settings to choose what we email you about." },
    { id: "notify", target: '[data-tour="portal-notify"]', href: "/portal/settings", page: "Settings", icon: "bell", title: "What we email you about", content: "Switch off the messages you do not want. Receipts for money you have paid always arrive, because they are your record." },
    { id: "signin", target: '[data-tour="portal-signin"]', href: "/portal/settings", icon: "shieldCheck", title: "Your password", content: "Change it here. We email you a six-digit code first, so nobody else can change it for you, and we refuse passwords that have leaked elsewhere." },
    { id: "workspace-inbox", target: '[data-tour="workspace-notifications"]', href: "/portal/notifications", page: "Your inbox", icon: "bell", title: "Decisions and replies for you", content: "This is your personal inbox. Open the work to review it, supply a requested item or read an update. Internal team notes are not client updates." },
    { id: "workspace-preferences", target: '[data-tour="workspace-email-preferences"]', href: "/portal/notifications", optional: true, icon: "settings", title: "Choose how we keep you informed", content: "Choose immediate email, a daily or weekly summary, or in-app only. Save changes commits your personal choices." },
    closer("done", "That's everything", "You can replay this any time from the ? button. If anything here is unclear, ask us in Support."),
  ],
};

/** One short tour per portal screen that has a decision on it, keyed by
 *  pathname. Each reuses the targets the walkthrough already uses. */
export const CLIENT_PAGE_TOURS: Record<string, TourDef> = {
  "/portal/notifications": {
    id: "client-page-workspace-inbox", version: 1, kind: "page", title: "This page: your inbox",
    steps: [
      { id: "intro", target: "body", placement: "center", showEstimate: true, icon: "bell", title: "Messages that belong to you", content: "Your project decisions, requested items and shared updates. You can skip or replay this short guide." },
      { id: "filters", target: '[data-tour="workspace-inbox-filters"]', icon: "filter", title: "What needs your answer", content: "Needs me shows open actions. All activity keeps the history. Summaries groups routine updates." },
      { id: "record", target: '[data-tour="workspace-inbox-action"]', optional: true, icon: "folder", title: "Open the work before deciding", content: "Read the exact version and context in the project record. Mark read does not approve work." },
      { id: "preferences", target: '[data-tour="workspace-email-preferences"]', optional: true, icon: "settings", title: "Your email choices", content: "Choose each category and summary frequency. Nothing changes until you save your personal preferences." },
      closer("done", "Your next action is clear", "The portal keeps the decision and its history. Email points here, and is not the only record."),
    ],
  },
  "/portal/projects/[id]": {
    id: "client-page-service-workspace", version: 1, kind: "page", title: "This page: your project work",
    steps: [
      { id: "intro", target: "body", placement: "center", showEstimate: true, icon: "folder", title: "Your project, its work and decisions", content: "See what is ready, what we need from you, and the history of what you agreed." },
      { id: "service", target: '[data-tour="workspace-service"]', optional: true, roles: ["client"], icon: "fileStack", title: "The workflow this service needs", content: "A content calendar is different from a test build or branding review. Your service view gives the work its proper context." },
      { id: "work-list", target: '[data-tour="workspace-work-list"]', optional: true, roles: ["client"], icon: "clipboard", title: "The work shared with you", content: "Open a record to see its current shared version, deadline, notes and decisions. Private drafts are kept out of your portal." },
      { id: "review", target: '[data-tour="workspace-view-review"]', optional: true, roles: ["client"], icon: "check", title: "Review the version you see", content: "Approve or ask for changes on the exact version. A later material change needs a new decision; silence never means approval." },
      { id: "actions", target: '[data-tour="workspace-client-actions"]', optional: true, roles: ["client"], icon: "flag", title: "What we need from you", content: "Supply the requested content or answer the decision by its agreed deadline. Ask your lead if a new date is needed." },
      { id: "updates", target: '[data-tour="workspace-client-updates"]', optional: true, roles: ["client"], icon: "bell", title: "Updates published by your team", content: "Shared decisions and progress stay with this project. Your personal inbox links to the next action." },
      closer("done", "Work and history stay together", "Use your inbox for outstanding actions and Support for a broader question. Replay this guide from the tour menu."),
    ],
  },

  "/portal/projects": {
    id: "client-page-projects",
    version: 1,
    kind: "page",
    title: "This page: your projects",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "folder", showEstimate: true, title: "Your projects", content: "Each piece of work with us, its stage, and the updates we have shared." },
      { id: "review", target: '[data-tour="portal-projects"]', icon: "fileStack", title: "Review and approve", content: "Open a project to see what is ready for you. Approve a deliverable, or send it back with a note on what to change." },
    ],
  },
  "/portal/billing": {
    id: "client-page-billing",
    version: 2,
    kind: "page",
    title: "This page: billing",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "wallet", showEstimate: true, title: "Billing", content: "What you have been invoiced, what is still to pay, and the receipts for what you have paid." },
      {id:"currencies",target:'[data-tour="money-currencies"]',optional:true,icon:"wallet",title:"Balances stay in their currency",content:"NGN and USD are separate amounts. Open an invoice to see its payment account, print it or download its PDF. Foreign currency payments use the account shown; the studio records the transfer after checking it."},
      { id: "invoices", target: '[data-tour="portal-billing"]', icon: "creditCard", title: "Invoices to pay", content: "Pay an invoice from its row, or open it to save or print. Anything already paid is listed below, with its receipt." },
    ],
  },
};

export function clientPageTourFor(pathname: string): TourDef | null {
  const route = /^\/portal\/projects\/[^/]+$/.test(pathname) ? "/portal/projects/[id]" : pathname;
  return CLIENT_PAGE_TOURS[route] ?? null;
}
