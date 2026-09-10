import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Globe, Mail, MessageSquare, Phone } from "lucide-react";
import { Header } from "@/components/layout/header";
import { WorkFooter } from "@/components/work/work-footer";
import ContactForm from "@/components/contact/contact-form";
import { CHANNELS } from "@/lib/contact";
import { FAQS } from "@/lib/faq";
import { PROJECTS } from "@/lib/projects";
import { COMPANY_NAME, CONTACT_EMAIL, SITE_URL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/contact/contact.css";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell us what you are trying to achieve and we will come back the same working day. Branding, SEO, web, apps, software and AI, social and PPC.",
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: "Contact | We Dig Creativity",
    description: "Tell us what you are trying to achieve. We reply the same working day.",
    type: "website",
    url: `${SITE_URL}/contact`,
  },
};

/* Only the names lucide actually exports, looked up rather than constructed:
   an unknown name renders nothing at all and the row loses its icon silently. */
const ICONS = { Mail, Phone, Clock, Globe } as const;

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Contact", item: `${SITE_URL}/contact` },
  ],
};

/* The same FAQ that feeds the homepage, so an answer cannot be updated in one
   place and go stale in the other. */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  url: `${SITE_URL}/contact`,
  mainEntity: {
    "@type": "Organization",
    name: COMPANY_NAME,
    url: SITE_URL,
    email: CONTACT_EMAIL,
  },
};

export default function ContactPage() {
  const channels = CHANNELS.filter((c) => c.value);

  return (
    <>
      <Header />
      <main className="flex-1 pv">
        <section className="pv-sec" style={{ paddingTop: "clamp(7rem, 12vw, 10rem)" }}>
          <div className="pv-wrap">
            <div className="ct-cols">
              {/* the ask */}
              <div>
                <span className="ct-pill">
                  <MessageSquare aria-hidden="true" />
                  Contact
                </span>
                <h1 className="ct-h">How can we help you today?</h1>
                <p className="pv-lede ct-lede">
                  Tell us what you are trying to achieve rather than what you think you
                  need built. We will come back the same working day, and we will say
                  plainly if it is not something we should be doing for you.
                </p>

                {/* Rendered from data, so a channel with nothing published
                    simply is not here — see the note at the top of
                    lib/contact.ts about the row that is deliberately empty. */}
                <div className="ct-lines">
                  {channels.map((c) => {
                    const Icon = ICONS[c.icon as keyof typeof ICONS] ?? Mail;
                    return (
                      <div className="ct-line" key={c.id}>
                        <span className="ct-line__i" aria-hidden="true"><Icon /></span>
                        <span className="ct-line__t">
                          <span className="ct-line__k">{c.label}</span>
                          <span className="ct-line__v">
                            {c.href ? <a href={c.href}>{c.value}</a> : c.value}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* the form */}
              <div className="ct-card">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>

        {/* The reference puts a row of household logos here under "trusted by".
            Ours are the sites we actually built, linked and live, because a
            strip of brands we have never worked with would be the one claim
            this page cannot afford to make. */}
        <section className="pv-sec pv-sec--alt" style={{ paddingBlock: "clamp(2.4rem, 4vw, 3.4rem)" }}>
          <div className="pv-wrap">
            <div className="ct-strip">
              <p className="ct-strip__k">Recent clients — every one of these is live</p>
              <div className="ct-strip__row">
                {PROJECTS.map((p) => (
                  <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer">
                    {p.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="pv-sec">
          <div className="pv-wrap">
            <div className="pv-head">
              <span className="pv-eyebrow">Before you write</span>
              <h2 className="pv-mix">Frequently <b>asked</b></h2>
            </div>
            {/* Native details/summary: it is keyboard-operable, findable by the
                browser's own in-page search even while collapsed, and needs no
                JavaScript to open. */}
            <div className="ct-faq">
              {FAQS.map((f) => (
                <details key={f.q}>
                  <summary>
                    {f.q}
                    <i aria-hidden="true" />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
            <p style={{ textAlign: "center", marginTop: "clamp(1.6rem, 3vw, 2.4rem)" }}>
              <Link className="pv-btn pv-btn--line" href="/work">See the work first</Link>
            </p>
          </div>
        </section>
      </main>

      <WorkFooter cta={false} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbJsonLd, contactJsonLd, faqJsonLd]),
        }}
      />
    </>
  );
}
