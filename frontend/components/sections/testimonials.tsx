"use client";

import { motion } from "motion/react";
import {
  AnimatedTestimonials,
  type Testimonial,
} from "@/components/ui/animated-testimonials";

/**
 * Placeholder testimonials — swap for real client quotes (and add `image`
 * URLs) as they come in. Avatars fall back to initials badges until then.
 */
const TESTIMONIALS: Testimonial[] = [
  {
    description:
      "WDC rebuilt our brand and site from scratch; within two months we were ranking for terms we'd chased for years. The team just gets it.",
    name: "Amara Okonkwo",
    handle: "Founder, Lumen Studios",
  },
  {
    description:
      "The cross-platform app they shipped feels native on every device. Clean code, on time, and they actually explained the trade-offs.",
    name: "Daniel Reyes",
    handle: "CTO, Fielded",
  },
  {
    description:
      "Our organic traffic doubled in a quarter. WDC's SEO work is the real thing; technical depth plus content that converts.",
    name: "Priya Nair",
    handle: "Head of Growth, Northbeam",
  },
  {
    description:
      "Branding, design, and dev under one roof meant no hand-off gaps. The final product looked exactly like the vision.",
    name: "Marcus Bell",
    handle: "CEO, Cadence Labs",
  },
  {
    description:
      "They wired AI into our support flow and cut response times in half. Genuinely thoughtful engineering, not hype.",
    name: "Sofia Almeida",
    handle: "COO, Brightloop",
  },
  {
    description:
      "Every detail was considered; animations, accessibility, performance. Our Lighthouse scores have never been greener.",
    name: "Tobi Adeyemi",
    handle: "Product Lead, Kite",
  },
  {
    description:
      "The paid social campaigns paid for themselves in the first month. Sharp creative and even sharper targeting.",
    name: "Hannah Cole",
    handle: "Marketing Director, Verano",
  },
  {
    description:
      "Working with WDC felt like adding a senior team overnight. Responsive, honest, and relentlessly detail-obsessed.",
    name: "Wei Zhang",
    handle: "Founder, Parcel",
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="overflow-hidden bg-[#000065] py-24 text-white dark:bg-background dark:text-foreground md:py-32"
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

      <AnimatedTestimonials data={TESTIMONIALS} />
    </section>
  );
}
