import Link from "next/link";
import { AlertTriangle, Banknote, CheckCircle2, FileText, MailWarning, Receipt, ShieldAlert } from "lucide-react";
import { getClient, getInvoices, getProviderEvents, providerAttentionCount } from "@/lib/admin/store";
import { listLogged } from "@/lib/message-log";
import { invoiceStatus, invoiceTotals, naira, nairaShort, providerNeedsAttention } from "@/lib/admin/types";
import type { ProviderOutcome } from "@/lib/admin/types";
import { Empty } from "@/components/admin/bits";
import { MatchEvent, ResendMessage, ResolveEvent } from "@/components/admin/reconcile-forms";
import { ImportStatement, MatchLine, SetAsideLine } from "@/components/admin/statement-forms";
import { statementLines, suggestInvoice, openInvoices } from "@/lib/money/statements";
import { money } from "@/lib/money/currency";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { PageHead } from "@/components/admin/page-head";
import { ChoresMenu } from "@/components/admin/chores-menu";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { Tabs } from "@/components/admin/tabs";
import { Chips } from "@/components/admin/chips";
import { Pager, readPer } from "@/components/admin/pager";
import { UrlSearch } from "@/components/admin/url-search";
import { dateWords, nowMs, whenWords } from "@/lib/admin/when";

export const metadata = { title: "Reconciliation" };

/**
 * WHERE THE BOOKS AND THE PROVIDERS ARE ASKED TO AGREE, on the Flow layout:
 * a deck of what needs somebody, then every provider event and every email
 * that did not go, with the open invoices beside them.
 *
 * WHAT IS IN HERE IS EVERYTHING THAT DID NOT LAND CLEANLY. A charge whose
 * reference matched no invoice. A webhook that arrived twice. One whose
 * signature did not verify. None of these show anywhere else, because on every
 * other screen they are an absence: an invoice that quietly stayed unpaid.
 *
 * Duplicates are listed too and are not a problem: a retry and the payer's
 * return race each other, so a healthy payment often leaves two events.
 *
 * THE STATEMENT TAB is money that reached the bank outside checkout (a
 * transfer straight to the account). Each imported line is matched to the
 * invoice it paid, which records the payment, or set aside with a reason.
 */

type Query = { tab?: string; show?: string; q?: string; page?: string; per?: string; import?: string };
const LINE: Record<string, { cls: string; word: string }> = {
  new: { cls: "ad__pill--live", word: "To match" }, matched: { cls: "ad__pill--good", word: "Matched" }, ignored: { cls: "ad__pill--flat", word: "Set aside" },
};
const TONE: Record<ProviderOutcome, string> = {
  Applied: "ad__pill--good", Duplicate: "ad__pill--flat", Unmatched: "ad__pill--bad",
  Failed: "ad__pill--bad", Ignored: "ad__pill--flat", Rejected: "ad__pill--bad",
};
const WORD: Record<ProviderOutcome, string> = {
  Applied: "Matched", Duplicate: "Repeat", Unmatched: "No invoice found", Failed: "Failed", Ignored: "Ignored", Rejected: "Rejected",
};

function hrefFor(q: Query, patch: Partial<Query>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...q, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return `/admin/money/reconciliation${s ? `?${s}` : ""}#recon-list`;
}

export default async function ReconciliationPage({ searchParams }: { searchParams: Promise<Query> }) {
  await syncStore();
  persistSoon();
  const query = await searchParams;
  const now = nowMs();
  const per = readPer(query.per);
  const attention = getProviderEvents({ attention: true, limit: 100 });
  const everything = getProviderEvents({ limit: 100 });
  const outstanding = providerAttentionCount();
  const failedMail = await listLogged({ state: "Failed", limit: 25 });
  const tab = query.tab === "emails" ? "emails" : query.tab === "statement" ? "statement" : "provider";
  const lines = await statementLines();
  const pool = openInvoices();
  const unmatched = (lines ?? []).filter((l) => l.state === "new");
  const suggestions = new Map(unmatched.map((l) => [l.id, suggestInvoice(l, pool)]));
  const search = query.q?.trim().toLocaleLowerCase() ?? "";

  /* THE FIGURES, from the same event log the table shows. */
  const applied = everything.filter((e) => e.outcome === "Applied");
  const moneyIn = applied.reduce((n, e) => n + (e.amount ?? 0), 0);
  const repeats = everything.filter((e) => e.outcome === "Duplicate" || e.outcome === "Ignored").length;
  const open = getInvoices()
    .filter((i) => !i.voided && invoiceStatus(i) !== "Draft" && invoiceTotals(i).due > 0)
    .sort((a, b) => a.due.localeCompare(b.due));
  const openDue = open.reduce((n, i) => n + invoiceTotals(i).due, 0);

  const deck: DeckItem[] = [
    ...unmatched.slice(0, 6).map((l): DeckItem => {
      const sug = suggestions.get(l.id);
      return {
        id: `line-${l.id}`, kind: "Bank", urgency: dateWords(l.postedOn, now, false), tone: "warn", label: l.account || "Statement",
        title: sug ? `${money(l.amount, l.currency)} looks like ${sug.invoice.number}` : `${money(l.amount, l.currency)} reached the bank with no invoice`,
        body: l.narration || "The bank gave no narration for this line.",
        facts: [{ k: "Reference", v: l.reference || "None" }, ...(sug ? [{ k: "Client", v: getClient(sug.invoice.clientId)?.company ?? "Client" }] : [])],
        why: sug ? `${sug.why}. Confirm it and the invoice is updated with a receipt.` : "Until it is matched, the invoice it paid still reads as owed.",
        primary: { label: sug ? "Confirm the match" : "Find its invoice", href: `${hrefFor(query, { tab: "statement", show: undefined, q: undefined, page: undefined }).replace("#recon-list", "")}#line-${l.id}` },
        open: hrefFor(query, { tab: "statement", show: undefined, q: undefined, page: undefined }),
      };
    }),
    ...attention.slice(0, 6).map((e): DeckItem => ({
      id: `ev-${e.id}`, kind: "Match", urgency: dateWords(e.at, now, false), tone: e.outcome === "Unmatched" ? "warn" : "bad", label: e.provider,
      title: e.amount !== null ? `${naira(e.amount)} from ${e.provider} needs an invoice` : `${e.provider} sent ${e.event} that did not land`,
      body: e.note ?? (e.outcome === "Unmatched" ? "The reference matched no invoice. Match it to the invoice it paid, or mark it handled with a reason." : "This event did not apply. Read what happened, then mark it handled."),
      facts: [{ k: "Reference", v: e.reference }, { k: "Outcome", v: WORD[e.outcome] }, ...(e.channel ? [{ k: "Channel", v: e.channel.replace(/_/g, " ") }] : [])],
      why: "Until it is matched, the invoice it paid still reads as owed and keeps sending reminders.",
      primary: { label: e.outcome === "Unmatched" ? "Match it" : "Look closer", href: hrefFor(query, { tab: "provider", show: "attention", q: e.reference }) },
      open: hrefFor(query, { tab: "provider", show: "attention", q: e.reference }),
    })),
    ...failedMail.slice(0, 4).map((m): DeckItem => ({
      id: `mail-${m.id}`, kind: "Email", urgency: dateWords(m.at, now, false), tone: "warn", label: "Did not go",
      title: `An email to ${m.to} did not go`,
      body: m.error ?? "The mail server refused it.",
      facts: [{ k: "About", v: m.subject }],
      why: "The client is waiting on something they never received.",
      primary: { label: "Open emails that failed", href: hrefFor(query, { tab: "emails" }) },
    })),
  ];

  const showAttention = query.show === "attention";
  const events = everything
    .filter((e) => !showAttention || providerNeedsAttention(e))
    .filter((e) => !search || `${e.reference} ${e.event} ${e.amount ?? ""} ${e.note ?? ""}`.toLocaleLowerCase().includes(search));
  const showLines = query.show === "matched" || query.show === "ignored" ? query.show : query.show === "all" ? "all" : "new";
  const stmt = (lines ?? [])
    .filter((l) => showLines === "all" || l.state === showLines)
    .filter((l) => !search || `${l.narration} ${l.reference} ${l.amount / 100} ${l.account}`.toLocaleLowerCase().includes(search));
  const lineIn = (lines ?? []).filter((l) => l.state === "matched").reduce((n, l) => n + (l.currency === "NGN" ? l.amount : 0), 0);
  const mails = failedMail.filter((m) => !search || `${m.to} ${m.subject}`.toLocaleLowerCase().includes(search));
  const rows = tab === "emails" ? mails.length : tab === "statement" ? stmt.length : events.length;
  const pageCount = Math.max(1, Math.ceil(rows / per));
  const page = Math.min(Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1), pageCount);
  const slice = <T,>(list: T[]) => list.slice((page - 1) * per, page * per);
  const filtered = Boolean(search || showAttention);
  const count = (st: string) => (lines ?? []).filter((l) => l.state === st).length;

  return (
    <>
      <PageHead title="Reconciliation" crumbs={[{ href: "/admin/money", label: "Money" }]}
        action={lines ? <ImportStatement startOpen={query.import === "1"} /> : undefined}
        lede={<>{outstanding + unmatched.length ? `${outstanding + unmatched.length} ${outstanding + unmatched.length === 1 ? "payment needs" : "payments need"} matching.` : "Every payment has landed where it should."} <strong>{failedMail.length ? `${failedMail.length} ${failedMail.length === 1 ? "email" : "emails"} did not go.` : "Every email went."}</strong></>}
        chores={<ChoresMenu label="reconciliation, more" items={[{ label: "Invoices and spend", href: "/admin/money", icon: "file" }, { label: "Payment settings", href: "/admin/settings/integrations", icon: "file" }, { label: "Message log", href: "/admin/settings/email/log", icon: "file" }]} />} />
      <Workbench railLabel="Reconciliation pulse" rail={<>
        <RailHead title="Payments pulse" />
        <StatTiles items={[
          { label: "To match", value: String(outstanding + unmatched.length), note: outstanding + unmatched.length ? `${unmatched.length} from the bank, ${outstanding} from checkout` : "Nothing waiting", noteTone: outstanding + unmatched.length ? "accent" : undefined, icon: AlertTriangle, tone: "live", href: hrefFor(query, { tab: "provider", show: "attention", q: undefined, page: undefined }) },
          { label: "Money in", value: nairaShort(moneyIn), note: `${applied.length} matched ${applied.length === 1 ? "payment" : "payments"}`, icon: Receipt, tone: "good" },
          { label: "Matched", value: String(applied.length), note: "Receipts issued", icon: CheckCircle2, tone: "brand" },
          { label: "Repeats", value: String(repeats), note: "Retries and ignored, no action", icon: ShieldAlert, tone: "neutral" },
          ...(lines ? [{ label: "From the bank", value: nairaShort(lineIn), note: `${count("matched")} statement ${count("matched") === 1 ? "line" : "lines"} matched`, icon: Banknote, tone: "brand" as const, href: hrefFor(query, { tab: "statement", show: "matched", q: undefined, page: undefined }) }] : []),
        ]} />
        <RailCard title="Open invoices" aside={naira(openDue)}>
          <RailRows empty="No invoice is waiting on a payment." rows={open.slice(0, 4).map((i) => {
            const late = invoiceStatus(i) === "Overdue";
            return { key: i.id, title: i.number, sub: `${getClient(i.clientId)?.company ?? "Client"} · ${naira(invoiceTotals(i).due)}`, icon: FileText, tone: late ? "bad" as const : "neutral" as const, href: `/admin/money/${i.id}`, tag: { text: late ? "Overdue" : `Due ${dateWords(i.due, now, false)}`, tone: late ? "bad" as const : "flat" as const } };
          })} />
        </RailCard>
      </>}>
        <Deck id="recon" title="Payments to match" items={deck} emptyTitle="Everything has landed." emptyBody="Every payment matched an invoice and every email went." emptyNext={{ label: "Open invoices and spend", href: "/admin/money" }} />
        <section className="adList" id="recon-list" aria-label="Payments and emails" data-tour="recon-log">
          <div className="adList__hd"><span className="adList__sp" /><UrlSearch label="Search reconciliation" placeholder="Reference, amount or email" /></div>
          <Tabs label="Reconciliation" current={tab} items={[
            { key: "provider", label: "Payments", count: everything.length, tone: outstanding ? "warn" : undefined, href: hrefFor(query, { tab: undefined, page: undefined, show: undefined }) },
            { key: "statement", label: "Bank statement", count: unmatched.length, tone: unmatched.length ? "warn" : undefined, href: hrefFor(query, { tab: "statement", page: undefined, show: undefined }) },
            { key: "emails", label: "Emails that failed", count: failedMail.length, tone: failedMail.length ? "warn" : undefined, href: hrefFor(query, { tab: "emails", page: undefined, show: undefined }) },
          ]} />
          {tab === "provider" ? (
            <div className="adList__pad" style={{ paddingTop: ".75rem" }} data-tour="recon-attention">
              <Chips label="Show" current={showAttention ? "attention" : ""} items={[
                { key: "", label: "All", count: everything.length, href: hrefFor(query, { show: undefined, page: undefined }) },
                { key: "attention", label: "To match", count: outstanding, href: hrefFor(query, { show: "attention", page: undefined }) },
              ]} />
            </div>
          ) : null}
          {tab === "statement" ? (
            <div className="adList__pad" style={{ paddingTop: ".75rem" }}>
              <Chips label="Show" current={showLines} items={[
                { key: "new", label: "To match", count: count("new"), href: hrefFor(query, { show: undefined, page: undefined }) },
                { key: "matched", label: "Matched", count: count("matched"), href: hrefFor(query, { show: "matched", page: undefined }) },
                { key: "ignored", label: "Set aside", count: count("ignored"), href: hrefFor(query, { show: "ignored", page: undefined }) },
                { key: "all", label: "All", count: lines?.length ?? 0, href: hrefFor(query, { show: "all", page: undefined }) },
              ]} />
            </div>
          ) : null}
          {tab === "statement" ? (lines === null ? (
            <Empty title="Statement import is not switched on yet" icon={Banknote} action={<Link className="ad__btn" href="/admin/settings/system">Open Settings, System</Link>}>It needs migration 0055. Apply it in Settings, System, then come back to import.</Empty>
          ) : stmt.length ? (
            <>
              <div className="ad__scroll" tabIndex={0} role="region" aria-label="Bank statement lines, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th>Narration</th><th>State</th><th>Date</th><th className="num">Amount</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {slice(stmt).map((l) => {
                      const sug = suggestions.get(l.id);
                      const inv = l.invoiceId ? getInvoices().find((i) => i.id === l.invoiceId) : null;
                      return (
                        <tr key={l.id} id={`line-${l.id}`}>
                          <td><b>{l.narration || "No narration"}</b><small style={{ display: "block", color: "var(--ad-dim)" }}>{[l.reference, l.account].filter(Boolean).join(" · ") || "No reference"}</small></td>
                          <td><span className={`ad__pill ${LINE[l.state].cls}`}>{LINE[l.state].word}</span>
                            {l.state === "new" && sug ? <small style={{ display: "block", color: "var(--ad-dim)" }}>Looks like {sug.invoice.number}</small> : null}
                            {inv ? <small style={{ display: "block" }}><Link href={`/admin/money/${inv.id}`}>{inv.number}</Link></small> : null}
                            {l.state === "ignored" && l.note ? <small style={{ display: "block", color: "var(--ad-dim)" }}>{l.resolvedBy}: {l.note}</small> : null}</td>
                          <td className="ad__dim">{dateWords(l.postedOn, now, false)}</td>
                          <td className="num">{money(l.amount, l.currency)}</td>
                          <td className="ad__rmC">{l.state === "new" ? <span className="ad__row"><MatchLine id={l.id} amount={l.amount} narration={l.narration} suggested={sug ? { id: sug.invoice.id, label: `${sug.invoice.number} · ${getClient(sug.invoice.clientId)?.company ?? "Client"}` } : undefined} /><SetAsideLine id={l.id} /></span> : null}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager label="Statement pages" total={stmt.length} page={page} per={per} noun={stmt.length === 1 ? "line" : "lines"} href={(p) => hrefFor(query, { page: p.page && p.page > 1 ? String(p.page) : undefined, per: p.per ? String(p.per) : query.per })} />
            </>
          ) : search || (lines.length && showLines !== "all") ? (
            <Empty title={search ? "Nothing matches" : showLines === "new" ? "Every line is dealt with" : "Nothing here yet"} icon={Banknote} action={<Link className="ad__btn" href={hrefFor({ tab: "statement", show: "all" }, {})}>Show every line</Link>}>{search ? "Try another narration, reference or amount." : "Lines move between these as they are matched or set aside."}</Empty>
          ) : (
            <Empty title="No statement imported yet" icon={Banknote} action={<Link className="ad__btn ad__btn--primary" href="/admin/money/reconciliation?tab=statement&import=1">Import a statement</Link>}>Transfers straight to the bank never pass through checkout. Import the bank&apos;s CSV and match each line to the invoice it paid.</Empty>
          )) : null}
          {tab === "provider" ? (events.length ? (
            <>
              <div className="ad__scroll" tabIndex={0} role="region" aria-label="Payment events, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th>Reference</th><th>Outcome</th><th>Event</th><th>Received</th><th className="num">Amount</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {slice(events).map((e) => (
                      <tr key={e.id} id={`ev-${e.id}`}>
                        <td><b className="ad__num">{e.reference}</b><small style={{ display: "block", color: "var(--ad-dim)" }}>{e.provider}{e.channel ? ` · ${e.channel.replace(/_/g, " ")}` : ""}</small></td>
                        <td><span className={`ad__pill ${TONE[e.outcome]}`}>{WORD[e.outcome]}</span>{e.resolution ? <small style={{ display: "block", color: "var(--ad-dim)" }}>{e.resolution.by}: {e.resolution.note}</small> : null}</td>
                        <td className="ad__dim">{e.event}</td>
                        <td className="ad__dim">{whenWords(e.at, now)}</td>
                        <td className="num">{e.amount === null ? "None" : naira(e.amount)}</td>
                        <td className="ad__rmC">{providerNeedsAttention(e) ? <span className="ad__row">{e.outcome === "Unmatched" && e.amount !== null && e.amount > 0 ? <MatchEvent event={e} /> : null}<ResolveEvent event={e} /></span> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager label="Payment pages" total={events.length} page={page} per={per} noun={events.length === 1 ? "event" : "events"} href={(p) => hrefFor(query, { page: p.page && p.page > 1 ? String(p.page) : undefined, per: p.per ? String(p.per) : query.per })} />
            </>
          ) : filtered ? (
            <Empty title="Nothing matches" icon={Receipt} action={<Link className="ad__btn" href="/admin/money/reconciliation#recon-list">Clear filters</Link>}>Try another reference or amount, or show everything.</Empty>
          ) : (
            <Empty title="No payments have come in yet" icon={Receipt} action={<Link className="ad__btn" href="/admin/money">Open invoices</Link>}>The first time a client pays with Paystack or Flutterwave, every event lands here whatever its outcome.</Empty>
          )) : tab === "emails" ? (mails.length ? (
            <>
              <div className="ad__scroll" tabIndex={0} role="region" aria-label="Emails that failed, scrolls sideways" data-lenis-prevent>
                <table className="ad__t">
                  <thead><tr><th>To</th><th>About</th><th>Why not</th><th>When</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {slice(mails).map((m) => (
                      <tr key={m.id}>
                        <td><b>{m.to}</b></td>
                        <td>{m.subject}</td>
                        <td className="ad__dim">{m.error ?? "The mail server refused it."}</td>
                        <td className="ad__dim">{whenWords(m.at, now)}</td>
                        <td className="ad__rmC"><ResendMessage id={m.id} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager label="Email pages" total={mails.length} page={page} per={per} noun={mails.length === 1 ? "email" : "emails"} href={(p) => hrefFor(query, { page: p.page && p.page > 1 ? String(p.page) : undefined, per: p.per ? String(p.per) : query.per })} />
            </>
          ) : search ? (
            <Empty title="Nothing matches" icon={MailWarning} action={<Link className="ad__btn" href="/admin/money/reconciliation?tab=emails#recon-list">Clear search</Link>}>Try another address or subject.</Empty>
          ) : (
            <Empty title="Every email went" icon={MailWarning} action={<Link className="ad__btn" href="/admin/settings/email/log">Open the message log</Link>}>An email the mail server refuses lands here with its reason and a Try again button.</Empty>
          )) : null}
        </section>
      </Workbench>
    </>
  );
}
