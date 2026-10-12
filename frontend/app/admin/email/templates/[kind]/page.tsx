import { notFound } from "next/navigation";
import { PageHead } from "@/components/admin/page-head";
import AreaGate from "@/components/admin/owner-only";
import { DesignEditor } from "@/components/admin/email/design-editor";
import { kindByKey } from "@/lib/email-registry";
import { getSaved, versions } from "@/lib/email-design-store";

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const k = kindByKey((await params).kind);
  return { title: k ? `${k.name} design` : "Email" };
}

export default async function EditEmail({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const k = kindByKey(kind);
  if (!k) notFound();
  const [saved, history] = await Promise.all([getSaved(kind), versions(kind)]);
  return (
    <AreaGate area="settings" what="Email">
      <PageHead
        title={k.name}
        crumbs={[{ href: "/admin/email?tab=templates", label: "Marketing" }]}
        lede={<>{k.line} The brand header, dark mode and footer are added for you.</>}
      />
      <DesignEditor kind={k.key} name={k.name} tags={k.tags} starters={k.starters}
        saved={saved ? { design: saved.design, enabled: saved.enabled } : null}
        history={history} />
    </AreaGate>
  );
}
