import type { LegalSection } from "@/lib/legal";

/**
 * What an edited policy may look like, checked on the server before it is
 * saved and again when it is read back, so a bad row can never reach the page.
 * Title and slug are not editable: the footer, the sitemap and the share
 * images all name the shipped titles, and a policy's address should not move.
 */
export type LegalOverride = { blurb: string; intro: string; tabs?: { id: string; label: string }[]; sections: LegalSection[] };

export const LEGAL_LIMITS = { blurb: 300, intro: 1200, heading: 140, paragraph: 3000, paragraphs: 30, sections: 120, tabs: 12, tabLabel: 40 } as const;

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "");

export function parseLegalOverride(input: unknown): { ok: true; value: LegalOverride } | { ok: false; error: string } {
  let raw: unknown = input;
  if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { return { ok: false, error: "That policy could not be read. Reload the page and try again." }; } }
  if (!raw || typeof raw !== "object") return { ok: false, error: "That policy could not be read." };
  const o = raw as Record<string, unknown>;
  const blurb = clean(o.blurb, LEGAL_LIMITS.blurb);
  const intro = clean(o.intro, LEGAL_LIMITS.intro);
  if (!blurb) return { ok: false, error: "Add the one-line summary shown on the Policies page." };
  if (!intro) return { ok: false, error: "Add the opening paragraph." };

  let tabs: { id: string; label: string }[] | undefined;
  if (Array.isArray(o.tabs) && o.tabs.length) {
    if (o.tabs.length > LEGAL_LIMITS.tabs) return { ok: false, error: `Use ${LEGAL_LIMITS.tabs} tabs or fewer.` };
    tabs = [];
    for (const t of o.tabs as Record<string, unknown>[]) {
      const id = typeof t?.id === "string" ? t.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) : "";
      const label = clean(t?.label, LEGAL_LIMITS.tabLabel);
      if (!id || !label) return { ok: false, error: "Every tab needs a name." };
      if (tabs.some((x) => x.id === id)) return { ok: false, error: `Two tabs are both called “${label}”. Rename one.` };
      tabs.push({ id, label });
    }
  }

  if (!Array.isArray(o.sections) || !o.sections.length) return { ok: false, error: "A policy needs at least one section." };
  if (o.sections.length > LEGAL_LIMITS.sections) return { ok: false, error: `Use ${LEGAL_LIMITS.sections} sections or fewer.` };
  const sections: LegalSection[] = [];
  for (const [i, s] of (o.sections as Record<string, unknown>[]).entries()) {
    const heading = clean(s?.heading, LEGAL_LIMITS.heading);
    if (!heading) return { ok: false, error: `Section ${i + 1} needs a heading.` };
    const body = (Array.isArray(s?.body) ? s.body : []).map((p) => clean(p, LEGAL_LIMITS.paragraph)).filter(Boolean).slice(0, LEGAL_LIMITS.paragraphs);
    if (!body.length) return { ok: false, error: `“${heading}” needs some text.` };
    let tab = typeof s?.tab === "string" && s.tab ? s.tab : undefined;
    if (!tabs) tab = undefined;
    else if (tab && !tabs.some((t) => t.id === tab)) tab = tabs[0].id;
    sections.push(tab ? { heading, body, tab } : { heading, body });
  }
  return { ok: true, value: { blurb, intro, ...(tabs ? { tabs } : {}), sections } };
}
