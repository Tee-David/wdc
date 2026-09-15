import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";
import { OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

/**
 * The homepage's own link-preview card: the brand mark, not a screenshot.
 *
 * This used to be a photograph of the live hero, re-shot by a Playwright
 * script whenever the hero changed. A photo only earns its place over a
 * drawn card when it shows something the drawing can't, and at the size a
 * chat app actually renders a preview -- well under 200px wide -- a hero
 * screenshot reduces to a smear of colour with none of its own words
 * legible anyway. The mark alone still reads at that size, and it doesn't
 * go stale the next time the hero's copy or backdrop changes.
 *
 * `icon-color.svg` is the one mark that carries both brand colours, navy
 * and orange, so it goes on white here rather than repeating the navy
 * ground the mark already sits on everywhere else on the site.
 */
export const alt = `${SITE_NAME}: creative and digital agency`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

let markCache: string | null = null;
const markDataUri = () => {
  if (markCache) return markCache;
  const svg = fs.readFileSync(path.join(process.cwd(), "public", "brand", "icon-color.svg"));
  markCache = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  return markCache;
};

/* The mark's own viewBox is 904x944, close to square but not quite -- the
   height drives the size and the width follows that ratio so the mark is
   never stretched. Held to 440px tall against a 630px-tall canvas so a
   square crop taken from the centre (what several chat apps do) still
   shows the whole mark with room around it. */
const MARK_HEIGHT = 440;
const MARK_WIDTH = Math.round((904 / 944) * MARK_HEIGHT);

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={markDataUri()} alt="" width={MARK_WIDTH} height={MARK_HEIGHT} />
      </div>
    ),
    OG_SIZE,
  );
}
