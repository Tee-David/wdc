import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { MOTTO, SITE_NAME } from "@/lib/site";

/**
 * The social card, in one place.
 *
 * WHY THIS EXISTS. Every page on the site had complete metadata except the one
 * thing a person actually sees: `og:image` was absent everywhere, so a link to
 * any of it -- pasted into WhatsApp, Slack, LinkedIn, a DM -- unfurled as a
 * bare grey rectangle with a line of text. For an agency whose whole case is
 * that it makes things look considered, that is the worst possible first
 * impression, and it is the single highest-value thing missing from the SEO
 * setup.
 *
 * WHY IT IS DRAWN RATHER THAN A FILE. A static card would need re-exporting by
 * hand every time a page or a case study is added, and would say the same
 * thing for all of them. Drawn at build time from the page's own title, each
 * route gets a card that names it.
 *
 * THE FONT IS A REAL FILE IN THE REPO. Satori cannot read the woff2 that
 * `next/font` produces and has no access to the browser's font stack, so
 * without an embedded font this would silently fall back to Noto Sans and the
 * card would be the one WDC surface not set in the brand face. Two static
 * instances of Space Grotesk, cut from the variable font at the weights used
 * here, live in assets/fonts/ for exactly this.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/* `process.cwd()` is the project root during the build, which is where the
   generation actually happens; these never load at request time. */
const font = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), "assets", "fonts", file));

const INK = "#ffffff";
const BAND = "#000065";
const ACCENT = "#ff6500";

/* THE REAL MARK, READ OFF DISK AT BUILD TIME.
   The card used to draw an orange disc with a letter C in it, which is not our
   logo -- it is a placeholder that had been standing in long enough to start
   looking deliberate. `logo-white.svg` is the actual lockup, and Satori will
   render an SVG given to it as a data URI. Read once per build, not per card. */
let logoCache: string | null = null;
const logoDataUri = () => {
  if (logoCache) return logoCache;
  const svg = fs.readFileSync(path.join(process.cwd(), "public", "brand", "logo-white.svg"));
  logoCache = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  return logoCache;
};

export async function ogCard({
  eyebrow,
  title,
  note,
}: {
  /** The small tracked line above the title -- the section, or the service. */
  eyebrow?: string;
  /** The page's own name. The card's whole job is to say this legibly. */
  title: string;
  /** One short line under it. Falls back to the motto. */
  note?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          /* NOT `space-between`. That pushed the lockup to the top edge and the
             words to the bottom, leaving a dead band through the middle -- and
             chat apps crop to the middle, so the crop was mostly empty navy.
             Everything now sits in one block, centred, which is what survives
             being cut down to a thumbnail. */
          justifyContent: "center",
          background: BAND,
          padding: "0 84px",
          fontFamily: "Space Grotesk",
          /* One gesture of decoration, dialled back from a 900px bloom that
             read as a gradient for its own sake. */
          backgroundImage:
            "radial-gradient(620px 380px at 92% -8%, rgba(255,101,0,0.30), transparent 60%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUri()} alt="" width={300} height={96} style={{ marginBottom: 40 }} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow ? (
            <span
              style={{
                color: ACCENT,
                fontSize: 21,
                fontWeight: 700,
                /* 3 was wide enough to read as a gap between letters rather
                   than a tracked label. */
                letterSpacing: 1.6,
                textTransform: "uppercase",
                marginBottom: 14,
              }}
            >
              {eyebrow}
            </span>
          ) : null}
          <span
            style={{
              color: INK,
              /* Smaller than it was at both ends. 86px filled the card so
                 completely that a chat-app crop landed mid-word; at 72 the
                 line still dominates and the crop still contains a phrase. */
              fontSize: title.length > 42 ? 54 : 72,
              fontWeight: 700,
              letterSpacing: -1.5,
              lineHeight: 1.06,
              maxWidth: 900,
            }}
          >
            {title}
          </span>
          <span
            style={{
              color: "#a9abd8",
              fontSize: 25,
              fontWeight: 500,
              marginTop: 18,
              maxWidth: 820,
              lineHeight: 1.4,
            }}
          >
            {note ?? `${MOTTO}. ${SITE_NAME}.`}
          </span>
        </div>

        {/* A short accent rule instead of a second block of text: it closes the
            composition and is unmistakably ours at any crop. */}
        <div style={{ display: "flex", width: 96, height: 6, borderRadius: 999, background: ACCENT, marginTop: 40 }} />
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Space Grotesk", data: font("SpaceGrotesk-Bold.ttf"), weight: 700, style: "normal" },
        { name: "Space Grotesk", data: font("SpaceGrotesk-Medium.ttf"), weight: 500, style: "normal" },
      ],
    },
  );
}
