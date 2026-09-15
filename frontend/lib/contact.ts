/**
 * The channels shown on /contact.
 *
 * ONLY WHAT IS PUBLISHED. The reference layout has three rows — email, phone,
 * a street address — and it would be trivial to fill all three. But a phone
 * number nobody answers and an address nobody is at are worse than a missing
 * row: they cost a lead its reply and the studio its credibility. So a channel
 * with no `value` does not render, and the two rows below that are not an
 * email are things the site already says about itself elsewhere:
 *
 *   - the same-working-day reply is the promise on the homepage contact band
 *   - working remotely with brands anywhere is the answer in the published FAQ
 *
 * TO ADD A PHONE OR AN OFFICE: fill in `value` (and `href` for a tel: link)
 * on the entry below. The row appears, in order, with no component change.
 */
import { CONTACT_EMAIL } from "./site";

export type Channel = {
  id: string;
  /** lucide-react export name. PascalCase — lucide ships no lowercase exports,
      and an unknown name renders nothing at all. */
  icon: string;
  label: string;
  /** Empty string means "we have not published this" and the row is skipped. */
  value: string;
  href?: string;
};

export const CHANNELS: Channel[] = [
  {
    id: "email",
    icon: "Mail",
    label: "Email",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    id: "phone",
    icon: "Phone",
    label: "Phone",
    /* Deliberately empty. There is no published number; inventing one is how a
       contact page starts costing enquiries. Fill this in and the row appears. */
    value: "",
  },
  {
    id: "reply",
    icon: "Clock",
    label: "Reply time",
    value: "Same working day",
  },
  {
    id: "where",
    icon: "Globe",
    label: "Working with",
    /* "Remote-first" is how a studio describes itself to other studios. A
       client reading this row wants to know whether we can take their work,
       not what our internal setup is called -- and the published FAQ answer is
       already the plainer version of it: clients across Nigeria and beyond. */
    value: "Clients across Nigeria and beyond",
  },
];

/** What the enquiry form offers as a subject. Drawn from the six services so
    the list cannot drift from what the studio actually sells. */
export const ENQUIRY_TOPICS = [
  "Brand & Business Identity",
  "SEO",
  "Full-Stack Web Development",
  "Cross-Platform Apps",
  "Software Engineering & AI",
  "Social Media & PPC",
  "Something else",
] as const;
