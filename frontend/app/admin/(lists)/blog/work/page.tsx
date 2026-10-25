import Link from "next/link";
import { BriefcaseBusiness, Clock, Eye, EyeOff, FilePlus2, Folder, PencilLine } from "lucide-react";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { Empty, Panel, when } from "@/components/admin/bits";
import { PageHead } from "@/components/admin/page-head";
import { ChoresMenu } from "@/components/admin/chores-menu";
import { Deck, type DeckItem } from "@/components/admin/deck";
import { Chips } from "@/components/admin/chips";
import { UrlSearch } from "@/components/admin/url-search";
import { Pager, readPer } from "@/components/admin/pager";
import { RailCard, RailHead, StatTiles, Workbench } from "@/components/admin/workbench";
import { RailRows } from "@/components/admin/rail-list";
import { getClient, getProjects } from "@/lib/admin/store";
import { syncStore } from "@/lib/admin/persist";
import { HideCase } from "@/components/admin/case-hide";
import { adminCaseList } from "@/lib/work-db";
import { CASE_KINDS } from "@/lib/work-def";
import { WORK_CATEGORIES } from "@/lib/work";

export const metadata = { title: "Case studies" };

const STATE: Record<string, { label: string; tone: string }> = {
  live: { label: "Live", tone: "ad__pill--good" },
  changed: { label: "Live, with unpublished changes", tone: "ad__pill--warn" },
  draft: { label: "Draft", tone: "ad__pill--flat" },
  hidden: { label: "Off the site", tone: "ad__pill--flat" },
};
const KIND_TONE = { build: "ad__pill--brand", identity: "ad__pill--live", campaign: "ad__pill--good" } as const;

/**
 * CASE STUDIES (Blog, second tab): everything /work shows, the seventeen
 * written in code and any added here, with its kind, service and state. The
 * editor is one click away; taking one off the site is the owner's and keeps
 * everything that was written.
 */
type CQ = { q?: string; state?: string; page?: string; per?: string };

export default async function CaseStudiesPage({ searchParams }: { searchParams: Promise<CQ> }) {
  const role = await adminRole();
  if (!can(role, "content")) {
    return <AdminState kind="forbidden" title="Case studies are for the content team" description="Ask Admin if you need something changed here."
      action={<Link className="ad__btn" href="/admin">Back to the dashboard</Link>} />;
  }
  const query = await searchParams;
  const isOwner = role === "owner";
  let rows: Awaited<ReturnType<typeof adminCaseList>> = [];
  let failed = false;
  try { rows = await adminCaseList(); } catch { failed = true; }
  const label = (s: string) => WORK_CATEGORIES.find((c) => c.slug === s)?.label ?? s;

  const per = readPer(query.per);
  const wanted = (["live", "draft", "changed", "hidden"] as const).find((x) => x === query.state);
  const search = query.q?.trim().toLocaleLowerCase() ?? "";
  const count = (st: string) => rows.filter((r) => r.state === st).length;
  const shown = rows
    .filter((r) => !wanted || r.state === wanted)
    .filter((r) => !search || `${r.data.client} ${r.data.title} ${label(r.data.category)}`.toLocaleLowerCase().includes(search));
  const pageCount = Math.max(1, Math.ceil(shown.length / per));
  const page = Math.min(Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1), pageCount);
  const pageRows = shown.slice((page - 1) * per, page * per);
  const href = (changes: Partial<CQ>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, ...changes })) if (v) p.set(k, String(v));
    const q = p.toString();
    return `/admin/blog/work${q ? `?${q}` : ""}`;
  };

  /* READY TO WRITE: a delivered project whose client has no case study yet,
     matched by the client's name, which is the only link the data has. */
  await syncStore();
  const written = new Set(rows.map((r) => (r.data.client ?? "").trim().toLocaleLowerCase()).filter(Boolean));
  const ready = getProjects().filter((p) => p.stage === "Delivered").map((p) => ({ p, c: getClient(p.clientId) }))
    .filter((x): x is { p: ReturnType<typeof getProjects>[number]; c: NonNullable<ReturnType<typeof getClient>> } => Boolean(x.c) && !written.has(x.c!.company.trim().toLocaleLowerCase()))
    .slice(0, 3);

  const deckItems: DeckItem[] = [
    ...rows.filter((r) => r.state === "changed").slice(0, 4).map((r): DeckItem => ({
      id: `changed-${r.slug}`, kind: "Unpublished", tone: "warn", urgency: r.updatedAt ? `Edited ${when(r.updatedAt)}` : "Edited", label: label(r.data.category),
      title: `${r.data.client || r.data.title} has changes that are not live`,
      body: "The page on /work still shows the last published version. Open it, check the changes and publish.",
      facts: [{ k: "Client", v: r.data.client || "Untitled" }, { k: "Kind", v: CASE_KINDS[r.kind].label }],
      why: "What visitors read is the published copy, not your draft.",
      primary: { label: "Open the editor", href: `/admin/blog/work/${r.slug}` },
    })),
    ...rows.filter((r) => r.state === "draft").slice(0, 3).map((r): DeckItem => ({
      id: `draft-${r.slug}`, kind: "Draft", tone: "neutral", urgency: r.updatedAt ? `Saved ${when(r.updatedAt)}` : "Draft", label: label(r.data.category),
      title: `Finish the case study for ${r.data.client || r.data.title}`,
      body: "It is a draft, so it is not on /work yet.",
      facts: [{ k: "Kind", v: CASE_KINDS[r.kind].label }, { k: "Service", v: label(r.data.category) }],
      why: "A finished case study is the page that turns a visitor into an enquiry.",
      primary: { label: "Open the editor", href: `/admin/blog/work/${r.slug}` },
    })),
  ];
  const live = count("live") + count("changed");
  const lede = <>{live} live, {count("draft")} in draft{count("changed") ? `, ${count("changed")} with changes not published` : ""}. <strong>{ready.length ? `${ready.length} delivered ${ready.length === 1 ? "project has" : "projects have"} no case study.` : "Every delivered project has one."}</strong></>;
  const chips = [
    { key: "", label: "All", href: href({ state: undefined, page: undefined }), count: rows.length },
    { key: "live", label: "Live", href: href({ state: "live", page: undefined }), count: count("live") },
    { key: "changed", label: "Changed", href: href({ state: "changed", page: undefined }), count: count("changed") },
    { key: "draft", label: "Drafts", href: href({ state: "draft", page: undefined }), count: count("draft") },
    { key: "hidden", label: "Off the site", href: href({ state: "hidden", page: undefined }), count: count("hidden") },
  ];

  return (
    <>
      <PageHead
        title="Case studies"
        lede={lede}
        action={<Link className="ad__btn ad__btn--primary" href="/admin/blog/work/new"><FilePlus2 aria-hidden="true" /> New case study</Link>}
        chores={<ChoresMenu label="case studies, more" items={[
          { label: "Blog posts", href: "/admin/blog", icon: "file" },
          { label: "Media library", href: "/admin/settings/media", icon: "image" },
          { label: "Open the work page", href: "/work", icon: "open", external: true },
        ]} />}
      />

      {failed ? (
        <Panel title="Case studies">
          <AdminState kind="error" title="The case studies could not load" description="The database did not answer. The site is still showing the ones written in code."
            action={<Link className="ad__btn" href="/admin/blog/work">Try again</Link>} />
        </Panel>
      ) : (
        <Workbench
          railLabel="Work pulse"
          rail={<>
            <RailHead title="Work pulse" />
            <StatTiles items={[
              { label: "Live", value: String(live), note: "On the work pages", icon: Eye, tone: "good", href: href({ state: "live", page: undefined }) },
              { label: "Drafts", value: String(count("draft")), note: count("draft") ? "Not on the site yet" : "Nothing half written", icon: PencilLine, tone: "live", href: href({ state: "draft", page: undefined }) },
              { label: "With changes", value: String(count("changed")), note: count("changed") ? "Edited, not published" : "Nothing unpublished", noteTone: count("changed") ? "accent" : undefined, icon: Clock, tone: count("changed") ? "warn" : "neutral", href: href({ state: "changed", page: undefined }) },
              { label: "Off the site", value: String(count("hidden")), note: "Hidden, nothing lost", icon: EyeOff, tone: "neutral", href: href({ state: "hidden", page: undefined }) },
            ]} />
            <RailCard title="Ready to write" aside="Delivered, no case study">
              <RailRows empty="Every delivered project already has a case study." rows={ready.map(({ p, c }) => ({ key: p.id, title: c.company, sub: `${p.title} · delivered`, icon: Folder, tone: "neutral" as const, href: "/admin/blog/work/new", tag: { text: "Start", tone: "brand" as const } }))} />
            </RailCard>
          </>}
        >
          <Deck id="cases" title="Case studies this week" items={deckItems}
            emptyTitle="The case studies are looked after."
            emptyBody="No draft is waiting and nothing edited is unpublished."
            emptyNext={{ label: "Write a case study", href: "/admin/blog/work/new" }} />

          <section className="adList" aria-label="All case studies">
            <div className="adList__hd">
              <h2>Case studies</h2>
              <span className="adList__n">{rows.length}</span>
              <span className="adList__sp" />
              <UrlSearch label="Search case studies" placeholder="Client, title or service" />
            </div>
            <div className="adList__pad"><Chips label="State" items={chips} current={wanted ?? ""} /></div>
            {pageRows.length ? (
              <>
                <div className="ad__scroll" id="case-list" tabIndex={0} role="region" aria-label="Case studies table, scrolls sideways" data-lenis-prevent>
                  <table className="ad__t">
                    <thead>
                      <tr><th>Case study</th><th>Kind</th><th>Service</th><th>State</th><th>Last saved</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r) => {
                        const st = STATE[r.state];
                        return (
                          <tr key={r.slug}>
                            <td>
                              <span className="adCase__who">
                                {r.data.cover
                                  // eslint-disable-next-line @next/next/no-img-element
                                  ? <img src={r.data.cover} alt="" width={64} height={44} loading="lazy" />
                                  : <span className="adCase__noPic" aria-hidden="true"><BriefcaseBusiness /></span>}
                                <span>
                                  <Link href={`/admin/blog/work/${r.slug}`}><b>{r.data.client || "Untitled"}</b></Link>
                                  <small>{r.data.title}</small>
                                </span>
                              </span>
                            </td>
                            <td><span className={`ad__pill ${KIND_TONE[r.kind]}`}>{CASE_KINDS[r.kind].label}</span></td>
                            <td>{label(r.data.category)}</td>
                            <td><span className={`ad__pill ${st.tone}`}>{st.label}</span></td>
                            <td className="ad__dim">{r.updatedAt ? `${when(r.updatedAt)}${r.updatedBy ? ` by ${r.updatedBy}` : ""}` : "Written in code"}</td>
                            <td>
                              <span className="ad__row adCase__acts">
                                <Link className="ad__btn" href={`/admin/blog/work/${r.slug}`}><PencilLine aria-hidden="true" /> Edit</Link>
                                {r.state !== "draft" && r.state !== "hidden" ? (
                                  <a className="ad__btn" href={`/work/${r.data.category}/${r.slug}`} target="_blank" rel="noopener noreferrer">View</a>
                                ) : null}
                                {isOwner && r.state !== "draft" ? (
                                  <HideCase slug={r.slug} client={r.data.client} hidden={r.state === "hidden"} />
                                ) : null}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pager label="Case study pages" total={shown.length} page={page} per={per} noun={shown.length === 1 ? "case study" : "case studies"}
                  href={(patch) => href({ page: patch.page && patch.page > 1 ? String(patch.page) : undefined, per: patch.per ? String(patch.per) : query.per })} />
              </>
            ) : rows.length ? (
              <Empty title={search ? `No case study matches “${query.q?.trim()}”` : "No case study in that state"} icon={BriefcaseBusiness} action={<Link className="ad__btn" href="/admin/blog/work">Clear filters</Link>}>
                Search by client, title or service, or clear the filters.
              </Empty>
            ) : (
              <Empty title="No case studies yet" icon={BriefcaseBusiness}
                action={<Link className="ad__btn ad__btn--primary" href="/admin/blog/work/new">Write the first one</Link>}>
                A case study tells the story of one piece of work: the brief, how it was made, and the result.
              </Empty>
            )}
          </section>
        </Workbench>
      )}
    </>
  );
}
