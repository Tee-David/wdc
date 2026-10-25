"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { actorName, adminRole, allow } from "./guard";
import { audit } from "./store";
import { applyPendingMigrations } from "@/lib/system/migrations";
import { FAIL, OK, type ActionState } from "./validate";
import { PROBES, SLOW, runProbe, type ProbeName } from "@/lib/system/probes";
import { importRealtors, purgeInvitations, retryFailedFormEmails, revalidatePublic, reverifyMedia, TOOLS, type ToolName } from "@/lib/system/tools";

const PAGES = ["/admin/settings/system", "/admin/settings/integrations"];
const refresh = () => PAGES.forEach((p) => revalidatePath(p));

/**
 * "Check now". A probe that answers in seconds is waited for; the mail
 * server takes about 23 seconds to sign in, so that one runs behind the
 * response (AGENTS.md: nothing whose latency we do not own runs before it)
 * and its answer is on the page at the next load.
 */
export async function checkIntegration(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const name = String(fd.get("probe") ?? "") as ProbeName;
  if (!(PROBES as readonly string[]).includes(name)) return FAIL({}, "That check is not there.");
  const by = await actorName();
  if (SLOW.has(name)) {
    after(async () => { await runProbe(name, by); });
    return OK("Started. The mail server takes about half a minute to answer; reload to see what it said.");
  }
  const r = await runProbe(name, by);
  refresh();
  return r.ok ? OK(`${r.detail} (${(r.ms / 1000).toFixed(1)} s)`) : FAIL({}, `${r.detail} (${(r.ms / 1000).toFixed(1)} s)`);
}

export async function runTool(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  const name = String(fd.get("tool") ?? "") as ToolName;
  if (!(TOOLS as readonly string[]).includes(name)) return FAIL({}, "That tool is not there.");
  const by = await actorName();
  if (name === "retry-mail" || name === "media") {
    /* Up to twenty sends, or two hundred bucket questions: behind the response. */
    after(async () => {
      try { await (name === "retry-mail" ? retryFailedFormEmails(by) : reverifyMedia(by)); } catch (error) {
        console.error(`[tools] ${name} failed:`, error instanceof Error ? error.message : error);
      }
    });
    return OK("Started. It runs behind this page; reload in a minute to see what it did.");
  }
  if (name === "realtors-practice") {
    if ((await adminRole()) !== "owner") return FAIL({}, "Bringing in records is the owner's.");
    try { const r = await importRealtors(by); refresh(); revalidatePath("/admin", "layout"); return OK(`Done: ${r.summary}`); } catch (error) {
      console.error("[tools] realtors-practice failed:", error instanceof Error ? error.message : error);
      return FAIL({}, "That could not be run just now. Anything already saved stays; running it again carries on.");
    }
  }
  try {
    const r = name === "invitations" ? await purgeInvitations(by) : await revalidatePublic(by);
    refresh();
    return OK(`Done: ${r.summary}.`);
  } catch {
    return FAIL({}, "That could not be run just now. Nothing was changed.");
  }
}

/**
 * Bring the database up to this deploy. The owner's alone, asked twice in
 * the page (it changes the schema), and every file applied is an audit line.
 */
export async function applyMigrations(): Promise<ActionState> {
  const refused = await allow("settings");
  if (refused) return refused;
  if ((await adminRole()) !== "owner") return FAIL({}, "Changing the database is the owner's.");
  const by = await actorName();
  let r;
  /* Data migrations: the seeds the owner applies with the schema. */
  const steps = {
    "realtors-practice": async () => {
      const { importRealtorsPractice } = await import("@/lib/system/import-realtors");
      const done = await importRealtorsPractice(by);
      audit({ actor: by, kind: "setting", subjectId: "0059_seed_realtors_practice.sql", subject: "Realtors' Practice import", action: "brought in the invoice history", note: done.summary });
    },
  };
  try { r = await applyPendingMigrations(steps); } catch (error) {
    console.error("[migrations] could not start:", error instanceof Error ? error.message : error);
    return FAIL({}, "The database could not be reached. Nothing was changed.");
  }
  for (const name of r.applied) audit({ actor: by, kind: "setting", subjectId: name, subject: "Database schema", action: `applied migration ${name}` });
  refresh();
  revalidatePath("/admin", "layout");
  if (r.failed) {
    audit({ actor: by, kind: "setting", subjectId: r.failed.name, subject: "Database schema", action: `could not apply migration ${r.failed.name}`, note: r.failed.error });
    return FAIL({}, `${r.applied.length ? `Applied ${r.applied.length}, then ` : ""}${r.failed.name} failed and was rolled back: ${r.failed.error}`);
  }
  return OK(r.applied.length ? `Applied ${r.applied.length} migration${r.applied.length === 1 ? "" : "s"}. The database matches this deploy.` : "Nothing to apply. The database already matches this deploy.");
}
