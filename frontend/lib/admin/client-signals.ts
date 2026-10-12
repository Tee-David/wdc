import "server-only";
import { db } from "@/lib/db/pool";
import { invitationsConfigured, invitationsFor, inviteState, type Invitation } from "@/lib/invitations";
import { getClients, getEstimates, getInvoicesFor, getProjectsFor, getSubmissions } from "@/lib/admin/store";
import { estimateState, estimateTotals, invoiceStatus, invoiceTotals, naira, type Client, type Invoice, type Project } from "@/lib/admin/types";
import { currencyOf } from "@/lib/money/currency";
import { dateWords } from "@/lib/admin/when";

/**
 * WHAT EACH CLIENT NEEDS, read off the store, never typed.
 *
 * One pass over the clients, shared by the list, its deck and its rail so the
 * three cannot disagree. A client's STATE is derived, not stored: archived,
 * or a lead while nothing has been started or billed, or past once every
 * project is delivered and nothing is owed, or active. The NEXT STEP is the
 * most pressing true thing about them, in the order a person would chase it:
 * money late, a client who owes us an answer, our own move, then calm.
 * Amounts are left out when `money` is false (staff see no figures).
 *
 * ponytail: invitations and accounts are read in two queries for the whole
 * list; past a few thousand clients, page them.
 */
export type ClientState = "active" | "lead" | "past" | "archived";
export type Portal = "account" | "invited" | "none";
export type NextTone = "bad" | "warn" | "live" | "brand" | "flat";

export type ClientRow = {
  client: Client;
  state: ClientState;
  live: Project[];
  owed: number;
  late: number;
  lateInvoice?: Invoice;
  lateDays: number;
  portal: Portal;
  invitedDaysAgo?: number;
  next: { tag: string; tone: NextTone; text: string; when: string };
};

const DAY = 86_400_000;
const days = (iso: string, now: number) => Math.floor((now - Date.parse(iso)) / DAY);
const shortDate = (iso: string) => dateWords(iso);

/** Who has an account and who has an unspent invitation, keyed by lower case email. Empty when there is no database. */
export async function portalMaps() {
  const accounts = new Set<string>();
  const invites = new Map<string, Invitation>();
  if (!invitationsConfigured()) return { accounts, invites, connected: false };
  try {
    const [users, list] = await Promise.all([
      db.query<{ e: string }>(`SELECT lower("email") AS e FROM "user" WHERE "role" = 'client' LIMIT 5000`),
      invitationsFor({ role: "client", limit: 500 }),
    ]);
    for (const u of users.rows) accounts.add(u.e);
    for (const i of list) {
      const key = i.email.toLowerCase();
      if (inviteState(i) === "pending" && !invites.has(key)) invites.set(key, i);
    }
    return { accounts, invites, connected: true };
  } catch {
    return { accounts, invites, connected: false };
  }
}

export async function buildClientRows({ money, includeArchived = true }: { money: boolean; includeArchived?: boolean }): Promise<{ rows: ClientRow[]; portalKnown: boolean }> {
  const now = Date.now();
  const { accounts, invites, connected } = await portalMaps();
  const estimates = getEstimates();
  const rows = getClients({ includeArchived }).map((client): ClientRow => {
    const projects = getProjectsFor(client.id);
    const live = projects.filter((p) => p.stage !== "Delivered");
    const billed = money ? getInvoicesFor(client.id).filter((i) => i.status !== "Draft" && !i.voided && currencyOf(i) === "NGN") : [];
    const owed = billed.reduce((n, i) => n + invoiceTotals(i).due, 0);
    const overdue = billed.filter((i) => invoiceStatus(i) === "Overdue" && invoiceTotals(i).due > 0).sort((a, b) => a.due.localeCompare(b.due));
    const lateInvoice = overdue[0];
    const late = overdue.reduce((n, i) => n + invoiceTotals(i).due, 0);
    const lateDays = lateInvoice ? Math.max(1, days(lateInvoice.due, now)) : 0;
    const key = client.email.trim().toLowerCase();
    const portal: Portal = accounts.has(key) ? "account" : invites.has(key) ? "invited" : "none";
    const invite = invites.get(key);
    const sentQuote = estimates.find((e) => e.clientId === client.id && estimateState(e) === "Sent");

    const state: ClientState = client.archived ? "archived"
      : !projects.length && !getInvoicesFor(client.id).some((i) => i.status !== "Draft") ? "lead"
      : projects.length && !live.length && !owed ? "past" : "active";

    let next: ClientRow["next"];
    const waiting = live.find((p) => p.health === "Waiting on client");
    const ours = live.find((p) => p.health === "Blocked" || p.health === "At risk" || p.stage === "Revisions");
    const last = (p: Project) => p.events.map((e) => e.at).sort().at(-1);
    if (lateInvoice) {
      next = { tag: "Late", tone: "bad", text: money ? `Payment of ${naira(invoiceTotals(lateInvoice).due)}` : "A payment", when: `${lateDays} ${lateDays === 1 ? "day" : "days"} late` };
    } else if (waiting) {
      const since = last(waiting); const d = since ? days(since, now) : 0;
      next = { tag: "Waiting on client", tone: "warn", text: waiting.title, when: d >= 1 ? `Waiting ${d} ${d === 1 ? "day" : "days"}` : "Waiting since today" };
    } else if (ours) {
      next = { tag: "Your move", tone: "live", text: ours.title, when: ours.stage === "Revisions" ? "In revision" : ours.health };
    } else if (state === "lead") {
      next = sentQuote
        ? { tag: "Lead", tone: "brand", text: `Decision on ${sentQuote.number}`, when: `Expires ${shortDate(sentQuote.expires)}` }
        : { tag: "Lead", tone: "brand", text: "Start the first project", when: "Nothing opened yet" };
    } else if (state === "past") {
      const delivered = projects.map((p) => last(p)).filter(Boolean).sort().at(-1);
      next = { tag: "Past client", tone: "flat", text: "Every project is delivered", when: delivered ? dateWords(delivered, Date.now(), false) : "Closed" };
    } else if (state === "archived") {
      next = { tag: client.mergedInto ? "Merged" : "Archived", tone: "flat", text: "Kept for history", when: "" };
    } else {
      const soon = live.filter((p) => p.due).sort((a, b) => String(a.due).localeCompare(String(b.due)))[0];
      next = soon
        ? { tag: "On track", tone: "flat", text: soon.title, when: `Due ${shortDate(soon.due!)}` }
        : { tag: "On track", tone: "flat", text: live[0]?.title ?? "Nothing waiting", when: live[0] ? "No date set" : "" };
    }
    return { client, state, live, owed, late, lateInvoice, lateDays, portal, invitedDaysAgo: invite ? days(invite.createdAt, now) : undefined, next };
  });
  return { rows, portalKnown: connected };
}

/** Leads that never became clients: forms that arrived and nobody owns yet. */
export function unownedSubmissions() {
  return getSubmissions().filter((s) => !s.clientId && s.status === "Submitted").sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)));
}

/** Quotes sent and not yet answered, for the pipeline and the deck. */
export function openQuotes() {
  return getEstimates().filter((e) => estimateState(e) === "Sent").map((e) => ({ estimate: e, total: currencyOf(e) === "NGN" ? estimateTotals(e).total : 0 }));
}
