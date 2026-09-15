/**
 * How a URL unfurls, read off the page's own tags.
 *
 * WHAT THIS ANSWERS. Somebody is about to paste a link into a WhatsApp group
 * of four hundred people and has no idea what will appear under it. That is
 * the anxiety this tool exists for, and it is the reason WhatsApp leads the
 * list rather than Facebook: in this market it is the channel a link actually
 * travels through.
 *
 * NO DOM, AND THAT IS A DECISION RATHER THAN A CORNER CUT. Parsing a
 * stranger's HTML with a real parser means a dependency whose job is to be
 * lenient about hostile markup, and `AGENTS.md` says not to add a package for
 * a small job. What we need is a dozen meta tags out of a document head, and
 * the regexes below are written to fail SHUT: anything they cannot read
 * becomes "missing", which is the same thing a scraper that cannot read it
 * will decide. A parser would be more accurate about broken markup; it would
 * also be more accurate than Facebook's own crawler, which is the wrong target
 * -- what a reader wants to know is what the scrapers will do, and the
 * scrapers are not generous either.
 *
 * THE LIMITS BELOW ARE APPROXIMATE, DATED AND SOURCED. Every platform redraws
 * its cards without telling anyone, so `PLATFORMS` carries the date it was
 * last reviewed and the page says so. A tool that shows a truncation to the
 * character and is quietly a year out of date is worse than one that says
 * "about".
 *
 * PURE, SO IT IS TESTABLE. `scripts/check-link-preview.mjs` calls it with
 * fixture HTML and no network, which is also why there is no `server-only`
 * here: the fetching lives in the route, the reading lives here.
 */

/* ------------------------------------------------------------ the platforms */

export type PlatformKey = "whatsapp" | "x" | "linkedin" | "facebook";

export type Platform = {
  key: PlatformKey;
  label: string;
  /** Roughly where the title is cut. */
  title: number;
  /** Roughly where the description is cut. 0 means the card shows none. */
  description: number;
  /** One line about this platform's own habit, shown under its card. */
  note: string;
};

/**
 * REVIEWED 2026-09. The numbers are the commonest desktop renderings and they
 * drift; they are printed on the page with the word "about" for that reason.
 *
 * Sources, which are also what to re-read when this is next reviewed:
 *   WhatsApp image rules   https://www.ogrilla.com/blog/whatsapp-link-preview-guide
 *   OG sizes across apps   https://imagedimensions.com/guides/open-graph-image-size
 *   LinkedIn truncation    https://opengraphplus.com/consumers/linkedin
 *   Cross-platform limits  https://blipfiles.com/en/guides/character-limits-social-media-seo
 */
export const REVIEWED = "September 2026";

export const PLATFORMS: Platform[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    title: 65,
    description: 120,
    note: "The one that matters most here, and the fussiest about the image: over 300KB and it shows no picture at all.",
  },
  {
    key: "x",
    label: "X",
    title: 70,
    description: 125,
    note: "Needs twitter:card to decide between a large picture and a thumbnail. Without it, the card is the small one.",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    title: 119,
    description: 250,
    note: "Caches hard. If you fix a tag, LinkedIn will keep showing the old card until its Post Inspector is run on the URL.",
  },
  {
    key: "facebook",
    label: "Facebook",
    title: 100,
    description: 300,
    note: "The most forgiving of the four, and the one whose crawler most often gets served a different page than a person.",
  },
];

/* ---------------------------------------------------------------- the image */

/** WhatsApp's ceiling, and the tightest of the four. */
export const MAX_IMAGE_BYTES = 300 * 1024;
/** Below this, no platform renders the picture at all. */
export const MIN_IMAGE_EDGE = 100;
/** The one shape that renders cleanly everywhere: 1200x630, 1.91:1. */
export const BEST_IMAGE = { width: 1200, height: 630 };

export type ImageFacts = {
  url: string;
  /** Null when we could not read it: blocked, missing, or a format with no
   *  header we parse. Said as "could not read", never as "wrong". */
  bytes: number | null;
  width: number | null;
  height: number | null;
  contentType: string | null;
};

/* ----------------------------------------------------------------- the tags */

export type Tags = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  siteName: string;
  canonical: string;
  /** "summary", "summary_large_image", or empty where the page sets none. */
  twitterCard: string;
  /** Which source each field came from, so the tool can say WHY a card is
   *  empty rather than only that it is. */
  from: { title: string; description: string; image: string };
};

/**
 * One attribute out of a tag, quoted either way, in any order.
 *
 * Written as "find the tags, then read inside each one" rather than one
 * clever expression, because a single regex over a whole document is how a
 * parser starts matching across tag boundaries.
 */
function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"));
  return (match?.[2] ?? match?.[3] ?? match?.[4] ?? "").trim();
}

/**
 * HTML entities, the five that matter plus numeric ones.
 *
 * A title reading `Ada &amp; Sons` has to be shown as `Ada & Sons`, because
 * that is what the reader will see on the card. Deliberately NOT a general
 * entity table: the named set is enormous, and the five below plus numerics
 * cover what appears in titles that people write.
 */
export function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    /* Ampersand last, or `&amp;lt;` decodes to `<` in two passes. */
    .replace(/&amp;/gi, "&");
}

function tidy(value: string) {
  return decodeEntities(value).replace(/\s+/g, " ").trim();
}

/** Relative image paths are the commonest broken preview there is. */
function absolute(value: string, base: string) {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

export function readTags(html: string, base: string): Tags {
  /* THE HEAD ONLY, where there is one. A body can carry a `<meta>` inside a
     comment, a code sample or a `<template>`, and a page that DOCUMENTS Open
     Graph tags would otherwise be read as having them. */
  const head = html.match(/<head[\s>][\s\S]*?<\/head>/i)?.[0] ?? html;

  const metas = head.match(/<meta\b[^>]*>/gi) ?? [];
  const named = new Map<string, string>();
  for (const tag of metas) {
    /* `property` is the Open Graph spelling and `name` the Twitter one, and
       plenty of pages use the wrong one of the two. Both are read, because
       the crawlers read both and the reader wants to know what the crawlers
       will do, not what the specification says they should. */
    const key = (attr(tag, "property") || attr(tag, "name")).toLowerCase();
    const content = attr(tag, "content");
    if (key && content && !named.has(key)) named.set(key, content);
  }

  const docTitle = tidy(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const link = head.match(/<link\b[^>]*rel\s*=\s*["']?canonical["']?[^>]*>/i)?.[0] ?? "";

  const get = (...keys: string[]) => {
    for (const key of keys) {
      const value = named.get(key);
      if (value) return { value: tidy(value), key };
    }
    return { value: "", key: "" };
  };

  const title = get("og:title", "twitter:title");
  const description = get("og:description", "twitter:description", "description");
  const image = get("og:image", "og:image:url", "og:image:secure_url", "twitter:image");

  return {
    /* THE FALLBACK IS THE DOCUMENT TITLE, because that is what every scraper
       falls back to. A tool that showed an empty card here would be telling
       the reader their link is worse than it is. `from` carries the
       difference, so the card can be right and the advice can still say the
       tag is missing. */
    title: title.value || docTitle,
    description: description.value,
    image: absolute(image.value, base),
    imageAlt: get("og:image:alt", "twitter:image:alt").value,
    siteName: get("og:site_name").value,
    canonical: absolute(attr(link, "href"), base),
    twitterCard: get("twitter:card").value.toLowerCase(),
    from: {
      title: title.key || (docTitle ? "<title>" : ""),
      description: description.key,
      image: image.key,
    },
  };
}

/* ------------------------------------------------------------ the rendering */

/**
 * The text as the card will carry it.
 *
 * CUT AT A WORD, NOT MID-SYLLABLE. Every one of these platforms breaks on a
 * word and adds an ellipsis, so cutting at the exact character would show the
 * reader something no platform renders.
 */
export function truncate(value: string, limit: number) {
  if (!value || value.length <= limit) return { text: value, cut: false };
  const slice = value.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  return { text: `${(lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`, cut: true };
}

export type Card = {
  platform: Platform;
  title: string;
  description: string;
  titleCut: boolean;
  descriptionCut: boolean;
  /** The domain every one of the four prints under the card. */
  domain: string;
  /** False when the picture will not render there, with `imageReason` saying
   *  why in the words the reader needs. */
  showsImage: boolean;
  imageReason: string;
  /** X shows a thumbnail rather than a banner without `twitter:card`. */
  large: boolean;
};

export function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * One card per platform, with this page's tags in it.
 *
 * The image rules are applied PER PLATFORM rather than once, because they
 * genuinely differ: WhatsApp drops the picture over 300KB where the others
 * scale it, and X falls back to a thumbnail without a card type.
 */
export function cardsFor(tags: Tags, image: ImageFacts | null, finalUrl: string): Card[] {
  return PLATFORMS.map((platform) => {
    const title = truncate(tags.title, platform.title);
    const description = platform.description
      ? truncate(tags.description, platform.description)
      : { text: "", cut: false };

    let showsImage = Boolean(tags.image);
    let imageReason = tags.image ? "" : "No og:image, so the card is text only.";

    if (showsImage && image) {
      if (image.bytes !== null && platform.key === "whatsapp" && image.bytes > MAX_IMAGE_BYTES) {
        showsImage = false;
        imageReason = `The image is ${Math.round(image.bytes / 1024)}KB. WhatsApp drops anything over 300KB.`;
      } else if (
        image.width !== null && image.height !== null
        && (image.width < MIN_IMAGE_EDGE || image.height < MIN_IMAGE_EDGE)
      ) {
        showsImage = false;
        imageReason = `The image is ${image.width}×${image.height}. Under 100px on a side, nothing renders it.`;
      }
    }

    return {
      platform,
      title: title.text,
      description: description.text,
      titleCut: title.cut,
      descriptionCut: description.cut,
      domain: domainOf(tags.canonical || finalUrl),
      showsImage,
      imageReason,
      /* Only X makes this distinction, and only it is told about it. */
      large: platform.key !== "x" || tags.twitterCard === "summary_large_image",
    };
  });
}

/* ------------------------------------------------------------- the findings */

export type Finding = {
  id: string;
  label: string;
  verdict: "good" | "weak" | "missing" | "unknown";
  detail: string;
};

/**
 * What to fix, in the order it costs a share.
 *
 * ORDERED BY CONSEQUENCE, NOT BY TAG. A missing image is the difference
 * between a card and a grey line of text, so it is first; an absent
 * `og:image:alt` is a real accessibility fault and nobody's link died of it,
 * so it is last. The same rule the email checker follows: lead with the
 * finding that has a consequence the reader can feel.
 */
export function findingsFor(tags: Tags, image: ImageFacts | null): Finding[] {
  const out: Finding[] = [];

  if (!tags.image) {
    out.push({
      id: "image",
      label: "Preview image",
      verdict: "missing",
      detail: "There is no og:image, so every one of these is a line of text with a link on it. One 1200×630 image is the single biggest difference you can make to a shared link.",
    });
  } else if (image?.bytes !== null && image?.bytes !== undefined && image.bytes > MAX_IMAGE_BYTES) {
    out.push({
      id: "image",
      label: "Preview image",
      verdict: "weak",
      detail: `The image is ${Math.round(image.bytes / 1024)}KB. WhatsApp shows nothing over 300KB, so the channel most of your links travel through is the one that drops it. A JPEG at 80% quality holds the same dimensions well under that.`,
    });
  } else if (image?.width && image?.height) {
    const ratio = image.width / image.height;
    const ideal = BEST_IMAGE.width / BEST_IMAGE.height;
    if (image.width < MIN_IMAGE_EDGE || image.height < MIN_IMAGE_EDGE) {
      out.push({
        id: "image",
        label: "Preview image",
        verdict: "missing",
        detail: `At ${image.width}×${image.height} it is below the 100px floor, so no platform will render it. Replace it with 1200×630.`,
      });
    } else if (Math.abs(ratio - ideal) > 0.35) {
      out.push({
        id: "image",
        label: "Preview image",
        verdict: "weak",
        detail: `It is ${image.width}×${image.height}, which is ${ratio > ideal ? "wider" : "taller"} than the 1.91:1 every card is cut to. Faces and words near the edges will be cropped out. 1200×630 renders cleanly everywhere.`,
      });
    } else {
      out.push({
        id: "image",
        label: "Preview image",
        verdict: "good",
        detail: `${image.width}×${image.height}${image.bytes ? `, ${Math.round(image.bytes / 1024)}KB` : ""}. That is the shape and the weight every one of the four wants.`,
      });
    }
  } else {
    out.push({
      id: "image",
      label: "Preview image",
      verdict: "unknown",
      detail: "There is an og:image, but we could not read it to check its size. That often means the file is behind something a scraper cannot reach either, which is worth checking.",
    });
  }

  if (!tags.title) {
    out.push({
      id: "title",
      label: "Title",
      verdict: "missing",
      detail: "No og:title and no page title, so the card has nothing to head it. Most scrapers will print the bare URL.",
    });
  } else if (tags.from.title === "<title>") {
    out.push({
      id: "title",
      label: "Title",
      verdict: "weak",
      detail: "There is no og:title, so the cards fall back to the page title. That works, and it means the headline people see when your link is shared is the one written for Google rather than for them.",
    });
  } else if (tags.title.length > 65) {
    out.push({
      id: "title",
      label: "Title",
      verdict: "weak",
      detail: `It is ${tags.title.length} characters, so WhatsApp and X cut it. Say the thing that matters in the first 60 and the rest is a bonus.`,
    });
  } else {
    out.push({
      id: "title",
      label: "Title",
      verdict: "good",
      detail: `${tags.title.length} characters, which survives all four cards intact.`,
    });
  }

  if (!tags.description) {
    out.push({
      id: "description",
      label: "Description",
      verdict: "missing",
      detail: "No og:description and no meta description, so the cards show a title and a domain with nothing under them. One sentence of about 110 characters fills every one of the four.",
    });
  } else if (tags.description.length > 200) {
    out.push({
      id: "description",
      label: "Description",
      verdict: "weak",
      detail: `It is ${tags.description.length} characters. Facebook keeps it, WhatsApp and X cut it well before the end. Front-load the point.`,
    });
  } else {
    out.push({
      id: "description",
      label: "Description",
      verdict: "good",
      detail: `${tags.description.length} characters, which reads whole on most of the four.`,
    });
  }

  out.push(
    tags.twitterCard === "summary_large_image"
      ? {
          id: "card",
          label: "X card type",
          verdict: "good",
          detail: "twitter:card is summary_large_image, so X gives the picture the full width rather than a thumbnail.",
        }
      : {
          id: "card",
          label: "X card type",
          verdict: tags.twitterCard ? "weak" : "missing",
          detail: tags.twitterCard
            ? `twitter:card is "${tags.twitterCard}", so X renders a small square thumbnail beside the text rather than a banner.`
            : "No twitter:card, so X falls back to the small thumbnail layout. One meta tag turns it into a full-width picture.",
        },
  );

  if (tags.image) {
    out.push(
      tags.imageAlt
        ? { id: "alt", label: "Image description", verdict: "good", detail: "og:image:alt is set, so the picture is described to anyone using a screen reader." }
        : { id: "alt", label: "Image description", verdict: "weak", detail: "No og:image:alt. Nothing breaks without it, and a reader on a screen reader gets a card with an unnamed picture in it." },
    );
  }

  return out;
}
