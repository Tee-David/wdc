/**
 * The maintenance page templates: what the admin chooses between.
 *
 * DATA ONLY. This file is imported by the admin's client components (the
 * gallery) as well as the server, so it must never import a template body or
 * anything server-side. The pages themselves live in ./templates and are
 * loaded one at a time, only when a page is actually rendered.
 */

export type TemplateId = "01" | "02" | "03" | "04" | "05" | "06" | "07" | "08" | "09" | "10" | "11";

/** A setting a template reads, beyond the message and back-by time every template shows. */
export type TemplateOption = {
  key: string;
  label: string;
  hint: string;
  /** "lines": one entry per line. "text": a single piece of text. */
  kind: "lines" | "text";
  max: number;
  rows?: number;
  /** Used when the admin has not written their own. */
  fallback: string;
};

export type TemplateDef = {
  id: TemplateId;
  name: string;
  /** One line for the gallery. */
  line: string;
  /** True when the scene moves with the maintenance clock (start to back-by time). */
  clock: boolean;
  options: TemplateOption[];
};

export const TEMPLATES: readonly TemplateDef[] = [
  {
    id: "01", name: "We are digging", clock: true,
    line: "A drill tunnels through the site's layers, as deep as the work has got.",
    options: [{
      key: "layers", kind: "lines", max: 600, rows: 5,
      label: "What is being worked on",
      hint: "Up to five lines, top layer first, as Title | what is happening. Visitors tap a layer to read it.",
      fallback: [
        "Navigation | Rebuilding the menu so every page is two taps away.",
        "Services | Rewriting the service pages and their prices.",
        "Our work | Adding new case studies to the portfolio.",
        "Speed | Making every page load faster on a phone.",
        "Foundations | Updating the servers everything else stands on.",
      ].join("\n"),
    }],
  },
  { id: "02", name: "Wireframe rebuild", clock: false, line: "A blueprint drafts, measures and redesigns the homepage on a loop.", options: [] },
  { id: "03", name: "The orange thread", clock: false, line: "One orange line sketches ideas and ends on a clock at the back-by time.", options: [] },
  { id: "04", name: "The studio sign", clock: false, line: "A hanging shop sign to swing and flip, with a split-flap countdown.", options: [] },
  { id: "05", name: "Constellations", clock: false, line: "The studio's services as star patterns, with shooting stars.", options: [] },
  { id: "06", name: "Zero gravity", clock: true, line: "The homepage floats apart and lands back in place as the work finishes.", options: [] },
  { id: "07", name: "The tiny crew", clock: false, line: "A small crew puts the sign back up, letter by letter. Pick them up.", options: [] },
  { id: "08", name: "Rebuild the logo", clock: false, line: "The WDC mark in pieces, for visitors to put back together.", options: [] },
  { id: "09", name: "The paper plane", clock: true, line: "The page folds into a plane that circles until the site is back.", options: [] },
  {
    id: "10", name: "Dig it up", clock: false,
    line: "The page is buried. Visitors brush the soil away to find the message.",
    options: [{
      key: "note", kind: "text", max: 160, rows: 2,
      label: "Buried note",
      hint: "A short note from the studio for visitors to dig up.",
      fallback: "Note from the studio: the coffee machine is also under maintenance. Morale is holding.",
    }],
  },
  { id: "11", name: "Event horizon", clock: false, line: "The site spirals into a black hole, and the countdown slows near the edge.", options: [] },
];

export const DEFAULT_TEMPLATE: TemplateId = "06";

export function templateById(id: string | null | undefined): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** The design saved in Settings: which template, and each template's own options. */
export type Design = { template: TemplateId; options: Partial<Record<TemplateId, Record<string, string>>> };

export const DEFAULT_DESIGN: Design = { template: DEFAULT_TEMPLATE, options: {} };

/** A stored value made safe to use: an unknown template falls back, options are trimmed to their limits. */
export function normaliseDesign(raw: unknown): Design {
  const v = (raw && typeof raw === "object" ? raw : {}) as { template?: unknown; options?: unknown };
  const template = templateById(typeof v.template === "string" ? v.template : "")?.id ?? DEFAULT_TEMPLATE;
  const options: Design["options"] = {};
  const given = (v.options && typeof v.options === "object" ? v.options : {}) as Record<string, unknown>;
  for (const t of TEMPLATES) {
    const mine = (given[t.id] && typeof given[t.id] === "object" ? given[t.id] : {}) as Record<string, unknown>;
    const kept: Record<string, string> = {};
    for (const o of t.options) {
      const s = typeof mine[o.key] === "string" ? (mine[o.key] as string).replace(/\r\n?/g, "\n").trim().slice(0, o.max) : "";
      if (s) kept[o.key] = s;
    }
    if (Object.keys(kept).length) options[t.id] = kept;
  }
  return { template, options };
}

/** The value of one option, or its fallback. */
export function optionValue(design: Design, id: TemplateId, key: string): string {
  const def = templateById(id)?.options.find((o) => o.key === key);
  return design.options[id]?.[key] || def?.fallback || "";
}
