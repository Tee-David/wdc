import type { Metadata } from "next";
import Script from "next/script";

import IntroAnimation from "@/components/intro/intro-animation";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/sections/hero";
import PreviewBody from "@/components/preview/preview-body";
import { FAQS } from "@/lib/faq";
import { CONTACT_EMAIL } from "@/lib/site";

import "./preview.css";

export const metadata: Metadata = {
  title: "Preview — We Dig Creativity",
  description:
    "Preview of the redesigned We Dig Creativity homepage. Branding, SEO, web and app development, and AI-powered software engineering.",
  robots: { index: false, follow: false },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function PreviewPage() {
  return (
    <>
      {/*
        The intro must stay mounted here. layout.tsx stamps data-intro="play" on
        <html> for every route and globals.css paints an opaque cover at z-99
        until the intro sets data-intro="done" — a page without it would sit
        under that cover forever. Keeping it also makes this a true preview of
        the homepage it will replace.
      */}
      <IntroAnimation />
      <Header />
      <main className="flex-1">
        {/* Reused unchanged: the intro's logos land in #hero-marquee, so this
            hero is the payoff of the intro animation and must not be replaced.
            The wrapper only carries preview-scoped overrides. */}
        <div className="pv-hero">
          <Hero />
        </div>
        <PreviewBody />
      </main>

      <footer className="pv">
        <div className="pv-sec pv-sec--band" style={{ paddingBlock: "clamp(2.4rem,4vw,3.4rem)" }}>
          <div className="pv-wrap">
            <p style={{ color: "var(--on-band-dim)", fontSize: ".9rem", textAlign: "center" }}>
              © {new Date().getFullYear()} We Dig Creativity Solutions. All rights reserved.{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)" }}>
                {CONTACT_EMAIL}
              </a>
            </p>
            <p style={{ color: "var(--on-band-dim)", fontSize: ".9rem", textAlign: "center", marginTop: 6 }}>
              ...brilliant simplicity{" "}
              <strong style={{ color: "var(--accent)" }}>of thought!</strong>
            </p>
          </div>
        </div>
      </footer>

      <Script
        id="pv-faq-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
