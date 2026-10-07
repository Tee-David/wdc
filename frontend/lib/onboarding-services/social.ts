import { UNSURE, type Step } from "../onboarding-shared";

/**
 * The social form's steps (Size first). One file per service so two people can
 * work on two services without touching the same lines. Composed by
 * `stepsFor` in ../onboarding.ts.
 */
export const SOCIAL_STEPS: Step[] = [
  {
    /* SPLIT IN TWO, and the handles are now one field per platform.

       A single "your handles" box was asking the client to invent a format,
       and what comes back is a paragraph somebody then has to read and unpick.
       The client's own social form does this properly -- nine separate handle
       fields, each revealed only by ticking its platform -- so a client on two
       platforms answers two questions and never sees the other seven. Copied
       because it is right, not because it was there. */
    phase: "work", id: "social", service: "social", title: "Where you are",
    blurb: "The accounts we would be running, and who runs them today.",
    fields: [
      { key: "channels", label: "Which platforms are you on?", kind: "multi", required: true, options: ["Instagram", "Facebook", "X", "TikTok", "LinkedIn", "YouTube", "Pinterest", "Snapchat", "WhatsApp", "Somewhere else", "None yet"] },
      { key: "handle_instagram", label: "Your Instagram handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["Instagram"] } },
      { key: "handle_facebook", label: "Your Facebook handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["Facebook"] } },
      { key: "handle_x", label: "Your X handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["X"] } },
      { key: "handle_tiktok", label: "Your TikTok handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["TikTok"] } },
      { key: "handle_linkedin", label: "Your LinkedIn handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["LinkedIn"] } },
      { key: "handle_youtube", label: "Your YouTube handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["YouTube"] } },
      { key: "handle_pinterest", label: "Your Pinterest handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["Pinterest"] } },
      { key: "handle_snapchat", label: "Your Snapchat handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["Snapchat"] } },
      { key: "handle_whatsapp", label: "Your WhatsApp handle", kind: "text", placeholder: "@yourbusiness", showIf: { key: "channels", equals: ["WhatsApp"] } },
      { key: "handle_other", label: "Anywhere else? Give us the handle", kind: "text", showIf: { key: "channels", equals: ["Somewhere else"] } },
      { key: "content_source", label: "Who creates your content today?", kind: "cards", required: true, options: ["Nobody yet", "My team", "A freelancer", "I would like WDC to"] },
      {
        key: "content_creator_wanted", label: "Would you like us to create it?", kind: "yesno",
        showIf: { key: "content_source", equals: ["Nobody yet"] },
        scope: "Extra to what you have already paid for. Say yes and we will send you a quote first. Nothing is charged from this form.",
        tip: "Accounts without a supply of content go quiet within a month. If making it yourself is not realistic, it is better to say so now than to find out in week three.",
      },
      { key: "access_ok", label: "How should we handle account access?", kind: "cards", required: true, options: ["I can give WDC access", "Please work through me"] },
    ],
  },
  {
    phase: "work", id: "social_content", service: "social", title: "What we post",
    blurb: "What it is for, what works, and what to stay away from.",
    fields: [
      { key: "social_goal", assist: true, label: "What do you most want social media to achieve?", kind: "cards", options: ["Awareness", "Sales", "Bookings", "Community", "Recruitment", "Other"] },
      { key: "social_goal_other", label: "What other result matters to you?", kind: "text", showIf: { key: "social_goal", equals: ["Other"] } },
      { key: "content_types", assist: true, label: "Which kinds of content tend to connect with your audience?", kind: "multi", options: ["Short video", "Photos", "Carousels", "Stories", "Live", "Written posts", "Memes and humour", "Behind the scenes", "Other", UNSURE] },
      { key: "content_types_other", label: "What other kind of content should we consider?", kind: "text", showIf: { key: "content_types", equals: ["Other"] } },
      { key: "themes_yes", assist: true, label: "Anything you want us to keep coming back to?", kind: "textarea" },
      { key: "themes_no", assist: true, label: "Anything we should stay away from?", kind: "textarea", tip: "Topics, competitors, a tone that is not you." },
      { key: "competitors_admired", assist: true, label: "Any competitor accounts you admire?", kind: "textarea", tip: "Handles are enough." },
      { key: "upcoming", label: "Any launches, promotions or events coming up we should plan around?", kind: "textarea" },
      {
        key: "ad_spend", assist: true, label: "What monthly media budget have you set aside?", kind: "select",
        tip: "This is media spend, paid to Meta or Google. It is separate from our fee.",
        options: ["Under ₦100k", "₦100k–₦500k", "₦500k–₦2m", "Over ₦2m", UNSURE],
      },
    ],
  },
];
