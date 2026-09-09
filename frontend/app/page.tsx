import IntroAnimation from "@/components/intro/intro-animation";
import { Header } from "@/components/layout/header";
import { Hero } from "@/components/sections/hero";
import PreviewBody from "@/components/preview/preview-body";
import { FAQS } from "@/lib/faq";
import { CONTACT_EMAIL } from "@/lib/site";

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
      <Header />
      <main className="flex-1">
        {/* The intro's logos land in #hero-marquee, so this hero is the payoff
            of the intro animation. The wrapper carries the hero overrides. */}
        <div className="pv-hero">
          <Hero />
        </div>
        <PreviewBody />
      </main>

      <footer className="pv">
        <div
          className="pv-sec pv-sec--band"
          style={{ paddingBlock: "clamp(2.4rem,4vw,3.4rem)" }}
        >
          <div className="pv-wrap">
            <p style={{ color: "var(--on-band-dim)", fontSize: ".9rem", textAlign: "center" }}>
              © {new Date().getFullYear()} We Dig Creativity Solutions. All rights reserved.{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--accent)" }}>
                {CONTACT_EMAIL}
              </a>
            </p>
            <p
              style={{
                color: "var(--on-band-dim)",
                fontSize: ".9rem",
                textAlign: "center",
                marginTop: 6,
              }}
            >
              ...brilliant simplicity{" "}
              <strong style={{ color: "var(--accent)" }}>of thought!</strong>
            </p>
          </div>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
