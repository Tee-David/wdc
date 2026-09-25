import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import ClientShell from "@/components/client/shell";
import AdminTourProvider from "@/components/admin/tour/tour-provider";
import { getPortalRequest } from "@/lib/portal/session";
import { NotLinked } from "@/components/client/not-linked";
import "@/components/admin/admin.css";
/* The dashboard's own `adDash__*` rules (KPI grid, attention rows, compact
   lists) -- shared by name across every portal screen the same way the
   admin's own dashboard-view.tsx pulls them in, rather than duplicated
   under a `portal` prefix for no visual difference. */
import "@/components/admin/dashboard.css";
import "@/components/client/portal.css";
import { persistSoon, syncStore } from "@/lib/admin/persist";

/**
 * The client portal's own shell, mirroring `app/admin/layout.tsx` almost
 * exactly -- same reason for not inheriting the site's furniture (a
 * preloader and a custom cursor are wrong on a screen somebody opens to
 * check an invoice), same `force-dynamic`, same `.ad` token scope. The two
 * audiences share one design system on purpose: AGENTS.md asks for "the
 * established Litch-style shell" for BOTH admin and client navigation, not
 * two shells that happen to look similar.
 */
export const metadata: Metadata = {
  title: { default: "Portal", template: "%s · WDC Portal" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await syncStore();
  persistSoon();
  const { session, client } = await getPortalRequest();

  if (!session?.user) {
    const asked = (await headers()).get("x-wdc-path");
    redirect(`/login?redirect=${encodeURIComponent(asked?.startsWith("/portal") ? asked : "/portal")}`);
  }
  const role = (session.user as typeof session.user & { role?: string }).role;
  if (role !== "client") redirect("/signed-in");

  const user = { name: session.user.name, email: session.user.email, image: session.user.image };

  /* A SIGNED-IN CLIENT WITH NO CLIENT RECORD is not an error -- it is
     somebody the studio has not entered yet, most likely because they made
     an account before onboarding finished. Said honestly, in the same shell
     rather than a bare page, with the one real next step: email us. */
  if (!client) {
    return (
      <div className="ad">
        <ClientShell user={user} clientCompany={null}>
          <NotLinked email={session.user.email} />
        </ClientShell>
      </div>
    );
  }

  /* The same tour provider the admin mounts, over the portal's own registry.
     Only a linked client gets it: the unlinked state above is one sentence
     and has nothing to walk through. */
  return (
    <div className="ad">
      <AdminTourProvider role="client" audience="client">
        <ClientShell user={user} clientCompany={client.company}>
          {children}
        </ClientShell>
      </AdminTourProvider>
    </div>
  );
}
