import Link from "next/link";
import { BuilderPage } from "@/components/admin/money-forms";
import PageTourButton from "@/components/admin/tour/page-tour-button";
import { syncStore } from "@/lib/admin/persist";
import { creditBalances, financeDefaults, getClients } from "@/lib/admin/store";
import { noticeBlocks } from "@/lib/admin/money-rules";
import "@/components/admin/dashboard.css";
import "@/components/admin/money-new.css";

export const metadata = { title: "New invoice" };
export const dynamic = "force-dynamic";

/**
 * A NEW INVOICE OR QUOTE, on a page of its own: the form on the left and the
 * document it will become on the right, so the total, the VAT and the dates
 * are seen where the client will see them. `?type=quote` builds a quote and
 * `?client=` opens it for one client. Owner only, through the Money layout.
 */
export default async function NewDocument({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await syncStore();
  const sp = await searchParams;
  const quote = sp.type === "quote";
  const finance = financeDefaults();
  const client = sp.client && getClients().some((c) => c.id === sp.client) ? sp.client : undefined;
  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/money">Money</Link></p>
          <h1>{quote ? "New quote" : "New invoice"}</h1>
          <p>{quote ? "Price a piece of work. " : "Raise a bill. "}<b>The document grows beside the form.</b></p>
        </div>
        <div className="ad__row"><PageTourButton /></div>
      </div>
      <BuilderPage
        estimate={quote} clientId={client}
        defaultVatRate={finance.vatRate} defaultDueInDays={finance.dueInDays}
        credits={creditBalances()} noEmail={noticeBlocks(getClients())}
      />
    </>
  );
}
