import type { ServiceSlug } from "@/lib/services";

/**
 * What tends to go with what, for the package builder on /services: pick one
 * service and the page offers the one or two that usually travel with it.
 * Suggestions only, never added for the visitor. Edit this list to match what
 * the studio actually sells together.
 */
export const PAIRS: Record<ServiceSlug, ServiceSlug[]> = {
  branding: ["web", "social"],
  web: ["seo", "branding"],
  seo: ["web", "social"],
  apps: ["software", "branding"],
  software: ["apps", "web"],
  social: ["branding", "seo"],
};
