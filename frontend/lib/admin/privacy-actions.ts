"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { actorName, allow } from "./guard";
import { FAIL, OK, type ActionState } from "./validate";
import { audit } from "./store";
import { getRules, RULES, saveRules, type Rules } from "@/lib/privacy/retention";
import { erasePersonalData, hashEmail, logRequest, looksEmail } from "@/lib/privacy/requests";

const PAGE = "/admin/settings/privacy";

export async function saveRetentionRules(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const current = await getRules();
  const next = { ...current } as Rules;
  for (const r of RULES) {
    const raw = String(fd.get(r.key) ?? "");
    const v = raw === "keep" ? null : Number(raw);
    if (!(v === null || r.options.includes(v))) return FAIL({ [r.key]: "Pick one of the periods." });
    next[r.key] = v;
  }
  const by = await actorName();
  try { await saveRules(next, by); } catch { return FAIL({}, "That could not be saved just now."); }
  const changed = RULES.filter((r) => current[r.key] !== next[r.key]);
  for (const r of changed) {
    audit({ actor: by, kind: "setting", subjectId: "privacy.retention", subject: "Retention", action: `changed how long ${r.label.toLowerCase()} are kept`, field: r.label,
      from: current[r.key] === null ? "kept" : `${current[r.key]} days`, to: next[r.key] === null ? "kept" : `${next[r.key]} days` });
  }
  revalidatePath(PAGE);
  return OK(changed.length ? "Saved. The daily tidy applies it from its next run." : "Nothing changed.");
}

/** Erase by anonymising. The address typed twice: once to find it, once to confirm. */
export async function eraseRequest(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const confirm = String(fd.get("confirm") ?? "").trim().toLowerCase();
  if (!looksEmail(email)) return FAIL({}, "Look an address up first.");
  if (confirm !== email) return FAIL({ confirm: "Type the address exactly, to confirm." });
  const by = await actorName();
  let r;
  try { r = await erasePersonalData(email); } catch { return FAIL({}, "Nothing was erased: the database did not finish. Try again."); }
  if (!r.ok) return FAIL({}, "This address has an account. Deactivate it on Team first (or, for a client, close their portal access), then erase the rest.");
  await logRequest(email, "erase", r.counts, by).catch(() => undefined);
  const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
  audit({ actor: by, kind: "setting", subjectId: `privacy:${hashEmail(email).slice(0, 8)}`, subject: "Personal data request", action: `erased ${total} records for one address`, note: `request ${hashEmail(email).slice(0, 8)}` });
  revalidatePath(PAGE);
  /* The form goes with what it erased, so the result travels in the address. */
  redirect(`${PAGE}?email=${encodeURIComponent(email)}&erased=${total}`);
}
