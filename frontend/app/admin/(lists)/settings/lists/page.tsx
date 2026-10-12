import Link from "next/link";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { Head } from "@/components/admin/settings/kit";
import { persistSoon, syncStore } from "@/lib/admin/persist";
import { getClients, getExpenses } from "@/lib/admin/store";
import { EXPENSE_CATEGORIES } from "@/lib/admin/types";
import { listDepartments } from "@/lib/departments";
import { postsForAdmin } from "@/lib/blog-db";

export const metadata = { title: "Lists and categories" };

type Row = { name: string; n: number; href?: string };

/**
 * LISTS AND CATEGORIES: every list the studio sorts things by, with how many things use each entry, and where that
 * list is managed. Client tags are whatever has been typed on a client, so they are counted here and renamed on the
 * client; expense categories are a fixed set the books depend on; blog tags come from the posts; departments are
 * managed under People. Nothing on this page is stored separately, so nothing can disagree with the records.
 */
export default async function ListsSettings() {
  if (!can(await adminRole(), "settings")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="Lists are for Admin" description="The tags, categories and groups the studio sorts things by." /></section>;
  }
  await syncStore();
  persistSoon();
  const tally = (names: string[]): Row[] => {
    const m = new Map<string, number>();
    for (const n of names) m.set(n, (m.get(n) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name, n]) => ({ name, n }));
  };
  const clientTags = tally(getClients().flatMap((c) => c.tags ?? [])).map((r) => ({ ...r, href: `/admin/clients?q=${encodeURIComponent(r.name)}` }));
  const expenses = getExpenses();
  const expenseRows: Row[] = EXPENSE_CATEGORIES.map((name) => ({ name, n: expenses.filter((e) => e.category === name).length, href: "/admin/money" }));
  let blogTags: Row[] = [];
  try { blogTags = tally((await postsForAdmin(200)).flatMap((p) => p.tags ?? [])); } catch { blogTags = []; }
  const departments = ((await listDepartments()) ?? []).map((d): Row => ({ name: d.name, n: d.members.filter((m) => m.active).length, href: "/admin/users/departments" }));

  const lists: { title: string; line: string; unit: string; rows: Row[]; empty: string; where: { href: string; label: string } }[] = [
    { title: "Client tags", line: "Typed on a client to find them again.", unit: "client", rows: clientTags, empty: "No client has a tag yet. Add tags on a client's record.", where: { href: "/admin/clients", label: "Open clients" } },
    { title: "Expense categories", line: "A fixed set, so the books add up the same way every month.", unit: "expense", rows: expenseRows, empty: "", where: { href: "/admin/money", label: "Open money" } },
    { title: "Blog tags", line: "From the posts. Edit them on the post.", unit: "post", rows: blogTags, empty: "No post has a tag yet.", where: { href: "/admin/blog", label: "Open the blog" } },
    { title: "Departments", line: "Who looks after which clients. People are counted, not items.", unit: "person", rows: departments, empty: "No department yet. Add Branding, SEO or Web under People.", where: { href: "/admin/users/departments", label: "Manage departments" } },
  ];
  return (
    <>
      <Head title="Lists and categories" line="Everything the studio sorts by, and what uses each entry." />
      <div className="adSet__cards">
        {lists.map((l) => (
          <section key={l.title} className="ad__panel" aria-label={l.title}>
            <div className="ad__panelH"><h2>{l.title}</h2><span className="ad__dim">{l.line}</span></div>
            {l.rows.length ? l.rows.slice(0, 12).map((r) => (
              <div key={r.name} className="adSet__row adSet__row--static adSet__row--tight">
                <span className="adSet__text"><b>{r.href ? <Link href={r.href}>{r.name}</Link> : r.name}</b></span>
                <span className="adSet__end"><span className="ad__dim">{r.n ? `${r.n} ${r.n === 1 ? l.unit : `${l.unit}s`.replace("persons", "people")}` : "Not used yet"}</span></span>
              </div>
            )) : <p className="ad__dim adSetPad" style={{ margin: 0 }}>{l.empty}</p>}
            <div className="adSetPad"><Link className="ad__btn" href={l.where.href}>{l.where.label}</Link></div>
          </section>
        ))}
      </div>
    </>
  );
}
