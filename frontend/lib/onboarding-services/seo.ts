import type { Step } from "../onboarding-shared";

/**
 * The seo form's steps (Size first). One file per service so two people can
 * work on two services without touching the same lines. Composed by
 * `stepsFor` in ../onboarding.ts.
 */
export const SEO_STEPS: Step[] = [
  {
    phase: "work", id: "seo", service: "seo", title: "SEO",
    blurb: "What you want to be found for, and what we need access to.",
    fields: [
      { key: "site_url", label: "Your website", kind: "url", placeholder: "https://", required: true },
      { key: "target_terms", assist: true, label: "What should someone be typing into Google when they find you?", kind: "textarea", required: true },
      { key: "geo", assist: true, label: "Where are your customers?", kind: "text", placeholder: "e.g. one city, or nationwide", required: true },
      { key: "competitors", assist: true, label: "Which similar businesses show up when you search?", kind: "textarea", tip: "Names or links are enough. You do not need to know their rankings." },
      {
        key: "tools_access", label: "Which website tools do you already have?", kind: "multi", required: true,
        hint: "Choose what you have. We will arrange access securely; do not share passwords here.",
        tip: "Search Console shows how people find you in search. Analytics shows website visits and actions. Google Business Profile is your business listing in maps and search. CMS admin is where you edit website pages.",
        options: ["Search Console", "Analytics", "Google Business Profile", "CMS admin", "None of these"],
      },
      { key: "content_owner", label: "Who writes your content?", kind: "cards", required: true, options: ["Nobody yet", "My team", "An agency", "I would like WDC to"] },
      /* "Nobody yet" is the answer that quietly decides whether the search work
         can do anything at all: pages have to exist before they can rank. */
      {
        key: "content_writer_wanted", label: "Would you like us to write it?", kind: "yesno",
        showIf: { key: "content_owner", equals: ["Nobody yet"] },
        scope: "Extra to what you have already paid for. Say yes and we will send you a quote first. Nothing is charged from this form.",
        tip: "Search work needs pages to work on. If nobody is writing them, we can. Or we can give your team the outlines and the search terms to write from, which costs less.",
      },
    ],
  },
];
