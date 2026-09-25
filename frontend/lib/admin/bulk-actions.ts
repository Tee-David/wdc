"use server";

import { FAIL, OK, type ActionState } from "./validate";
import { archiveClient, emailReminder, moveStage, setProjectArchived, setTicketState } from "./actions";
import { moveBlogPostToDraft, publishBlogPostNow, trashBlogDraft } from "./blog-actions";
import { STAGES } from "./types";

/**
 * ONE ACTION, MANY ROWS (the bulk bar on Clients, Support and Invoices). Each
 * row goes through the same single-row action a person would press, so the
 * permission check, the history line, the email and its opt-out are exactly
 * the ones that action already has; nothing here decides anything new. The
 * reply counts what went through and what did not, and why.
 */

type Job = { run: (prev: ActionState, fd: FormData) => Promise<ActionState>; fields: (id: string) => Record<string, string>; done: string };

const RUN: Record<string, Job> = {
  "tickets:Answered": { run: setTicketState, fields: (id) => ({ id, status: "Answered" }), done: "marked answered" },
  "tickets:Closed": { run: setTicketState, fields: (id) => ({ id, status: "Closed" }), done: "closed" },
  "tickets:Open": { run: setTicketState, fields: (id) => ({ id, status: "Open" }), done: "reopened" },
  "clients:archive": { run: archiveClient, fields: (id) => ({ id }), done: "archived" },
  "invoices:remind": { run: emailReminder, fields: (id) => ({ id }), done: "reminded" },
  "projects:archive": { run: setProjectArchived, fields: (id) => ({ id }), done: "archived" },
  /* One per stage, so a stage move is the same moveStage a person presses:
     its history line and the client's email included. */
  ...Object.fromEntries(STAGES.map((st) => [`projects:stage:${st}`, { run: moveStage, fields: (id: string) => ({ id, stage: st }), done: `moved to ${st}` } satisfies Job])),
  "posts:publish": { run: publishBlogPostNow, fields: (id) => ({ id }), done: "published" },
  "posts:draft": { run: moveBlogPostToDraft, fields: (id) => ({ id }), done: "moved to draft" },
  "posts:trash": { run: trashBlogDraft, fields: (id) => ({ id }), done: "moved to the Trash" },
};

export async function runBulk(kind: string, ids: string[]): Promise<ActionState> {
  const job = Object.hasOwn(RUN, kind) ? RUN[kind] : undefined;
  if (!job) return FAIL({}, "That is not something the selection can do.");
  const list = [...new Set((Array.isArray(ids) ? ids : []).map(String))].slice(0, 200);
  if (!list.length) return FAIL({}, "Nothing is selected.");
  let ok = 0;
  const why = new Map<string, number>();
  for (const id of list) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(job.fields(id))) fd.set(k, v);
    const r = await job.run({ ok: false }, fd).catch(() => ({ ok: false, message: "It could not be done just now." }) as ActionState);
    if (r.ok) ok += 1;
    else { const m = r.message || "It could not be done."; why.set(m, (why.get(m) ?? 0) + 1); }
  }
  const failed = list.length - ok;
  if (!failed) return OK(`${ok} ${job.done}.`);
  const reasons = [...why].map(([m, n]) => `${n}: ${m}`).join(" ");
  return ok ? OK(`${ok} ${job.done}; ${failed} not. ${reasons}`) : FAIL({}, `None ${job.done}. ${reasons}`);
}
