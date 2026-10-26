import { notFound } from "next/navigation";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getClient, getPayouts, getProject } from "@/lib/admin/store";
import { naira } from "@/lib/admin/types";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { PrintButton } from "@/components/admin/print-button";
import "@/components/admin/advice.css";

export const metadata = { title: "Payment advice", robots: { index: false } };

/**
 * THE PAYMENT ADVICE for a freelancer: what was paid, for what, when and with
 * which reference. Admin previews it here and prints or saves it as a PDF to
 * send; it says only what the payout record holds.
 */
export default async function PaymentAdvice({ params }: { params: Promise<{ id: string }> }) {
  await syncStore();
  persistSoon();
  if (!can(await adminRole(), "money")) notFound();
  const { id } = await params;
  const p = getPayouts().find((x) => x.id === id);
  if (!p) notFound();
  const project = p.projectId ? getProject(p.projectId) : null, client = p.clientId ? getClient(p.clientId) : project ? getClient(project.clientId) : null;
  const day = (iso?: string) => (iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(new Date(iso)) : "Not yet");
  const ref = `PA-${p.id.slice(0, 8).toUpperCase()}`;
  return (
    <main className="adv">
      <div className="adv__bar"><PrintButton label="Print or save as PDF" /></div>
      <article className="adv__doc" aria-label="Payment advice">
        <header><p className="adv__eyebrow">Payment advice</p><h1>{naira(p.amount)} to {p.who}</h1><p className="adv__ref">{ref}</p></header>
        <dl>
          <div><dt>Paid to</dt><dd>{p.who}{p.email ? <><br /><span>{p.email}</span></> : null}</dd></div>
          <div><dt>For</dt><dd>{p.work}</dd></div>
          {project ? <div><dt>Project</dt><dd>{project.title}{client ? `, ${client.company}` : ""}</dd></div> : null}
          <div><dt>Amount</dt><dd>{naira(p.amount)}</dd></div>
          <div><dt>Status</dt><dd>{p.state}</dd></div>
          <div><dt>Due</dt><dd>{day(p.due)}</dd></div>
          <div><dt>Paid on</dt><dd>{day(p.paidAt)}</dd></div>
          {p.reference ? <div><dt>Transfer reference</dt><dd>{p.reference}</dd></div> : null}
          {p.approvedBy ? <div><dt>Approved by</dt><dd>{p.approvedBy}, {day(p.approvedAt)}</dd></div> : null}
        </dl>
        <footer>WDC Solutions. Keep this for your records. Questions about it go to the studio.</footer>
      </article>
    </main>
  );
}
