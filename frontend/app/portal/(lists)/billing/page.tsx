import CurrencyBalances from "@/components/money/currency-balances";
import { moneySummary } from "@/lib/money/summary";
import { currencyOf, money } from "@/lib/money/currency";
import { PayForm } from "@/components/money/pay-form";
import { selectedPaystackMode } from "@/lib/paystack-mode";
import Link from "next/link";
import Image from "next/image";
import { ListSearch } from "@/components/admin/list-search";
import { Banknote, CreditCard, Download, FileText, Lock, Receipt } from "lucide-react";
import { getPortalRequest } from "@/lib/portal/session";
import { getCreditsFor, getEstimatesFor, getInvoices, getPaymentsFor, getProject } from "@/lib/admin/store";
import { estimateState, estimateTotals, invoiceStatus, invoiceTotals, refundedTotal } from "@/lib/admin/types";
import { Empty, InvoicePill, when } from "@/components/admin/bits";
import { Pager, readPer } from "@/components/admin/pager";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { PageHead } from "@/components/admin/page-head";
import { RailCard, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { Tabs } from "@/components/admin/tabs";
import { Chips } from "@/components/admin/chips";
import { Deck, type DeckItem } from "@/components/admin/deck";
import "@/components/client/portal.css";
import "@/components/admin/dashboard.css";

export const metadata = { title: "Billing" };

type Show = "all" | "due" | "paid";
type Query = { tab?: string; show?: string; page?: string; per?: string };

function href(q: Query, patch: Query) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...q, ...patch })) if (v) p.set(k, v);
  const s = p.toString();
  return `/portal/billing${s ? `?${s}` : ""}#invoices`;
}

const QUOTE_TONE: Record<string, string> = { Sent: "ad__pill--warn", Accepted: "ad__pill--good", Declined: "ad__pill--flat", Expired: "ad__pill--flat", Draft: "ad__pill--flat" };
const QUOTE_WORD: Record<string, string> = { Sent: "Waiting on you", Accepted: "Accepted", Declined: "Declined", Expired: "Expired", Draft: "Draft" };

/**
 * BILLING, as C-Billing draws it: what to pay first as a deck, then one card
 * with invoices, receipts and quotes, and beside it what has been paid, how
 * to pay and what comes next. Every figure is read from the same records the
 * studio's Money screen uses; nothing here is summarised from anything else.
 * Tables stay tables on a phone: the first column pins and the rest scroll.
 */
export default async function PortalBilling({ searchParams }: { searchParams: Promise<Query> }) {
  await syncStore();
  persistSoon();
  const { client, isPrimaryContact, billingProjectIds } = await getPortalRequest();
  if (!client) return null;
  if (!isPrimaryContact && !billingProjectIds.length) {
    return (
      <>
        <PageHead title="Billing" lede="Invoices, receipts and quotes for your projects." />
        <section className="adList"><Empty title="Billing access is not included" icon={Lock}>Your project invitation does not include invoices or payment details. Ask Admin if you need billing access.</Empty></section>
      </>
    );
  }
  const query = await searchParams;
  const paymentMode = await selectedPaystackMode().catch(() => null);

  const invoices = getInvoices().filter((inv) => inv.status !== "Draft" && ((isPrimaryContact && inv.clientId === client.id) || (Boolean(inv.projectId) && billingProjectIds.includes(inv.projectId!))));
  const credits = isPrimaryContact ? getCreditsFor(client.id).filter((c) => !c.applied) : [];
  const quotes = isPrimaryContact ? getEstimatesFor(client.id).filter((e) => e.state !== "Draft").sort((a, b) => b.issued.localeCompare(a.issued)) : [];
  const live = invoices.filter((inv) => !inv.voided);
  const balance = live.reduce((n, inv) => n + invoiceTotals(inv).due, 0);
  const billed = live.reduce((n, inv) => n + invoiceTotals(inv).total, 0);
  const creditBalance = credits.reduce((n, c) => n + c.amount, 0);
  const payments = invoices
    .flatMap((inv) => getPaymentsFor(inv.id).map((p) => ({ p, inv })))
    .sort((a, b) => b.p.at.localeCompare(a.p.at));
  const kept = (p: (typeof payments)[number]["p"]) => (p.reversed ? 0 : p.amount - refundedTotal(p));
  const paidTotal = payments.reduce((n, { p }) => n + kept(p), 0);
  const paidShare = billed ? Math.min(100, Math.round((paidTotal / billed) * 100)) : 0;
  const owing = live.filter((inv) => invoiceTotals(inv).due > 0).sort((a, b) => a.due.localeCompare(b.due));
  /* The one to pay first: the oldest due date with money still owed. */
  const next = owing[0];
  const canPay = Boolean(client.email?.trim());
  const payable = (inv: (typeof invoices)[number]) => canPay && ["NGN", "USD"].includes(currencyOf(inv));

  const tab = query.tab === "receipts" || query.tab === "quotes" ? query.tab : "invoices";
  const show: Show = query.show === "due" || query.show === "paid" ? query.show : "all";
  const rows = invoices.filter((inv) => {
    const due = invoiceTotals(inv).due;
    if (show === "due") return !inv.voided && due > 0;
    if (show === "paid") return !inv.voided && due <= 0;
    return true;
  });
  const listLength = tab === "receipts" ? payments.length : tab === "quotes" ? quotes.length : rows.length;
  const per = readPer(query.per, 5);
  const pages = Math.max(1, Math.ceil(listLength / per));
  const page = Math.min(pages, Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1));
  const slice = <T,>(list: T[]) => list.slice((page - 1) * per, page * per);

  const deckItems: DeckItem[] = owing.map((inv): DeckItem => {
    const overdue = invoiceStatus(inv) === "Overdue";
    const due = invoiceTotals(inv).due;
    const project = inv.projectId ? getProject(inv.projectId) : null;
    return {
      id: `bill-${inv.id}`, kind: "Invoice", tone: overdue ? "bad" : "warn", urgency: overdue ? "Overdue" : `Due ${when(inv.due)}`, label: inv.number,
      title: `Pay ${money(due, currencyOf(inv))}${project ? ` for ${project.title}` : ""}`,
      body: "Pay with Paystack or Flutterwave on the invoice page. A paid invoice cannot be paid twice, and your receipt arrives straight away.",
      facts: [{ k: "Due", v: when(inv.due) }, { k: "Invoice total", v: money(invoiceTotals(inv).total, currencyOf(inv)) }],
      why: overdue ? "It is past its due date." : "It is the next one due.",
      primary: { label: `Pay ${money(due, currencyOf(inv))}`, href: `/i/${inv.token}` },
      secondary: { label: "Preview the invoice", href: `/i/${inv.token}` },
      open: `/i/${inv.token}`,
    };
  });

  const rail = (
    <>
      <RailCard title="Paid so far">
        <div className="pBill__ring">
          <span className="adRing" style={{ "--p": paidShare } as React.CSSProperties} aria-hidden="true"><b>{paidShare}%<small>paid</small></b></span>
          <span className="pBill__ringText">
            <b className="ad__num">{paidTotal ? moneySummary(payments.map(({ p, inv }) => ({ ...p, currency: currencyOf(inv) })), kept) : "Nil"}</b>
            <small>of {billed ? moneySummary(live, (inv) => invoiceTotals(inv).total) : "nothing"} invoiced</small>
            {balance > 0 && next ? <small className="pBill__ringDue">{moneySummary(owing, (inv) => invoiceTotals(inv).due)} to pay, next due {when(next.due)}</small> : <small>Nothing to pay. Thank you.</small>}
          </span>
        </div>
      </RailCard>
      <RailCard title="How you can pay">
        <ul className="pBill__ways">
          <li><span className="pBill__logo"><Image src="/paystack.svg" alt="" width={20} height={20} /></span><span><b>Paystack</b><small>Cards and bank transfer</small></span></li>
          <li><span className="pBill__logo"><Image src="/flutterwave.svg" alt="" width={20} height={20} /></span><span><b>Flutterwave</b><small>Cards, bank and USSD</small></span></li>
        </ul>
        <p className="ad__dim pBill__note">No fee to you. Closing a payment halfway is safe: we keep checking and email you the result. An invoice cannot be paid twice.</p>
      </RailCard>
      <RailCard title="Coming up">
        <RailRows empty="Nothing else is due." rows={owing.slice(next ? 1 : 0, 5).map((inv) => ({
          key: inv.id, title: inv.projectId ? getProject(inv.projectId)?.title ?? inv.number : inv.number, sub: `${inv.number} · ${money(invoiceTotals(inv).due, currencyOf(inv))}`,
          icon: FileText, tone: invoiceStatus(inv) === "Overdue" ? "bad" as const : "neutral" as const, href: `/i/${inv.token}`,
          tag: { text: when(inv.due), tone: invoiceStatus(inv) === "Overdue" ? "bad" as const : "flat" as const },
        }))} />
      </RailCard>
      {isPrimaryContact && creditBalance ? (
        <RailCard title="Credit on account" aside={moneySummary(credits, (c) => c.amount)}>
          <p className="ad__dim pBill__note">Taken off your next invoice automatically.</p>
        </RailCard>
      ) : null}
      <CurrencyBalances invoices={invoices} />
    </>
  );

  return (
    <>
      <PageHead title="Billing"
        lede={balance > 0
          ? <>You have paid {paidTotal ? moneySummary(payments.map(({ p, inv }) => ({ ...p, currency: currencyOf(inv) })), kept) : "nothing yet"}. <strong>{moneySummary(owing, (inv) => invoiceTotals(inv).due)} is still to pay.</strong></>
          : <>Every invoice, receipt and quote for your projects. <strong>Nothing to pay.</strong></>}
        action={next && payable(next) ? (
          /* A real POST, as on the invoice itself: a link that spends money can be followed by a prefetcher. The amount comes off the token, never from this page. */
          <PayForm currency={currencyOf(next)} action={`/api/pay/${next.token}`}>
            <button type="submit" className="ad__btn ad__btn--primary"><CreditCard aria-hidden="true" /> Pay {money(invoiceTotals(next).due, currencyOf(next))}</button>
          </PayForm>
        ) : undefined} />
      {paymentMode !== "live" ? <p className="pBill__mode" role="status">{paymentMode === "test" ? "Online checkout is in test mode. Simulated payments leave your invoices unpaid. Open an invoice for bank details to make a real payment." : "Online checkout is not available right now. Open an invoice for bank details or message Admin."}</p> : null}

      <Workbench railLabel="Your balance" rail={rail}>
        <Deck id="billing" title="To pay" items={deckItems}
          emptyTitle="Nothing to pay."
          emptyBody="You are up to date. Thank you."
          emptyNext={{ label: "See your projects", href: "/portal/projects" }} />

        <section className="adList" id="invoices" aria-label="Invoices, receipts and quotes" data-tour="portal-billing">
          <div className="adList__hd"><h2>{tab === "receipts" ? "Receipts" : tab === "quotes" ? "Quotes" : "Invoices"}</h2><span className="adList__n">{listLength}</span><span className="adList__sp" />{tab === "invoices" && invoices.length ? <ListSearch target="portal-invoices" placeholder="Number or project" noun="invoices" /> : null}</div>
          <Tabs label="Billing" current={tab} items={[
            { key: "invoices", label: "Invoices", count: invoices.length, tone: owing.some((i) => invoiceStatus(i) === "Overdue") ? "bad" : undefined, href: href(query, { tab: undefined, show: undefined, page: undefined }) },
            { key: "receipts", label: "Receipts", count: payments.length, href: href(query, { tab: "receipts", show: undefined, page: undefined }) },
            ...(isPrimaryContact ? [{ key: "quotes", label: "Quotes", count: quotes.length, tone: quotes.some((q) => estimateState(q) === "Sent") ? "warn" as const : undefined, href: href(query, { tab: "quotes", show: undefined, page: undefined }) }] : []),
          ]} />

          {tab === "invoices" ? (
            <>
              <div className="adList__pad" style={{ paddingTop: ".75rem" }}>
                <Chips label="Which invoices" current={show} items={[
                  { key: "all", label: "All", count: invoices.length, href: href(query, { show: undefined, page: undefined }) },
                  { key: "due", label: "To pay", count: owing.length, href: href(query, { show: "due", page: undefined }) },
                  { key: "paid", label: "Paid", count: live.length - owing.length, href: href(query, { show: "paid", page: undefined }) },
                ]} />
              </div>
              {rows.length ? (
                <div className="ad__scroll" id="portal-invoices" tabIndex={0} role="region" aria-label="Invoices, scrolls sideways" data-lenis-prevent>
                  <table className="ad__t">
                    <thead><tr><th>Invoice</th><th>For</th><th>Status</th><th>Due</th><th className="num">Total</th><th className="num">Left to pay</th><th><span className="ad__sr">Actions</span></th></tr></thead>
                    <tbody>
                      {slice(rows).map((inv) => {
                        const t = invoiceTotals(inv);
                        const project = inv.projectId ? getProject(inv.projectId) : null;
                        const left = !inv.voided && t.due > 0;
                        return (
                          <tr key={inv.id} data-row>
                            <td><a href={`/i/${inv.token}`} target="_blank" rel="noopener noreferrer"><b className="ad__docNo">{inv.number}</b></a><small style={{ display: "block", color: "var(--ad-dim)" }}>Issued {when(inv.issued)}</small></td>
                            <td>{project?.title ?? <span className="ad__dim">Not one project</span>}</td>
                            <td><InvoicePill status={invoiceStatus(inv)} /></td>
                            <td className="ad__docNo">{when(inv.due)}</td>
                            <td className="num">{money(t.total, currencyOf(inv))}</td>
                            <td className="num">{left ? money(t.due, currencyOf(inv)) : <span className="ad__dim">Nil</span>}</td>
                            <td>
                              <span className="pBill__acts">
                                {left && payable(inv) ? (
                                  <PayForm currency={currencyOf(inv)} action={`/api/pay/${inv.token}`}>
                                    <button type="submit" className="ad__btn ad__btn--primary">Pay now</button>
                                  </PayForm>
                                ) : null}
                                <a className="ad__btn" href={`/i/${inv.token}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${inv.number} to save or print`}><Download aria-hidden="true" /> PDF</a>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : invoices.length ? (
                <Empty title={show === "due" ? "Nothing to pay" : "Nothing paid yet"} icon={FileText} action={<Link className="ad__btn" href={href(query, { show: undefined, page: undefined })}>Show every invoice</Link>}>Change the filter to see the rest.</Empty>
              ) : (
                <Empty title="No invoices yet" icon={Banknote} action={<Link className="ad__btn" href="/portal/projects">See your projects</Link>}>Invoices raised against your projects appear here, with the document and a way to pay.</Empty>
              )}
            </>
          ) : tab === "receipts" ? (payments.length ? (
            <div className="ad__scroll" tabIndex={0} role="region" aria-label="Receipts, scrolls sideways" data-lenis-prevent>
              <table className="ad__t">
                <thead><tr><th>Receipt</th><th>For invoice</th><th>How</th><th>When</th><th className="num">Amount</th><th><span className="ad__sr">Open</span></th></tr></thead>
                <tbody>
                  {slice(payments).map(({ p, inv }) => (
                    <tr key={p.id}>
                      <td><a href={`/r/${p.token}`} target="_blank" rel="noopener noreferrer"><b className="ad__docNo">{p.receiptNo}</b></a></td>
                      <td className="ad__docNo">{inv.number}</td>
                      <td><span className="ad__pill ad__pill--flat">{p.method}</span></td>
                      <td className="ad__docNo">{when(p.at)}</td>
                      <td className="num">{money(p.amount, currencyOf(inv))}</td>
                      <td><a className="ad__btn" href={`/r/${p.token}`} target="_blank" rel="noopener noreferrer" aria-label={`Receipt ${p.receiptNo}`}><Receipt aria-hidden="true" /> Receipt</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No receipts yet" icon={Receipt} action={next ? <a className="ad__btn" href={`/i/${next.token}`}>Open {next.number}</a> : <Link className="ad__btn" href="/portal/projects">See your projects</Link>}>A receipt arrives here and by email the moment a payment lands.</Empty>
          )) : (quotes.length ? (
            <div className="ad__scroll" tabIndex={0} role="region" aria-label="Quotes, scrolls sideways" data-lenis-prevent>
              <table className="ad__t">
                <thead><tr><th>Quote</th><th>Status</th><th>Sent</th><th>Valid until</th><th className="num">Total</th><th><span className="ad__sr">Open</span></th></tr></thead>
                <tbody>
                  {slice(quotes).map((q) => {
                    const st = estimateState(q);
                    return (
                      <tr key={q.id}>
                        <td><a href={`/q/${q.token}`} target="_blank" rel="noopener noreferrer"><b className="ad__docNo">{q.number}</b></a></td>
                        <td><span className={`ad__pill ${QUOTE_TONE[st]}`}>{QUOTE_WORD[st]}</span></td>
                        <td className="ad__docNo">{when(q.issued)}</td>
                        <td className="ad__docNo">{when(q.expires)}</td>
                        <td className="num">{money(estimateTotals(q).total, currencyOf(q))}</td>
                        <td><a className={`ad__btn${st === "Sent" ? " ad__btn--primary" : ""}`} href={`/q/${q.token}`} target="_blank" rel="noopener noreferrer">{st === "Sent" ? "Review the quote" : "Open"}</a></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No quotes yet" icon={FileText} action={<Link className="ad__btn" href="/portal/support">Ask for a quote</Link>}>When we price new work for you, the quote appears here to accept or ask about.</Empty>
          ))}

          {listLength ? (
            <Pager label={`${tab} pages`} total={listLength} page={page} per={per} noun={tab === "receipts" ? "receipts" : tab === "quotes" ? "quotes" : "invoices"}
              href={(p) => href(query, { page: p.page && p.page > 1 ? String(p.page) : undefined, per: p.per ? String(p.per) : query.per })} />
          ) : null}
        </section>
        {next && payable(next) ? <p className="pBill__safe ad__dim"><Lock aria-hidden="true" /> Card payments are handled by Paystack and Flutterwave. We never see your card.</p> : null}
      </Workbench>
    </>
  );
}
