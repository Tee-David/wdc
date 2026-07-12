"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import Link from "next/link";
import { WdcMark } from "@/components/brand/logo";
import { ScrollReveal, type RevealToken } from "@/components/ui/scroll-reveal";

/* ── Inline service icons (stroke, inherit currentColor) ─────────────── */

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-7 w-7",
};

function BrandingIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M12 19l7-7a2.8 2.8 0 0 0-4-4l-7 7-1.5 5.5L12 19Z" />
      <path d="M13.5 6.5 17.5 10.5" />
      <path d="M4 4.5l.7 1.8L6.5 7l-1.8.7L4 9.5l-.7-1.8L1.5 7l1.8-.7L4 4.5Z" />
    </svg>
  );
}

function SeoIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
      <path d="M8.5 11h5M11 8.5v5" />
    </svg>
  );
}

function WebIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M8.5 8.5 5 12l3.5 3.5" />
      <path d="M15.5 8.5 19 12l-3.5 3.5" />
      <path d="M13 6.5 11 17.5" />
    </svg>
  );
}

function AppIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <rect x="7" y="3" width="10" height="18" rx="2.4" />
      <path d="M11 18h2" />
    </svg>
  );
}

function EngineeringIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9.5 9.5h5v5h-5z" />
      <path d="M9 3v2M15 3v2M9 19v2M15 19v2M3 9h2M3 15h2M19 9h2M19 15h2" />
    </svg>
  );
}

function SocialIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M4 9v4a1 1 0 0 0 1 1h2l4.5 3.5V4.5L7 8H5a1 1 0 0 0-1 1Z" />
      <path d="M16.5 9.5a3 3 0 0 1 0 5" />
      <path d="M19 7a6.5 6.5 0 0 1 0 10" />
    </svg>
  );
}

/* ── Services ────────────────────────────────────────────────────────── */

type Service = {
  title: string;
  description: string;
  icon: ReactNode;
  gradient: string;
};

const SERVICES: Service[] = [
  {
    title: "Branding & Design",
    description:
      "Identity systems, logos, and visuals that make brands unmistakable.",
    icon: <BrandingIcon />,
    gradient: "from-[#FF6500] to-[#ff9142]",
  },
  {
    title: "SEO",
    description:
      "Get found — technical, on-page, and content SEO that ranks and converts.",
    icon: <SeoIcon />,
    gradient: "from-[#000065] to-[#2323a8]",
  },
  {
    title: "Full-Stack Web Development",
    description:
      "Fast, accessible, scalable websites and web apps built to perform.",
    icon: <WebIcon />,
    gradient: "from-[#0b1a8c] to-[#3a5bd4]",
  },
  {
    title: "Cross-Platform App Development",
    description:
      "One codebase, every device — native-quality mobile experiences.",
    icon: <AppIcon />,
    gradient: "from-[#1a0a55] to-[#5a2ea6]",
  },
  {
    title: "Software Engineering & AI",
    description:
      "Custom software and AI integrations engineered for real outcomes.",
    icon: <EngineeringIcon />,
    gradient: "from-[#000065] to-[#0a5a5a]",
  },
  {
    title: "Social Media & PPC",
    description:
      "Turn attention into growth with paid ads and social that moves.",
    icon: <SocialIcon />,
    gradient: "from-[#ff5a1f] to-[#ff8c00]",
  },
];

const REVEAL_TOKENS: RevealToken[] = [
  "We create striking concepts and",
  { highlight: "branding" },
  {
    icon: <WdcMark className="h-[0.85em] w-auto" />,
    label: "We Dig Creativity",
  },
  "that help your business",
  { highlight: "grow fast." },
];

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
      aria-hidden="true"
    >
      <path d="M2 8h11M9 3.5 13.5 8 9 12.5" />
    </svg>
  );
}

export function Services() {
  return (
    <section
      id="services"
      className="border-t border-line bg-surface/40 py-24 dark:bg-surface/20 md:py-32"
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-10">
        {/* Scroll-reveal statement */}
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
            What we do
          </p>
          <ScrollReveal
            tokens={REVEAL_TOKENS}
            className="text-center"
            textClassName="text-[2rem] leading-[1.2] sm:text-4xl md:text-5xl"
          />
        </div>

        {/* Service cards */}
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service, i) => (
            <motion.a
              key={service.title}
              href="#contact"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              whileHover={{ y: -6 }}
              className={`group relative flex flex-col items-center overflow-hidden rounded-3xl bg-gradient-to-br ${service.gradient} p-7 text-center text-white shadow-[0_18px_40px_-18px_rgba(0,0,101,0.5)] transition-shadow duration-300 hover:shadow-[0_26px_60px_-20px_rgba(0,0,101,0.6)] sm:items-start sm:text-left`}
            >
              {/* Ambient sheen */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl transition-transform duration-500 group-hover:scale-125"
              />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                {service.icon}
              </span>
              <h3 className="relative mt-6 font-heading text-xl font-bold tracking-tight">
                {service.title}
              </h3>
              <p className="relative mt-2 text-sm leading-relaxed text-white/85">
                {service.description}
              </p>
              <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                Learn more
                <ArrowIcon />
              </span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
