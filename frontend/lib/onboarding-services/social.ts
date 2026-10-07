import type { Cond, Step } from "../onboarding-shared";
import { UNSURE } from "../onboarding-shared";

/**
 * The Social Media & Paid Ads form, Size first, after the UX research
 * (plans/onboarding-ux-research.md, E6).
 *
 * Management, content creation and paid ads are three separate packages and
 * can be combined. The handle-per-platform questions are replaced by one links
 * box. Whether they have accounts and whether we may have access is ONE
 * decision with four answers. The four end-of-form text boxes became one. The
 * ad budget stays, with the existing "paid to the platform, separate from our
 * fee" wording. Passwords are never asked for.
 */

export const SIZE_KEY = "social_size";

const MANAGEMENT = "Management";
const CONTENT = "Content creation";
const ADS = "Paid ads";

const MID: Cond = { tier: 2 };
const BIG: Cond = { tier: 3 };
const wantsAds: Cond = { key: "social_packages", equals: [ADS] };

export const SOCIAL_STEPS: Step[] = [
  {
    phase: "work", id: "social", service: "social", title: "What you want",
    blurb: "The packages, and where you are.",
    fields: [
      {
        key: SIZE_KEY, assist: true, required: true, kind: "cards",
        label: "How much help do you want?",
        hint: "A rough feel is enough. We confirm it later.",
        options: ["Small", "Medium", "Large"],
        optionInfo: {
          Small: { desc: "One platform and one need." },
          Medium: { desc: "A few platforms and a regular plan." },
          Large: { desc: "Many platforms, content and ads together." },
        },
      },
      {
        key: "social_packages", assist: true, required: true, kind: "multi",
        label: "Which packages do you want?",
        hint: "They are separate. Take one or combine them.",
        options: [MANAGEMENT, CONTENT, ADS],
        optionInfo: {
          [MANAGEMENT]: { desc: "We run your accounts day to day." },
          [CONTENT]: { desc: "We make the posts, pictures and videos." },
          [ADS]: { desc: "Paid campaigns that bring in customers." },
        },
      },
      {
        key: "channels", required: true, kind: "multi", label: "Which platforms are you on?",
        options: ["Instagram", "Facebook", "X", "TikTok", "LinkedIn", "YouTube", "Pinterest", "Snapchat", "WhatsApp", "Somewhere else", "None yet"],
      },
      {
        key: "social_links", kind: "textarea", label: "Paste your links",
        placeholder: "Your page links or handles, one per line",
        hint: "Optional. We look at them before we start.",
        showIf: { key: "channels", equals: ["Instagram", "Facebook", "X", "TikTok", "LinkedIn", "YouTube", "Pinterest", "Snapchat", "WhatsApp", "Somewhere else"] },
      },
    ],
  },
  {
    phase: "work", id: "social_access", service: "social", title: "Accounts and ads",
    blurb: "How we get to your accounts, and the ad budget.",
    fields: [
      {
        key: "social_access", required: true, kind: "cards",
        label: "How should we handle your accounts?",
        hint: "We never ask for passwords. You add us through each platform's own sharing tools.",
        options: [
          "I have them and can add you",
          "I have some, please help with the rest",
          "I do not have them, please set them up",
          "Please work through me",
        ],
      },
      {
        key: "ad_spend", assist: true, kind: "select",
        label: "How much will you spend on adverts each month?",
        hint: "This is paid to Meta or Google, not to us. It is separate from our fee.",
        options: ["Under ₦100k", "₦100k to ₦500k", "₦500k to ₦2m", "Over ₦2m", UNSURE],
        showIf: wantsAds,
      },
      {
        key: "n_how", kind: "notice", label: "How we work",
        hint: "We plan a content calendar, schedule the posts and bring trend ideas. You approve content before we post it.",
      },
      {
        key: "social_approval_speed", kind: "cards", label: "How fast can you approve posts?",
        options: ["Same day", "Within two days", "About a week"],
        showIf: MID,
      },
      {
        key: "social_goal", assist: true, kind: "cards", label: "What do you most want social media to achieve?",
        options: ["Awareness", "Sales", "Bookings", "Community", "Recruitment", "Other"],
        showIf: MID,
      },
      { key: "social_goal_other", label: "What other result matters to you?", kind: "text", showIf: [MID, { key: "social_goal", equals: ["Other"] }] },
      {
        key: "social_report", kind: "cards", label: "How often would you like a report?",
        options: ["Every week", "Every month", "Every three months"],
        showIf: MID,
      },
      {
        key: "social_success", assist: true, kind: "text", label: "What would count as success?",
        placeholder: "For example: 20 enquiries a month",
        showIf: MID,
      },
    ],
  },
  {
    phase: "work", id: "social_more", service: "social", title: "A little more detail",
    blurb: "For a large plan. All optional.",
    fields: [
      {
        key: "content_types", assist: true, kind: "multi", label: "Which kinds of content connect with your audience?",
        options: ["Short video", "Photos", "Carousels", "Stories", "Live", "Written posts", "Memes and humour", "Behind the scenes", "Other"],
        showIf: BIG,
      },
      { key: "social_results", label: "Past results", kind: "textarea", placeholder: "Numbers if you have them", showIf: BIG },
      { key: "social_results_files", label: "Or upload screenshots", kind: "upload", showIf: BIG },
      {
        key: "social_notes", label: "Anything to keep, avoid or plan around?", kind: "textarea",
        placeholder: "Themes to keep, things to stay away from, accounts you admire, launches coming up",
        showIf: BIG,
      },
    ],
  },
];
