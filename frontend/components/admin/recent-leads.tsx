import Link from "next/link";
import { Mail, UserPlus } from "lucide-react";
import { getClients } from "@/lib/admin/store";
import { enquiriesAreConfigured, recentEnquiries, type Enquiry } from "@/lib/enquiries";
import { Empty, Panel, when } from "./bits";
import { SkRows } from "./skeleton";

/**
 * Who signed up or got in touch most recently.
 *
 * TWO SOURCES, ONE LIST. New clients come from the admin's own records and
 * enquiries from the contact form's table, merged newest first, because the
 * question in the morning is "who is new", not "which system are they in".
 *
 * THE DATABASE HALF IS HONEST ABOUT ITSELF. Not configured, unreachable and
 * empty are three different sentences, and none of them is an invented row.
 */
type Row =
  | { kind: "client"; at: string; id: string; title: string; detail: string }
  | { kind: "enquiry"; at: string; enquiry: Enquiry };

const LIMIT = 5;

async function loadEnquiries(): Promise<{ state: "off" | "error" | "ok"; rows: Enquiry[] }> {
  if (!enquiriesAreConfigured()) return { state: "off", rows: [] };
  try {
    return { state: "ok", rows: await recentEnquiries(LIMIT) };
  } catch (error) {
    console.error("Recent enquiries could not be read", error instanceof Error ? error.message : "unknown error");
    return { state: "error", rows: [] };
  }
}

export async function RecentLeads() {
  const enquiries = await loadEnquiries();
  const clients = getClients()
    .slice()
    .sort((a, b) => b.since.localeCompare(a.since))
    .slice(0, LIMIT);

  const rows: Row[] = [
    ...clients.map((c) => ({ kind: "client" as const, at: c.since, id: c.id, title: c.company, detail: `New client · ${c.name}` })),
    ...enquiries.rows.map((e) => ({ kind: "enquiry" as const, at: e.createdAt, enquiry: e })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, LIMIT);

  return (
    <Panel title="New clients and enquiries" dataTour="dash-leads" action={<Link href="/admin/clients">All clients</Link>}>
      {rows.length ? (
        <div className="adDash__compactList">
          {rows.map((row) => row.kind === "client" ? (
            <Link href={`/admin/clients/${row.id}`} key={`c-${row.id}`}>
              <span className="adDash__listIcon"><UserPlus aria-hidden="true" /></span>
              <span><b>{row.title}</b><small>{row.detail}</small></span>
              <time>{when(row.at)}</time>
            </Link>
          ) : (
            /* A reply is the action an enquiry asks for, and there is no
               enquiry screen yet, so the row is a reply addressed to them. */
            <a
              href={`mailto:${row.enquiry.email}?subject=${encodeURIComponent(`Re: ${row.enquiry.topic}`)}`}
              key={`e-${row.enquiry.id}`}
            >
              <span className="adDash__listIcon"><Mail aria-hidden="true" /></span>
              <span>
                <b>{row.enquiry.firstName} {row.enquiry.lastName}</b>
                <small>
                  Enquiry · {row.enquiry.topic}
                  {row.enquiry.delivery === "failed" ? " · email notice failed, reply from here" : ""}
                </small>
              </span>
              <time>{when(row.at)}</time>
            </a>
          ))}
        </div>
      ) : (
        <Empty title="No one new yet" icon={UserPlus}>
          New clients and contact-form enquiries will appear here.
        </Empty>
      )}
      {enquiries.state !== "ok" ? (
        <p className="adDash__leadsNote" role="status">
          {enquiries.state === "off"
            ? "Enquiries are stored once the database is connected; until then they arrive by email only."
            : "Stored enquiries could not be read just now. New clients are still listed."}
        </p>
      ) : null}
    </Panel>
  );
}

/** Same rows, same heights, nothing invented. */
export function RecentLeadsSkeleton() {
  return (
    <Panel title="New clients and enquiries">
      <div className="sk" aria-hidden="true"><div className="sk__body"><SkRows n={3} /></div></div>
    </Panel>
  );
}
