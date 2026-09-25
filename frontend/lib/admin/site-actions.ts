"use server";

import { revalidatePath, updateTag } from "next/cache";
import { actorName, allow } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { audit } from "./store";
import { setAppSetting } from "@/lib/app-settings";
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
  const reset = fd.get("reset") !== null;
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
