/**
 * `JsonLd` — server-only primitive that renders structured data as a
 * `<script type="application/ld+json">` block. Every Schema.org payload
 * (Organization, WebSite, FAQPage, Service…) flows through this one
 * component so the markup stays consistent and easy to audit.
 *
 * Stays a Server Component on purpose — JSON-LD must be in the initial
 * HTML to be indexed.
 */

import { COMPANY_NAME, CONTACT_EMAIL, MOTTO, SITE_NAME, SITE_URL } from "@/lib/site";

export interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

export default function JsonLd({ data }: JsonLdProps) {
  // `dangerouslySetInnerHTML` is the standard pattern — the script body
  // must NOT be HTML-escaped (Google's parser needs raw JSON).
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(Array.isArray(data) ? data : [data]),
      }}
    />
  );
}

/* ─── Helpers ────────────────────────────────────────────────────── */

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY_NAME,
    alternateName: ["WDC Solutions", SITE_NAME],
    slogan: MOTTO,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/icon-color.svg`,
    description:
      "Full-service creative and digital marketing agency: branding & design, SEO, full-stack web development, cross-platform app development, AI-powered software engineering, and social media marketing.",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: CONTACT_EMAIL,
      },
    ],
    knowsAbout: [
      "Branding and graphic design",
      "Search engine optimization",
      "Web development",
      "Cross-platform app development",
      "Software engineering",
      "AI and LLM integration",
      "Social media marketing",
      "Pay-per-click advertising",
    ],
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "WDC Solutions",
    url: SITE_URL,
    publisher: { "@type": "Organization", name: COMPANY_NAME },
  };
}

export function servicesJsonLd() {
  const services = [
    "Branding & Design",
    "Search Engine Optimization",
    "Full-Stack Web Development",
    "Cross-Platform App Development",
    "Software Engineering & AI Integration",
    "Social Media Marketing & PPC",
  ];
  return services.map((name) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    provider: { "@type": "Organization", name: COMPANY_NAME, url: SITE_URL },
    areaServed: "Worldwide",
  }));
}
