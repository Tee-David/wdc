import "server-only";

import { unstable_cache } from "next/cache";
import { getAppSetting } from "@/lib/app-settings";

/**
 * What the owner can change about how the site presents itself to search
 * engines: the default description, and a switch that asks them not to index
 * the site at all (for a rebuild, or before launch).
 *
 * READ BY THE ROOT LAYOUT'S METADATA, so every page that does not set its own
 * `robots` inherits it (AGENTS.md: metadata is inherited). Pages that already
 * say noindex keep saying it. robots.txt is deliberately NOT changed by the
 * switch: a crawler that is disallowed never fetches the page, so it never
 * sees the noindex, and a URL it already knows can stay listed.
 *
 * Cached under one tag, and the save invalidates the tag and every page, so
 * the switch takes effect on the next request rather than at the next build.
 * The build reads it too; if the database cannot be read then, the pages
 * carry the defaults (indexable) until the next save or deploy.
 */

export const SITE_NOINDEX_KEY = "site.noindex";
export const SITE_DESCRIPTION_KEY = "site.description";
export const SITE_SEO_TAG = "site-seo";

/** 140 characters. The previous one ran past 230, so search results cut it mid-sentence. */
export const DEFAULT_DESCRIPTION =
  "We Dig Creativity helps businesses stand out and grow through branding, web development, SEO, mobile apps, AI software and digital marketing.";

export const DESCRIPTION_MIN = 50;
export const DESCRIPTION_MAX = 160;

export type Noindex = { on: boolean; since?: string; by?: string };

export type SiteSeo = { noindex: Noindex; description: string; customDescription: boolean };

export const siteSeo = unstable_cache(async (): Promise<SiteSeo> => {
  const [noindex, description] = await Promise.all([
    getAppSetting<Noindex>(SITE_NOINDEX_KEY, { on: false }),
    getAppSetting<string>(SITE_DESCRIPTION_KEY, ""),
  ]);
  const custom = typeof description === "string" && description.trim().length >= DESCRIPTION_MIN;
  return {
    noindex: noindex && typeof noindex === "object" && noindex.on === true ? noindex : { on: false },
    description: custom ? description.trim() : DEFAULT_DESCRIPTION,
    customDescription: custom,
  };
/* NO TIME-BASED REVALIDATE. Any `revalidate` here becomes every public
   page's ISR interval (a 3600 made the whole site regenerate hourly); the
   save invalidates the tag and the pages, and a deploy reads it afresh. */
}, ["site-seo"], { tags: [SITE_SEO_TAG] });
