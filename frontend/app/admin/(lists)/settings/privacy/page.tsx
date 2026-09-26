import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getRules, RULES } from "@/lib/privacy/retention";
import { countOf, findPersonalData, looksEmail, recentRequests, SECTION_LABEL, totalOf, type Found } from "@/lib/privacy/requests";
import { lastAuditFor } from "@/lib/audit-db";
import { AdminState } from "@/components/admin/admin-state";
import { Empty, Panel } from "@/components/admin/bits";
import { EraseForm, RetentionForm } from "@/components/admin/settings/privacy-controls";
import "@/components/admin/forms/forms.css";

export const metadata = { title: "Privacy" };

const time = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });

/**
 * The nightly audit line ("removed 0 old message log rows, 0 entries and ...;
 * retention: 1 unfinished briefs deleted, ...") as figures. The line is the
 * record and stays as it is; this only reads it, so an old entry and a new one
 * show the same way. One of anything is said in the singular.
 */
const ONE: [RegExp, string][] = [[/\brows\b/, "row"], [/\bentries\b/, "entry"], [/\bdrafts\b/, "draft"], [/\bbriefs\b/, "brief"],
  [/\benquiries\b/, "enquiry"], [/\binvitations\b/, "invitation"], [/\baccounts\b/, "account"], [/\bsessions and tokens\b/, "session or token"]];
function dailyFigures(action: string): { n: number; label: string }[] {
  const out: { n: number; label: string }[] = [];
  for (const part of action.split(";")) {
    const [, section = ""] = /^\s*(reminders|retention):/.exec(part) ?? [];
    for (const m of part.matchAll(/(\d+) ([^,;\d]+?)(?=,|;| and \d|$)/g)) {
      const n = Number(m[1]);
      let label = m[2].replace(/ past their Trash period$/, " past Trash").trim();
      if (section === "reminders") label = `payment reminders ${label}`;
      if (n === 1) for (const [re, one] of ONE) if (re.test(label)) { label = label.replace(re, one); break; }
      out.push({ n, label });
    }
  }
  return out;
}

/**
 * How long personal data is kept, and a person's request to see or erase
 * what the studio holds about them. The owner's.
 */
export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ email?: string; erased?: string }> }) {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="Privacy is for the owner" description="How long personal data is kept, and requests to see or erase it." /></section>;
  }
  const sp = await searchParams;
  const email = (sp.email ?? "").trim().toLowerCase();
  const asked = Boolean(email);
  const valid = looksEmail(email);
  const [rules, daily, requests, found] = await Promise.all([
    getRules(),
    lastAuditFor("daily").catch(() => null),
    recentRequests().catch(() => []),
    valid ? findPersonalData(email).catch(() => null) : Promise.resolve(null),
  ]);
  const counts = found ? countOf(found) : null;
  const total = found ? totalOf(found) : 0;
  const q = encodeURIComponent(email);
  const erased = /^\d+$/.test(sp.erased ?? "") ? Number(sp.erased) : null;

  return (
    <>
      <div className="ad__head"><div><h1>Privacy and data</h1><p>How long things are kept, and requests about a person.</p></div></div>
      <div className="ad__stack">
        <RetentionForm rules={RULES} values={rules} />

        <Panel title="Last nightly run" action={daily ? <span className="ad__dim adPriv__at">{time(daily.at)}</span> : null}>
          <div className="adSetPad">
            {!daily ? (
              <p className="ad__dim adForms__p">The periods above are applied every night. It has not run yet.</p>
            ) : (() => {
              const figs = dailyFigures(daily.action);
              const done = figs.filter((f) => f.n > 0);
              return (
                <>
                  {done.length ? (
                    <ul className="adPriv__figs">
                      {done.map((f) => <li key={f.label}><b>{f.n}</b><span>{f.label}</span></li>)}
                    </ul>
                  ) : null}
                  <p className="ad__dim adForms__p">
                    {done.length ? "Nothing else needed doing." : "Nothing needed doing."}
                    {daily.note ? <> Part of it did not run: {daily.note}</> : null}
                  </p>
                </>
              );
            })()}
          </div>
        </Panel>

        <Panel title="A request about one person">
          <form className="adForms__filters adPriv__look" method="get" role="search" style={{ borderBottom: 0 }}>
            <label className="adForms__search">Their email address
              <input type="email" name="email" defaultValue={email} placeholder="name@example.com" required />
            </label>
            <button className="ad__btn ad__btn--primary" type="submit">Look up</button>
          </form>
          {erased !== null ? (
            <p className="ad__msg is-ok" style={{ margin: "0 1rem 1rem" }} role="status">
              <span>Erased {erased} {erased === 1 ? "record" : "records"}. Numbers and dates stay; names, addresses, answers and messages are gone.</span>
            </p>
          ) : null}
          {asked && !valid ? (
            <p className="ad__msg is-bad" style={{ margin: "0 1rem 1rem" }} role="status"><span>That is not an email address.</span></p>
          ) : !asked ? (
            <p className="ad__dim" style={{ padding: "0 1rem 1rem", margin: 0 }}>Searches enquiries, briefs, the newsletter, emails sent, invitations and accounts.</p>
          ) : !found ? (
            <AdminState kind="error" title="The lookup did not finish" description="The database did not answer. Nothing was changed; try again." />
          ) : total === 0 ? (
            <Empty title="Nothing is held about this address">No enquiry, brief, subscription, email, invitation or account uses it.</Empty>
          ) : (
            <div style={{ padding: "0 1rem 1rem" }}>
              <dl className="adForms__dl" style={{ padding: 0 }}>
                {(Object.keys(counts!) as (keyof Found)[]).filter((k) => counts![k]).map((k) => (
                  <div key={k}><dt>{SECTION_LABEL[k]}</dt><dd>{counts![k]}</dd></div>
                ))}
              </dl>
              <p className="ad__row" style={{ margin: ".8rem 0" }}>
                <a className="ad__btn" href={`/admin/settings/privacy/export?email=${q}&format=json`}>Download JSON</a>
                <a className="ad__btn" href={`/admin/settings/privacy/export?email=${q}&format=csv`}>Download CSV</a>
              </p>
              {counts!.accounts ? (
                <p className="ad__dim">This address has an account, so it cannot be erased from here. Deactivate it on Team, or close the client&apos;s portal access, first.</p>
              ) : <EraseForm email={email} />}
            </div>
          )}
        </Panel>

        <Panel title="Requests">
          {requests.length ? (
            <div className="ad__scroll">
              <table className="ad__t">
                <thead><tr><th>When</th><th>What</th><th>Records</th><th>By</th><th>Reference</th></tr></thead>
                <tbody>
                  {requests.map((r, n) => (
                    <tr key={`${r.at}-${n}`}>
                      <td>{time(r.at)}</td>
                      <td><span className={`ad__pill ${r.kind === "erase" ? "ad__pill--bad" : "ad__pill--flat"}`}>{r.kind === "erase" ? "Erased" : "Exported"}</span></td>
                      <td className="num">{Object.values(r.counts).reduce((a, b) => a + Number(b || 0), 0)}</td>
                      <td>{r.by}</td>
                      <td className="ad__dim"><code>{r.ref}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty title="No requests yet">Each export and erasure is listed here by a reference, never by the address.</Empty>}
        </Panel>
      </div>
    </>
  );
}
