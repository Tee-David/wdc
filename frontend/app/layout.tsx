import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import JsonLd, {
  organizationJsonLd,
  servicesJsonLd,
  websiteJsonLd,
} from "@/components/seo/json-ld";
import { MOTTO, SITE_NAME, SITE_URL } from "@/lib/site";
import { DEFAULT_DESCRIPTION, siteSeo } from "@/lib/site-seo";
import SiteChrome from "@/components/layout/site-chrome";
import DrawGate from "@/components/ui/draw-gate";
import Preloader from "@/components/intro/preloader";
import Connectivity from "@/components/offline/connectivity";
import ScrollReset from "@/components/ui/scroll-reset";
import ScrollTop from "@/components/ui/scroll-top";
import "./globals.css";

/* Keep both families on the same locally bundled face. This removes two
   render-blocking Google Fonts requests (and makes production builds work in
   regions where Google Fonts is unavailable) without introducing a new asset:
   these are the exact Space Grotesk files the project already shipped.
   WOFF2, converted losslessly from the TTFs beside them (same 1,001 glyphs):
   32KB a weight on the wire against 45KB for the gzipped TTF, on every page.
   The TTFs stay for lib/og.tsx, whose renderer reads TTF only. */
const spaceGrotesk = localFont({
  src: [
    { path: "../assets/fonts/SpaceGrotesk-Medium.woff2", weight: "300 600" },
    { path: "../assets/fonts/SpaceGrotesk-Bold.woff2", weight: "700 900" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

/* Outfit, the body face of the dashboards (owner's call, 2026-10-26: Space
   Grotesk stays the main face; body text, labels and controls in the
   dashboards are Outfit). One variable file, Latin only, weights 100 to 900
   (Outfit-OFL.txt beside it). Not preloaded: only `.ad` uses it, so the
   public pages never fetch it. It has no Naira sign, so ₦ falls back to
   Space Grotesk through the stack in admin.css. */
const outfit = localFont({
  src: [{ path: "../assets/fonts/Outfit-Variable-latin.woff2", weight: "100 900" }],
  variable: "--font-outfit-face",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "sans-serif"],
});

const BASE_METADATA: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    /* Says what the company DOES. The previous default -- "Creative &
       Digital Marketing Agency" -- contained none of web, branding, SEO or
       software, which are both the services sold and the words people search
       for. 56 characters, inside the ~60 Google will show. */
    default: `${SITE_NAME} | Web, Branding, SEO & Software Agency`,
    template: `%s | ${SITE_NAME}`,
  },
  /* See DEFAULT_DESCRIPTION; the owner can replace it in Settings. */
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "creative agency",
    "digital marketing agency",
    "branding and design",
    "search engine optimization",
    "SEO agency",
    "web development agency",
    "cross-platform app development",
    "software engineering",
    "AI integration",
    "social media marketing",
    "brand identity design",
    "WDC Solutions",
  ],
  authors: [{ name: "We Dig Creativity Solutions" }],
  publisher: "We Dig Creativity Solutions",
  openGraph: {
    /* Stated rather than inferred. Without it a crawler has to guess the
       language of the card from the page, and some simply omit it. */
    locale: "en_NG",
    title: `${SITE_NAME} | Web, Branding, SEO & Software Agency`,
    description: `${MOTTO}. Branding, web development, SEO, mobile apps, AI software and digital marketing.`,
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Web, Branding, SEO & Software Agency`,
    description: `${MOTTO}. Brands that get noticed, get found, and get results.`,
  },
  alternates: {
    canonical: SITE_URL,
  },
  /* The brand navy, so the browser chrome on Android and the tab strip on
     desktop Chrome take the site's colour instead of the default grey. */
  other: { "theme-color": "#000065" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

/**
 * The base above, with what the owner set in Settings > Site and SEO: their
 * description, and the "ask search engines not to index" switch. Every page
 * that does not set its own `robots` inherits the switch.
 */
export async function generateMetadata(): Promise<Metadata> {
  const seo = await siteSeo().catch(() => null);
  if (!seo) return BASE_METADATA;
  return {
    ...BASE_METADATA,
    description: seo.description,
    ...(seo.noindex.on ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } } : {}),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${outfit.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {/* FIRST TAB STOP ON EVERY PAGE, and it has to be first in the DOM to
            be that. Before this, tabbing into the site reached the Jotform
            chat button and the accessibility widget -- two third-party
            controls -- then the logo, then all five navigation links, before
            any content. Someone navigating by keyboard paid that toll on
            every page. Visible only on focus: it is there for the people who
            need it and invisible to everyone else. */}
        <a href="#main" className="skip-link">Skip to main content</a>
        {/*
          Runs before first paint: decides whether the full-screen intro
          should play (first visit or away > 30 min, motion allowed) and sets
          data-intro on <html> so the CSS cover hides the hero until the intro
          takes over, with no "old page flash". Kept in sync with
          intro-animation.tsx.

          The pathname test is load-bearing. IntroAnimation only mounts on "/",
          and it is the only thing that ever clears the flag; without the test,
          anyone landing straight on /services or /about got the pre-paint
          cover with nothing behind it to lift it, and sat looking at an empty
          coloured screen until they navigated away.

          PHONES INCLUDED. A Lighthouse pass on 11 Sep 2026 added a
          max-width test here that switched the intro (and the preloader) off
          below 768px, and from then on most visitors never saw either. The
          owner wants both back, so the test is gone; the intro already sizes
          its ring and its touch travel from the screen it is on.

          It also picks the preloader (`data-loader`, "ink" or "blueprint"):
          the one the owner chose in Settings > Website and SEO, which the
          proxy hands over in the `wdc-loader-site` cookie (lib/preloader.ts),
          or Ink. `?loader=` previews the other one for this tab only (it is
          what the settings page's Preview opens) and plays it on that load;
          `?replay` plays the intro or preloader regardless of the
          thirty-minute window.
        */}
        {/* Native inline script (not next/script) so it ships in the initial
            server HTML and executes during parse — before the hero paints —
            without the client-side "script inside a React component" warning. */}
        <script
          id="intro-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;try{var x=location.pathname,q=location.search,a=x.indexOf("/admin")===0||x.indexOf("/portal")===0||x==="/login"||x==="/forgot-password"||x==="/reset-password"||["/i/","/r/","/q/","/invite/"].some(function(q){return x.indexOf(q)===0})||x.indexOf("/pay")===0||x==="/signed-in";d.dataset.admin=a?"1":"";var L=(q.match(/[?&]loader=(ink|blueprint)(&|$)/)||[])[1],F=!!L;if(F){try{sessionStorage.setItem("wdc-loader",L)}catch(e){}}else{try{L=sessionStorage.getItem("wdc-loader")}catch(e){}}try{localStorage.removeItem("wdc-loader")}catch(e){}if(!L){var c=document.cookie.match(/(?:^|; )wdc-loader-site=(ink|blueprint)/);L=c&&c[1]}d.dataset.loader=L==="blueprint"?"blueprint":"ink";var R=/[?&]replay(=|&|$)/.test(q),K="wdc-intro-seen-at",T=1800000,r=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,s=0;try{s=parseInt(localStorage.getItem(K)||"0",10)||0}catch(e){}var p=!a&&!F&&x==="/"&&!r&&(R||!s||Date.now()-s>T);d.dataset.intro=p?"play":"skip";var P="wdc-preload-seen-at",ps=0;try{ps=parseInt(localStorage.getItem(P)||"0",10)||0}catch(e){}var w=!a&&!p&&!r&&(F||R||!ps||Date.now()-ps>T);if(w){try{localStorage.setItem(P,String(Date.now()))}catch(e){}}d.dataset.preload=w?"play":"skip"}catch(e){d.dataset.intro="skip";d.dataset.preload="skip"}})();`,
          }}
        />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), ...servicesJsonLd()]} />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {/* THE SITE'S FURNITURE, AND NONE OF IT ON THE ADMIN.

              A dashboard opened forty times a day does not want a preloader in
              front of it, a cursor that lags a table, a smooth-scroll easing
              between rows, or a chat widget for talking to ourselves. The
              admin layout cannot unmount these because it nests INSIDE this
              provider, so the decision is made here, by path.

              The preloader and the intro are decided earlier still, in the
              pre-paint script above: by the time a component could check a
              path, the cover is already on screen. That is why `data-admin` is
              stamped there rather than read from the router. */}
          <SiteChrome />
          <DrawGate />
          {/* Once per browser session, never under reduced motion, and never
              on a visit where the homepage ring intro is playing -- it reads
              `data-intro`, which the inline script above has already set. */}
          <Preloader />
          {/* KEPT ON THE ADMIN. Losing the network mid-invoice matters more
              there than anywhere else on the site. */}
          <Connectivity />
          {/* Also kept on the admin: a link that leaves you halfway down the
              next page is wrong everywhere. See the component for the two
              separate causes it handles. */}
          <ScrollReset />
          {/* THE BOTTOM CORNERS, and they share one set of variables so no one
              of them has to know another's size -- see :root in
              components/ui/scroll-top.css. Right: the agent at the bottom,
              back-to-top above it, because the thing reached for most often
              belongs closest to the thumb. Left: the accessibility menu, on
              the same baseline as back-to-top, desktop only. */}
          <ScrollTop />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
