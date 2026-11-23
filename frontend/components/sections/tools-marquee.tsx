"use client";

import { LogoGlyph } from "@/components/ui/logo-glyph";
import LogoLoop from "@/components/ui/logo-loop";
import { LOGOS } from "@/lib/logos";

/* THE TOOLS, below the testimonials since 2026-11-23 (owner): the row under
   the hero now shows the clients, and the tools close the proof run instead. */
const MARQUEE_LOGOS = LOGOS.map((entry) => ({
  title: entry.name,
  ariaLabel: entry.name,
  node: (
    <span className="group flex shrink-0 items-center gap-2 text-muted transition-colors duration-300 hover:text-foreground">
      <LogoGlyph
        entry={entry}
        mono
        className="h-[1em] w-[1em] opacity-80 transition-opacity duration-300 group-hover:opacity-100"
      />
      <span className="text-sm font-medium leading-none">{entry.name}</span>
    </span>
  ),
}));

export default function ToolsMarquee() {
  return (
    /* CLIPPED SIDEWAYS HERE, because the rail does not clip itself: its track
       is several copies wide, and the hero section that used to hold it was
       doing the clipping. Without this the page was 20,000px wide. */
    <div className="mx-auto w-full max-w-[1280px] overflow-x-clip px-4 md:px-6 lg:px-10">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted">
        Powering brands with the world&apos;s best tools
      </p>
      <LogoLoop
        logos={MARQUEE_LOGOS}
        speed={90}
        direction="left"
        logoHeight={26}
        gap={44}
        pauseOnHover
        scaleOnHover
        fadeOut
        ariaLabel="Tools and platforms WDC works with"
      />
    </div>
  );
}
