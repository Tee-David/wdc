import type { Metadata } from "next";
import { Space_Grotesk, Outfit } from "next/font/google";
import { ThemeProvider } from "next-themes";
import JsonLd, {
  organizationJsonLd,
  servicesJsonLd,
  websiteJsonLd,
} from "@/components/seo/json-ld";
import { MOTTO, SITE_NAME, SITE_URL } from "@/lib/site";
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
    default: `${SITE_NAME} — Creative & Digital Marketing Agency`,
    template: `%s | ${SITE_NAME}`,
  },
  description: `${MOTTO}. WDC Solutions is the creative engine behind brands that get noticed, get found, and get results — branding & design, SEO, web development, cross-platform apps, and AI-powered software engineering.`,
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
    title: `${SITE_NAME} — Creative & Digital Marketing Agency`,
    description: `${MOTTO}. Branding & design, SEO, web development, cross-platform apps, and AI-powered software engineering.`,
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Creative & Digital Marketing Agency`,
    description: `${MOTTO}. Brands that get noticed, get found, and get results.`,
  },
  alternates: {
    canonical: SITE_URL,
  },
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
      <body className="min-h-full flex flex-col">
        <JsonLd data={[organizationJsonLd(), websiteJsonLd(), ...servicesJsonLd()]} />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
