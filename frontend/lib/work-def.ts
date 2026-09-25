/**
 * A CASE STUDY AS THE ADMIN EDITS IT: the three kinds of story, what each
 * needs, and the one function that turns whatever the editor sent into a
 * clean `CaseStudy` or says what is missing. Pure, so the editor shows the
 * same problems the server refuses on (artifact: "WDC Case Studies").
 */
import { SERVICES, type ServiceSlug } from "./services";
import type { CaseStudy } from "./work";

export type CaseKind = "build" | "identity" | "campaign";

export const CASE_KINDS: Record<CaseKind, {
  label: string; eg: string; defaultFor: ServiceSlug[];
  listLabel: string; listHint: string; picsLabel: string; pics: [number, number];
}> = {
  build: {
    label: "A build", eg: "A website, an app or software we built.", defaultFor: ["web", "apps", "software", "seo"],
    listLabel: "Built with", listHint: "The tools it runs on: Next.js, PostgreSQL, Expo...", picsLabel: "Screenshots", pics: [0, 8],
  },
  identity: {
    label: "An identity", eg: "A brand system, a guideline or a profile.", defaultFor: ["branding"],
    listLabel: "The system includes", listHint: "What was handed over: logo suite, usage rules, colour system...", picsLabel: "Artwork", pics: [1, 10],
  },
  campaign: {
    label: "A campaign", eg: "A season or set of social and print artwork.", defaultFor: ["social"],
    listLabel: "The season included", listHint: "The pieces in the set: key art, speaker cards, schedules...", picsLabel: "Artwork", pics: [1, 12],
  },
};

/** What an existing case study is, read off what it carries. */
export function kindOf(c: Pick<CaseStudy, "palette" | "stackLabel">): CaseKind {
  if (c.palette?.length) return "identity";
  if (/season/i.test(c.stackLabel ?? "")) return "campaign";
  return "build";
}

export const kindForService = (s: ServiceSlug): CaseKind =>
  (Object.entries(CASE_KINDS).find(([, v]) => v.defaultFor.includes(s))?.[0] as CaseKind | undefined) ?? "build";

export const LIMITS = { title: 90, summary: 80, short: 80, long: 1_200, did: 10, list: 12, palette: 8, alt: 160 } as const;

export const slugifyCase = (v: string) =>
  v.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const SERVICE_SLUGS = SERVICES.map((s) => s.slug) as ServiceSlug[];
const isService = (v: unknown): v is ServiceSlug => typeof v === "string" && (SERVICE_SLUGS as string[]).includes(v);
const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max) : "";
const list = (v: unknown, max: number, each: number) =>
  [...new Set((Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : []).map((x) => str(x, each)).filter(Boolean))].slice(0, max);
/** Our own pictures only: a path on the site, or an address in our bucket. */
const picture = (v: unknown, bucket: string) => {
  const s = str(v, 400);
  if (/^\/[A-Za-z0-9/_.-]+\.(jpe?g|png|webp|avif)$/i.test(s)) return s;
  if (bucket && s.startsWith(`${bucket.replace(/\/$/, "")}/`)) return s;
  return "";
};

/** What the editor sends. Everything optional; `cleanCase` decides. */
export type CaseInput = Partial<Record<keyof CaseStudy, unknown>> & { kind?: unknown; coverAlt?: unknown; galleryAlt?: unknown };

/**
 * Build a `CaseStudy` from the editor's answers. `problems` lists what stops
 * it being published, in words for the person editing; a draft may be saved
 * with problems, a publish may not.
 */
export function cleanCase(raw: CaseInput, opts: { bucket?: string } = {}): { data: CaseStudy & { kind: CaseKind; coverAlt?: string; galleryAlt?: string[] }; problems: string[] } {
  const bucket = opts.bucket ?? "";
  const problems: string[] = [];
  const category = isService(raw.category) ? raw.category : "web";
  const kind: CaseKind = raw.kind === "identity" || raw.kind === "campaign" || raw.kind === "build" ? raw.kind : kindForService(category);
  const k = CASE_KINDS[kind];
  const also = (Array.isArray(raw.categories) ? raw.categories : []).filter(isService).filter((s) => s !== category);
  const client = str(raw.client, LIMITS.short);
  const title = str(raw.title, 200);
  const summary = str(raw.summary, 200);
  const did = list(raw.did, LIMITS.did, 200);
  const stack = list(raw.stack, LIMITS.list, 60);
  const cover = picture(raw.cover, bucket);
  const coverAlt = str(raw.coverAlt, LIMITS.alt);
  const galleryRaw = Array.isArray(raw.gallery) ? raw.gallery : [];
  const altRaw = Array.isArray(raw.galleryAlt) ? raw.galleryAlt : [];
  const gallery: string[] = [];
  const galleryAlt: string[] = [];
  galleryRaw.slice(0, k.pics[1]).forEach((g, i) => {
    const p = picture(g, bucket);
    if (p) { gallery.push(p); galleryAlt.push(str(altRaw[i], LIMITS.alt)); }
  });
  const palette = kind === "identity"
    ? (Array.isArray(raw.palette) ? raw.palette : []).slice(0, LIMITS.palette).flatMap((p) => {
        const o = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
        const hex = str(o.hex, 7);
        return /^#[0-9a-f]{6}$/i.test(hex) ? [{ hex: hex.toLowerCase(), name: str(o.name, 40) || hex }] : [];
      })
    : undefined;
  const q = (raw.quote && typeof raw.quote === "object" ? raw.quote : {}) as Record<string, unknown>;
  const quoteText = kind === "identity" ? str(q.text, 400) : "";
  const url = str(raw.url, 300);
  const cleanUrl = /^https:\/\/[^\s]+\.[^\s]{2,}$/i.test(url) ? url : "";
  const slug = slugifyCase(str(raw.slug, 80) || client || title);

  if (!client) problems.push("Add the client's name.");
  if (!slug) problems.push("Give it an address (the client's name is used when there is none).");
  if (!title) problems.push("Add a title.");
  else if (title.length > LIMITS.title) problems.push(`Shorten the title to ${LIMITS.title} characters.`);
  if (!summary) problems.push("Add the one-line summary for the card.");
  else if (summary.length > LIMITS.summary) problems.push(`Shorten the summary to ${LIMITS.summary} characters.`);
  for (const [key, label] of [["about", "About the client"], ["brief", "The brief"], ["approach", "The approach"]] as const) {
    if (!str(raw[key], LIMITS.long)) problems.push(`Write ${label.toLowerCase()}.`);
  }
  if (did.length < 3) problems.push("List at least three things under What we did.");
  if (stack.length < 2) problems.push(`Add at least two under ${k.listLabel}.`);
  if (kind === "identity" && (palette?.length ?? 0) < 2) problems.push("Add at least two colours to the palette.");
  if (url && !cleanUrl) problems.push("The live address needs to start with https://.");
  if (!cover) problems.push("Add a cover picture.");
  else if (!coverAlt) problems.push("Describe the cover picture for people who cannot see it.");
  if (gallery.length < k.pics[0]) problems.push(`Add at least ${k.pics[0]} ${k.picsLabel.toLowerCase()}.`);
  if (galleryAlt.some((a) => !a)) problems.push(`Describe every one of the ${k.picsLabel.toLowerCase()}.`);

  return {
    problems,
    data: {
      slug, category, categories: [category, ...also], kind,
      title, client, summary,
      sector: str(raw.sector, LIMITS.short), location: str(raw.location, LIMITS.short),
      about: str(raw.about, LIMITS.long), brief: str(raw.brief, LIMITS.long), approach: str(raw.approach, LIMITS.long),
      did, stack, stackLabel: kind === "build" ? undefined : k.listLabel,
      ...(cleanUrl && kind !== "identity" ? { url: cleanUrl } : {}),
      ...(cover ? { cover, coverAlt } : {}),
      ...(gallery.length ? { gallery, galleryAlt } : {}),
      ...(palette?.length ? { palette } : {}),
      ...(quoteText ? { quote: { text: quoteText, from: str(q.from, 80) || client } } : {}),
    },
  };
}
