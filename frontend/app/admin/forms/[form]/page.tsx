import type { Metadata } from "next";
import { findForm } from "@/lib/forms/find";
import Link from "next/link";
import { Pager } from "@/components/admin/pager";
import { DateRange } from "@/components/admin/date-range";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { stepsFor } from "@/lib/onboarding";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { columnCookie, chosenColumns, PER_PAGE, tabsFor, type FormDef } from "@/lib/forms/registry";
import { cellText, isEntryId, listEntries, onboardingServiceOf, readFilters, type Filters } from "@/lib/forms/entries";
import { AdminState } from "@/components/admin/admin-state";
import { Empty, Panel, when } from "@/components/admin/bits";
import { EntriesTable, type TableRow } from "@/components/admin/forms/entries-table";
import { ColumnPicker } from "@/components/admin/forms/column-picker";
import DemoSubmission, { demoTitle } from "@/components/admin/forms/demo-submission";
import { FormSettingsEditor } from "@/components/admin/forms/form-settings";
import { ImportSubscribers } from "@/components/admin/forms/import-subscribers";
import { fillTokens, NOTIFICATIONS } from "@/lib/forms/settings";
import { dataFromEntry, formEmail, tokensFor } from "@/lib/forms/emails";
import { unsubscribeUrl } from "@/lib/newsletter";
import { getFormSettings } from "@/lib/forms/settings-db";
import "@/components/admin/forms/forms.css";
import { persistSoon, syncStore } from "@/lib/admin/persist";

/* NO generateStaticParams: an entry that arrives after the build still opens. */

type Props = {
  params: Promise<{ form: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await syncStore();
  const { form: key } = await params;
  const form = await findForm(key);
  if (form) return { title: form.title };
  return { title: demoTitle(key) ?? "Form" };
}

/** The filters as a query string, for links that must keep them. */
function query(f: Filters, patch: Partial<Record<keyof Filters, string | number>> = {}) {
  const v = { tab: f.tab, q: f.q, from: f.from, to: f.to, sort: f.sort, per: f.per, page: f.page, ...patch };
  const qs = new URLSearchParams();
  for (const [k, x] of Object.entries(v)) {
    const s = String(x ?? "");
    if (!s || (k === "page" && s === "1") || (k === "sort" && s === "newest")) continue;
    qs.set(k, s);
  }
  return qs.toString();
}


function Tabs({ form, current, settings }: { form: FormDef; current: "entries" | "questions" | "settings"; settings: boolean }) {
  return (
    <nav aria-label={`${form.title} sections`}>
      <ul className="adForms__tabs">
        <li><Link href={`/admin/forms/${form.key}`} aria-current={current === "entries" ? "page" : undefined}>Entries</Link></li>
        {form.custom
          ? <li><Link href={`/admin/forms/${form.key}/build`}>Edit form</Link></li>
          : <li><Link href={`/admin/forms/${form.key}?view=questions`} aria-current={current === "questions" ? "page" : undefined}>Questions</Link></li>}
        {settings ? <li><Link href={`/admin/forms/${form.key}?view=settings`} aria-current={current === "settings" ? "page" : undefined}>Settings</Link></li> : null}
      </ul>
    </nav>
  );
}

function Questions({ form }: { form: FormDef }) {
  if (!form.service) {
    return (
      <Panel title="What this form asks">
        <dl className="adForms__dl">
          {form.columns.filter((c) => !["serial", "notice", "when", "status", "unsubscribed", "source"].includes(c.key)).map((c) => (
            <div key={c.key}><dt>{c.label}</dt></div>
          ))}
        </dl>
      </Panel>
    );
  }
  const steps = stepsFor(form.service);
  return (
    <Panel title={`${steps.reduce((n, s) => n + s.fields.length, 0)} questions across ${steps.length} steps`}>
      <div style={{ padding: ".4rem 1rem 1rem" }}>
        {steps.map((st) => (
          <section key={st.id} style={{ paddingTop: ".9rem" }}>
            <h3 style={{ fontSize: ".8rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ad-dim)" }}>{st.title}</h3>
            <ol style={{ margin: ".4rem 0 0", paddingLeft: "1.2rem" }}>
              {st.fields.map((f) => (
                <li key={f.key} style={{ padding: ".25rem 0" }}>
                  {f.label}
                  {f.required ? <b aria-label="required"> *</b> : null}
                  {f.showIf ? <span className="ad__dim"> · only if an earlier answer calls for it</span> : null}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </Panel>
  );
}

export default async function FormPage({ params, searchParams }: Props) {
  await syncStore();
  persistSoon();
  const { form: key } = await params;
  const form = await findForm(key);

  if (!form) {
    /* An old link to one brief, from before each form had its own page. */
    if (isEntryId(key)) {
      const service = await onboardingServiceOf(key).catch(() => null);
      if (service) redirect(`/admin/forms/onboarding-${service}/entries/${key}`);
      notFound();
    }
    return <DemoSubmission id={key} />;
  }

  const sp = await searchParams;
  const jar = await cookies();
  const role = await adminRole();
  const mayConfigure = can(role, "settings");
  const view = sp.view === "questions" ? "questions" : sp.view === "settings" && mayConfigure ? "settings" : "entries";
  const f = readFilters(form, sp);
  const chosen = chosenColumns(form, jar.get(columnCookie(form))?.value);
  const columns = chosen.map((k) => form.columns.find((c) => c.key === k)!).filter(Boolean);

  const head = (
    <div className="ad__head">
      <div>
        <p className="ad__dim"><Link href="/admin/forms">Forms</Link></p>
        <h1>{form.title}</h1>
        <p>{form.noun === "Subscriber" ? "Everyone who asked for the newsletter." : `Every ${form.noun.toLowerCase()} this form has received.`}</p>
      </div>
      <div className="ad__row">
        {form.source === "newsletter" && mayConfigure ? <ImportSubscribers /> : null}
        <a className="ad__btn" href={form.publicPath} target="_blank" rel="noopener"><ExternalLink aria-hidden="true" /> Open form</a>
      </div>
    </div>
  );

  if (view === "settings") {
    const settings = await getFormSettings(form);
    /* The latest real entry, so the preview shows real words, not placeholders. */
    const latest = (await listEntries(form, readFilters(form, { per: "25" })).catch(() => null))?.rows[0];
    const previews: Record<string, { to: string; subject: string; html: string }> = {};
    if (latest) {
      const data = dataFromEntry(form, latest);
      for (const n of NOTIFICATIONS[form.source]) {
        const m = formEmail(form, n.key, data, form.source === "newsletter" ? { unsubscribeUrl: unsubscribeUrl(latest.email) ?? undefined } : {});
        const s = settings.notifications[n.key];
        if (m) previews[n.key] = {
          to: n.audience === "studio" && s.to.length ? s.to.join(", ") : m.to,
          subject: s.subject ? fillTokens(s.subject, tokensFor(form, data)) : m.subject,
          html: m.html,
        };
      }
    }
    return (
      <>{head}<Tabs form={form} current="settings" settings />
        {settings.savedAt ? <p className="ad__dim" style={{ margin: "0 0 .8rem" }}>Last changed by {settings.savedBy} on {when(settings.savedAt)}.</p> : null}
        <FormSettingsEditor formKey={form.key} title={form.title} settings={settings}
          notifications={NOTIFICATIONS[form.source]} isOnboarding={form.source === "onboarding"} previews={previews} />
      </>
    );
  }
  if (view === "questions") return <>{head}<Tabs form={form} current="questions" settings={mayConfigure} /><Questions form={form} /></>;

  let page;
  try {
    page = await listEntries(form, f);
  } catch (error) {
    console.error("[forms] entries could not be read", error instanceof Error ? error.message : error);
    return (
      <>{head}<Tabs form={form} current="entries" settings={mayConfigure} />
        <AdminState kind="error" title="These entries could not be loaded"
          description="The database did not answer, or it is not connected. Nothing has been lost; reload in a minute." />
      </>
    );
  }

  const tabs = tabsFor(form);
  const filtered = Boolean(f.q || f.from || f.to);
  const listQuery = query(f);
  const rows: TableRow[] = page.rows.map((e) => ({
    id: e.id,
    href: `/admin/forms/${form.key}/entries/${e.id}${listQuery ? `?${listQuery}` : ""}`,
    read: e.read,
    starred: e.starred,
    cells: columns.map((c) => {
      const t = cellText(form, e, c.key);
      if (c.key === "when" || c.key === "unsubscribed") return t ? when(t) : "";
      if (c.key === "serial") return t ? `${form.noun} #${t}` : "";
      if (c.key === "client") return t || "Not a client yet";
      if (c.key === "notice") return t === "failed" ? "Not delivered" : t === "pending" ? "Sending" : "";
      return t;
    }),
  }));
  const exportQuery = query(f, { page: "", per: "" });
  const canExport = can(role, "exports");

  return (
    <>
      {head}
      <Tabs form={form} current="entries" settings={mayConfigure} />

      <nav aria-label="Entry states">
        <ul className="adForms__tabs">
          {tabs.map((t) => (
            <li key={t.key}>
              <Link href={`/admin/forms/${form.key}?${query(f, { tab: t.key, page: 1 })}`}
                aria-current={t.key === f.tab ? "page" : undefined}
                className={page.counts[t.key] ? undefined : "is-empty"}>
                {t.label} <span className="ad__num">{page.counts[t.key] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="ad__panel">
        <form className="adForms__filters" method="get" role="search">
          <input type="hidden" name="tab" value={f.tab} />
          <label className="adForms__search">Search
            <input type="search" name="q" defaultValue={f.q} placeholder={form.source === "contact" ? "Name, email, topic or message" : form.source === "newsletter" ? "An address" : "Name, email or any answer"} />
          </label>
          {f.from ? <input type="hidden" name="from" value={f.from} /> : null}
          {f.to ? <input type="hidden" name="to" value={f.to} /> : null}
          {f.per !== 25 ? <input type="hidden" name="per" value={f.per} /> : null}
          <label>Sort
            <select name="sort" defaultValue={f.sort}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">{form.source === "newsletter" ? "Address" : "Name"}</option>
            </select>
          </label>
          <button className="ad__btn ad__btn--primary" type="submit">Apply</button>
          {filtered ? <Link className="ad__btn" href={`/admin/forms/${form.key}?tab=${f.tab}`}>Clear</Link> : null}
        </form>
        <div className="adForms__range">
          <DateRange
            label="Received"
            value={{ from: f.from || undefined, to: f.to || undefined }}
            href={(r) => `/admin/forms/${form.key}?${query(f, { from: r.from ?? "", to: r.to ?? "", page: 1 })}`}
            keep={{ tab: f.tab, q: f.q, sort: f.sort === "newest" ? undefined : f.sort, per: f.per }}
            action={`/admin/forms/${form.key}`}
          />
          <span className="ad__row">
            <ColumnPicker formKey={form.key} columns={form.columns} chosen={chosen} />
            {canExport ? (
              <>
                <a className="ad__btn" href={`/admin/forms/${form.key}/export?format=csv&${exportQuery}`}>CSV</a>
                <a className="ad__btn" href={`/admin/forms/${form.key}/export?format=xlsx&${exportQuery}`}>XLSX</a>
              </>
            ) : null}
          </span>
        </div>

        <EntriesTable formKey={form.key} inbox={form.inbox} tab={f.tab} canDelete={can(role, "destructive")} canExport={canExport}
          columns={columns} rows={rows} exportQuery={exportQuery}
          footer={
            <Pager
              label="Entry pages"
              total={page.total}
              page={f.page}
              per={f.per}
              noun={page.total === 1 ? "entry" : "entries"}
              perOptions={PER_PAGE}
              href={(patch) => `/admin/forms/${form.key}?${query(f, { ...(patch.page ? { page: patch.page } : {}), ...(patch.per ? { per: patch.per } : {}) })}`}
            />
          }
          empty={filtered ? (
            <Empty title="Nothing matches these filters" action={<Link className="ad__btn" href={`/admin/forms/${form.key}?tab=${f.tab}`}>Clear filters</Link>} />
          ) : (
            <Empty title={f.tab === tabs[0].key ? `No entries from the ${form.title.toLowerCase()} form yet` : `Nothing in ${tabs.find((t) => t.key === f.tab)?.label}`}
              action={f.tab === tabs[0].key ? <a className="ad__btn" href={form.publicPath} target="_blank" rel="noopener">Open form</a> : undefined}>
              {f.tab === tabs[0].key ? "They appear here the moment somebody sends one." : undefined}
            </Empty>
          )}
        />
      </section>
    </>
  );
}
