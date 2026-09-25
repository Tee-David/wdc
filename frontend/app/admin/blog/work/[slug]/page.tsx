import Link from "next/link";
import { notFound } from "next/navigation";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { CaseEditor } from "@/components/admin/case-editor";
import { caseForEditor } from "@/lib/work-db";
import { CASE_STUDIES, WORK_CATEGORIES } from "@/lib/work";
import { r2PublicBase } from "@/lib/r2";

export const metadata = { title: "Case study" };

/** One case study in the editor; `new` starts an empty one. */
export default async function CaseStudyEditPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ service?: string }>;
}) {
  const role = await adminRole();
  if (!can(role, "content")) {
    return <AdminState kind="forbidden" title="Case studies are for the content team" description="Ask the owner if you need something changed here."
      action={<Link className="ad__btn" href="/admin">Back to the dashboard</Link>} />;
  }
  const { slug } = await params;
  const isNew = slug === "new";
  const found = isNew ? null : await caseForEditor(slug).catch(() => null);
  if (!isNew && !found) notFound();
  const sp = await searchParams;
  const service = WORK_CATEGORIES.find((c) => c.slug === sp.service)?.slug;
  const initial = found?.data ?? (service ? { category: service } as never : null);
  /* The site's own work pictures, to choose from instead of uploading. */
  const ours = [...new Set(CASE_STUDIES.flatMap((c) => [c.cover, ...(c.gallery ?? [])]).filter((x): x is string => Boolean(x) && x!.startsWith("/")))];

  return (
    <>
      <div className="ad__head">
        <div>
          <p className="ad__dim"><Link href="/admin/blog">Blog</Link> / <Link href="/admin/blog/work">Case studies</Link></p>
          <h1>{isNew ? "New case study" : found!.data.client}</h1>
          <p>{isNew ? "Five short steps. Save a draft at any point; it goes live when it is published." : `/work/${found!.data.category}/${slug}`}</p>
        </div>
      </div>
      <CaseEditor
        initial={initial}
        kind={found?.data.kind}
        originalSlug={isNew ? undefined : slug}
        services={WORK_CATEGORIES.map((c) => ({ slug: c.slug, label: c.label }))}
        bucket={r2PublicBase()}
        canPublish={role === "owner"}
        ours={ours}
      />
    </>
  );
}
