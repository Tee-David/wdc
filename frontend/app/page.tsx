import IntroMount from "@/components/intro/intro-mount";
import { SiteFooter } from "@/components/layout/site-footer";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/sections/hero";
import PreviewBody from "@/components/preview/preview-body";
import type { Faq } from "@/lib/faq";
import { siteFaqs } from "@/lib/site-content";
import { hydrateCaseStudies } from "@/lib/work-db";

/* Built from the same list the accordion shows, which the admin can edit. */
const faqJsonLdFor = (faqs: Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

export default async function Home() {
  await hydrateCaseStudies();
  const { faqs } = await siteFaqs();
  const faqJsonLd = faqJsonLdFor(faqs);
  return (
    <>
      {/*
        The intro must stay the first child. layout.tsx stamps data-intro on
        <html> before first paint and globals.css paints a cover until the
        intro sets data-intro="done".

        IntroMount loads the animation itself only on the visits that play it
        -- it is the heaviest client component on this page and most visits
        never see it.
      */}
      <IntroMount />
      {/* Over the film a phone shows only the mark and the menu: the hero's
          own pair is on screen, so a third "Start" in the bar is noise until
          the visitor scrolls past them. */}
      <Header overHero filmHero markOnlyOnPhones />
      <main id="main" tabIndex={-1} className="flex-1">
        {/* The intro's logos land in #hero-marquee, the tool rail directly
            under the film, so the hero is still the payoff of the intro. */}
        <Hero />
        <PreviewBody faqs={faqs} />
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
