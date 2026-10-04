"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo, WdcMark } from "@/components/brand/logo";
import ThemeSwitchButton from "@/components/ui/theme-switch-button";
import UserWay from "@/components/ui/userway";
import StaggeredMenu from "@/components/ui/staggered-menu";
import { MenuAccount, useSiteUser } from "@/components/layout/signed-in";

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
  { label: "Blog", link: "/blog" },
  { label: "About Us", link: "/about" },
  { label: "Contact Us", link: "/contact" },
];

/**
 * Fixed header. Transparent over the hero; once scrolled it gains a
 * theme surface + border and the full logo swaps to the mark only.
 *
 * ONE BAR AT EVERY WIDTH: the logo on the left, "Start a project" and the
 * menu button on the right. The owner's call (2026-10-04): the desktop row of
 * links, the theme toggle and the log-in disc all moved into the menu, which
 * is the same panel a phone opens. The bar carries one action and one way to
 * everything else, so nothing competes with the hero under it.
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
/**
 * `markOnlyOnPhones` is the homepage's: over its film a phone shows the mark
 * and the menu and nothing else, because the hero's own pair is already on
 * screen. The "Start" CTA comes back the moment the bar goes solid, so the
 * site's main action is never more than a scroll away.
 */
export function Header({
  overHero = false,
  markOnlyOnPhones = false,
}: { overHero?: boolean; markOnlyOnPhones?: boolean } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useSiteUser();
  /* Solid whenever the bar is not floating over a dark hero, so a page with
     light paper at the top gets its surface from the first pixel. */
  const solid = scrolled || !overHero;
  /* Phones over the homepage film: the mark, the menu, nothing else. */
  const quiet = markOnlyOnPhones && !solid;

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
      /* h-11 is 44px: the LINK is the tap target, the mark inside it stays h-9,
         so the logo is the same size it was and a thumb now has the full
         44px. It still clears the h-16 bar around it. */
      className="relative inline-flex h-11 items-center"
    >
      {/* One component for both themes so the two states match in size. Light
          mode previously used the flat logo-white.svg while dark used Logo,
          whose mark is h-9 plus a wordmark, so light rendered visibly smaller. */}
      <span
        className="inline-flex transition-opacity duration-200 ease-out"
        style={{ opacity: solid ? 0 : 1 }}
        aria-hidden={solid}
      >
        <span className={quiet ? "hidden md:inline-flex" : "inline-flex"}>
          <Logo tone="white" markClassName="h-9 w-auto" />
        </span>
        {markOnlyOnPhones ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/brand/icon-white-accent.svg" alt="" className={`h-9 w-auto drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] ${quiet ? "md:hidden" : "hidden"}`} />
        ) : null}
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

  /* A FLOATING GLASS BAR, the owner's call (2026-10-04). The bar is a
     rounded pill inset from the top and the sides at every scroll position;
     over a dark hero it is clear, and once the page scrolls (or on a page
     with no dark hero) the glass fades in under it. Only the fill, edge and
     shadow change, so nothing moves when it arrives.

     The blur is a known cost: a blurred backdrop on a FIXED element is
     re-rendered under every frame of scroll, and this bar once dropped
     `backdrop-blur-md` for exactly that reason. It is back on the owner's
     call, kept to the pill rather than the full width, at a moderate radius,
     and replaced by a solid fill for anyone who asks for reduced
     transparency. See `.hd-bar` in globals.css. */
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      {/* Single bar at every breakpoint: logo left, CTA + hamburger right.
          Nav lives entirely inside the staggered menu; the theme toggler
          rides in the menu footer. The header itself is click-through so the
          margins around the pill never swallow a tap meant for the page. */}
      <div className={`hd-bar pointer-events-auto mx-auto flex items-center justify-between ${solid ? "is-glass" : ""}`}>
        {logoSwap}

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/contact"
            /* THE SITE'S PRIMARY, AND THE GROUND IT SITS ON MOVES UNDER IT.

               It was `bg-white text-black` in every state, which is right over
               the hero photograph and wrong the moment the bar goes solid: a
               white pill on a white bar has no edge at all, and nothing
               measured it because the header is not a `.pv-btn`. So the colours
               come from `.btn-primary` like every other primary on the site,
               and the only thing decided here is WHICH ground it is on --
               transparent over a dark hero, the page's own surface once the bar
               is solid, which the theme already answers for at `:root`. */
            /* ON PHONES TOO. It was `hidden` below 768px, so on the screens
               most visitors use the site's main action was nowhere on screen
               until they opened the menu. It is smaller there (44px tall, the
               touch minimum) and says "Start" under 360px, and it steps out of
               the way while the menu is open over it. */
            className={`header-cta-pulse group btn-primary inline-flex min-h-11 shrink-0 items-center whitespace-nowrap gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,26,0.35)] active:translate-y-0 md:min-h-0 md:gap-2 md:px-5 md:py-2.5 md:text-sm ${solid ? "" : "hero-cta"} ${menuOpen ? "invisible" : ""} ${quiet ? "max-md:hidden" : ""}`}
          >
            {/* Not "Book a Strategy Call". That was carried over wholesale
                when this header was rebuilt to match litchconsulting's, and it
                is a finance consultancy's product: WDC does not sell a
                strategy call, it takes a brief. The link has always gone to
                the contact form, so the label now says what the click does. */}
            <span className="min-[360px]:hidden">Start</span>
            <span className="hidden min-[360px]:inline">Start a Project</span>
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

          <StaggeredMenu
            className={(
              menuOpen
                ? ""
                : solid
                  ? "[&_.sm-toggle]:text-[#000065] dark:[&_.sm-toggle]:text-foreground"
                  /* Over a dark hero the menu is a glass disc, like the
                     hero's own controls. */
                  : "hd-glass-menu [&_.sm-burger]:drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] [&_.sm-toggle]:!text-white dark:[&_.sm-toggle]:!text-foreground"
            )}
            /* Log in joins the LIST rather than the footer row. The footer
               holds the two controls that change how the site looks; this is a
               destination, so it belongs with the other destinations -- and the
               footer row is already balanced two-up at 320px, where a third
               pill would not fit. */
            items={[
              ...NAV.map((n) => ({
                label: n.label,
                link: n.link,
                ariaLabel: `Go to ${n.label}`,
              })),
              /* Signed in, the dashboard is a place like the others, so it is
                 the last item in the list, in the accent; the account row below
                 carries only the way out. Signed out, Log in takes its spot. */
              ...(user
                ? [{ label: "Dashboard", link: "/signed-in", ariaLabel: "Open your dashboard", accent: true }]
                : [{ label: "Log in", link: "/login", ariaLabel: "Log in to your account" }]),
            ]}
            accountSlot={user ? <MenuAccount user={user} /> : null}
            onMenuOpen={() => setMenuOpen(true)}
            onMenuClose={() => setMenuOpen(false)}
            /* TWO REAL BUTTONS, not a disc with a caption floating beside it.
               The label used to be a bare <span> that did nothing when tapped,
               so the hit area was the 40px disc and the words next to it were
               decoration -- which on a phone is exactly the part a thumb aims
               at. Both are now filled buttons with their own background, and
               the accessibility menu sits beside the theme switch because the
               two belong together: they are the only controls here that change
               how the site looks rather than where you are in it. */
            footerSlot={
              <>
                <ThemeSwitchButton />
                <UserWay />
              </>
            }
          />
        </div>
      </div>
    </header>
  );
}
