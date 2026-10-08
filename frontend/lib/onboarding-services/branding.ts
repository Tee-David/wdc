import { UNSURE, type Cond, type OptionInfo, type Step } from "../onboarding-shared";

/**
 * The Branding & Design form, Size first, after the UX research
 * (plans/onboarding-ux-research.md, E1 and D).
 *
 * A small job is six questions: how big, what we are making, what you have,
 * the style route, colours, and timing (timing is on the shared closing
 * screen). Everything else opens only at a bigger size, or when a later pick
 * calls for it: ticking Brand guidelines on a small job still reaches the
 * colour screen, because the colour screen follows the DELIVERABLE, not the
 * size.
 *
 * Required: the size, what we are making and what you have. The style route is
 * optional, and skipping it is treated as "Suggest for me, no directions".
 */

export const SIZE_KEY = "job_size";

const SMALL = "One piece or a small set";
const MEDIUM = "Several pieces";
const FULL = "A full brand";

const LOGO = "Logo";
const IDENTITY = "Full identity system";
const GUIDE = "Brand guidelines";
const FLYERS = "Flyers";
const TEMPLATES = "Social templates";
const PROMO = "Promotional branding";
const PACKAGING = "Packaging";
const SIGNAGE = "Signage";
const STATIONERY = "Stationery and cards";
const DECK = "Pitch deck";
const APPAREL = "Apparel and uniform";
const MOTION = "Motion design";
const OTHER = "Other";

/**
 * One picture per card, from work already public on the site. Kept to one so
 * the first view of this question is not a wall of images on a weak network.
 */
export const DELIVERABLE_INFO: Record<string, OptionInfo> = {
  [LOGO]: { desc: "The mark people remember you by.", images: ["/brand-work/sm/thinkers-diary-logo.jpg"] },
  [IDENTITY]: { desc: "Your logo, the brand guidelines, logo files in every size and colour, and mockups.", images: ["/brand-work/sm/moore-mockups.jpg"] },
  [GUIDE]: { desc: "Only the guide, for a logo you already have. A full identity system already includes it.", images: ["/brand-work/sm/tab-guide-4.jpg"] },
  [FLYERS]: { desc: "Posters and flyers for print and for feeds.", images: ["/brand-work/sm/bay-accessories-flyer.jpg"] },
  [TEMPLATES]: { desc: "Post layouts you can reuse every week.", images: ["/brand-work/sm/nipsa-codm.jpg"] },
  [PROMO]: { desc: "Sale and campaign artwork.", images: ["/brand-work/sm/hair-sale.jpg"] },
  [PACKAGING]: { desc: "Boxes, labels and shopping bags.", images: ["/brand-work/sm/marfaa-packaging.jpg"] },
  [SIGNAGE]: { desc: "Signs and storefronts.", images: ["/brand-work/sm/moore-signage.jpg"] },
  [STATIONERY]: { desc: "Business cards, letterheads and ID cards.", images: ["/brand-work/sm/stationery-set.jpg"] },
  [DECK]: { desc: "A presentation built from your brand.", images: ["/brand-work/sm/realtors-deck-cover.jpg"] },
  [APPAREL]: { desc: "Uniforms, shirts and caps.", images: ["/brand-work/sm/marfaa-apparel.jpg"] },
  [MOTION]: { desc: "Logo reveals, promo videos, reels and explainers.", images: ["/work/motion/wdc-promo-brand.jpg"] },
  [OTHER]: { desc: "Something not on this list." },
};

/** Medium and large jobs, and a client who is not sure (the middle set). */
const MID: Cond = { tier: 2 };
const BIG: Cond = { tier: 3 };

const has = (...values: string[]): Cond => ({ key: "deliverables", equals: values });
const REPEAT = has(FLYERS, TEMPLATES, PROMO);
/* The colour screen follows the deliverable: these four always reach it. */
const COLOURS_NEEDED: Cond = { any: [has(IDENTITY, GUIDE, FLYERS, TEMPLATES)] };

const haveLogo: Cond = { key: "brand_have", equals: ["A logo"] };
const haveGuide: Cond = { key: "brand_have", equals: ["A brand guide"] };
const wantsStyle: Cond = { key: "style_help", equals: ["I have references", "A bit of both"] };
const wantsDirections: Cond = { key: "style_help", equals: ["Suggest for me", "A bit of both"] };

export const BRANDING_STEPS: Step[] = [
  {
    phase: "work", id: "branding", service: "branding", title: "What we are making",
    blurb: "Tell us how big it is, and what you need.",
    fields: [
      {
        key: SIZE_KEY, assist: true, required: true, kind: "cards",
        label: "How big is this job?",
        hint: "Rough is fine. We confirm it with you later.",
        options: [SMALL, MEDIUM, FULL],
        optionInfo: {
          [SMALL]: { desc: "For example one logo, or a few flyers." },
          [MEDIUM]: { desc: "For example a logo, a look and some social posts." },
          [FULL]: { desc: "A whole identity, with guidelines and more." },
        },
      },
      {
        key: "deliverables", assist: true, required: true, kind: "multi",
        label: "What are we making?",
        hint: "Tap as many as you need.",
        tip: "A logo is your identifying symbol or name. A full identity system is the whole package: your logo, the brand guidelines, the logo files in every size, colour and layout (PNG and SVG), plus mockups and sample artwork. Choose Brand guidelines on its own only if you already have the logo and just need the rules written down. Packaging covers boxes, labels and bags. Signage covers signs. Social templates are reusable post layouts. A pitch deck is a presentation.",
        options: [LOGO, IDENTITY, GUIDE, FLYERS, TEMPLATES, PROMO, PACKAGING, SIGNAGE, STATIONERY, DECK, APPAREL, MOTION, OTHER],
        optionInfo: DELIVERABLE_INFO,
      },
      { key: "deliverables_other", label: "What else would you like us to create?", kind: "text", showIf: has(OTHER) },
      {
        key: "motion_kinds", label: "What kind of motion?", kind: "multi",
        options: ["Logo reveal", "Promo video", "Social reel", "Explainer", "Website loop"],
        showIf: has(MOTION),
      },
      {
        key: "job_rhythm", label: "Is this a single piece, a batch, or every month?", kind: "cards",
        hint: "Flyers and social templates are small jobs. They can be one piece, a batch, or a monthly service.",
        options: ["One piece", "A batch", "Every month"],
        showIf: REPEAT,
      },
      {
        key: "batch_count", label: "About how many pieces?", kind: "cards",
        options: ["1 to 3", "4 to 10", "11 to 20", "More than 20"],
        showIf: [REPEAT, { key: "job_rhythm", equals: ["A batch", "Every month"] }],
      },
    ],
  },
  {
    phase: "work", id: "branding_have", service: "branding", title: "What you already have, and the look you want",
    blurb: "So we start from what you own and head where you want to go.",
    fields: [
      {
        key: "brand_have", required: true, kind: "multi",
        label: "What do you already have?",
        hint: "Tap everything that applies.",
        options: ["A logo", "Our colours", "A brand guide", "Nothing yet"],
      },
      { key: "logo_files", label: "Upload your logo", kind: "upload", showIf: haveLogo },
      { key: "brandbook_file", label: "Upload your brand guide", kind: "upload", showIf: haveGuide },
      {
        key: "untouchable", assist: true, label: "Anything that must not change?", kind: "textarea",
        tip: "A name, a colour or a logo people already know you by.",
        showIf: [BIG, { key: "brand_have", equals: ["A logo", "A brand guide"] }],
      },
      { key: "tagline", label: "Do you have a slogan or tagline?", kind: "text", placeholder: "Leave it if you do not", showIf: { any: [has(IDENTITY, GUIDE)] } },
      {
        key: "style_help", kind: "cards",
        label: "How would you like to set the style?",
        hint: "Optional. If you skip it, we will suggest a direction and confirm it with you.",
        options: ["I have references", "Suggest for me", "A bit of both"],
        optionInfo: {
          "I have references": { desc: "Send pictures or links you like." },
          "Suggest for me": { desc: "We choose a direction that fits your business." },
          "A bit of both": { desc: "Send a few, and we fill in the rest." },
        },
      },
      {
        key: "style_links", label: "Paste links to examples you like", kind: "textarea",
        placeholder: "Links, or names of brands, and what you like about each",
        hint: "Social handles are fine too.",
        showIf: wantsStyle,
      },
      { key: "style_files", label: "Or upload pictures you like", kind: "upload", showIf: wantsStyle },
      {
        key: "style_directions", kind: "yesno",
        label: "Would you like to see a few directions before we start?",
        hint: "Either way, we will do this properly. If you say no, we will choose a direction that fits your business and confirm it with you before we go further.",
        showIf: wantsDirections,
      },
    ],
  },
  {
    phase: "work", id: "branding_colours", service: "branding", title: "Colours",
    blurb: "About 30 seconds. Skip it if you like.",
    fields: [
      {
        key: "brand_colours", kind: "colours", label: "Your colours",
        hint: "Tap the feeling that is closest and we will suggest colours to match. You can change them later.",
        showIf: { any: [MID, has(IDENTITY, GUIDE, FLYERS, TEMPLATES)] },
      },
    ],
  },
  {
    phase: "work", id: "branding_fonts", service: "branding", title: "Fonts",
    blurb: "About 30 seconds. Skip it if you like.",
    fields: [
      {
        key: "brand_fonts", kind: "fonts", label: "Your fonts",
        hint: "Pick two to five pairings, or tell us the fonts you already use. We choose the one that agrees best.",
        showIf: { any: [MID, has(IDENTITY, GUIDE)] },
      },
    ],
  },
  {
    phase: "work", id: "branding_more", service: "branding", title: "A little more detail",
    blurb: "Only for a full brand. Say as much as you like.",
    fields: [
      {
        key: "surfaces", assist: true, label: "Where will people see your logo?", kind: "multi",
        tip: "Choose the places you expect to use it. Stitching, stamps and seals need a simple mark that stays clear when small, and a vehicle needs one that reads on a large moving surface.",
        options: ["Embroidery", "Signage", "Print", "Screen", "Packaging", "Vehicle", "Stamp or seal", "Other"],
        showIf: [BIG, has(LOGO, SIGNAGE, PACKAGING, APPAREL, IDENTITY)],
      },
      { key: "surfaces_other", label: "Where else must the brand work?", kind: "text", showIf: [BIG, { key: "surfaces", equals: ["Other"] }] },
      {
        key: "brand_voice", assist: true, label: "How should the brand sound?", kind: "multi",
        hint: "Tap the ones that fit. Two or three is plenty.",
        options: ["Formal", "Friendly", "Bold", "Playful", "Confident", "Witty", "Inspiring", "Other"],
        showIf: [BIG, has(IDENTITY, GUIDE)],
      },
      { key: "brand_voice_other", label: "How else should it sound?", kind: "text", showIf: [BIG, has(IDENTITY, GUIDE), { key: "brand_voice", equals: ["Other"] }] },
      {
        key: "brand_words", assist: true, label: "Pick up to three words for the personality", kind: "multi",
        options: ["Trusted", "Modern", "Warm", "Premium", "Fun", "Bold", "Calm", "Local"],
        showIf: [BIG, has(IDENTITY, GUIDE)],
      },
      { key: "avoid", assist: true, label: "Anything we should steer well clear of?", kind: "textarea", showIf: BIG },
    ],
  },
];

/** Used by the colour screen's copy and by tests. */
export { UNSURE, COLOURS_NEEDED };
