/**
 * The on-page half of the SEO snapshot at /tools/seo.
 *
 * WHAT IT IS ALLOWED TO CLAIM, decided before anything was written. This reads
 * ONE fetch of ONE page. It therefore knows about that page's own HTML and
 * nothing else: not the site's links, not its sitemap, not whether Google has
 * indexed anything, and not what the page weighs once its images and scripts
 * have loaded. Every finding below is phrased inside that boundary, and the
 * page says so in as many words. A free tool that implies it has audited a
 * site when it has read a document is how "SEO report" became a word for
 * spam.
 *
 * IT IS THE CLASS A FLOOR, in the terms of `docs/tools-programme.md`. The
 * Lighthouse run that follows is metered and capped and may be unavailable;
 * this is not. Everything here costs one HTTP fetch, which we are paying for
 * anyway, and a visitor who arrives on a day the budget is spent still gets
 * all of it.
 *
 * NO SCORE OUT OF A HUNDRED. Lighthouse already gives one, and a second
 * invented number would be the worst thing on the page: it invites the reader
 * to feel finished at 72 and it cannot be defended when they ask how it was
 * calculated. Findings, each with the sentence that says what it costs them.
 *
 * REGEX AND NOT A PARSER, for the reasons written at the top of
 * `lib/link-preview.ts`: a dozen tags out of a document head, and a dependency
 * whose job is to be lenient about hostile markup is not worth adding for it.
 * Pure and synchronous, so `scripts/check-seo-audit.mjs` runs it without a
 * browser or a network.
 */

export type Verdict = "good" | "weak" | "missing" | "unknown";

export type Finding = {
  id: string;
  label: string;
  verdict: Verdict;
  detail: string;
};

/** Everything the snapshot read, kept apart from what it concluded. */
export type Facts = {
  url: string;
  https: boolean;
  title: string;
  description: string;
  h1s: string[];
  canonical: string;
  robots: string;
  viewport: string;
  og: { title: boolean; description: boolean; image: boolean };
  images: number;
  imagesWithoutAlt: number;
  structuredData: string[];
  /** The HTML document only. Named that way everywhere it is shown. */
  bytes: number;
};

/* --------------------------------------------------------------- the reading */

function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i"));
  return (match?.[2] ?? match?.[3] ?? match?.[4] ?? "").trim();
}

function decode(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function tidy(value: string) {
  return decode(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function read(html: string, url: string, bytes: number): Facts {
  const head = html.match(/<head[\s>][\s\S]*?<\/head>/i)?.[0] ?? html;

  const metas = head.match(/<meta\b[^>]*>/gi) ?? [];
  const named = new Map<string, string>();
  for (const tag of metas) {
    const key = (attr(tag, "name") || attr(tag, "property")).toLowerCase();
    const content = attr(tag, "content");
    if (key && !named.has(key)) named.set(key, content);
  }

  /* H1s COME FROM THE WHOLE DOCUMENT, not the head, and that is the point of
     the check: the fault being looked for is a second one further down the
     page, which is exactly where nobody looks. */
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => tidy(m[1]))
    .filter(Boolean);

  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  /* AN EMPTY ALT IS A CORRECT ALT. `alt=""` says "this picture is decoration,
     skip it", which is the right answer for a divider or a background. Only a
     MISSING attribute is a fault, and treating the two the same would tell
     somebody who has done the work properly that they have not. */
  const withoutAlt = imgs.filter((tag) => !/\balt\s*=/i.test(tag)).length;

  const structured = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap((m) => {
      try {
        const parsed = JSON.parse(m[1].trim());
        const nodes = Array.isArray(parsed) ? parsed : [parsed, ...(parsed["@graph"] ?? [])];
        return nodes.map((node: Record<string, unknown>) => String(node?.["@type"] ?? "")).filter(Boolean);
      } catch {
        /* A block that will not parse is a block Google drops too, so it is
           reported as nothing found rather than as something found. */
        return [];
      }
    });

  const canonicalTag = head.match(/<link\b[^>]*rel\s*=\s*["']?canonical["']?[^>]*>/i)?.[0] ?? "";

  return {
    url,
    https: /^https:/i.test(url),
    title: tidy(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
    description: tidy(named.get("description") ?? ""),
    h1s,
    canonical: attr(canonicalTag, "href"),
    robots: (named.get("robots") ?? "").toLowerCase(),
    viewport: named.get("viewport") ?? "",
    og: {
      title: Boolean(named.get("og:title")),
      description: Boolean(named.get("og:description")),
      image: Boolean(named.get("og:image")),
    },
    images: imgs.length,
    imagesWithoutAlt: withoutAlt,
    structuredData: [...new Set(structured)],
    bytes,
  };
}

/* ------------------------------------------------------------- the findings */

/**
 * Ordered by consequence, hardest first.
 *
 * `noindex` is at the top because it is the only finding here that means the
 * page is invisible to Google no matter what else is right, and because it is
 * almost always an accident -- a staging flag that went live with the site. We
 * have found it on a paying client's homepage.
 */
export function findings(facts: Facts): Finding[] {
  const out: Finding[] = [];

  const noindex = /\bnoindex\b/.test(facts.robots);
  out.push(
    noindex
      ? {
          id: "robots",
          label: "Indexing",
          verdict: "missing",
          detail: "This page carries a noindex instruction, which tells Google to keep it out of search entirely. Everything else on this list is academic until that is removed, and it is usually a staging setting that went live with the site.",
        }
      : {
          id: "robots",
          label: "Indexing",
          verdict: "good",
          detail: facts.robots
            ? `The robots meta tag says "${facts.robots}", and nothing in it blocks indexing.`
            : "Nothing is blocking this page from being indexed.",
        },
  );

  if (!facts.title) {
    out.push({ id: "title", label: "Title", verdict: "missing", detail: "There is no title tag. It is the blue line in every search result and the name of every browser tab, and without it Google writes its own from whatever it finds." });
  } else if (facts.title.length > 60) {
    out.push({ id: "title", label: "Title", verdict: "weak", detail: `${facts.title.length} characters, so Google will cut it in the results. Under about 60 keeps it whole; the first three words do most of the work.` });
  } else if (facts.title.length < 20) {
    out.push({ id: "title", label: "Title", verdict: "weak", detail: `Only ${facts.title.length} characters. There is room to say what the page is for and where you are, and that room is free.` });
  } else {
    out.push({ id: "title", label: "Title", verdict: "good", detail: `${facts.title.length} characters, which survives a search result intact.` });
  }

  if (!facts.description) {
    out.push({ id: "description", label: "Meta description", verdict: "missing", detail: "There is none, so Google picks two lines out of the page and shows them instead. That is your advertisement being written by a machine that has not been told what you sell." });
  } else if (facts.description.length > 160) {
    out.push({ id: "description", label: "Meta description", verdict: "weak", detail: `${facts.description.length} characters. Google cuts around 160, so the end of it is decoration.` });
  } else if (facts.description.length < 70) {
    out.push({ id: "description", label: "Meta description", verdict: "weak", detail: `${facts.description.length} characters, which leaves most of the space in the result empty. Around 150 is the whole of it.` });
  } else {
    out.push({ id: "description", label: "Meta description", verdict: "good", detail: `${facts.description.length} characters, which fits the space Google gives it.` });
  }

  if (facts.h1s.length === 0) {
    out.push({ id: "h1", label: "Headline", verdict: "missing", detail: "No H1 anywhere on the page. It is the one heading that tells both a reader and a crawler what this page is about, and a page without one is asking to be guessed at." });
  } else if (facts.h1s.length > 1) {
    out.push({ id: "h1", label: "Headline", verdict: "weak", detail: `${facts.h1s.length} H1s: “${facts.h1s.slice(0, 3).join("”, “")}”${facts.h1s.length > 3 ? " and more" : ""}. Several competing headlines means none of them is the headline.` });
  } else {
    out.push({ id: "h1", label: "Headline", verdict: "good", detail: `One H1: “${facts.h1s[0]}”. That is the shape a page should be.` });
  }

  out.push(
    facts.canonical
      ? { id: "canonical", label: "Canonical", verdict: "good", detail: `Set to ${facts.canonical}, so the same page reachable at several addresses still counts as one.` }
      : { id: "canonical", label: "Canonical", verdict: "weak", detail: "No canonical link. It is how you tell Google which address is the real one when the same page is reachable with and without a slash, with tracking parameters, or on www and without." },
  );

  out.push(
    facts.viewport
      ? { id: "viewport", label: "Mobile viewport", verdict: "good", detail: "The viewport meta tag is set, so phones render the page at their own width rather than zooming out of a desktop layout." }
      : { id: "viewport", label: "Mobile viewport", verdict: "missing", detail: "No viewport meta tag. On a phone the browser renders a desktop-width page and shrinks it, which is unreadable and which Google treats as not mobile friendly. It is one line." },
  );

  out.push(
    facts.https
      ? { id: "https", label: "HTTPS", verdict: "good", detail: "Served over https, which browsers require before they will stop labelling a site as not secure." }
      : { id: "https", label: "HTTPS", verdict: "missing", detail: "This address is plain http. Browsers mark it as not secure in the address bar, and forms on it are flagged outright. A certificate is free." },
  );

  const ogCount = [facts.og.title, facts.og.description, facts.og.image].filter(Boolean).length;
  out.push(
    ogCount === 3
      ? { id: "og", label: "Sharing tags", verdict: "good", detail: "og:title, og:description and og:image are all set, so a link to this page unfurls properly when it is shared." }
      : {
          id: "og",
          label: "Sharing tags",
          verdict: ogCount === 0 ? "missing" : "weak",
          detail: `${ogCount === 0 ? "None of" : `Only ${ogCount} of`} the three Open Graph tags are set, so a link to this page shared on WhatsApp or LinkedIn shows a bare line of text instead of a card. Our link preview checker shows exactly what it looks like.`,
        },
  );

  if (facts.images === 0) {
    out.push({ id: "alt", label: "Image descriptions", verdict: "unknown", detail: "No images in the HTML. Either there genuinely are none, or they are added by JavaScript after the page loads — which is also how Google first sees it." });
  } else if (facts.imagesWithoutAlt === 0) {
    out.push({ id: "alt", label: "Image descriptions", verdict: "good", detail: `All ${facts.images} images carry an alt attribute. An empty one is correct for decoration; what matters is that none is missing.` });
  } else {
    out.push({
      id: "alt",
      label: "Image descriptions",
      verdict: "weak",
      detail: `${facts.imagesWithoutAlt} of ${facts.images} images have no alt attribute. That is a page a screen reader cannot describe and image search cannot file, and it is usually an afternoon to fix.`,
    });
  }

  out.push(
    facts.structuredData.length
      ? { id: "schema", label: "Structured data", verdict: "good", detail: `Found: ${facts.structuredData.join(", ")}. That is what lets a result carry stars, prices, breadcrumbs or opening hours instead of two lines of text.` }
      : { id: "schema", label: "Structured data", verdict: "weak", detail: "No valid JSON-LD on the page. It is how a search result earns the extra detail — an address, a rating, a breadcrumb trail — and it only describes what is already visible here." },
  );

  return out;
}

/**
 * The one-line summary, which is the sentence somebody repeats to whoever
 * owns the site.
 */
export function headline(list: Finding[]) {
  const bad = list.filter((f) => f.verdict === "missing").length;
  const weak = list.filter((f) => f.verdict === "weak").length;
  if (bad === 0 && weak === 0) return "Nothing on this page is working against you, which is rarer than it should be.";
  if (bad === 0) return `${weak} thing${weak === 1 ? "" : "s"} on this page could be doing more for you.`;
  return `${bad} thing${bad === 1 ? " is" : "s are"} actively costing you here${weak ? `, and ${weak} more could be doing more` : ""}.`;
}
