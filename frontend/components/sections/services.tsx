"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import type { ReactNode } from "react";
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

/* ── Inline reveal-statement icons (bobbing) ─────────────────────────── */

function BobbingIcon({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <motion.span
      className="inline-flex"
      animate={{ y: [0, -6, 0], rotate: [0, -5, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.span>
  );
}

function SparkleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="h-[0.82em] w-[0.82em] text-secondary drop-shadow-[0_4px_12px_rgba(255,101,0,0.55)]"
    >
      <path d="M12 2l1.7 5.3a3 3 0 0 0 2 2L21 11l-5.3 1.7a3 3 0 0 0-2 2L12 20l-1.7-5.3a3 3 0 0 0-2-2L3 11l5.3-1.7a3 3 0 0 0 2-2L12 2Z" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[0.82em] w-[0.82em] text-primary dark:text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
    >
      <path d="M14.5 4 20 9.5 8.5 21H3v-5.5L14.5 4Z" />
      <path d="M13 5.5 18.5 11" />
    </svg>
  );
}

/* ── Services ────────────────────────────────────────────────────────── */

type Service = {
  title: string;
  description: string;
  icon: ReactNode;
  image: string;
};

const SERVICES: Service[] = [
  {
    title: "Branding & Design",
    description:
      "Identity systems, logos, motion, and visuals that make brands unmistakable across every surface.",
    icon: <BrandingIcon />,
    image:
      "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&q=80",
  },
  {
    title: "SEO",
    description:
      "Get found; technical, on-page, and content SEO that ranks, earns clicks, and converts.",
    icon: <SeoIcon />,
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
  },
  {
    title: "Full-Stack Web Development",
    description:
      "Fast, accessible, scalable websites and web apps engineered to perform and last.",
    icon: <WebIcon />,
    image:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80",
  },
  {
    title: "Cross-Platform App Development",
    description:
      "One codebase, every device; native-quality mobile experiences on iOS and Android.",
    icon: <AppIcon />,
    image:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80",
  },
  {
    title: "Software Engineering & AI",
    description:
      "Custom software and AI integrations engineered around real business outcomes.",
    icon: <EngineeringIcon />,
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
  },
  {
    title: "Social Media & PPC",
    description:
      "Turn attention into growth with paid ads and social content that actually moves.",
    icon: <SocialIcon />,
    image:
      "https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=1200&q=80",
  },
];

const REVEAL_TOKENS: RevealToken[] = [
  "We create",
  {
    icon: (
      <BobbingIcon>
        <PenIcon />
      </BobbingIcon>
    ),
    label: "craft",
  },
  "striking concepts and",
  { highlight: "branding" },
  {
    icon: (
      <BobbingIcon delay={0.7}>
        <SparkleIcon />
      </BobbingIcon>
    ),
    label: "spark",
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

function ServiceCard({ service }: { service: Service }) {
  return (
    <motion.a
      href="#contact"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.35,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group flex w-full shrink-0 snap-start flex-col"
    >
      <div className="relative aspect-[5/4] overflow-hidden rounded-3xl shadow-[0_20px_50px_-24px_rgba(0,0,101,0.55)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={service.image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000065]/45 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-40" />
        {/* Floating arrow: white pill + orange arrow at rest, inverting
            to an orange pill + white arrow on card hover. */}
        <span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-secondary shadow-lg transition-all duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6 group-hover:bg-secondary group-hover:text-white">
          <ArrowIcon />
        </span>
      </div>

      <h3 className="mt-6 font-heading text-xl font-bold tracking-tight text-primary dark:text-white">
        {service.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-primary/60 dark:text-[#b9bade]">
        {service.description}
      </p>
    </motion.a>
  );
}

/** Width of one card + its gutter on the mobile carousel, in px. */
const MOBILE_CARD_PITCH = 320;
const MOBILE_CARD_WIDTH = 272;
export function Services() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  // Total horizontal travel so the last card's right edge reaches the
  // viewport's right edge. Measured in an effect so nothing reads the
  // window during render (SSR-safe, React-purity-safe).
  const [travel, setTravel] = useState(0);
  // Manual drag offset (px) applied on top of the scroll-linked `x`.
  const dragOffsetRef = useRef(0);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => {
      setIsMobile(mq.matches);
      setTravel(
        Math.max(
          SERVICES.length * MOBILE_CARD_PITCH - window.innerWidth,
          0
        ) + 32
      );
    };
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Grab-drag the mobile track by hand: pointer down records the start,
  // pointer move applies the delta, pointer up releases. Works alongside the
  // scroll-linked `x` — the drag offset simply adds to it.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      dragOffsetRef.current = dragOffset;
    },
    [dragOffset]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = dragStartRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      // Only claim the gesture for horizontal drags so vertical page
      // scrolling still works when the finger mostly moves up/down.
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
        const next = Math.max(-travel, Math.min(0, dragOffsetRef.current + dx));
        dragOffsetRef.current = next;
        setDragOffset(next);
      }
    },
    [travel]
  );

  const handlePointerEnd = useCallback(() => {
    dragStartRef.current = null;
  }, []);

  // Section scroll (start -> end) drives the horizontal slide. `scrollYProgress`
  // is 0 at "start" and 1 at "end"; spread over the full section keeps it
  // scroll-linked, exactly like the intro/About wheels.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const x = useTransform(
    scrollYProgress,
    [0.25, 0.75],
    [0, -travel],
    { clamp: true }
  );

  // Combine the scroll-linked slide with the manual drag offset.
  const combinedX = useTransform(x, (v) => v + dragOffset);

  return (
    <section
      ref={sectionRef}
      id="services"
      /* Curved on both edges — it rides over the About section above and the
         Testimonials below, so each seam reads as one continuous sweep. */
      className="relative z-10 -mt-10 flex min-h-svh flex-col justify-center overflow-hidden rounded-[2.5rem] bg-white py-32 text-primary dark:bg-[#171787] dark:text-white md:-mt-16 md:rounded-[4rem] md:py-40 lg:-mt-[5.5rem] lg:rounded-[5.5rem] lg:py-48"
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 lg:px-10">
        {/* Scroll-reveal statement */}
        <div className="mx-auto max-w-5xl text-center">
          <ScrollReveal
            tokens={REVEAL_TOKENS}
            className="text-center text-primary dark:text-white"
            baseRotation={0}
            baseOpacity={0.08}
            blurStrength={14}
            textClassName="text-[clamp(1.55rem,6.5vw,4.25rem)] leading-[1.15]"
          />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-6 max-w-5xl text-base leading-relaxed text-primary/55 dark:text-[#9d9ec9] md:text-lg"
          >
             From brand identity and websites to cross-platform apps, SEO, and
            AI-powered software; we design and engineer the entire experience,
            so every touchpoint pulls in the same direction.
          </motion.p>
        </div>

        {/* Service cards — image on top with a floating arrow button; icon,
            title and description below. Hovering the image recolours the icon.
            Mobile: scroll-linked horizontal carousel. Desktop: grid. */}
        {isMobile ? (
          <motion.div
            style={{ x: combinedX }}
            className="mt-16 flex w-max cursor-grab gap-6 px-6 touch-pan-y active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            {SERVICES.map((service) => (
              <div
                key={service.title}
                style={{ width: MOBILE_CARD_WIDTH }}
                className="shrink-0"
              >
                <ServiceCard service={service} />
              </div>
            ))}
          </motion.div>
        ) : (
          <div className="mt-16 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service, i) => (
              <motion.a
                key={service.title}
                href="#contact"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{
                  duration: 0.35,
                  delay: (i % 3) * 0.05,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group flex flex-col"
              >
                <div className="relative aspect-[5/4] overflow-hidden rounded-3xl shadow-[0_20px_50px_-24px_rgba(0,0,101,0.55)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={service.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#000065]/45 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-40" />
                  {/* Floating arrow: white pill + orange arrow at rest, inverting
                      to an orange pill + white arrow on card hover. */}
                  <span className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-secondary shadow-lg transition-all duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6 group-hover:bg-secondary group-hover:text-white">
                    <ArrowIcon />
                  </span>
                </div>

                <h3 className="mt-6 font-heading text-xl font-bold tracking-tight text-primary dark:text-white">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-primary/60 dark:text-[#b9bade]">
                  {service.description}
                </p>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
