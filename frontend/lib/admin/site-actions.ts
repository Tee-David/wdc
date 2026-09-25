"use server";

import { revalidatePath, updateTag } from "next/cache";
import { actorName, allow } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { audit } from "./store";
import { setAppSetting } from "@/lib/app-settings";
import { forgetMaintenance, MAINTENANCE_KEY } from "@/lib/maintenance";
import { SITE_URL } from "@/lib/site";
import {
  DESCRIPTION_MAX, DESCRIPTION_MIN, SITE_DESCRIPTION_KEY, SITE_NOINDEX_KEY, SITE_SEO_TAG, siteSeo,
} from "@/lib/site-seo";

const PAGE = "/admin/settings/site";

/** Every public page reads these, so every public page is refreshed. */
function refreshSite() {
  updateTag(SITE_SEO_TAG);
  revalidatePath("/", "layout");
}

export async function saveSiteDescription(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  /* Not "reset": a control with that name hides the form's own reset(), which React calls after every action. */
  const reset = fd.get("useDefault") !== null;
  const text = reset ? "" : String(fd.get("description") ?? "").replace(/\s+/g, " ").trim();
  if (!reset && (text.length < DESCRIPTION_MIN || text.length > DESCRIPTION_MAX)) {
    return FAIL({ description: `Between ${DESCRIPTION_MIN} and ${DESCRIPTION_MAX} characters, so a search result shows all of it. This is ${text.length}.` });
  }
  const before = (await siteSeo()).description;
  const by = await actorName();
  try { await setAppSetting(SITE_DESCRIPTION_KEY, text, by); } catch { return FAIL({}, "That could not be saved just now."); }
  audit({ actor: by, kind: "setting", subjectId: SITE_DESCRIPTION_KEY, subject: "Site description", action: reset ? "reset the site description" : "changed the site description", field: "Description", from: before, to: text || "the default" });
  refreshSite();
  return OK(reset ? "Back to the default description." : "Saved. Search engines pick it up the next time they visit.");
}

/**
 * Ask search engines not to index the site. Turning it ON needs the site's
 * address typed out, because left on it quietly takes the studio out of
 * search; turning it off needs nothing.
 */
export async function setSiteNoindex(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const on = fd.get("on") === "1";
  const host = new URL(SITE_URL).host;
  if (on && String(fd.get("confirm") ?? "").trim().toLowerCase() !== host) {
    return FAIL({ confirm: `Type ${host} to confirm.` });
  }
  const by = await actorName();
  try {
    await setAppSetting(SITE_NOINDEX_KEY, on ? { on: true, since: new Date().toISOString(), by } : { on: false }, by);
  } catch { return FAIL({}, "That could not be saved just now."); }
  audit({ actor: by, kind: "setting", subjectId: SITE_NOINDEX_KEY, subject: "Search engines", action: on ? "asked search engines not to index the site" : "let search engines index the site again" });
  refreshSite();
  revalidatePath(PAGE);
  return OK(on
    ? "Search engines are asked not to index the site. Pages already listed drop out as they are re-crawled."
    : "Search engines may index the site again.");
}

/**
 * Maintenance mode on or off. On needs the site's address typed out, like
 * noindex, because it takes the public site down. A new "since" retires
 * every pass and reviewer link given out for an earlier maintenance.
 */
export async function setMaintenance(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const on = fd.get("on") === "1";
  const host = new URL(SITE_URL).host;
  const by = await actorName();
  let value: Record<string, unknown> = { on: false };
  if (on) {
    if (String(fd.get("confirm") ?? "").trim().toLowerCase() !== host) return FAIL({ confirm: `Type ${host} to confirm.` });
    const message = String(fd.get("message") ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    const backRaw = String(fd.get("backBy") ?? "").trim();
    let backBy: string | undefined;
    if (backRaw) {
      /* A datetime-local value, read as Lagos time (UTC+1, no daylight saving). */
      const t = Date.parse(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(backRaw) ? `${backRaw}:00+01:00` : backRaw);
      if (Number.isNaN(t) || t <= Date.now()) return FAIL({ backBy: "A time still to come, or leave it empty." });
      backBy = new Date(t).toISOString();
    }
    value = { on: true, since: new Date().toISOString(), by, ...(message ? { message } : {}), ...(backBy ? { backBy } : {}) };
  }
  try { await setAppSetting(MAINTENANCE_KEY, value, by); } catch { return FAIL({}, "That could not be saved just now."); }
  forgetMaintenance();
  audit({ actor: by, kind: "setting", subjectId: MAINTENANCE_KEY, subject: "Maintenance mode", action: on ? "put the public site into maintenance" : "brought the public site back" });
  revalidatePath(PAGE);
  return OK(on
    ? "The public site is in maintenance. Visitors get a holding page within half a minute; the admin, payments and invoices keep working."
    : "The site is back for everybody within half a minute.");
}
