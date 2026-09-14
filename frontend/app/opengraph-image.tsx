import fs from "node:fs";
import path from "node:path";
import { SITE_NAME } from "@/lib/site";
import { OG_SIZE } from "@/lib/og";

/**
 * The site-wide link preview card: a photograph of the hero itself.
 *
 * WHY A SCREENSHOT HERE, WHEN A DRAWN CARD IS USUALLY BETTER. A drawn card
 * wins when it can say something the page cannot show at thumbnail size, which
 * is why every other route still draws one. The homepage is the exception: its
 * hero IS the pitch, the headline is already set at a size that survives being
 * shrunk, and the logo, the promise and the call to action are in one frame.
 * Rebuilding that in Satori would be a worse copy of something we already have.
 *
 * It is captured at exactly 1200x630, so the hero composes itself for the card
 * rather than being cropped into it.
 *
 * IT GOES STALE. That is the cost, and the mitigation is that it is
 * reproducible: `node scripts/shoot-og-card.mjs` re-shoots it against a local
 * production build. Re-run it whenever the hero changes.
 */
export const alt = `${SITE_NAME}: creative and digital agency`;
export const size = OG_SIZE;
export const contentType = "image/jpeg";

export default async function Image() {
  const file = fs.readFileSync(path.join(process.cwd(), "public", "og", "home-card.jpg"));
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
    },
  });
}
