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
          justifyContent: "space-between",
          background: BAND,
          padding: "72px 80px",
          fontFamily: "Space Grotesk",
          /* The one piece of decoration: a soft orange bloom off the top
             right, the same gesture the hero band carries, so the card and the
             page it points at are recognisably one thing. */
          backgroundImage: `radial-gradient(900px 520px at 88% -12%, rgba(255,101,0,0.42), transparent 62%)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              background: ACCENT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ color: INK, fontSize: 25, fontWeight: 700 }}>We Dig</span>
            <span style={{ color: INK, fontSize: 25, fontWeight: 700 }}>Creativity</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow ? (
            <span
              style={{
                color: ACCENT,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              {eyebrow}
            </span>
          ) : null}
          <span
            style={{
              color: INK,
              /* Two sizes rather than a formula: a long case-study name and a
                 one-word section title both have to fill the card without
                 either wrapping to four lines or floating in space. */
              fontSize: title.length > 42 ? 66 : 86,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.04,
              maxWidth: 940,
            }}
          >
            {title}
          </span>
          <span
            style={{
              color: "#a9abd8",
              fontSize: 28,
              fontWeight: 500,
              marginTop: 24,
              maxWidth: 900,
            }}
          >
            {note ?? `${MOTTO}. ${SITE_NAME}.`}
          </span>
        </div>
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
