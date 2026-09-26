import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { DEFAULT_LOG_RETENTION, getAppSetting, LOG_RETENTION_KEY } from "@/lib/app-settings";
import { failureReasons, loggedStateCounts, searchLogged, type LogQuery } from "@/lib/message-log";
import { mailIsConfigured } from "@/lib/email";
import type { MessageState } from "@/lib/admin/types";
import { AdminState } from "@/components/admin/admin-state";
import { Empty, Panel } from "@/components/admin/bits";
import { Pager } from "@/components/admin/pager";
import { DateRange } from "@/components/admin/date-range";
import { ResendMessage } from "@/components/admin/reconcile-forms";
import { LogMore, RetryFailed } from "@/components/admin/email-settings";
import "@/components/admin/forms/forms.css";

export const metadata = { title: "Message log" };

/**
 * Everything the site has sent (FluentSMTP's log, made to fit), moved off
 * Settings, Email so that page is only settings.
 */

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const STATES: ("" | MessageState)[] = ["", "Failed", "Queued", "Sent", "Skipped"];
const PER = [25, 50, 100];
/* "26 Sept, 00:06": the year only when it is not this one, so the column
   stays one line wide instead of wrapping to four. */
const time = (iso: string) => {
  const d = new Date(iso);
  const thisYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", ...(thisYear ? {} : { year: "numeric" }), hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" });
};
const TONE: Record<string, string> = { Sent: "ad__pill--good", Failed: "ad__pill--bad", Queued: "ad__pill--warn", Skipped: "ad__pill--flat" };

export default async function MessageLogPage({ searchParams }: Props) {
  if (!can(await adminRole(), "settings")) {
    return (
      <section className="ad__panel">
        <AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="The message log is the owner's" description="Every email the site has sent." />
      </section>
    );
  }
  const sp = await searchParams;
  const state = (STATES.find((s) => s === one(sp.state)) ?? "") as LogQuery["state"];
  const per = PER.includes(Number(one(sp.per))) ? Number(one(sp.per)) : 25;
  const page = Math.max(1, Math.floor(Number(one(sp.page)) || 1));
  const dayOf = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const query: LogQuery = { q: one(sp.q).trim().slice(0, 120), state, page, per, from: dayOf(one(sp.from)), to: dayOf(one(sp.to)) };
  const days = await getAppSetting(LOG_RETENTION_KEY, DEFAULT_LOG_RETENTION);

  let log: Awaited<ReturnType<typeof searchLogged>> | null = null;
  let counts: Record<string, number> = {};
  let reasons: Awaited<ReturnType<typeof failureReasons>> = [];
  try { [log, counts, reasons] = await Promise.all([searchLogged(query), loggedStateCounts(), failureReasons()]); } catch { log = null; }
  const mail = mailIsConfigured();
  const failed = counts.Failed ?? 0;
  const qs = (patch: Record<string, string | number>) => {
    const v = new URLSearchParams();
    const all = { q: query.q, state: query.state, per: query.per, page: query.page, from: query.from ?? "", to: query.to ?? "", ...patch };
    for (const [k, x] of Object.entries(all)) if (String(x) && !(k === "page" && String(x) === "1") && !(k === "per" && String(x) === "25")) v.set(k, String(x));
    return v.toString();
  };

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/settings/email">Email</Link></p>
          <h1>Message log</h1>
          <p>Every email the site sent, kept {days} days.</p>
        </div>
        <div className="ad__row adLog__acts">
          {/* Retrying can only fail again with no mail server, so it is only
              offered once there is one; the reasons line says what to do
              otherwise. */}
          {failed && mail ? <RetryFailed count={failed} /> : null}
          <LogMore />
        </div>
      </div>

      <div className="ad__stack">
        {failed && reasons.length ? (
          <div className="adLog__why" role="note">
            <span className="ad__pill ad__pill--bad">{failed} failed</span>
            <p>
              {reasons.length === 1 || reasons[0].n === failed
                ? <>All for one reason: <b>{reasons[0].reason}</b></>
                : <>Mostly <b>{reasons[0].reason}</b> ({reasons[0].n}){reasons.slice(1).map((r) => <span key={r.reason}>, then {r.reason} ({r.n})</span>)}</>}
              {!mail ? <> This deployment has no mail server. <Link href="/admin/settings/integrations">Connect it</Link></> : null}
            </p>
          </div>
        ) : null}
        <Panel title="Messages">
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
            {per !== 25 ? <input type="hidden" name="per" value={per} /> : null}
            {query.from ? <input type="hidden" name="from" value={query.from} /> : null}
            {query.to ? <input type="hidden" name="to" value={query.to} /> : null}
            <button className="ad__btn ad__btn--primary" type="submit">Search</button>
            {query.q || query.from || query.to ? <Link className="ad__btn" href={`?${qs({ q: "", from: "", to: "", page: 1 })}`}>Clear</Link> : null}
          </form>
          <div className="adForms__range">
            <DateRange
              label="Sent"
              value={{ from: query.from, to: query.to }}
              href={(r) => `?${qs({ from: r.from ?? "", to: r.to ?? "", page: 1 })}`}
              keep={{ q: query.q, state, per: per === 25 ? undefined : per }}
            />
          </div>
          {!log ? (
            <AdminState kind="error" title="The message log could not be read" description="The database did not answer, or it is not connected." />
          ) : log.rows.length ? (
            <>
              {/* A TABLE, ON EVERY SCREEN (the owner's rule: a table stays a
                  table). The message column is given the width so a row
                  stays one or two lines tall instead of six, and the table
                  scrolls sideways inside its panel with When pinned, as
                  every other admin table does. */}
              <div className="ad__scroll">
                <table className="ad__t adLog">
                  <thead><tr><th>When</th><th>Message</th><th>State</th><th className="num">Took</th><th><span className="ad__sr">Actions</span></th></tr></thead>
                  <tbody>
                    {log.rows.map((m) => (
                      <tr key={m.id}>
                        <td className="adLog__when">{time(m.at)}</td>
                        <td className="adLog__what">
                          <b>{m.subject}</b>
                          <small>To {m.to} · {m.summary}{m.by ? ` · ${m.by}` : ""}</small>
                        </td>
                        <td className="adLog__state">
                          <span className={`ad__pill ${TONE[m.state] ?? ""}`}>{m.state}</span>
                          {m.error ? <small>{m.error}</small> : null}
                          {m.resends.length ? <small>Resent {m.resends.length} time{m.resends.length === 1 ? "" : "s"}</small> : null}
                        </td>
                        <td className="num">{m.ms ? `${(m.ms / 1000).toFixed(1)} s` : ""}</td>
                        <td className="adLog__act">{m.state === "Failed" ? <ResendMessage id={m.id} /> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                label="Message log pages"
                total={log.total}
                page={page}
                per={per}
                noun={log.total === 1 ? "message" : "messages"}
                href={(patch) => `?${qs({ ...(patch.page ? { page: patch.page } : {}), ...(patch.per ? { per: patch.per } : {}) })}`}
              />
            </>
          ) : query.q || state || query.from || query.to ? (
            <Empty title="Nothing matches" action={<Link className="ad__btn" href="?">Show everything</Link>} />
          ) : (
            <Empty title="Nothing sent yet">Every email shows here, with whether it arrived.</Empty>
          )}
        </Panel>

      </div>
    </>
  );
}
