import Link from "next/link";
import { BriefcaseBusiness, FilePlus2, PencilLine } from "lucide-react";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { Empty, Panel, when } from "@/components/admin/bits";
import { BlogTabs } from "@/components/admin/blog-tabs";
import { ListSearch } from "@/components/admin/list-search";
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
export default async function CaseStudiesPage() {
  const role = await adminRole();
  if (!can(role, "content")) {
    return <AdminState kind="forbidden" title="Case studies are for the content team" description="Ask the owner if you need something changed here."
      action={<Link className="ad__btn" href="/admin">Back to the dashboard</Link>} />;
  }
  const isOwner = role === "owner";
  let rows: Awaited<ReturnType<typeof adminCaseList>> = [];
  let failed = false;
  try { rows = await adminCaseList(); } catch { failed = true; }
  const label = (s: string) => WORK_CATEGORIES.find((c) => c.slug === s)?.label ?? s;

  return (
    <>
      <div className="ad__head">
        <div>
          <h1>Blog</h1>
          <p>The case studies on /work. Add one in five short steps; it goes live when you publish it.</p>
        </div>
        <div className="ad__row">
          <Link className="ad__btn ad__btn--primary" href="/admin/blog/work/new"><FilePlus2 aria-hidden="true" /> New case study</Link>
        </div>
      </div>
      <BlogTabs on="work" />

      {failed ? (
        <Panel title="Case studies">
          <AdminState kind="error" title="The case studies could not load" description="The database did not answer. The site is still showing the ones written in code."
            action={<Link className="ad__btn" href="/admin/blog/work">Try again</Link>} />
        </Panel>
      ) : (
        <Panel title={`${rows.length} case ${rows.length === 1 ? "study" : "studies"}`}>
          {rows.length ? (
            <>
              <ListSearch target="case-list" placeholder="Search client, title or service" noun="case studies" />
              <div className="ad__scroll" id="case-list">
                <table className="ad__t">
                  <thead>
                    <tr><th>Case study</th><th>Kind</th><th>Service</th><th>State</th><th>Last saved</th><th className="ad__rmH"><span className="ad__sr">Actions</span></th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const st = STATE[r.state];
                      return (
                        <tr key={r.slug} data-search={`${r.data.client} ${r.data.title} ${label(r.data.category)}`}>
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
            </>
          ) : (
            <Empty title="No case studies yet" icon={BriefcaseBusiness}
              action={<Link className="ad__btn ad__btn--primary" href="/admin/blog/work/new">Write the first one</Link>}>
              A case study tells the story of one piece of work: the brief, how it was made, and the result.
            </Empty>
          )}
        </Panel>
      )}
    </>
  );
}
