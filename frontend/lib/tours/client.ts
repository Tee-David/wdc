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
  version: 1,
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
  version: 3,
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
    { id: "billing", target: '[data-tour="portal-billing"]', href: "/portal/billing", page: "Billing", icon: "creditCard", title: "Invoices and payments", content: "Each invoice opens its own page, where you can pay by card or bank transfer and download the receipt afterwards." },
    { id: "nav-support", target: '[data-tour="portal-nav-support"]', href: "/portal/billing", desktopOnly: true, icon: "inbox", interact: { hint: "Click Support to move on" }, title: "Support", content: "Open Support to ask us something." },
    { id: "support", target: '[data-tour="portal-support"]', href: "/portal/support", page: "Support", icon: "inbox", title: "Questions and replies", content: "Start a conversation about anything. We reply here, and you can also reach us by email or on your project's WhatsApp group if we set one up." },
    { id: "nav-settings", target: '[data-tour="portal-nav-settings"]', href: "/portal/support", desktopOnly: true, icon: "settings", interact: { hint: "Click Settings to move on" }, title: "Settings", content: "Open Settings to choose what we email you about." },
    { id: "notify", target: '[data-tour="portal-notify"]', href: "/portal/settings", page: "Settings", icon: "bell", title: "What we email you about", content: "Switch off the messages you do not want. Receipts for money you have paid always arrive, because they are your record." },
    { id: "signin", target: '[data-tour="portal-signin"]', href: "/portal/settings", icon: "shieldCheck", title: "Your password", content: "Change it here. We email you a six-digit code first, so nobody else can change it for you, and we refuse passwords that have leaked elsewhere." },
    closer("done", "That's everything", "You can replay this any time from the ? button. If anything here is unclear, ask us in Support."),
  ],
};

/** One short tour per portal screen that has a decision on it, keyed by
 *  pathname. Each reuses the targets the walkthrough already uses. */
export const CLIENT_PAGE_TOURS: Record<string, TourDef> = {
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
    version: 1,
    kind: "page",
    title: "This page: billing",
    steps: [
      { id: "intro", target: "body", placement: "center", icon: "wallet", showEstimate: true, title: "Billing", content: "What you have been invoiced, what is still to pay, and the receipts for what you have paid." },
      { id: "invoices", target: '[data-tour="portal-billing"]', icon: "creditCard", title: "Invoices to pay", content: "Pay an invoice from its row, or open it to save or print. Anything already paid is listed below, with its receipt." },
    ],
  },
};

export function clientPageTourFor(pathname: string): TourDef | null {
  return CLIENT_PAGE_TOURS[pathname] ?? null;
}
