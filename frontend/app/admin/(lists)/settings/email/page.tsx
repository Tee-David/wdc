import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { getAdminRequest } from "@/lib/admin/session";
import { mailIsConfigured } from "@/lib/email";
import { DEFAULT_LOG_RETENTION, getAppSetting, LOG_RETENTION_DAYS, LOG_RETENTION_KEY } from "@/lib/app-settings";
import { loggedStateCounts, searchLogged, type LogQuery } from "@/lib/message-log";
import type { MessageState } from "@/lib/admin/types";
import { AdminState } from "@/components/admin/admin-state";
import { Empty, Panel } from "@/components/admin/bits";
import { ResendMessage } from "@/components/admin/reconcile-forms";
import { Retention, TestEmail, TidyNow } from "@/components/admin/email-settings";
import "@/components/admin/forms/forms.css";

export const metadata = { title: "Email" };

/**
 * How the site sends mail, and everything it has sent: FluentSMTP's screens,
 * made to fit.
 *
 * THE CONNECTION IS READ, NEVER WRITTEN. The mail server's details are
 * environment variables, set in Vercel; this page says what is set and what
 * is missing, and never shows the password. A form that wrote SMTP secrets
 * into the database would be a second place for them to leak from.
 */

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const STATES: ("" | MessageState)[] = ["", "Failed", "Queued", "Sent", "Skipped"];
const PER = [25, 50, 100];
const time = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
const TONE: Record<string, string> = { Sent: "ad__pill--good", Failed: "ad__pill--bad", Queued: "ad__pill--warn", Skipped: "ad__pill--flat" };

function connection() {
  const env = (k: string) => process.env[k]?.trim() ?? "";
  const port = env("SMTP_PORT") || "465";
  return [
    { label: "Server", value: env("SMTP_HOST") || null },
    { label: "Port", value: port },
    { label: "Encryption", value: env("SMTP_SECURE") === "true" || port === "465" ? "SSL/TLS on connect" : "STARTTLS when offered" },
    { label: "Username", value: env("SMTP_USER") || null },
    { label: "Password", value: env("SMTP_PASSWORD") ? "Set, not shown" : null },
    { label: "From name", value: env("SMTP_FROM_NAME") || "WDC Solutions (default)" },
    { label: "From address", value: env("SMTP_FROM_EMAIL") || null },
    { label: "Replies go to", value: env("SMTP_REPLY_TO") || "The From address" },
  ];
}

export default async function EmailSettingsPage({ searchParams }: Props) {
  if (!can(await adminRole(), "settings")) {
    return (
      <section className="ad__panel">
        <AdminState kind="forbidden" title="Email settings are for the owner" description="The mail server, the message log and retention are changed by the owner." />
      </section>
    );
  }
  const sp = await searchParams;
  const state = (STATES.find((s) => s === one(sp.state)) ?? "") as LogQuery["state"];
  const per = PER.includes(Number(one(sp.per))) ? Number(one(sp.per)) : 25;
  const page = Math.max(1, Math.floor(Number(one(sp.page)) || 1));
  const query: LogQuery = { q: one(sp.q).trim().slice(0, 120), state, page, per };
  const { session } = await getAdminRequest().catch(() => ({ session: null }));
  const days = await getAppSetting(LOG_RETENTION_KEY, DEFAULT_LOG_RETENTION);
  const conn = connection();

  let log: Awaited<ReturnType<typeof searchLogged>> | null = null;
  let counts: Record<string, number> = {};
  try { [log, counts] = await Promise.all([searchLogged(query), loggedStateCounts()]); } catch { log = null; }
  const qs = (patch: Record<string, string | number>) => {
    const v = new URLSearchParams();
    const all = { q: query.q, state: query.state, per: query.per, page: query.page, ...patch };
    for (const [k, x] of Object.entries(all)) if (String(x) && !(k === "page" && String(x) === "1") && !(k === "per" && String(x) === "25")) v.set(k, String(x));
    return v.toString();
  };
  const pages = log ? Math.max(1, Math.ceil(log.total / per)) : 1;

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/settings">Settings</Link></p>
          <h1>Email</h1>
          <p>How the site sends mail, and every message it has sent.</p>
        </div>
      </div>

      <div className="ad__stack">
        <Panel title="Mail server" action={<span className={`ad__pill ${mailIsConfigured() ? "ad__pill--good" : "ad__pill--bad"}`}>{mailIsConfigured() ? "Set up" : "Missing"}</span>}>
          <dl className="adForms__dl">
            {conn.map((c) => (
              <div key={c.label}><dt>{c.label}</dt><dd>{c.value ?? <span className="ad__pill ad__pill--bad">Missing</span>}</dd></div>
            ))}
          </dl>
          <p className="ad__dim adForms__p" style={{ padding: "0 1rem" }}>
            These are environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_NAME, SMTP_FROM_EMAIL, SMTP_REPLY_TO), changed in the hosting settings rather than here, so the password never passes through the admin.
          </p>
        </Panel>

        <Panel title="Send a test">
          <div style={{ padding: "0 1rem 1rem" }}><TestEmail me={session?.user?.email ?? ""} /></div>
        </Panel>

        <Panel title="Message log">
          <nav aria-label="Message states">
            <ul className="adForms__tabs" style={{ padding: ".8rem 1rem 0" }}>
              {STATES.map((s) => (
                <li key={s || "all"}>
                  <Link href={`?${qs({ state: s, page: 1 })}`} aria-current={s === state ? "page" : undefined}>
                    {s || "All"} <span className="ad__num">{s ? counts[s] ?? 0 : Object.values(counts).reduce((a, b) => a + b, 0)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form className="adForms__filters" method="get" role="search">
            <input type="hidden" name="state" value={state} />
            <label className="adForms__search">Search
              <input type="search" name="q" defaultValue={query.q} placeholder="An address or subject, or to:someone subject:receipt" />
            </label>
            <label>Per page
              <select name="per" defaultValue={String(per)}>{PER.map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </label>
            <button className="ad__btn ad__btn--primary" type="submit">Search</button>
            {query.q ? <Link className="ad__btn" href={`?${qs({ q: "", page: 1 })}`}>Clear</Link> : null}
          </form>
          {!log ? (
            <AdminState kind="error" title="The message log could not be read" description="The database did not answer, or it is not connected." />
          ) : log.rows.length ? (
            <>
              <div className="ad__scroll">
                <table className="ad__t">
                  <thead><tr><th>When</th><th>To</th><th>What</th><th>State</th><th>Took</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {log.rows.map((m) => (
                      <tr key={m.id}>
                        <td className="ad__num">{time(m.at)}</td>
                        <td>{m.to}</td>
                        <td><b>{m.subject}</b><small>{m.summary}{m.by ? ` · ${m.by}` : ""}</small></td>
                        <td>
                          <span className={`ad__pill ${TONE[m.state] ?? ""}`}>{m.state}</span>
                          {m.error ? <small>{m.error}</small> : null}
                          {m.resends.length ? <small>Resent {m.resends.length} time{m.resends.length === 1 ? "" : "s"}</small> : null}
                        </td>
                        <td className="num">{m.ms ? `${(m.ms / 1000).toFixed(1)} s` : ""}</td>
                        <td className="ad__rmC">{m.state === "Failed" ? <ResendMessage id={m.id} /> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="adForms__foot">
                <span className="ad__dim ad__num">{(page - 1) * per + 1}–{Math.min(page * per, log.total)} of {log.total}</span>
                <span className="ad__row">
                  {page > 1 ? <Link className="ad__btn" href={`?${qs({ page: page - 1 })}`}>Previous</Link> : null}
                  <span className="ad__dim">Page {page} of {pages}</span>
                  {page < pages ? <Link className="ad__btn" href={`?${qs({ page: page + 1 })}`}>Next</Link> : null}
                </span>
              </div>
            </>
          ) : query.q || state ? (
            <Empty title="Nothing matches" action={<Link className="ad__btn" href="?">Show everything</Link>} />
          ) : (
            <Empty title="Nothing sent yet">Every email the site sends is written here before it goes, with whether it arrived.</Empty>
          )}
        </Panel>

        <Panel title="Keeping the log">
          <div style={{ padding: "0 1rem 1rem" }}>
            <Retention days={days} options={LOG_RETENTION_DAYS} />
            <p className="ad__dim adForms__p">The daily tidy runs at 04:40 Lagos time. It also empties each form&apos;s Trash of entries older than that form keeps them.</p>
            <TidyNow />
          </div>
        </Panel>
      </div>
    </>
  );
}
