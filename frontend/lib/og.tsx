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
/* A PHOTOGRAPH BEHIND THE CARD, RESIZED AT BUILD TIME.

   The suggestion that started this was to use a screenshot of the homepage.
   The instinct was right -- the flat navy card was lifeless next to the site
   it points at -- but a screenshot is the wrong artefact three times over: at
   the ~120px a chat app actually renders, the headline and nav become mush;
   it freezes one of six rotating hero backdrops, so it is wrong the next time
   the design moves; and it shows the reader exactly what they get after
   clicking, which is not a reason to click.

   So the photograph, not the screenshot, and the words drawn over it at a size
   that survives being shrunk. `sharp` covers the source to 1200x630 once per
   build; the base64 of a full-size JPEG would otherwise be several megabytes
   of string handed to the renderer for an image it is about to downscale. */
const shotCache = new Map<string, string>();
async function shotDataUri(publicPath: string) {
  const hit = shotCache.get(publicPath);
  if (hit) return hit;
  const { default: sharp } = await import("sharp");
  const buf = await sharp(path.join(process.cwd(), "public", publicPath))
    .resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover", position: "attention" })
    /* A GENTLE BLUR, EARNING ITS PLACE TWICE. It lifts the type off the
       photograph so the headline never has to fight a detail behind it, and
       because a PNG's weight is driven by detail it takes the rendered card
       from 640KB to something a chat app will actually fetch -- WhatsApp gives
       up on previews around 600KB, which the sharp original sat right on. */
    .blur(3)
    .jpeg({ quality: 58, mozjpeg: true })
    .toBuffer();
  const uri = `data:image/jpeg;base64,${buf.toString("base64")}`;
  shotCache.set(publicPath, uri);
  return uri;
}

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
  shot,
}: {
  /** The small tracked line above the title -- the section, or the service. */
  eyebrow?: string;
  /** The page's own name. The card's whole job is to say this legibly. */
  title: string;
  /** One short line under it. Falls back to the motto. */
  note?: string;
  /** A path under `public/` -- one of the site's own photographs -- to sit
      behind the card. Omit for the flat brand ground. */
  shot?: string;
}) {
  const photo = shot ? await shotDataUri(shot) : null;
  const rendered = new ImageResponse(
    (
      <div
        style={{
          position: "relative",
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
          fontFamily: "Space Grotesk",
          /* One gesture of decoration, dialled back from a 900px bloom that
             read as a gradient for its own sake. */
          /* THE PHOTOGRAPH IS A BACKGROUND LAYER, NOT AN <img>.

             As an absolutely positioned element it was laid out as a flex item
             -- Satori's support for `position: absolute` is partial -- so the
             card wore a navy band along the top and bottom where the image had
             been pushed by `justify-content: center`. A background cannot be
             laid out by the flex algorithm at all, so it fills the card by
             construction.

             Layer order is CSS's: the first gradient paints on top. The scrim
             is weighted left, where the type sits, rather than spread evenly --
             the same reasoning the hero and the blog covers use -- and it is
             navy rather than black so the card still reads as ours and not as
             a darkened stock photo. */
          backgroundImage: [
            "radial-gradient(620px 380px at 92% -8%, rgba(255,101,0,0.30), transparent 60%)",
            photo
              ? "linear-gradient(100deg, rgba(0,0,60,0.95) 0%, rgba(0,0,60,0.90) 44%, rgba(0,0,60,0.58) 80%, rgba(0,0,60,0.40) 100%)"
              : null,
            photo ? `url(${photo})` : null,
          ].filter(Boolean).join(", "),
          backgroundSize: "cover",
        }}
      >
        {/* THE PADDING LIVES HERE, NOT ON THE CARD. An absolutely positioned
            child is laid out inside its parent's PADDING box, so with the
            inset on the container the photograph stopped 84px short of the
            left edge and the card wore a navy margin. */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            padding: "0 84px",
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

  /* THE CARD IS RE-ENCODED WHEN IT CARRIES A PHOTOGRAPH.

     `ImageResponse` emits a full-colour PNG, and a PNG of a photograph is
     large however gently it is blurred: the version with the hero behind it
     came out at 677KB. WhatsApp gives up on a preview at roughly 600KB, so the
     card that was supposed to make links look better would simply not appear.

     Quantising to a 128-colour palette is the right trade here and nowhere
     else: the photograph is already blurred, so there is no fine detail for a
     palette to destroy, while the type and the logo are flat white on flat
     navy -- the two things a palette reproduces exactly. Cards without a
     photograph are flat colour already and are returned untouched. */
  if (!photo) return rendered;

  const { default: sharp } = await import("sharp");
  const png = await sharp(Buffer.from(await rendered.arrayBuffer()))
    .png({ palette: true, colours: 128, effort: 7 })
    .toBuffer();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": OG_CONTENT_TYPE,
      /* Content-addressed by the build, so it can be cached hard. */
      "Cache-Control": "public, immutable, no-transform, max-age=31536000",
    },
  });
}
