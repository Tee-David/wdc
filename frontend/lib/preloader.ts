import { getAppSetting } from "@/lib/app-settings";
import { DEFAULT_PRELOADER, isPreloader, PRELOADER_KEY, type PreloaderId } from "@/lib/preloader-options";

export { PRELOADER_COOKIE } from "@/lib/preloader-options";

/**
 * WHICH PRELOADER THE SITE PLAYS, the owner's choice in Settings > Website
 * and SEO, made the same way as the maintenance page: a gallery, a preview,
 * nothing changes until it is saved.
 *
 * The choice has to be known before the first paint, in the inline script in
 * app/layout.tsx, and most public pages are static HTML that cannot read the
 * database. So the proxy, which already reads the maintenance switch on every
 * public request, hands it to the browser as a small readable cookie
 * (PRELOADER_COOKIE), set only when it differs from what the browser holds.
 * Held for thirty seconds per instance, like the switch, so a change reaches
 * everybody within half a minute. A database that does not answer means the
 * default, never a broken page.
 */
const TTL = 30_000;
const held = globalThis as typeof globalThis & { __wdcPreloader?: { at: number; value: PreloaderId } };

export async function preloader(opts: { fresh?: boolean } = {}): Promise<PreloaderId> {
  const h = held.__wdcPreloader;
  if (!opts.fresh && h && Date.now() - h.at < TTL) return h.value;
  const raw = await getAppSetting<unknown>(PRELOADER_KEY, DEFAULT_PRELOADER);
  const value = isPreloader(raw) ? raw : DEFAULT_PRELOADER;
  held.__wdcPreloader = { at: Date.now(), value };
  return value;
}

export function forgetPreloader() {
  delete held.__wdcPreloader;
}
