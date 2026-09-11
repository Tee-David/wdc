import IntroAnimation from "@/components/intro/intro-animation";
import { SiteFooter } from "@/components/layout/site-footer";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/sections/hero";
import PreviewBody from "@/components/preview/preview-body";
import { FAQS } from "@/lib/faq";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Home() {
  return (
    <>
      {/*
        IntroAnimation must stay the first child. layout.tsx stamps data-intro
        on <html> before first paint and globals.css paints a cover until the
        intro sets data-intro="done".
      */}
      <IntroAnimation />
      <Header overHero />
      <main className="flex-1">
        {/* The intro's logos land in #hero-marquee, so this hero is the payoff
            of the intro animation. The wrapper carries the hero overrides. */}
        <div className="pv-hero">
          <Hero />
        </div>
        <PreviewBody />
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
