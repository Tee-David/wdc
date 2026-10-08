import { notFound } from "next/navigation";
import { adminRole } from "@/lib/admin/guard";
import { can } from "@/lib/admin/permissions";
import { AdminState } from "@/components/admin/admin-state";
import { Panel, when } from "@/components/admin/bits";
import { Head } from "@/components/admin/settings/kit";
import { LegalEditor } from "@/components/admin/legal-editor";
import { Form, Actions, Hidden, Submit } from "@/components/admin/form";
import { History } from "lucide-react";
import { restorePolicyVersion } from "@/lib/admin/legal-actions";
import { getLegalStates } from "@/lib/legal-store";
import { contentHistory } from "@/lib/revisions";
import "@/components/admin/blog-editor.css";

export const metadata = { title: "Edit a policy" };

export default async function EditPolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!can(await adminRole(), "content")) {
    return <section className="ad__panel"><AdminState kind="forbidden" back={{ href: "/admin/settings", label: "Back to settings" }} title="Policies are not part of your role" description="Ask an owner if you need to change the legal text." /></section>;
  }
  const state = (await getLegalStates()).find((s) => s.doc.slug === slug);
  if (!state) notFound();
  const configured = Boolean(process.env.DATABASE_URL || process.env.COCKROACHDB_URL);
  const history = await contentHistory(`legal.${slug}`).catch(() => []);
  return (
    <>
      <Head title={state.doc.title} line={state.edited ? `Edited ${when(state.edited.at)} by ${state.edited.by}.` : "Showing the text that shipped with the site."} />
      <div className="ad__stack">
        {configured ? (
          <section className="ad__panel" style={{ padding: "1rem" }}>
            <LegalEditor doc={state.doc} edited={Boolean(state.edited)} />
          </section>
        ) : (
          <section className="ad__panel">
            <AdminState kind="error" title="The content database is not connected" description="COCKROACHDB_URL is not set, so edits have nowhere to be saved. The site is showing the text that shipped." />
          </section>
        )}
        {history.length ? (
          <Panel title="Earlier versions" action={<span className="ad__dim adSet__aside">The last 10 are kept</span>}>
            <ol className="adRevs">
              {history.map((h) => (
                <li key={h.id} className="adRevs__row">
                  <span className="adRevs__who"><b>{h.shipped ? "What shipped" : "An edit"}</b><small className="ad__dim">{h.by} · {when(h.at)}</small></span>
                  <Form action={restorePolicyVersion} confirm="Put this version back on the live policy? Its words replace what readers see now. The current version is kept.">
                    <Hidden name="slug" value={slug} />
                    <Hidden name="version" value={h.id} />
                    <Actions><Submit tone="plain" icon={History}>Restore</Submit></Actions>
                  </Form>
                </li>
              ))}
            </ol>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
