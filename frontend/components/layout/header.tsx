"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Logo, WdcMark } from "@/components/brand/logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import StaggeredMenu from "@/components/ui/staggered-menu";

const NAV = [
  { label: "Home", link: "/" },
  { label: "About Us", link: "#about" },
  { label: "Services", link: "#services" },
  { label: "Our Work", link: "#work" },
  { label: "Blog", link: "#blog" },
];

const SOCIALS = [
  { label: "Instagram", link: "https://instagram.com" },
  { label: "X", link: "https://x.com" },
  { label: "LinkedIn", link: "https://linkedin.com" },
  { label: "WhatsApp", link: "https://wa.me/" },
];

/**
 * Fixed header. Transparent over the hero; once scrolled it gains a
 * theme surface + border and the full logo swaps to the mark only.
 * Desktop: logo / nav / CTA + theme toggle. Mobile: toggle / logo / menu.
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logoSwap = (
    <Link href="/" aria-label="We Dig Creativity — home" className="inline-flex">
      <AnimatePresence mode="wait" initial={false}>
        {scrolled ? (
          <motion.span
            key="mark"
            initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.7, rotate: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="inline-flex"
          >
            <WdcMark className="h-9 w-auto" />
          </motion.span>
        ) : (
          <motion.span
            key="full"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="inline-flex"
          >
            <Logo markClassName="h-9 w-auto" />
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-line bg-background/85 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,101,0.06)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      {/* Desktop */}
      <div className="mx-auto hidden h-[72px] max-w-[1280px] items-center justify-between px-6 md:flex lg:px-10">
        {logoSwap}

        <nav aria-label="Primary" className="flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.link}
              className="group relative rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
            >
              {item.label}
              <span className="absolute inset-x-4 -bottom-px h-px scale-x-0 bg-secondary transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="#contact"
            className="group inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(255,101,0,0.35)] active:translate-y-0"
          >
            Let&apos;s Talk
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            >
              <path d="M4 12 12 4M6 4h6v6" />
            </svg>
          </Link>
          <AnimatedThemeToggler />
        </div>
      </div>

      {/* Mobile: toggler left, logo center, menu right */}
      <div className="grid h-16 grid-cols-3 items-center px-4 md:hidden">
        <div className="justify-self-start">
          <AnimatedThemeToggler className="h-9 w-9" />
        </div>
        <div className="justify-self-center">{logoSwap}</div>
        <div className="justify-self-end">
          <StaggeredMenu
            items={NAV.map((n) => ({
              label: n.label,
              link: n.link,
              ariaLabel: `Go to ${n.label}`,
            }))}
            socialItems={SOCIALS}
          />
        </div>
      </div>
    </header>
  );
}
