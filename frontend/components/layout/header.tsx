"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { siInstagram, siX, siFacebook, siWhatsapp } from "simple-icons";
import { Logo, WdcMark } from "@/components/brand/logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import StaggeredMenu from "@/components/ui/staggered-menu";
import { CONTACT_EMAIL } from "@/lib/site";

const NAV = [
  { label: "Home", link: "/" },
  { label: "About Us", link: "#about" },
  { label: "Services", link: "#services" },
  { label: "Our Work", link: "#work" },
  { label: "Blog", link: "#blog" },
];

/** simple-icons brand glyph, tinted by the current text color. */
function BrandGlyph({ path, title }: { path: string; title: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" role="img" aria-label={title}>
      <path d={path} />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 5.5L20 7" />
    </svg>
  );
}

const SOCIALS = [
  {
    label: "Instagram",
    link: "https://instagram.com",
    icon: <BrandGlyph path={siInstagram.path} title="Instagram" />,
  },
  { label: "X", link: "https://x.com", icon: <BrandGlyph path={siX.path} title="X" /> },
  {
    label: "Facebook",
    link: "https://facebook.com",
    icon: <BrandGlyph path={siFacebook.path} title="Facebook" />,
  },
  { label: "Email", link: `mailto:${CONTACT_EMAIL}`, icon: <MailGlyph /> },
  {
    label: "WhatsApp",
    link: "https://wa.me/",
    icon: <BrandGlyph path={siWhatsapp.path} title="WhatsApp" />,
  },
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

      {/* Mobile: logo left, hamburger right (theme toggler lives in the menu) */}
      <div className="flex h-16 items-center justify-between px-4 md:hidden">
        {logoSwap}
        <StaggeredMenu
          items={NAV.map((n) => ({
            label: n.label,
            link: n.link,
            ariaLabel: `Go to ${n.label}`,
          }))}
          socialItems={SOCIALS}
          footerSlot={
            <>
              <AnimatedThemeToggler />
              <span className="text-sm font-medium text-muted">
                Switch theme
              </span>
            </>
          }
        />
      </div>
    </header>
  );
}
