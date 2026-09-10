"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
const MotionLink = motion(Link);
import { siInstagram, siX, siFacebook, siWhatsapp } from "simple-icons";
import { Logo, WdcMark } from "@/components/brand/logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import StaggeredMenu from "@/components/ui/staggered-menu";
import { CONTACT_EMAIL } from "@/lib/site";

/**
 * Every entry points at something that exists.
 *
 * `#about`, `#work` and `#blog` were all dead: the homepage sections are
 * `#pv-work`, `#pv-process` and `#pv-contact`, and there is no blog. A nav
 * item that scrolls nowhere is worse than one that is not there, so Blog is
 * gone until there is a blog to link to.
 *
 * "Our Work" is an in-page anchor, so it needs the leading `/` to work from
 * /services and /about too — a bare `#pv-work` would look for that section on
 * whatever page you are already on and find nothing.
 */
const NAV = [
  { label: "Home", link: "/" },
  { label: "Our Works", link: "/work" },
  { label: "Services", link: "/services" },
  { label: "About Us", link: "/about" },
  { label: "Contact Us", link: "/contact" },
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
/**
 * `overHero` says whether the page starts with a DARK full-bleed hero behind
 * the bar. Only the homepage and the work category pages do.
 *
 * It defaults to false on purpose. The transparent-white treatment is only
 * legible over something dark, and defaulting to it meant /contact — which
 * opens on white paper — rendered white links on a white ground: a nav that
 * was there, tabbable, and invisible. Getting the flag wrong the other way
 * costs a surface nobody minded; getting it wrong this way costs the nav.
 */
export function Header({ overHero = false }: { overHero?: boolean } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  /* An in-page anchor ("/#pv-contact") is never the current page, and "/" would
     otherwise match every route as a prefix. Everything else matches its own
     section, so /work/branding/moore-designs still lights "Our Works". */
  /* Solid whenever the bar is not floating over a dark hero, so a page with
     light paper at the top gets its surface from the first pixel. */
  const solid = scrolled || !overHero;

  const isCurrent = (link: string) =>
    link.includes("#") ? false
      : link === "/" ? pathname === "/"
      : pathname === link || pathname.startsWith(`${link}/`);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /*
   * Both logos stay mounted and cross-fade on opacity. This previously used
   * AnimatePresence with mode="wait", which will not mount the incoming logo
   * until the outgoing one has finished exiting; with a spring exit that meant
   * the header sat empty for a noticeable beat, and toggling quickly could
   * leave it empty altogether. Keeping both mounted cannot get stuck.
   */
  /*
   * Both logos stay mounted and cross-fade on opacity, which cannot get stuck
   * the way AnimatePresence mode="wait" could. The full logo is the one left in
   * flow, because it is the wider of the two: with the mark in flow instead the
   * link collapsed to the mark's 34px and the full logo overflowed it.
   */
  const logoSwap = (
    <Link
      href="/"
      aria-label="We Dig Creativity, home"
      className="relative inline-flex h-9 items-center"
    >
      {/* One component for both themes so the two states match in size. Light
          mode previously used the flat logo-white.svg while dark used Logo,
          whose mark is h-9 plus a wordmark, so light rendered visibly smaller. */}
      <span
        className="inline-flex transition-opacity duration-200 ease-out"
        style={{ opacity: solid ? 0 : 1 }}
        aria-hidden={solid}
      >
        <Logo tone="white" markClassName="h-9 w-auto" />
      </span>

      <span
        className="absolute inset-y-0 left-0 inline-flex items-center transition-opacity duration-200 ease-out"
        style={{ opacity: solid ? 1 : 0 }}
        aria-hidden={!solid}
      >
        {/* Navy mark once the header has a surface; auto-tone mark in dark mode */}
        <span className="dark:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/icon-navy.svg" alt="We Dig Creativity mark" className="h-9 w-auto" />
        </span>
        <span className="hidden dark:inline-flex">
          <WdcMark className="h-9 w-auto" />
        </span>
      </span>
    </Link>
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid
          ? "border-b border-line bg-background/85 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,101,0.06)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      {/* Single bar at every breakpoint: logo left, CTA + hamburger right.
          Nav lives entirely inside the staggered menu; the theme toggler
          rides in the menu footer. */}
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:h-[72px] md:px-6 lg:px-10">
        {logoSwap}

        {/* Desktop nav. The hamburger is a PHONE control now — a menu that
            hides five links behind a button on a 1440px screen makes the
            visitor work for something there is room to just show them. Both
            states have to hold: white over the hero, which is dark in both
            themes, and the theme's own foreground once the bar has a surface
            under it. */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {NAV.map((n) => {
            const on = isCurrent(n.link);
            return (
              <Link
                key={n.link}
                href={n.link}
                aria-current={on ? "page" : undefined}
                className={`group relative rounded-full px-4 py-2 text-[0.94rem] font-medium transition-colors duration-200 ${
                  solid
                    ? "text-[#000065] hover:text-secondary dark:text-foreground dark:hover:text-secondary"
                    : "text-white/85 hover:text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.45)]"
                } ${on ? "!text-secondary" : ""}`}
              >
                {n.label}
                {/* The current-page rule is drawn, not just coloured: colour
                    alone is not a state anyone can rely on. */}
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-secondary transition-transform duration-300 ease-out ${
                    on ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {/* Rides in the bar on desktop; on a phone it lives in the menu
              footer, where there is room for its label. */}
          <span
            className={`hidden lg:inline-flex ${
              solid ? "" : "[&_button]:!text-white [&_svg]:drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]"
            }`}
          >
            <AnimatedThemeToggler />
          </span>
          <MotionLink
            href="/#pv-contact"
            animate={{
              scale: [1, 1.04, 0.96, 1.02, 0.98, 1],
              rotate: [0, 2, -2, 2, -2, 0]
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              repeatDelay: 5,
              ease: "easeInOut",
            }}
            className="group hidden items-center gap-2 rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-[#000065] hover:shadow-[0_10px_30px_rgba(255,101,0,0.35)] active:translate-y-0 md:inline-flex"
          >
            Book a Strategy Call
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
          </MotionLink>

          <StaggeredMenu
            className={"lg:hidden " + (
              menuOpen
                ? ""
                : solid
                  ? "[&_.sm-toggle]:text-[#000065] dark:[&_.sm-toggle]:text-foreground"
                  : "[&_.sm-burger]:drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] [&_.sm-toggle]:!text-white dark:[&_.sm-toggle]:!text-foreground"
            )}
            items={NAV.map((n) => ({
              label: n.label,
              link: n.link,
              ariaLabel: `Go to ${n.label}`,
            }))}
            socialItems={SOCIALS}
            onMenuOpen={() => setMenuOpen(true)}
            onMenuClose={() => setMenuOpen(false)}
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
      </div>
    </header>
  );
}
