/**
 * Client testimonials. Real ones.
 *
 * WHAT REPLACED WHAT. Two arrays used to stand here and on the homepage,
 * holding eight and six invented quotes attributed to invented people at
 * invented companies — "Amara Okonkwo, Founder, Lumen Studios", "Daniel Reyes,
 * CTO, Fielded". They were placeholders, and the comment above them said so,
 * but a placeholder testimonial is not a lorem paragraph: it is a fabricated
 * endorsement, and it was rendering on a live marketing site as though those
 * people had said those words. Every one of them is gone.
 *
 * ATTRIBUTION. These came from WDC's clients, given as the organisation's
 * words rather than a named individual's. So they are attributed to the
 * ORGANISATION, and there is no `role` field here on purpose — inventing "Ops
 * Manager" or "Founder" to fill a line would put the same fiction back in a
 * smaller font. The second line is the client's sector and city, which is a
 * fact already recorded against each of them in lib/work.ts.
 *
 * `slug` ties each one to its case study, so a testimonial can be shown on the
 * page it is about and the two cannot drift apart. Any slug added here must
 * exist in CASE_STUDIES; `testimonialFor` returns undefined rather than
 * guessing if it does not.
 *
 * THE RULE, unchanged from lib/work.ts: nothing in this file may be written by
 * us. If a client has not said it, it does not appear here.
 */

export type Testimonial = {
  /** The case study this belongs to, from lib/work.ts. */
  slug: string;
  /** The client, as they are named everywhere else on the site. */
  client: string;
  /** Their words, verbatim. Never tightened, never paraphrased. */
  text: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    slug: "moore-designs",
    client: "Moore Designs",
    text:
      "In Lagos, customers still judge a tailor by the shopfront and the packaging before they even try the clothes. Ours finally look like they belong to the same business.",
  },
  {
    slug: "marfaa-authentic",
    client: "MARFAA Authentic",
    text:
      "Most local streetwear brands lose their logo the moment it hits black fabric or cheap hang tags. This one still reads cleanly after washing and under market lighting.",
  },
  {
    slug: "dhiol-world",
    client: "Dhiol World",
    text:
      "Running four related businesses from one place used to confuse both staff and customers. People would ask which company they were actually dealing with. That confusion is gone.",
  },
  {
    slug: "the-ajoks-brand",
    client: "TAB The Ajoks Brand",
    text:
      "Too many designers give you a logo that only looks good on a phone screen. These lockups still work on fabric labels, receipts and the small stamps we use daily.",
  },
  {
    slug: "millcon-corporate-profile",
    client: "Millcon & Millcon Consult Limited",
    text:
      "Most corporate profiles look fine on a laptop and collapse the moment a client prints them on a regular office printer. This one still looks serious even on average paper.",
  },
  {
    slug: "realtors-practice",
    client: "Realtors' Practice",
    text:
      "Agents were managing listings and clients across WhatsApp, Excel and random notebooks. Everything now sits in one place they can actually open when a buyer calls.",
  },
  {
    slug: "litch-consulting",
    client: "Litch Consulting",
    text:
      "Clients in this space expect numbers to look serious. Soft or overly colourful design makes them doubt the work. The current look matches the seriousness of the data.",
  },
  {
    slug: "jomo-resource-center",
    client: "Jomo Resource Center",
    text:
      "Parents and students used to find random social media posts before they found the actual courses. The site and search presence now bring them to the right information first.",
  },
  {
    slug: "speak-up-for-a-change",
    client: "Speak Up For A Change",
    text:
      "Different flyers and posters kept giving people different impressions of the organisation. The visual system finally stays consistent whether they see it online or on the street.",
  },
  {
    slug: "exambeta-travels",
    client: "Exambeta Travels & Tours",
    text:
      "People spending serious money on education abroad are already suspicious of agents. The previous site made us look like every other operator. This one feels more considered.",
  },
  {
    slug: "bamssa-oou",
    client: "BAMSSA OOU",
    text:
      "Student association materials usually look like they were designed overnight by different people. This year's set actually feels like one administration from the first poster to the final programme.",
  },
  {
    slug: "traxstaff",
    client: "TraxStaff",
    text:
      "Most time-tracking tools feel like extra work, so teams stop using them after two weeks. This one stayed simple enough that supervisors still see daily entries.",
  },
  {
    slug: "nomarc-projects",
    client: "Nomarc Projects",
    text:
      "Construction hiring was living in WhatsApp groups and scattered Excel sheets. Supervisors can now post and review openings without needing extra training or chasing people.",
  },
];

/** The testimonial for a case study, if that client has given one. */
export const testimonialFor = (slug: string): Testimonial | undefined =>
  TESTIMONIALS.find((t) => t.slug === slug);
