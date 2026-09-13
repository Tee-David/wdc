import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import JsonLd, {
  organizationJsonLd,
  servicesJsonLd,
  websiteJsonLd,
} from "@/components/seo/json-ld";
import { MOTTO, SITE_NAME, SITE_URL } from "@/lib/site";
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
   these are the exact Space Grotesk files the project already shipped. */
const spaceGrotesk = localFont({
  src: [
    { path: "../assets/fonts/SpaceGrotesk-Medium.ttf", weight: "300 600" },
    { path: "../assets/fonts/SpaceGrotesk-Bold.ttf", weight: "700 900" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    /* Says what the company DOES. The previous default -- "Creative &
       Digital Marketing Agency" -- contained none of web, branding, SEO or
       software, which are both the services sold and the words people search
       for. 56 characters, inside the ~60 Google will show. */
    default: `${SITE_NAME} | Web, Branding, SEO & Software Agency`,
    template: `%s | ${SITE_NAME}`,
  },
  /* 140 characters. The previous one ran past 230, so search results cut it
     mid-sentence and the half that mattered was the half that got cut. */
  description:
    "We Dig Creativity helps businesses stand out and grow through branding, web development, SEO, mobile apps, AI software and digital marketing.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} h-full antialiased`}
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
        */}
        {/* Native inline script (not next/script) so it ships in the initial
            server HTML and executes during parse — before the hero paints —
            without the client-side "script inside a React component" warning. */}
        <script
          id="intro-init"
          dangerouslySetInnerHTML={{
            __html: `(function(){var d=document.documentElement;try{var x=location.pathname,a=x.indexOf("/admin")===0||x==="/login"||x==="/forgot-password"||x==="/reset-password";d.dataset.admin=a?"1":"";var K="wdc-intro-seen-at",T=1800000,r=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,m=window.matchMedia&&window.matchMedia("(max-width: 767px)").matches,s=0;try{s=parseInt(localStorage.getItem(K)||"0",10)||0}catch(e){}var p=!a&&x==="/"&&!m&&!r&&(!s||Date.now()-s>T);d.dataset.intro=p?"play":"skip";var P="wdc:preloaded",q=false;try{q=sessionStorage.getItem(P)==="1"}catch(e){}var w=!a&&!m&&!p&&!r&&!q;if(w){try{sessionStorage.setItem(P,"1")}catch(e){}}d.dataset.preload=w?"play":"skip"}catch(e){d.dataset.intro="skip";d.dataset.preload="skip"}})();`,
          }}
        />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), ...servicesJsonLd()]} />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
