import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * POLICY TEXT WITH ITS LINKS. The policies are plain strings, so a document
 * that names another is linked here, at render time, from one list: write
 * "Privacy Policy" anywhere and it becomes a link to it, and nobody has to
 * remember to. The studio's email becomes a mail link. A name never links to
 * the page it is on, and each phrase is linked in every paragraph it appears
 * in, which is short enough that it does not read as noise.
 */
const TARGETS: { phrase: string; slug?: string; tab?: string }[] = [
  { phrase: "Client Engagement Policy", slug: "client-engagement-policy" },
  { phrase: "Payments and Refunds Policy", slug: "payments-and-refunds" },
  { phrase: "Messages and Reminders Policy", slug: "messages-and-reminders" },
  { phrase: "Privacy Policy", slug: "privacy-policy" },
  { phrase: "Cookie Policy", slug: "cookie-policy" },
  { phrase: "Terms of Service", slug: "terms-of-service" },
  { phrase: "Domains and hosting tab", slug: "client-engagement-policy", tab: "domains" },
  { phrase: "Payments and integrations tab", slug: "client-engagement-policy", tab: "payments" },
];

export default function Rich({ text, here }: { text: string; here: string }) {
  const escaped = [CONTACT_EMAIL, ...TARGETS.map((t) => t.phrase)].map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`(${escaped.join("|")})`));
  return (
    <>
      {parts.map((part, i): ReactNode => {
        if (part === CONTACT_EMAIL) return <a key={i} href={`mailto:${CONTACT_EMAIL}`}>{part}</a>;
        const target = TARGETS.find((t) => t.phrase === part);
        if (!target) return part;
        const href = target.slug === here ? (target.tab ? `#${target.tab}` : null) : `/policies/${target.slug}${target.tab ? `#${target.tab}` : ""}`;
        if (!href) return part;
        return href.startsWith("#") ? <a key={i} href={href}>{part}</a> : <Link key={i} href={href}>{part}</Link>;
      })}
    </>
  );
}

/** "Related policies" under every policy: where to read the others. */
export function SeeAlso({ here, docs }: { here: string; docs: { slug: string; title: string }[] }) {
  return (
    <nav className="lg-also" aria-label="Related policies">
      <p>Related policies</p>
      <ul>
        {docs.filter((d) => d.slug !== here).map((d) => <li key={d.slug}><Link href={`/policies/${d.slug}`}>{d.title}</Link></li>)}
      </ul>
    </nav>
  );
}
