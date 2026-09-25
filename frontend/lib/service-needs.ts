import type { ServiceSlug } from "@/lib/services";

/**
 * The /services chooser: what a visitor says they need, in their words, and
 * the services that answer it. Most needs are more than one service, which is
 * the point the page's closing band makes too.
 */
export const NEEDS = [
  { id: "look", label: "look the part", services: ["branding"] },
  { id: "found", label: "be found", services: ["seo", "social"] },
  { id: "sell", label: "sell online", services: ["web", "social"] },
  { id: "build", label: "build a product", services: ["apps", "software"] },
] as const satisfies readonly { id: string; label: string; services: readonly ServiceSlug[] }[];

export type NeedId = (typeof NEEDS)[number]["id"];

/** The need ids a service answers, space-separated for `data-needs~=`. */
export const needsFor = (slug: ServiceSlug) =>
  NEEDS.filter((n) => (n.services as readonly ServiceSlug[]).includes(slug)).map((n) => n.id).join(" ");
