import "server-only";
import type { DeckItem } from "@/components/admin/deck";
import { remindInvoice, reinviteClient } from "@/lib/admin/client-deck-actions";
import { getClient } from "@/lib/admin/store";
import { estimateState, estimateTotals, naira, type Submission } from "@/lib/admin/types";
import { openQuotes, unownedSubmissions, type ClientRow } from "@/lib/admin/client-signals";
import { SERVICES } from "@/lib/services";
import { dateWords } from "@/lib/admin/when";

/**
 * THE CLIENTS DECK: who needs a person today, built from persisted rows only.
 * Worst first: money late, then quotes nobody answered, then a form with no
 * owner, then an invitation that sat unopened, then a lead with nothing
 * started. A card appears only while its cause is true, so clearing the cause
 * (paying, answering, assigning) clears the card on the next load.
 * `money` is false for staff: no invoice or quote card, no amounts.
 */
const DAY = 86_400_000;
const ago = (iso: string, now: number) => Math.max(0, Math.floor((now - Date.parse(iso)) / DAY));
const dateOf = (iso: string) => dateWords(iso);
const first = (name: string) => name.trim().split(/\s+/)[0] || name;

function submissionName(s: Submission) {
  const a = s.answers;
  const pick = (k: string) => (typeof a[k] === "string" ? String(a[k]).trim() : "");
  return pick("company") || pick("business_name") || [pick("first_name"), pick("last_name")].filter(Boolean).join(" ") || "Someone";
}

export function buildClientDeck(rows: ClientRow[], money: boolean, now = Date.now()): DeckItem[] {
  const items: DeckItem[] = [];

  if (money) {
    for (const r of rows.filter((x) => x.lateInvoice && !x.client.archived).sort((a, b) => b.lateDays - a.lateDays)) {
      const inv = r.lateInvoice!;
      items.push({
        id: `late-${inv.id}`, kind: "Money", urgency: `${r.lateDays} ${r.lateDays === 1 ? "day" : "days"} late`, tone: "bad", label: inv.number,
        title: `${r.client.company} owes ${naira(r.late)}`,
        body: `${inv.number} was due ${dateOf(inv.due)}.${r.live.length ? ` ${r.live.length === 1 ? r.live[0].title : `${r.live.length} live projects`} continue${r.live.length === 1 ? "s" : ""} while it is open.` : ""}`,
        facts: [{ k: "Contact", v: r.client.name }, { k: "Was due", v: dateOf(inv.due) }, { k: "Portal", v: r.portal === "account" ? "Signs in" : r.portal === "invited" ? "Invited" : "No account" }],
        primary: { label: "Send reminder", run: remindInvoice.bind(null, inv.id) },
        secondary: { label: "Open invoice", href: `/admin/money/${inv.id}` },
        open: `/admin/clients/${r.client.id}?tab=money`,
      });
    }
    for (const { estimate: e } of openQuotes()) {
      if (estimateState(e) !== "Sent" || ago(e.issued, now) < 5) continue;
      const c = getClient(e.clientId);
      if (!c || c.archived) continue;
      items.push({
        id: `quote-${e.id}`, kind: "Quote", urgency: `Sent ${ago(e.issued, now)} days ago`, tone: "warn", label: e.number,
        title: `${c.company} has not answered ${e.number}`,
        body: `The quote for ${naira(estimateTotals(e).total)} stands until ${dateOf(e.expires)}. A call usually settles it.`,
        facts: [{ k: "Contact", v: c.name }, { k: "Quote", v: naira(estimateTotals(e).total) }, { k: "Stands until", v: dateOf(e.expires) }],
        primary: { label: "Open the quote", href: "/admin/money" },
        secondary: { label: "Open client", href: `/admin/clients/${c.id}?tab=money` },
        open: `/admin/clients/${c.id}`,
      });
    }
  }

  for (const s of unownedSubmissions().slice(0, 3)) {
    const svc = SERVICES.find((x) => x.slug === s.service)?.short ?? s.service;
    const name = submissionName(s);
    items.push({
      id: `form-${s.id}`, kind: "Lead", urgency: s.submittedAt ? `Sent ${ago(s.submittedAt, now)} ${ago(s.submittedAt, now) === 1 ? "day" : "days"} ago` : "New", tone: "brand", label: "Onboarding form",
      title: `${name} sent a brief for ${svc.toLowerCase()}`,
      body: "Nobody owns this lead yet. Read the brief, then attach it to a client or make a new one.",
      facts: [{ k: "Service", v: svc }, { k: "Sent", v: s.submittedAt ? dateOf(s.submittedAt) : "Not recorded" }],
      primary: { label: "Review the brief", href: `/admin/forms/${s.id}` },
      secondary: { label: "All forms", href: "/admin/forms" },
    });
  }

  for (const r of rows.filter((x) => x.state === "active" && x.portal === "invited" && (x.invitedDaysAgo ?? 0) >= 3 && x.live.length).sort((a, b) => (b.invitedDaysAgo ?? 0) - (a.invitedDaysAgo ?? 0)).slice(0, 3)) {
    items.push({
      id: `invite-${r.client.id}`, kind: "Portal", urgency: `Invited ${r.invitedDaysAgo} days ago`, tone: "warn", label: r.client.company,
      title: `${first(r.client.name)} has not opened the portal`,
      body: `${r.client.company} has live work, and approvals and invoices wait in the portal. The invitation still works until it expires.`,
      facts: [{ k: "Contact", v: r.client.name }, { k: "Sent to", v: r.client.email }, { k: "Live projects", v: String(r.live.length) }],
      primary: { label: "Send a new invitation", run: reinviteClient.bind(null, r.client.id) },
      secondary: { label: "Open client", href: `/admin/clients/${r.client.id}?tab=people` },
      open: `/admin/clients/${r.client.id}?tab=people`,
    });
  }

  for (const r of rows.filter((x) => x.state === "lead").slice(0, 3)) {
    const since = ago(r.client.since, now);
    items.push({
      id: `lead-${r.client.id}`, kind: "Lead", urgency: since === 0 ? "Added today" : `Added ${since} ${since === 1 ? "day" : "days"} ago`, tone: "brand", label: r.client.company,
      title: `${r.client.company} has no next step`,
      body: "Nothing is started or billed for them yet. Open a project, or send a quote while the conversation is warm.",
      facts: [{ k: "Contact", v: r.client.name }, { k: "Wants", v: r.client.services.map((s) => SERVICES.find((x) => x.slug === s)?.short ?? s).join(", ") || "Not said" }],
      primary: { label: "Open client", href: `/admin/clients/${r.client.id}` },
      open: `/admin/clients/${r.client.id}`,
    });
  }
  return items.slice(0, 8);
}
