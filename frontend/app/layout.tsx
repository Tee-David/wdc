import type { Metadata } from "next";
import { Space_Grotesk, Outfit } from "next/font/google";
import { ThemeProvider } from "next-themes";
import JsonLd, {
  organizationJsonLd,
  servicesJsonLd,
  websiteJsonLd,
} from "@/components/seo/json-ld";
import { MOTTO, SITE_NAME, SITE_URL } from "@/lib/site";
import { SmoothScroll } from "@/components/ui/smooth-scroll";
import { SmoothCursor } from "@/components/ui/smooth-cursor";
import DrawGate from "@/components/ui/draw-gate";
import Preloader from "@/components/intro/preloader";
import Connectivity from "@/components/offline/connectivity";
import JotformAgent from "@/components/agent/jotform-agent";
import ScrollTop from "@/components/ui/scroll-top";
import UserWay from "@/components/ui/userway";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME}; Creative & Digital Marketing Agency`,
    template: `%s | ${SITE_NAME}`,
  },
  description: `${MOTTO}. WDC Solutions is the creative engine behind brands that get noticed, get found, and get results; branding & design, SEO, web development, cross-platform apps, and AI-powered software engineering.`,
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
    title: `${SITE_NAME}; Creative & Digital Marketing Agency`,
    description: `${MOTTO}. Branding & design, SEO, web development, cross-platform apps, and AI-powered software engineering.`,
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME}; Creative & Digital Marketing Agency`,
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
      className={`${spaceGrotesk.variable} ${outfit.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
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
            __html: `(function(){var d=document.documentElement;try{var K="wdc-intro-seen-at",T=1800000,r=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,s=0;try{s=parseInt(localStorage.getItem(K)||"0",10)||0}catch(e){}var p=location.pathname==="/"&&!r&&(!s||Date.now()-s>T);d.dataset.intro=p?"play":"skip";var P="wdc:preloaded",q=false;try{q=sessionStorage.getItem(P)==="1"}catch(e){}var w=!p&&!r&&!q;if(w){try{sessionStorage.setItem(P,"1")}catch(e){}}d.dataset.preload=w?"play":"skip"}catch(e){d.dataset.intro="skip";d.dataset.preload="skip"}})();`,
          }}
        />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), ...servicesJsonLd()]} />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <SmoothScroll />
          <DrawGate />
          {/* Once per browser session, never under reduced motion, and never
              on a visit where the homepage ring intro is playing -- it reads
              `data-intro`, which the inline script above has already set. */}
          <Preloader />
          {/* Registers the service worker and owns the offline/online state.
              Renders nothing while the connection is fine. */}
          <Connectivity />
          {/* The AI assistant. Its third-party script is not fetched until the
              reader reaches for it or the browser goes idle, so it cannot cost
              anything the performance work just bought. */}
          <JotformAgent />
          {/* THE BOTTOM CORNERS, and they share one set of variables so no one
              of them has to know another's size -- see :root in
              components/ui/scroll-top.css. Right: the agent at the bottom,
              back-to-top above it, because the thing reached for most often
              belongs closest to the thumb. Left: the accessibility menu, on
              the same baseline as back-to-top, desktop only. */}
          <ScrollTop />
          <UserWay className="uw--corner" />
          {/* Renders nothing on touch or under reduced motion — see the
              component. Mounted inside the theme provider so it sits above
              every page without each page having to remember it. */}
          <SmoothCursor />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
