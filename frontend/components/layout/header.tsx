"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo, WdcMark } from "@/components/brand/logo";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import ThemeSwitchButton from "@/components/ui/theme-switch-button";
import UserWay from "@/components/ui/userway";
import StaggeredMenu from "@/components/ui/staggered-menu";
import { MenuAccount, initials, useSiteUser } from "@/components/layout/signed-in";
import { SERVICES } from "@/lib/services";
import ServiceIcon from "@/components/ui/service-icon";

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
  /* Services carries its six pages with it. The hub is still the link -- a
     parent that only opens a menu is a dead end for anyone who wanted the
     overview -- and the six hang off it. */
  {
    label: "Services",
    link: "/services",
    sub: SERVICES.map((s) => ({ label: s.short, link: `/services/${s.slug}`, icon: s.icon })),
  },
  { label: "Blog", link: "/blog" },
  { label: "About Us", link: "/about" },
  { label: "Contact Us", link: "/contact" },
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
  const user = useSiteUser();
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
  /* Over the hero the bar sits on a photograph, so both round controls are
     white. Once it has its own surface they take the page's ink, which is navy
     in light and near-white in dark. */
  const roundControl = solid
    ? "text-[#000065] dark:text-foreground"
    : "text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.45)]";

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

  /* NO BACKDROP BLUR ON THE BAR. This was `bg-background/85 backdrop-blur-md`,
     and a blurred backdrop on a FIXED element is the single most expensive
     thing a scrolling page can carry: the browser has to re-blur whatever has
     just moved underneath it on every frame, across the full width of the
     viewport, for the whole length of the document. iOS Safari is worst
     affected, which is where the "catch" was most obvious, but it costs on
     desktop too. At 94% opacity the bar reads as the same frosted surface and
     the page scrolls under it for free. */
  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid
          ? "border-b border-line bg-background/95 shadow-[0_8px_30px_rgba(0,0,101,0.06)]"
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
              <div className="hd-navitem" key={n.link}>
              <Link
                href={n.link}
                aria-current={on ? "page" : undefined}
                className={`group relative rounded-full px-4 py-2 text-[0.94rem] font-medium transition-colors duration-200 ${
                  solid
                    ? "text-[#000065]/75 hover:text-[#000065] dark:text-foreground/75 dark:hover:text-foreground"
                    : "text-white/85 hover:text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.45)]"
                } ${
                  on
                    ? solid
                      ? "!text-[#000065] dark:!text-foreground"
                      : "!text-white"
                    : ""
                }`}
              >
                {n.label}
                {n.sub ? <span className="hd-caret" aria-hidden="true" /> : null}
                {/* The current-page rule is drawn, not just coloured: colour
                    alone is not a state anyone can rely on — and the orange it
                    used to be measured 2.95:1 on this bar, so it was failing
                    the people who rely on it most. The state is now the drawn
                    rule plus aria-current, and the label simply comes up to
                    full strength from the 75% its siblings sit at. */}
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-4 -bottom-0.5 h-[2px] rounded-full bg-secondary transition-transform duration-300 ease-out ${
                    on ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>

              {/* THE SUBMENU OPENS ON HOVER AND ON FOCUS, not on hover alone.
                  `:focus-within` is what makes it reachable by keyboard: a
                  reader tabs into Services and the six pages are simply the
                  next six stops. Nothing here is information that only a
                  pointer can get at, which is the rule in AGENTS.md. */}
              {n.sub ? (
                <div className="hd-sub" role="group" aria-label={`${n.label} pages`}>
                  {n.sub.map((child) => (
                    <Link
                      key={child.link}
                      href={child.link}
                      className="hd-sub__a"
                      aria-current={isCurrent(child.link) ? "page" : undefined}
                    >
                      {/* The service's own icon, the same one its page and its
                          card carry, so the menu is recognisably a list of
                          those six things rather than six words. */}
                      <span className="hd-sub__i" aria-hidden="true">
                        <ServiceIcon name={child.icon} size={17} />
                      </span>
                      {child.label}
                    </Link>
                  ))}
                  {/* The parent link again, below a rule. A dropdown that only
                      offers the children strands anyone who wanted the
                      overview, and the top-level link is easy to miss once a
                      menu has opened under the cursor. */}
                  <span className="hd-sub__rule" aria-hidden="true" />
                  <Link href={n.link} className="hd-sub__a hd-sub__a--all">
                    All services
                    <span className="hd-sub__go" aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              ) : null}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {/* Rides in the bar on desktop; on a phone it lives in the menu
              footer, where there is room for its label. */}
          {/* No over-hero override any more. The toggle carries its own navy
              ground and white glyph in every theme, so it no longer needs the
              header to force a colour onto it when it sits over the photo. */}
          {/* ONE COLOUR RULE FOR BOTH ROUND CONTROLS, set here because only the
              header knows whether it is sitting on a photograph or on its own
              surface. Both take `currentColor` for their ring and their glyph,
              so they can never end up as a white icon on a white ground. */}
          <span className={`hidden lg:inline-flex ${roundControl}`}>
            <AnimatedThemeToggler className="hd-round" />
          </span>
          {/* LOG IN. Icon only, because the bar already carries five nav items
              and a CTA, and a seventh piece of text is the one that tips it
              into clutter. The label is still there for anyone who cannot see
              the icon -- `aria-label` names it and `title` shows it on hover
              -- and the target is 40px with the header's own padding around
              it, so it is comfortably thumb-sized.

              It takes the same navy disc and white glyph as the theme toggle
              beside it, for two reasons: the pair then reads as one set of
              controls rather than two unrelated buttons, and navy-on-white
              (17.68:1) holds in both themes and over the hero photograph,
              which a theme-following colour would not. */}
          {/* SIGNED IN, the same disc carries the person's initials and goes to
              their dashboard instead of the log-in page. */}
          {user ? (
            <Link
              href="/signed-in"
              aria-label={`Your dashboard, signed in as ${user.name}`}
              title={`Signed in as ${user.name}`}
              className={`hd-round hidden h-10 w-10 items-center justify-center rounded-full text-[.8rem] font-bold hover:scale-110 active:scale-95 lg:inline-flex ${roundControl}`}
            >
              {initials(user.name)}
            </Link>
          ) : (
            <Link
              href="/login"
              aria-label="Log in"
              title="Log in"
              className={`hd-round hidden h-10 w-10 items-center justify-center rounded-full hover:scale-110 active:scale-95 lg:inline-flex ${roundControl}`}
            >
              <LogIn className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
            </Link>
          )}
          <Link
            href="/#pv-contact"
            /* THE SITE'S PRIMARY, AND THE GROUND IT SITS ON MOVES UNDER IT.

               It was `bg-white text-black` in every state, which is right over
               the hero photograph and wrong the moment the bar goes solid: a
               white pill on a white bar has no edge at all, and nothing
               measured it because the header is not a `.pv-btn`. So the colours
               come from `.btn-primary` like every other primary on the site,
               and the only thing decided here is WHICH ground it is on --
               transparent over a dark hero, the page's own surface once the bar
               is solid, which the theme already answers for at `:root`. */
            className={`header-cta-pulse group btn-primary hidden items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,26,0.35)] active:translate-y-0 md:inline-flex ${solid ? "" : "hero-cta"}`}
          >
            {/* Not "Book a Strategy Call". That was carried over wholesale
                when this header was rebuilt to match litchconsulting's, and it
                is a finance consultancy's product: WDC does not sell a
                strategy call, it takes a brief. The link has always gone to
                the contact form, so the label now says what the click does. */}
            Start a project
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
            className={"lg:hidden " + (
              menuOpen
                ? ""
                : solid
                  ? "[&_.sm-toggle]:text-[#000065] dark:[&_.sm-toggle]:text-foreground"
                  : "[&_.sm-burger]:drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)] [&_.sm-toggle]:!text-white dark:[&_.sm-toggle]:!text-foreground"
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
