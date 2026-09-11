"use client";

import { motion } from "motion/react";
import {
  AnimatedTestimonials,
  type Testimonial,
} from "@/components/ui/animated-testimonials";
import { TESTIMONIALS } from "@/lib/testimonials";
import { caseBySlug } from "@/lib/work";

/**
 * The wall reads from lib/testimonials.ts, which holds what clients actually
 * said. What used to be here was eight invented quotes from eight invented
 * people at eight invented companies — see the note in that file.
 *
 * The sector and city under each name come from the case study, so the two
 * cannot disagree: a client renamed in one place is renamed in both. No role
 * line, because none was given and we are not going to make one up.
 */
const DATA: Testimonial[] = TESTIMONIALS.map((t) => {
  const cs = caseBySlug(t.slug);
  return {
    description: t.text,
    name: t.client,
    handle: cs ? `${cs.sector} · ${cs.location}` : "",
  };
});

export function Testimonials() {
  return (
    <section
      id="testimonials"
      /* Flat edges — tucks beneath the Services' bottom curve and the
         footer's top curve, filling both seams with its own colour. */
      className="relative z-0 -mt-10 flex min-h-svh flex-col justify-center overflow-hidden bg-[#000065] py-32 text-white dark:bg-background dark:text-foreground md:-mt-16 md:py-40 lg:-mt-[5.5rem] lg:py-48"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mx-auto mb-14 max-w-2xl px-6 text-center lg:px-10"
      >
        <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-secondary dark:border-line dark:bg-surface/60">
          Testimonials
        </p>
        <h2 className="font-heading text-[clamp(1.55rem,6.5vw,4.25rem)] font-bold leading-[1.15] tracking-tight text-white dark:text-foreground">
          Trusted by brands that{" "}
          <span className="text-secondary">dig deeper</span>
        </h2>
        <p className="mx-auto mt-6 max-w-5xl text-base leading-relaxed text-white/65 dark:text-muted md:text-lg">
          Founders and teams who care about speed, clarity, and results; and
          the work that earned their trust.
        </p>
      </motion.div>

      <AnimatedTestimonials data={DATA} />
    </section>
  );
}
