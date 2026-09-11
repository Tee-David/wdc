import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { SiteFooter } from "@/components/layout/site-footer";
import AboutBody from "@/components/about/about-body";
import { COMPANY_NAME, CONTACT_EMAIL, MOTTO, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "We Dig Creativity Solutions is a creative and digital studio. Design, engineering and growth in one team, so the brand, the product and the traffic arrive as one piece of work.",
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: "About | We Dig Creativity",
    description:
      "The studio behind the work: design, engineering and growth under one roof.",
    type: "website",
    url: `${SITE_URL}/about`,
  },
};

/* AboutPage wrapping the Organization node. Search engines read the company
   facts off `mainEntity`, so the email and motto live here as data rather than
   only as rendered copy. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `About ${SITE_NAME}`,
  url: `${SITE_URL}/about`,
  mainEntity: {
    "@type": "Organization",
    name: COMPANY_NAME,
    alternateName: SITE_NAME,
    url: SITE_URL,
    slogan: MOTTO,
    email: CONTACT_EMAIL,
    description:
      "A creative and digital studio: branding and design, SEO, full-stack web development, cross-platform apps, software engineering with AI, and social media and PPC.",
  },
};

export default function AboutPage() {
  return (
    <>
      <Header overHero />
      <main className="flex-1">
        <AboutBody />
      </main>
      {/* /about had no footer at all. Not a regression from the rebuild: this
          page never rendered one, so it was the only route on the site that
          ended with nothing under it. */}
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
