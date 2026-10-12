"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { CONTACT_EMAIL } from "@/lib/site";
import "@/components/preview/preview.css";
import "@/components/work/work.css";

/**
 * ANY PUBLIC PAGE THAT FAILS TO RENDER (a database timeout, a malformed
 * record). Without this, Next shows its own unstyled "Application error" with
 * no navigation and no way to try again. Said plainly, with the three ways
 * forward: try again, go home, or write to us.
 */
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <>
      <Header overHero />
      <main id="main" tabIndex={-1} className="flex-1 pv">
        <section className="wk-hero">
          <div className="pv-wrap wk-hero__in">
            <span className="pv-eyebrow">Something went wrong</span>
            <h1 className="pv-mix">This page <b>did not load</b>.</h1>
            <p className="pv-lede">
              Something failed on our side. Nothing you did caused it, and nothing you typed elsewhere is lost.
            </p>
          </div>
        </section>
        <section className="pv-sec">
          <div className="pv-wrap" style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", alignItems: "center" }}>
            <button type="button" className="pv-btn pv-btn--accent" onClick={() => reset()}>Try again</button>
            <Link className="pv-btn pv-btn--line" href="/">Go to the homepage</Link>
            <p style={{ flexBasis: "100%", margin: ".5rem 0 0" }}>
              Still stuck? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and tell us which page.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
