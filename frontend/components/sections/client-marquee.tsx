"use client";

import LogoLoop from "@/components/ui/logo-loop";
import { CLIENT_LOGOS } from "@/lib/clients";

/* The row's base logo height. Each logo scales from it by its own `size`. */
const BASE = 26;

const ITEMS = CLIENT_LOGOS.map((logo) => {
  const h = Math.round(BASE * (logo.size ?? 1));
  return {
    title: logo.name,
    ariaLabel: logo.name,
    node: (
      /* ONE INK, set by the page: the files are black on transparent, so
         `brightness(0)` keeps them black on paper and `invert` makes them
         the light type colour on the dark theme. Opacity, not a second
         colour, sets them back from the headline type. */
      // eslint-disable-next-line @next/next/no-img-element -- 5-20 KB marks already cut to size; the optimiser would only add a request.
      <img
        src={logo.src}
        alt={logo.name}
        width={Math.round((logo.w / logo.h) * h)}
        height={h}
        loading="eager"
        decoding="async"
        draggable={false}
        className="block max-w-none opacity-70 brightness-0 transition-opacity duration-300 hover:opacity-100 dark:invert"
        style={{ height: h, width: "auto" }}
      />
    ),
  };
});

/**
 * "Trusted by teams at": the clients whose work is on this site, in one ink,
 * directly under the hero film. Replaced the tool rail here (owner,
 * 2026-11-23); the tools moved below the testimonials.
 */
export default function ClientMarquee() {
  return (
    /* Clipped sideways here: the rail's track is several copies wide and
       does not clip itself. */
    <section
      id="hero-marquee"
      aria-labelledby="clients-title"
      className="mx-auto w-full max-w-[1280px] overflow-x-clip px-4 pt-10 md:px-6 md:pt-12 lg:px-10"
    >
      <div className="mb-6 flex items-center gap-4" >
        <span aria-hidden="true" className="h-px flex-1 bg-current opacity-15" />
        <h2 id="clients-title" className="shrink-0 text-center font-heading text-sm font-medium tracking-wide text-muted">
          Trusted by teams at
        </h2>
        <span aria-hidden="true" className="h-px flex-1 bg-current opacity-15" />
      </div>
      <LogoLoop
        logos={ITEMS}
        speed={60}
        direction="left"
        logoHeight={Math.round(BASE * 1.5)}
        gap={64}
        pauseOnHover
        fadeOut
        ariaLabel="Clients we have worked with"
      />
    </section>
  );
}
