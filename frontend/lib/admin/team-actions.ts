"use server";

import { revalidatePath } from "next/cache";
import { actorName, allow } from "./guard";
import { getAdminRequest } from "./session";
import { FAIL, OK, type ActionState } from "./validate";
import { audit } from "./store";
import { changeRole, deactivate, reactivate, signOutEverywhere, type TeamChange } from "@/lib/team";

/**
 * Changes to who can reach the admin. The owner's, and never to themselves:
 * the guards in lib/team.ts refuse a self-change and removing the last owner,
 * inside the transaction that would make the change.
 */

const PAGE = "/admin/settings/team";

async function actorId() {
  const { session } = await getAdminRequest().catch(() => ({ session: null }));
  return (session?.user as { id?: string } | undefined)?.id ?? "";
}

const WHY: Record<Exclude<TeamChange, { ok: true }>["reason"], string> = {
  missing: "That person is no longer there.",
  self: "You cannot change your own access. Ask another owner.",
  "last-owner": "That would leave the studio with no owner. Make somebody else an owner first.",
  "not-team": "That account is a client, not a member of the team.",
  "no-change": "Nothing needed changing.",
};

async function run(fd: FormData, label: (name: string) => string, go: (actor: string, target: string, by: string) => Promise<TeamChange>): Promise<ActionState> {
  const refused = await allow("team");
  if (refused) return refused;
  const actor = await actorId();
  if (!actor) return FAIL({}, "Your session could not be read. Sign in again, then retry.");
  const target = String(fd.get("id") ?? "");
  const by = await actorName();
  let r: TeamChange;
  try { r = await go(actor, target, by); } catch {
    return FAIL({}, "That could not be saved just now. Nothing was changed.");
  }
  if (!r.ok) return r.reason === "no-change" ? OK(WHY[r.reason]) : FAIL({}, WHY[r.reason]);
  audit({ actor: by, kind: "setting", subjectId: r.member.id, subject: r.member.name, action: label(r.member.name), note: r.member.email });
  revalidatePath(PAGE);
  return OK(`Done: ${label(r.member.name)}.`);
}

export async function setTeamRole(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const role = fd.get("role") === "owner" ? "owner" : fd.get("role") === "staff" ? "staff" : null;
  if (!role) return FAIL({ role: "Owner or staff." });
  return run(fd, (n) => `made ${n} ${role === "owner" ? "an owner" : "staff"}`, (a, t) => changeRole(a, t, role));
}

export async function deactivateMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(fd, (n) => `deactivated ${n} and signed them out everywhere`, (a, t, by) => deactivate(a, t, by));
}

export async function reactivateMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(fd, (n) => `reactivated ${n}`, (a, t) => reactivate(a, t));
}

export async function signOutMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(fd, (n) => `signed ${n} out everywhere`, (a, t) => signOutEverywhere(a, t));
}
