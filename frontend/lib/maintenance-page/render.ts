import "server-only";

import { getAppSetting } from "@/lib/app-settings";
import { CONTACT_EMAIL } from "@/lib/site";
import type { Maintenance } from "@/lib/maintenance";
import { DEFAULT_DESIGN, normaliseDesign, optionValue, TEMPLATES, templateById, type Design, type TemplateId } from "./registry";
import { renderDocument, type TemplateModule } from "./shell";

export const DESIGN_KEY = "site.maintenance.page";
export const DEFAULT_MESSAGE = "We are making a few changes to the site.";

/* Loaded one at a time, only when a page is drawn. The proxy runs on every
   public request, and eleven scenes it almost never needs have no business in
   the code it starts with. */
const LOADERS: Record<TemplateId, () => Promise<{ default: TemplateModule }>> = {
  "01": () => import("./templates/t01-digging"),
  "02": () => import("./templates/t02-wireframe"),
  "03": () => import("./templates/t03-thread"),
  "04": () => import("./templates/t04-sign"),
  "05": () => import("./templates/t05-constellations"),
  "06": () => import("./templates/t06-zero-gravity"),
  "07": () => import("./templates/t07-crew"),
  "08": () => import("./templates/t08-logo"),
  "09": () => import("./templates/t09-plane"),
  "10": () => import("./templates/t10-dig"),
  "11": () => import("./templates/t11-horizon"),
};

const TTL = 30_000;
const held = globalThis as typeof globalThis & { __wdcMaintenanceDesign?: { at: number; value: Design } };

/** The chosen template and its options. Held for half a minute, like the switch itself. */
export async function maintenanceDesign(opts: { fresh?: boolean } = {}): Promise<Design> {
  const h = held.__wdcMaintenanceDesign;
  if (!opts.fresh && h && Date.now() - h.at < TTL) return h.value;
  const value = normaliseDesign(await getAppSetting<unknown>(DESIGN_KEY, DEFAULT_DESIGN));
  held.__wdcMaintenanceDesign = { at: Date.now(), value };
  return value;
}

export function forgetMaintenanceDesign() {
  delete held.__wdcMaintenanceDesign;
}

/**
 * The page for one template.
 *
 * `preview` draws it for an admin: with the preview bar, a clock to scrub,
 * a form that saves nothing, and sample times when maintenance is off (an
 * hour in, three hours to go), so every template can be judged before it is
 * switched on.
 */
export async function renderMaintenancePage(input: {
  m: Maintenance;
  design: Design;
  preview?: { template: TemplateId; href: (id: TemplateId) => string };
}): Promise<string> {
  const { m, design, preview } = input;
  const id = preview?.template ?? design.template;
  const def = templateById(id) ?? templateById(DEFAULT_DESIGN.template)!;
  const mod = (await LOADERS[def.id]()).default;

  const now = Date.now();
  const live = m.on && m.since;
  let since = live ? Date.parse(m.since!) : now - 3_600_000;
  let backBy: number | null = m.backBy && !Number.isNaN(Date.parse(m.backBy)) ? Date.parse(m.backBy) : null;
  if (preview && !live) { since = now - 3_600_000; backBy = backBy && backBy > now ? backBy : now + 3 * 3_600_000; }
  if (Number.isNaN(since)) since = now;

  const options: Record<string, string> = {};
  for (const o of def.options) options[o.key] = optionValue(design, def.id, o.key);

  const i = TEMPLATES.findIndex((t) => t.id === def.id);
  return renderDocument({
    def, mod,
    data: { template: def.id, clock: def.clock, since, backBy, preview: Boolean(preview), notify: "/api/maintenance/notify", options },
    message: m.message?.trim() || DEFAULT_MESSAGE,
    contactEmail: CONTACT_EMAIL,
    portalUrl: "/portal",
    nav: preview ? {
      prev: TEMPLATES[(i + TEMPLATES.length - 1) % TEMPLATES.length],
      next: TEMPLATES[(i + 1) % TEMPLATES.length],
      href: preview.href,
    } : undefined,
  });
}
