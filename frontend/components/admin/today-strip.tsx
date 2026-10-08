import Link from "next/link";
import { CalendarClock, CalendarDays, Receipt } from "lucide-react";
import { getClient, getInvoices, getProjects } from "@/lib/admin/store";
import { invoiceStatus, invoiceTotals, naira } from "@/lib/admin/types";
import { meetingList } from "@/lib/meetings/store";

/**
 * TODAY, in one line each: meetings booked, invoices falling due, project
 * dates. Lagos days. Hidden when there is nothing today, so it is only ever
 * a reason to look. Meetings and invoices are the owner's (money, settings).
 */
const day = (offset = 0) => new Date(Date.now() + 3_600_000 + offset * 86_400_000).toISOString().slice(0, 10);

export async function TodayStrip({ owner }: { owner: boolean }) {
  const today = day();
  const meetings = owner
    ? await meetingList(`${today}T00:00:00+01:00`, `${day(1)}T00:00:00+01:00`).catch(() => [])
    : [];
  const live = meetings.filter((m) => ["accepted", "confirmed"].includes(String(m.status).toLowerCase()));
  const invoices = owner
    ? getInvoices().filter((i) => i.status !== "Draft" && !i.voided && invoiceTotals(i).due > 0 && i.due.slice(0, 10) === today)
    : [];
  const projects = getProjects().filter((p) => p.stage !== "Delivered" && p.due?.slice(0, 10) === today);
  if (!live.length && !invoices.length && !projects.length) return null;
  const time = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(new Date(iso));
  return (
    <section className="adToday" aria-label="Today" data-tour="dash-today">
      <b>Today</b>
      <ul>
        {live.slice(0, 3).map((m) => (
          <li key={m.uid}><CalendarDays aria-hidden="true" /><Link href="/admin/meetings">{time(m.start)} {m.attendees?.[0]?.name ?? m.title}</Link></li>
        ))}
        {invoices.slice(0, 3).map((i) => (
          <li key={i.id}><Receipt aria-hidden="true" /><Link href={`/admin/money/${i.id}`}>{naira(invoiceTotals(i).due)} due, {getClient(i.clientId)?.company ?? "a client"} ({invoiceStatus(i)})</Link></li>
        ))}
        {projects.slice(0, 3).map((p) => (
          <li key={p.id}><CalendarClock aria-hidden="true" /><Link href={`/admin/projects/${p.id}`}>{p.title} is due</Link></li>
        ))}
      </ul>
    </section>
  );
}
